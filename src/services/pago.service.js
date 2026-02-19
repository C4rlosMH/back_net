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
        // CORRECCIÓN AQUÍ: Se especifica el repositorio dentro de la transacción
        await manager.getRepository(MovimientoFinanciero).save(mov);
        await manager.getRepository(Cliente).save(cliente);
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
            abonoAtrasado = Number(cliente.saldo_aplazado);
            abonoCorriente = montoPago - abonoAtrasado;
            cliente.saldo_aplazado = 0;
        } else {
            abonoAtrasado = montoPago;
            cliente.saldo_aplazado = Number(cliente.saldo_aplazado) - montoPago;
        }
    } else {
        abonoCorriente = montoPago;
    }

    // Descontamos el restante (si lo hay) del saldo actual
    if (abonoCorriente > 0) {
        cliente.saldo_actual = Number(cliente.saldo_actual) - abonoCorriente;
        if (cliente.saldo_actual <= 0 && cliente.estado === "CORTADO") {
            cliente.estado = "ACTIVO"; 
        }
    }

    // --- 2. LÓGICA DE CONFIABILIDAD ---
    if (data.motivo_retraso !== 'logistica' && data.motivo_retraso !== 'acuerdo') {
        const hoy = new Date();
        const diaActual = hoy.getDate();
        const diaPago = cliente.dia_pago;

        let diasRetraso = diaActual - diaPago;
        if (diasRetraso < 0 && diaActual <= 7) { 
            const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
            diasRetraso = diaActual + (ultimoDiaMesAnterior - diaPago);
        }

        // Manejo seguro por si confiabilidad es null (usamos 100 por defecto)
        const confiabilidadActual = cliente.confiabilidad ?? 100;

        if (diasRetraso >= 0 && diasRetraso <= 5) {
            cliente.confiabilidad = Math.min(100, confiabilidadActual + 2);
        } else if (diasRetraso === 6 || diasRetraso === 7) {
            cliente.confiabilidad = Math.max(0, confiabilidadActual - 5);
        }
    }

    // --- 3. GENERACIÓN DEL HISTORIAL (Movimiento) ---
    let descBase = "Abono general";
    if (data.tipo_pago === 'LIQUIDACION') descBase = `Liquidación - ${data.mes_servicio || 'Saldo'}`;
    else if (data.tipo_pago === 'APLAZADO') descBase = `Pago Mes Aplazado`;
    else if (data.mes_servicio) descBase = `Abono Mes: ${data.mes_servicio}`;

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
        referencia: data.referencia || null, // Guardado de la referencia (Folio)
        cliente: cliente
    });

    await AppDataSource.transaction(async manager => {
        // CORRECCIÓN AQUÍ: Se especifica el repositorio para evitar el error de EntitySchema
        await manager.getRepository(MovimientoFinanciero).save(pago);
        await manager.getRepository(Cliente).save(cliente);
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