import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { activarClientePPPoE } from "./mikrotik.service.js";

export const getPerfilClienteService = async (clienteId) => {
    const clienteRepo = AppDataSource.getRepository(Cliente);
    
    const cliente = await clienteRepo.findOne({
        where: { id: clienteId },
        relations: ["plan", "equipos"] // Traemos la info del plan y sus equipos instalados
    });

    if (!cliente) {
        throw new Error("Cliente no encontrado.");
    }

    // Por seguridad, nos aseguramos de no enviar la contraseña bajo ninguna circunstancia
    delete cliente.password;

    return cliente;
};

export const getHistorialPagosService = async (clienteId) => {
    const movRepo = AppDataSource.getRepository(MovimientoFinanciero);
    
    // Buscamos los movimientos del cliente que sean ingresos (pagos)
    const historial = await movRepo.find({
        where: { 
            cliente: { id: clienteId },
            tipo: "INGRESO" 
        },
        order: { 
            fecha: "DESC" // Ordenamos para que el pago mas reciente salga primero
        },
        take: 30 // Limitamos a los ultimos 30 pagos para no saturar la red
    });

    return historial;
};

export const aplazarPagoService = async (clienteId) => {
    const clienteRepo = AppDataSource.getRepository(Cliente);
    
    // Traemos al cliente asegurandonos de tener su usuario_pppoe para mandarlo a Mikrotik
    const cliente = await clienteRepo.findOne({ 
        where: { id: clienteId },
        select: ["id", "saldo_actual", "saldo_aplazado", "estado", "usuario_pppoe"] 
    });

    if (!cliente) throw new Error("Cliente no encontrado.");

    if (Number(cliente.saldo_actual) <= 0) {
        throw new Error("No tienes un saldo actual pendiente para aplazar.");
    }

    if (Number(cliente.saldo_aplazado) > 0) {
        throw new Error("Ya tienes un saldo aplazado. Debes liquidarlo antes de solicitar otro aplazamiento.");
    }

    // Ejecutamos la logica contable (El salto de mes)
    cliente.saldo_aplazado = cliente.saldo_actual;
    cliente.saldo_actual = 0;
    
    // Logica de reactivacion automatica
    if (cliente.estado === "SUSPENDIDO") {
        cliente.estado = "ACTIVO"; // Lo marcamos como activo en la base de datos
        
        // Llamamos a tu script para levantar el servicio en Mikrotik
        if (cliente.usuario_pppoe) {
            const reactivado = await activarClientePPPoE(cliente.usuario_pppoe);
            if (!reactivado) {
                // Solo dejamos un aviso en consola por si falla la conexion al router, 
                // pero no le marcamos error al cliente para no asustarlo.
                console.warn(`[MikroTik] No se pudo reactivar automaticamente al usuario: ${cliente.usuario_pppoe}`);
            }
        }
    }

    await clienteRepo.save(cliente);

    return { 
        message: "Tu pago ha sido aplazado exitosamente. Si tu servicio estaba suspendido, se reactivara en unos instantes.",
        nuevo_saldo_actual: cliente.saldo_actual,
        nuevo_saldo_aplazado: cliente.saldo_aplazado
    };
}