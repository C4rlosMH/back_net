import { AppDataSource } from "../config/data-source.js";
import { Equipo } from "../entities/Equipo.js";
import { Cliente } from "../entities/Cliente.js";
import { In } from "typeorm"; // Necesario para buscar varios IDs a la vez

const equipoRepository = AppDataSource.getRepository(Equipo);
const clienteRepository = AppDataSource.getRepository(Cliente);

export const crearEquipoService = async (data) => {
    // Validar que la MAC no exista (aunque la BD lo hace, es bueno prever)
    const existe = await equipoRepository.findOne({ where: { mac_address: data.mac_address } });
    if (existe) throw new Error(`La MAC Address ${data.mac_address} ya está registrada.`);

    const nuevoEquipo = equipoRepository.create({
        ...data,
        estado: "ALMACEN" // Siempre nace en almacén
    });
    return await equipoRepository.save(nuevoEquipo);
};

export const asignarEquiposService = async (clienteId, equiposIds) => {
    // equiposIds espera ser un array, ej: [1, 5] (ID de la antena y del router)

    // 1. Verificar Cliente
    const cliente = await clienteRepository.findOne({ 
        where: { id: clienteId },
        relations: ["equipos"] // Traemos lo que ya tiene instalado
    });
    if (!cliente) throw new Error("Cliente no encontrado");

    // 2. Buscar los equipos que queremos asignar
    const equiposAInstalar = await equipoRepository.findBy({
        id: In(equiposIds)
    });

    if (equiposAInstalar.length !== equiposIds.length) {
        throw new Error("Uno o más equipos no existen en la base de datos.");
    }

    // 3. Validar estado y disponibilidad
    for (const equipo of equiposAInstalar) {
        if (equipo.estado !== "ALMACEN") {
            throw new Error(`El equipo ${equipo.modelo} (${equipo.mac_address}) no está en ALMACEN. Estado actual: ${equipo.estado}`);
        }
    }

    // --- REGLAS DE NEGOCIO (Antena vs Modem) ---
    
    // Identificar qué tipos estamos instalando
    const tieneAntenaNueva = equiposAInstalar.some(e => e.tipo === "ANTENA");
    const tieneRouterNuevo = equiposAInstalar.some(e => e.tipo === "ROUTER");
    
    // Verificar qué tiene el cliente YA instalado
    const clienteTieneRouter = cliente.equipos.some(e => e.tipo === "ROUTER");

    // Regla: Si pongo Antena, debo poner Router (o ya tener uno)
    if (tieneAntenaNueva) {
        if (!tieneRouterNuevo && !clienteTieneRouter) {
            throw new Error("REGLA DE INSTALACIÓN: Si asignas una ANTENA, el cliente debe tener un ROUTER asignado (nuevo o existente).");
        }
    }

    // Regla implícita: Si es MODEM, funciona solo (no lanzamos error)

    // 4. Si pasa las validaciones, procedemos a asignar
    for (const equipo of equiposAInstalar) {
        equipo.cliente = cliente;
        equipo.estado = "INSTALADO";
        await equipoRepository.save(equipo);
    }

    return { message: "Equipos asignados correctamente", total: equiposAInstalar.length };
};

export const getInventarioService = async (filtroEstado) => {
    // Si mandan filtro (ej: ?estado=ALMACEN), filtramos. Si no, todo.
    const where = filtroEstado ? { estado: filtroEstado } : {};
    return await equipoRepository.find({ 
        where,
        relations: ["cliente"] // Para ver quién lo tiene si está instalado
    });
};

export const deleteEquipoService = async (id) => {
    const result = await equipoRepository.delete({ id: parseInt(id) });
    if (result.affected === 0) throw new Error("Equipo no encontrado");
    return true;
};