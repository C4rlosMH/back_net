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
    // data = { clienteId, monto, metodo_pago, referencia }
    
    const cliente = await clienteRepository.findOne({ where: { id: data.clienteId } });
    if (!cliente) throw new Error("Cliente no encontrado");

    const montoPago = Number(data.monto);

    // Crear registro del pago
    const pago = movimientoRepository.create({
        tipo: "ABONO",
        monto: montoPago,
        descripcion: data.referencia || "Pago de servicio",
        metodo_pago: data.metodo_pago,
        cliente: cliente
    });

    // Actualizar saldo
    cliente.saldo_actual = Number(cliente.saldo_actual) - montoPago;

    if (cliente.saldo_actual <= 0 && cliente.estado === "CORTADO") {
        cliente.estado = "ACTIVO"; 
    }

    // --- CORRECCIÓN AQUÍ ---
    await AppDataSource.manager.transaction(async (manager) => {
        await manager.save(MovimientoFinanciero, pago);
        await manager.save(Cliente, cliente);
    });

    return {
        mensaje: "Pago registrado exitosamente",
        pago_aplicado: montoPago,
        saldo_restante: cliente.saldo_actual 
    };
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