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
    
    // 1. Generamos la descripción base según el tipo de pago
    let descBase = "Abono general";
    if (data.tipo_pago === 'LIQUIDACION') descBase = `Liquidación - ${data.mes_servicio || 'Saldo'}`;
    else if (data.tipo_pago === 'APLAZADO') descBase = `Promesa Pago - ${data.mes_servicio}`;
    else if (data.mes_servicio) descBase = `Abono Mes: ${data.mes_servicio}`;

    // 2. Si recibimos una nota personalizada desde el frontend, se la concatenamos
    if (data.descripcion && data.descripcion.trim() !== "") {
        descBase = `${descBase} | Nota: ${data.descripcion.trim()}`;
    }

    // 3. Creamos el movimiento con la descripción combinada
    const pago = movimientoRepository.create({
        tipo: "ABONO",
        monto: montoPago,
        descripcion: descBase, // Usamos la variable combinada
        mes_servicio: data.mes_servicio || null,
        metodo_pago: data.metodo_pago || "EFECTIVO",
        cliente: cliente
    });

    if (montoPago > 0) {
        cliente.saldo_actual = Number(cliente.saldo_actual) - montoPago;
        if (cliente.saldo_actual <= 0 && cliente.estado === "CORTADO") cliente.estado = "ACTIVO"; 
    }

    await AppDataSource.transaction(async manager => {
        await manager.save(pago);
        await manager.save(cliente);
    });

    return { mensaje: "Pago registrado", saldo_restante: cliente.saldo_actual };
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