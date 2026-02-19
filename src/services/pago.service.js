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
    cliente.saldo_actual = Number(cliente.saldo_actual) + costo;

    const movCargo = movimientoRepository.create({
        tipo: "CARGO_MENSUAL",
        monto: costo,
        descripcion: `Mensualidad ${cliente.plan.nombre}`,
        cliente: cliente
    });

    const movimientosAGuardar = [movCargo];

    // --- LÓGICA DE AUTO-PAGO CON SALDO A FAVOR ---
    let saldoFavor = Number(cliente.saldo_a_favor || 0);
    if (saldoFavor > 0) {
        // Tomamos lo que necesitemos para pagar (o todo lo que tenga si no le alcanza)
        const cobroAutomatico = Math.min(cliente.saldo_actual, saldoFavor);
        
        cliente.saldo_a_favor = saldoFavor - cobroAutomatico;
        cliente.saldo_actual = cliente.saldo_actual - cobroAutomatico;

        const movAutoCobro = movimientoRepository.create({
            tipo: "ABONO",
            monto: cobroAutomatico,
            descripcion: "Auto-pago descontado del Saldo a Favor",
            metodo_pago: "SISTEMA", // Dinero que ya estaba en el sistema
            cliente: cliente
        });
        movimientosAGuardar.push(movAutoCobro);
    }

    await AppDataSource.transaction(async manager => {
        for (const mov of movimientosAGuardar) {
            await manager.getRepository(MovimientoFinanciero).save(mov);
        }
        await manager.getRepository(Cliente).save(cliente);
    });

    return { mensaje: "Cargo generado procesado", nuevo_saldo: cliente.saldo_actual };
};

export const registrarPagoService = async (data) => {
    const cliente = await clienteRepository.findOne({ where: { id: data.clienteId } });
    if (!cliente) throw new Error("Cliente no encontrado");

    let montoPago = Number(data.monto);

    // --- LÓGICA DE APLAZAMIENTO (PRÓRROGA) ---
    if (data.tipo_pago === 'APLAZADO') {
        cliente.saldo_actual = Number(cliente.saldo_actual) - montoPago;
        if (cliente.saldo_actual < 0) cliente.saldo_actual = 0; 
        
        cliente.saldo_aplazado = Number(cliente.saldo_aplazado) + montoPago;

        if (cliente.estado === "CORTADO" || cliente.estado === "SUSPENDIDO") {
            cliente.estado = "ACTIVO";
        }

        const aplazamiento = movimientoRepository.create({
            tipo: "APLAZAMIENTO",
            monto: montoPago,
            descripcion: data.descripcion ? `Prórroga/Aplazamiento | ${data.descripcion}` : "Deuda movida a meses posteriores",
            mes_servicio: data.mes_servicio || null,
            metodo_pago: "SISTEMA", 
            referencia: null,
            cliente: cliente
        });

        await AppDataSource.transaction(async manager => {
            await manager.getRepository(MovimientoFinanciero).save(aplazamiento);
            await manager.getRepository(Cliente).save(cliente);
        });

        return { 
            mensaje: "Deuda aplazada correctamente", 
            saldo_restante: cliente.saldo_actual,
            saldo_aplazado_restante: cliente.saldo_aplazado,
            nueva_confiabilidad: cliente.confiabilidad
        };
    }

    // --- LÓGICA NORMAL DE PAGOS CON SALDO A FAVOR ---
    let abonoAtrasado = 0;
    let abonoCorriente = 0;
    let sobrante = 0;

    // 1. Pagar deuda vieja (aplazada)
    let deudaAplazada = Math.max(0, Number(cliente.saldo_aplazado));
    if (deudaAplazada > 0) {
        if (montoPago >= deudaAplazada) {
            abonoAtrasado = deudaAplazada;
            montoPago -= abonoAtrasado;
            cliente.saldo_aplazado = Number(cliente.saldo_aplazado) - abonoAtrasado;
        } else {
            abonoAtrasado = montoPago;
            cliente.saldo_aplazado = Number(cliente.saldo_aplazado) - abonoAtrasado;
            montoPago = 0;
        }
    }

    // 2. Pagar deuda corriente (mes actual)
    let deudaCorriente = Math.max(0, Number(cliente.saldo_actual));
    if (montoPago > 0 && deudaCorriente > 0) {
        if (montoPago >= deudaCorriente) {
            abonoCorriente = deudaCorriente;
            montoPago -= abonoCorriente;
            cliente.saldo_actual = Number(cliente.saldo_actual) - abonoCorriente;
        } else {
            abonoCorriente = montoPago;
            cliente.saldo_actual = Number(cliente.saldo_actual) - abonoCorriente;
            montoPago = 0;
        }
    }

    // 3. El dinero sobrante se va a la bolsa de SALDO A FAVOR
    if (montoPago > 0) {
        sobrante = montoPago;
        cliente.saldo_a_favor = Number(cliente.saldo_a_favor || 0) + sobrante;
    }

    if ((abonoCorriente > 0 || abonoAtrasado > 0 || sobrante > 0) && cliente.estado === "CORTADO") {
        cliente.estado = "ACTIVO"; 
    }

    // Lógica de confiabilidad
    if (data.motivo_retraso !== 'logistica' && data.motivo_retraso !== 'acuerdo') {
        const hoy = new Date();
        const diaActual = hoy.getDate();
        const diaPago = cliente.dia_pago;

        let diasRetraso = diaActual - diaPago;
        if (diasRetraso < 0 && diaActual <= 7) { 
            const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
            diasRetraso = diaActual + (ultimoDiaMesAnterior - diaPago);
        }

        const confiabilidadActual = cliente.confiabilidad ?? 100;

        if (diasRetraso >= 0 && diasRetraso <= 5) {
            cliente.confiabilidad = Math.min(100, confiabilidadActual + 2);
        } else if (diasRetraso === 6 || diasRetraso === 7) {
            cliente.confiabilidad = Math.max(0, confiabilidadActual - 5);
        }
    }

    let descBase = "Abono general";
    if (data.tipo_pago === 'LIQUIDACION') descBase = `Liquidación - ${data.mes_servicio || 'Saldo'}`;
    else if (data.mes_servicio) descBase = `Abono Mes: ${data.mes_servicio}`;

    if (abonoAtrasado > 0) descBase = `Recuperación de Adeudo ($${abonoAtrasado}) | ${descBase}`;
    if (sobrante > 0) descBase = `${descBase} | Quedan $${sobrante.toFixed(2)} guardados a favor`;
    if (data.descripcion && data.descripcion.trim() !== "") descBase = `${descBase} | Nota: ${data.descripcion.trim()}`;

    // Creamos UN SOLO registro de ingreso por el total de dinero físico recibido
    const pago = movimientoRepository.create({
        tipo: "ABONO",
        monto: Number(data.monto), 
        descripcion: descBase, 
        mes_servicio: data.mes_servicio || null,
        metodo_pago: data.metodo_pago || "EFECTIVO",
        referencia: data.referencia || null,
        cliente: cliente
    });

    await AppDataSource.transaction(async manager => {
        await manager.getRepository(MovimientoFinanciero).save(pago);
        await manager.getRepository(Cliente).save(cliente);
    });

    return { 
        mensaje: sobrante > 0 ? `Pago de $${data.monto} procesado. $${sobrante.toFixed(2)} a favor.` : "Pago registrado", 
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