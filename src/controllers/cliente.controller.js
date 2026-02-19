import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { Equipo } from "../entities/Equipo.js"; 
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { In } from "typeorm"; 
import { registrarLog } from "../services/log.service.js"; // Importamos el servicio de logs

const clienteRepo = AppDataSource.getRepository(Cliente);
const equipoRepo = AppDataSource.getRepository(Equipo);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const getClientes = async (req, res) => {
    try {
        const clienteRepo = AppDataSource.getRepository(Cliente);
        
        // Obtenemos los parámetros de la URL (por defecto página 1, límite 10)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const tab = req.query.tab || "TODOS";

        // Construcción de la consulta con filtros básicos
        const queryBuilder = clienteRepo.createQueryBuilder("cliente")
            .leftJoinAndSelect("cliente.plan", "plan")
            .leftJoinAndSelect("cliente.caja", "caja")
            .leftJoinAndSelect("cliente.equipos", "equipos");

        // Filtro por Tab (Estado)
        if (tab !== "TODOS") {
            queryBuilder.andWhere("cliente.estado = :tab", { tab });
        }

        // Filtro por búsqueda (Nombre o IP)
        if (search) {
            queryBuilder.andWhere(
                "(cliente.nombre_completo LIKE :search OR cliente.ip_asignada LIKE :search)",
                { search: `%${search}%` }
            );
        }

        // Ejecutamos la consulta con paginación
        const [clientes, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .orderBy("cliente.nombre_completo", "ASC")
            .getManyAndCount();

        res.json({
            clientes,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener clientes" });
    }
};

export const createCliente = async (req, res) => {
    try {
        const { planId, equiposIds, cajaId, ...data } = req.body;

        const cliente = clienteRepo.create({
            ...data,
            plan: planId ? { id: planId } : null,
            caja: cajaId ? { id: cajaId } : null
        });

        const savedCliente = await clienteRepo.save(cliente);

        if (equiposIds && equiposIds.length > 0) {
            await equipoRepo.update(
                { id: In(equiposIds) }, 
                { cliente: savedCliente, estado: "INSTALADO" }
            );
        }

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.usuario?.nombre || "Administrador", // Puedes ajustarlo si tienes los datos del usuario logueado en req
            "CREAR_CLIENTE",
            `Se registro el nuevo cliente: ${savedCliente.nombre_completo}`,
            "Cliente",
            savedCliente.id
        );

        res.json(savedCliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { planId, equiposIds, cajaId, ...data } = req.body;

        const cliente = await clienteRepo.findOne({ 
            where: { id: parseInt(id) },
            relations: ["equipos"] 
        });

        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        const nombreAnterior = cliente.nombre_completo;

        // 1. Actualizar datos basicos
        clienteRepo.merge(cliente, {
            ...data,
            plan: planId ? { id: planId } : null,
            caja: cajaId ? { id: cajaId } : null
        });
        await clienteRepo.save(cliente);

        // 2. Gestion de Equipos (Si se envia una nueva lista)
        if (equiposIds) {
            if (cliente.equipos && cliente.equipos.length > 0) {
                const idsAnteriores = cliente.equipos.map(e => e.id);
                await equipoRepo.update(
                    { id: In(idsAnteriores) },
                    { cliente: null, estado: "ALMACEN" }
                );
            }

            if (equiposIds.length > 0) {
                await equipoRepo.update(
                    { id: In(equiposIds) },
                    { cliente: { id: parseInt(id) }, estado: "INSTALADO" }
                );
            }
        }

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.usuario?.nombre || "Administrador",
            "ACTUALIZAR_CLIENTE",
            `Se actualizo el perfil o estado del cliente: ${nombreAnterior}`,
            "Cliente",
            cliente.id
        );

        res.json(cliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const cliente = await clienteRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["plan", "equipos", "caja"]
        });
        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });
        res.json(cliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const deleteCliente = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Buscar al cliente para verificar que equipos tiene asignados
        const cliente = await clienteRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["equipos"]
        });

        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        // 2. Liberar los equipos (ponerlos en ALMACEN y desvincularlos del cliente)
        if (cliente.equipos && cliente.equipos.length > 0) {
            const equiposIds = cliente.equipos.map(e => e.id);
            await equipoRepo.update(
                { id: In(equiposIds) },
                { cliente: null, estado: "ALMACEN" }
            );
        }

        // 3. Eliminar los movimientos financieros (historial de pagos) de este cliente
        await movimientoRepo.delete({ cliente: { id: parseInt(id) } });

        // 4. Eliminar el cliente
        await clienteRepo.delete({ id: parseInt(id) });
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.usuario?.nombre || "Administrador",
            "ELIMINAR_CLIENTE",
            `Se elimino definitivamente al cliente: ${cliente.nombre_completo}`,
            "Cliente",
            parseInt(id)
        );

        return res.sendStatus(204);
    } catch (error) {
        console.error("Error al eliminar cliente:", error);
        return res.status(500).json({ message: error.message });
    }
};