import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
// --- IMPORTAMOS EL SERVICIO DE MIKROTIK ---
import { activarClientePPPoE } from "./mikrotik.service.js";

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

    // --- LOGICA DE AUTO-PAGO CON SALDO A FAVOR ---
    let saldoFavor = Number(cliente.saldo_a_favor || 0);
    if (saldoFavor > 0) {
        const cobroAutomatico = Math.min(cliente.saldo_actual, saldoFavor);
        
        cliente.saldo_a_favor = saldoFavor - cobroAutomatico;
        cliente.saldo_actual = cliente.saldo_actual - cobroAutomatico;

        const movAutoCobro = movimientoRepository.create({
            tipo: "ABONO",
            monto: cobroAutomatico,
            descripcion: "Auto-pago descontado del Saldo a Favor",
            metodo_pago: "SISTEMA",
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

    // --- LOGICA DE APLAZAMIENTO (PRORROGA MANUAL) ---
    if (data.tipo_pago === 'APLAZADO') {
        cliente.saldo_actual = Number(cliente.saldo_actual) - montoPago;
        if (cliente.saldo_actual < 0) cliente.saldo_actual = 0; 
        
        cliente.saldo_aplazado = Number(cliente.saldo_aplazado) + montoPago;

        if (cliente.estado === "CORTADO" || cliente.estado === "SUSPENDIDO") {
            cliente.estado = "ACTIVO";
            
            // --- REACTIVACIÓN EN MIKROTIK POR PRÓRROGA ---
            if (cliente.tipo_conexion === 'fibra' && cliente.usuario_pppoe) {
                console.log(`[Pagos] Ejecutando reactivación en MikroTik (Prórroga) para: ${cliente.usuario_pppoe}`);
                await activarClientePPPoE(cliente.usuario_pppoe);
            }
        }

        const aplazamiento = movimientoRepository.create({
            tipo: "APLAZAMIENTO",
            monto: montoPago,
            descripcion: data.descripcion ? `Prorroga/Aplazamiento | ${data.descripcion}` : "Deuda movida a meses posteriores",
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

    // --- LOGICA NORMAL DE PAGOS EN CASCADA ---
    let montoEfectivo = Number(data.monto || 0);
    let montoDescuento = Number(data.monto_descuento || 0);
    
    montoPago = montoEfectivo + montoDescuento;

    if (montoPago <= 0) throw new Error("El monto total de la operacion debe ser mayor a 0");

    let abonoCorriente = 0;
    let abonoAplazado = 0;
    let abonoHistorico = 0;
    let sobrante = 0;

    // 1. Pagar deuda corriente
    let deudaCorriente = Math.max(0, Number(cliente.saldo_actual));
    if (montoPago > 0 && deudaCorriente > 0) {
        if (montoPago >= deudaCorriente) {
            abonoCorriente = deudaCorriente;
            montoPago -= abonoCorriente;
            cliente.saldo_actual = 0;
        } else {
            abonoCorriente = montoPago;
            cliente.saldo_actual = Number(cliente.saldo_actual) - abonoCorriente;
            montoPago = 0;
        }
    }

    // 2. Pagar deuda aplazada
    let deudaAplazada = Math.max(0, Number(cliente.saldo_aplazado));
    if (montoPago > 0 && deudaAplazada > 0) {
        if (montoPago >= deudaAplazada) {
            abonoAplazado = deudaAplazada;
            montoPago -= abonoAplazado;
            cliente.saldo_aplazado = 0;
        } else {
            abonoAplazado = montoPago;
            cliente.saldo_aplazado = Number(cliente.saldo_aplazado) - abonoAplazado;
            montoPago = 0;
        }
    }

    // 3. Pagar DEUDA HISTORICA
    let deudaHistorica = Math.max(0, Number(cliente.deuda_historica || 0));
    if (montoPago > 0 && deudaHistorica > 0) {
        if (montoPago >= deudaHistorica) {
            abonoHistorico = deudaHistorica;
            montoPago -= abonoHistorico;
            cliente.deuda_historica = 0;
        } else {
            abonoHistorico = montoPago;
            cliente.deuda_historica = Number(cliente.deuda_historica) - abonoHistorico;
            montoPago = 0;
        }
    }

    // 4. El dinero sobrante se va a la bolsa de SALDO A FAVOR
    if (montoPago > 0) {
        sobrante = montoPago;
        cliente.saldo_a_favor = Number(cliente.saldo_a_favor || 0) + sobrante;
    }

    // Reactivar al cliente
    if ((abonoCorriente > 0 || abonoAplazado > 0 || abonoHistorico > 0 || sobrante > 0) && (cliente.estado === "CORTADO" || cliente.estado === "SUSPENDIDO")) {
        cliente.estado = "ACTIVO"; 
        
        // --- REACTIVACIÓN EN MIKROTIK POR PAGO ---
        if (cliente.tipo_conexion === 'fibra' && cliente.usuario_pppoe) {
            console.log(`[Pagos] Ejecutando reactivación en MikroTik (Abono Recibido) para: ${cliente.usuario_pppoe}`);
            await activarClientePPPoE(cliente.usuario_pppoe);
        }
    }

    // Logica de Confiabilidad
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

    // Construir la descripcion del ticket dinamicamente
    let descBase = "Abono general";
    if (data.tipo_pago === 'LIQUIDACION') descBase = `Liquidacion - ${data.mes_servicio || 'Saldo'}`;
    else if (data.mes_servicio) descBase = `Abono Mes: ${data.mes_servicio}`;

    if (montoDescuento > 0) {
        if (sobrante > 0) {
            descBase = `Descuento por deuda (Saldo a favor generado) | ${descBase}`;
        } else {
            descBase = `Se salda deuda con el cliente | ${descBase}`;
        }
    }

    if (abonoCorriente > 0) descBase = `Mes Corriente ($${abonoCorriente}) | ${descBase}`;
    if (abonoAplazado > 0) descBase = `Abono Prorroga ($${abonoAplazado}) | ${descBase}`;
    if (abonoHistorico > 0) descBase = `Abono a Deuda Historica ($${abonoHistorico}) | ${descBase}`;
    if (sobrante > 0) descBase = `${descBase} | Quedan $${sobrante.toFixed(2)} a favor`;
    if (data.descripcion && data.descripcion.trim() !== "") descBase = `${descBase} | Nota: ${data.descripcion.trim()}`;

    const metodoFinal = (montoEfectivo === 0 && montoDescuento > 0) ? "SISTEMA" : (data.metodo_pago || "EFECTIVO");

    const pago = movimientoRepository.create({
        tipo: "ABONO",
        monto: montoEfectivo + montoDescuento, 
        descripcion: descBase, 
        mes_servicio: data.mes_servicio || null,
        metodo_pago: metodoFinal,
        referencia: data.referencia || null,
        cliente: cliente
    });

    await AppDataSource.transaction(async manager => {
        await manager.getRepository(MovimientoFinanciero).save(pago);
        await manager.getRepository(Cliente).save(cliente);
    });

    return { 
        mensaje: sobrante > 0 ? `Operacion procesada. $${sobrante.toFixed(2)} a favor.` : "Operacion registrada exitosamente", 
        saldo_restante: cliente.saldo_actual,
        deuda_historica_restante: cliente.deuda_historica, 
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