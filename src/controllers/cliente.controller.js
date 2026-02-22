import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { Equipo } from "../entities/Equipo.js"; 
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { In } from "typeorm"; 
import { registrarLog } from "../services/log.service.js"; 
// --- IMPORTAMOS LOS SERVICIOS DE MIKROTIK ---
import { suspenderClientePPPoE, activarClientePPPoE } from "../services/mikrotik.service.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const equipoRepo = AppDataSource.getRepository(Equipo);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const getClientes = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const tab = req.query.tab || "TODOS";
        
        const sortKey = req.query.sortKey || "nombre_completo";
        const sortDir = req.query.sortDir ? req.query.sortDir.toUpperCase() : "ASC";
        const conexion = req.query.conexion || "TODAS"; 

        const queryBuilder = clienteRepo.createQueryBuilder("cliente")
            .leftJoinAndSelect("cliente.plan", "plan")
            .leftJoinAndSelect("cliente.caja", "caja")
            .leftJoinAndSelect("cliente.equipos", "equipos");

        if (tab !== "TODOS") {
            queryBuilder.andWhere("cliente.estado = :tab", { tab });
        }

        if (conexion === "FIBRA") {
            queryBuilder.andWhere("cliente.tipo_conexion = 'fibra' AND caja.id IS NOT NULL");
        } else if (conexion === "RADIO") {
            queryBuilder.andWhere("(cliente.tipo_conexion = 'radio' OR caja.id IS NULL)");
        }

        if (search) {
            queryBuilder.andWhere(
                "(cliente.nombre_completo LIKE :search OR cliente.ip_asignada LIKE :search)",
                { search: `%${search}%` }
            );
        }

        const validColumns = ["nombre_completo", "tipo_conexion", "ip_asignada", "estado", "saldo_actual"];
        const columnaReal = validColumns.includes(sortKey) ? `cliente.${sortKey}` : "cliente.nombre_completo";
        
        queryBuilder.orderBy(columnaReal, sortDir);

        if (sortKey === "tipo_conexion") {
            queryBuilder.addOrderBy("cliente.nombre_completo", "ASC");
        }

        const [clientes, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        res.json({
            clientes,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error("=== ERROR EN GET CLIENTES ===", error);
        res.status(500).json({ message: "Error al obtener clientes", error: error.message });
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

        // Si se crea un cliente e inicia inmediatamente como Suspendido/Cortado
        if (savedCliente.tipo_conexion === 'fibra' && savedCliente.usuario_pppoe) {
            if (savedCliente.estado === 'SUSPENDIDO' || savedCliente.estado === 'CORTADO') {
                await suspenderClientePPPoE(savedCliente.usuario_pppoe);
            }
        }

        registrarLog(
            req.usuario?.nombre || "Administrador", 
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
        const estadoAnterior = cliente.estado; // <--- GUARDAMOS EL ESTADO ANTES DEL CAMBIO

        clienteRepo.merge(cliente, {
            ...data,
            plan: planId ? { id: planId } : null,
            caja: cajaId ? { id: cajaId } : null
        });
        await clienteRepo.save(cliente);

        // --- LÓGICA DE CORTES MANUALES EN MIKROTIK ---
        if (cliente.tipo_conexion === 'fibra' && cliente.usuario_pppoe) {
            // Evaluamos si hubo un cambio real en el estado para no mandar comandos en vano
            if (estadoAnterior !== cliente.estado) {
                if (cliente.estado === 'SUSPENDIDO' || cliente.estado === 'CORTADO') {
                    console.log(`[Manual] Ejecutando corte en MikroTik para el usuario: ${cliente.usuario_pppoe}`);
                    await suspenderClientePPPoE(cliente.usuario_pppoe);
                } else if (cliente.estado === 'ACTIVO') {
                    console.log(`[Manual] Ejecutando reactivación en MikroTik para el usuario: ${cliente.usuario_pppoe}`);
                    await activarClientePPPoE(cliente.usuario_pppoe);
                }
            }
        }

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
        
        const cliente = await clienteRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["equipos"]
        });

        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        // --- OPCIONAL: Eliminar del router si borras el cliente (Descomentar si deseas) ---
        // if (cliente.tipo_conexion === 'fibra' && cliente.usuario_pppoe) {
        //    await suspenderClientePPPoE(cliente.usuario_pppoe);
        // }

        if (cliente.equipos && cliente.equipos.length > 0) {
            const equiposIds = cliente.equipos.map(e => e.id);
            await equipoRepo.update(
                { id: In(equiposIds) },
                { cliente: null, estado: "ALMACEN" }
            );
        }

        await movimientoRepo.delete({ cliente: { id: parseInt(id) } });
        await clienteRepo.delete({ id: parseInt(id) });
        
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