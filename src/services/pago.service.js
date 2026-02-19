import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";

const clienteRepository = AppDataSource.getRepository(Cliente);
const movimientoRepository = AppDataSource.getRepository(MovimientoFinanciero);

export const generarCargoMensualService = async (clienteId) => {
    const cliente = await clienteRepository.findOne({ 
        where: { id: clienteId }, relations: ["plan"]
    });
    if (!cliente || !cliente.plan) throw new Error("Cliente no encontrado");

    const costo = Number(cliente.plan.precio_mensual);
    const mov = movimientoRepository.create({
        tipo: "CARGO_MENSUAL",
        monto: costo,
        descripcion: `Mensualidad ${cliente.plan.nombre}`,
        cliente: cliente
    });
    cliente.saldo_actual = Number(cliente.saldo_actual) + costo;

    await AppDataSource.transaction(async manager => {
        await manager.save(mov);
        await manager.save(cliente);
    });
    return { mensaje: "Cargo generado", nuevo_saldo: cliente.saldo_actual };
};

export const registrarPagoService = async (data) => {
    const cliente = await clienteRepository.findOne({ where: { id: data.clienteId } });
    if (!cliente) throw new Error("Cliente no encontrado");

    const montoPago = Number(data.monto);
    let abonoAtrasado = 0;
    let abonoCorriente = 0;

    // --- 1. LÓGICA FIFO (Cobrar deuda vieja primero) ---
    if (Number(cliente.saldo_aplazado) > 0) {
        if (montoPago >= Number(cliente.saldo_aplazado)) {
            // El pago cubre toda la deuda atrasada (y puede que sobre para la actual)
            abonoAtrasado = Number(cliente.saldo_aplazado);
            abonoCorriente = montoPago - abonoAtrasado;
            cliente.saldo_aplazado = 0;
        } else {
            // El pago solo cubre una parte de la deuda atrasada
            abonoAtrasado = montoPago;
            cliente.saldo_aplazado = Number(cliente.saldo_aplazado) - montoPago;
        }
    } else {
        // No hay deuda atrasada, todo va al mes corriente
        abonoCorriente = montoPago;
    }

    // Descontamos el restante (si lo hay) del saldo actual
    if (abonoCorriente > 0) {
        cliente.saldo_actual = Number(cliente.saldo_actual) - abonoCorriente;
        // Reactivación automática si estaba cortado y ya no debe el mes corriente
        if (cliente.saldo_actual <= 0 && cliente.estado === "CORTADO") {
            cliente.estado = "ACTIVO"; 
        }
    }

    // --- 2. LÓGICA DE CONFIABILIDAD ---
    // Evaluamos si hubo retraso, siempre y cuando no se indique que fue por tu logística o acuerdo
    if (data.motivo_retraso !== 'logistica' && data.motivo_retraso !== 'acuerdo') {
        const hoy = new Date();
        const diaActual = hoy.getDate();
        const diaPago = cliente.dia_pago;

        // Cálculo para saber cuántos días han pasado desde su día de pago
        let diasRetraso = diaActual - diaPago;
        // Ajuste por si el corte es a fin de mes (ej. día 30) y hoy es inicio de mes (ej. día 2)
        if (diasRetraso < 0 && diaActual <= 7) { 
            const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
            diasRetraso = diaActual + (ultimoDiaMesAnterior - diaPago);
        }

        // Aplicamos reglas de puntos
        if (diasRetraso >= 0 && diasRetraso <= 5) {
            // Premio: Pagó a tiempo o en gracia. Sube 2% (Máx 100%)
            cliente.confiabilidad = Math.min(100, cliente.confiabilidad + 2);
        } else if (diasRetraso === 6 || diasRetraso === 7) {
            // Penalización leve: Pagó tarde pero antes del aplazamiento grave. Baja 5%
            cliente.confiabilidad = Math.max(0, cliente.confiabilidad - 5);
        }
        // Nota: Si los días de retraso son más de 7, la falta grave (-15%) la aplicará 
        // automáticamente el Cron Job (automatización), así que aquí no restamos nada extra.
    }

    // --- 3. GENERACIÓN DEL HISTORIAL (Movimiento) ---
    let descBase = "Abono general";
    if (data.tipo_pago === 'LIQUIDACION') descBase = `Liquidación - ${data.mes_servicio || 'Saldo'}`;
    else if (data.tipo_pago === 'APLAZADO') descBase = `Pago Mes Aplazado`;
    else if (data.mes_servicio) descBase = `Abono Mes: ${data.mes_servicio}`;

    // Si pagó algo de deuda atrasada, lo indicamos en el historial
    if (abonoAtrasado > 0) {
        descBase = `Recuperación de Adeudo ($${abonoAtrasado}) | ${descBase}`;
    }

    if (data.descripcion && data.descripcion.trim() !== "") {
        descBase = `${descBase} | Nota: ${data.descripcion.trim()}`;
    }

    const pago = movimientoRepository.create({
        tipo: "ABONO",
        monto: montoPago,
        descripcion: descBase, 
        mes_servicio: data.mes_servicio || null,
        metodo_pago: data.metodo_pago || "EFECTIVO",
        cliente: cliente
    });

    await AppDataSource.transaction(async manager => {
        await manager.save(pago);
        await manager.save(cliente);
    });

    return { 
        mensaje: "Pago registrado", 
        saldo_restante: cliente.saldo_actual,
        saldo_aplazado_restante: cliente.saldo_aplazado,
        nueva_confiabilidad: cliente.confiabilidad
    };
};

export const getHistorialPagosService = async (clienteId) => {
    return await movimientoRepository.find({
        where: { cliente: { id: parseInt(clienteId) } },
        order: { fecha: "DESC" } 
    });
};

export const getMovimientosGlobalesService = async () => {
    return await movimientoRepository.find({
        relations: ["cliente"],
        order: { fecha: "DESC" },
        take: 100
    });
};