import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";

const clienteRepository = AppDataSource.getRepository(Cliente);
const movimientoRepository = AppDataSource.getRepository(MovimientoFinanciero);

// 1. GENERAR CARGO (Simula el día de corte)
export const generarCargoMensualService = async (clienteId) => {
    // console.log("1. Buscando cliente ID:", clienteId);
    
    const cliente = await clienteRepository.findOne({ 
        where: { id: clienteId },
        relations: ["plan"]
    });

    if (!cliente) throw new Error("Cliente no encontrado");
    
    // Validación extra por si el plan no cargó
    if (!cliente.plan) {
        throw new Error("El cliente no tiene un plan asignado.");
    }

    const costoPlan = Number(cliente.plan.precio_mensual);

    // Crear el registro del movimiento
    const movimiento = movimientoRepository.create({
        tipo: "CARGO_MENSUAL",
        monto: costoPlan,
        descripcion: `Mensualidad del Plan ${cliente.plan.nombre}`,
        cliente: cliente
    });

    // Actualizar la deuda del cliente
    cliente.saldo_actual = Number(cliente.saldo_actual) + costoPlan;

    // --- CORRECCIÓN AQUÍ ---
    await AppDataSource.manager.transaction(async (manager) => {
        // Debemos especificar la Entidad (MovimientoFinanciero, Cliente) porque usamos Schemas
        await manager.save(MovimientoFinanciero, movimiento);
        await manager.save(Cliente, cliente);
    });

    return { 
        mensaje: "Cargo aplicado correctamente", 
        nuevo_saldo: cliente.saldo_actual 
    };
};

// 2. REGISTRAR PAGO (Abono)
export const registrarPagoService = async (data) => {
    // data = { clienteId, monto, metodo_pago, tipo_pago, mes_servicio, referencia }
    
    const cliente = await clienteRepository.findOne({ where: { id: data.clienteId } });
    if (!cliente) throw new Error("Cliente no encontrado");

    const montoPago = Number(data.monto);

    // 1. Generar descripción automática basada en el tipo
    let desc = data.referencia || "Abono general";
    
    if (data.tipo_pago === 'LIQUIDACION') {
        desc = `Liquidación Total - ${data.mes_servicio || 'Saldo Pendiente'}`;
    } else if (data.tipo_pago === 'APLAZADO') {
        desc = `Promesa de Pago - ${data.mes_servicio}`;
    } else if (data.mes_servicio) {
        desc = `Abono Mes: ${data.mes_servicio}`;
    }

    // 2. Crear registro
    const pago = movimientoRepository.create({
        tipo: "ABONO",
        monto: montoPago,
        descripcion: desc,
        mes_servicio: data.mes_servicio || null,
        metodo_pago: data.metodo_pago || "EFECTIVO",
        cliente: cliente
    });

    // 3. Actualizar saldo (Solo si hay dinero real, no promesas)
    if (montoPago > 0) {
        cliente.saldo_actual = Number(cliente.saldo_actual) - montoPago;
        // Reactivación automática si paga todo y estaba cortado
        if (cliente.saldo_actual <= 0 && cliente.estado === "CORTADO") {
            cliente.estado = "ACTIVO"; 
        }
    }

    await AppDataSource.manager.transaction(async (manager) => {
        await manager.save(MovimientoFinanciero, pago);
        await manager.save(Cliente, cliente);
    });

    return { mensaje: "Pago registrado exitosamente", saldo_restante: cliente.saldo_actual };
};

// 3. VER ESTADO DE CUENTA
export const getHistorialPagosService = async (clienteId) => {
    const cliente = await clienteRepository.findOne({ where: { id: clienteId } });
    if (!cliente) throw new Error("Cliente no encontrado");

    const movimientos = await movimientoRepository.find({
        where: { cliente: { id: clienteId } },
        order: { fecha: "DESC" } 
    });

    return {
        cliente: cliente.nombre_completo,
        saldo_actual: cliente.saldo_actual,
        historial: movimientos
    };
};

export const getMovimientosGlobalesService = async () => {
    return await movimientoRepository.find({
        relations: ["cliente"], // Trae los datos del cliente (nombre, etc.)
        order: { fecha: "DESC" },
        take: 100 // Limita a los últimos 100 para no saturar
    });
};