import { AppDataSource } from "../config/data-source.js";
import { Insumo } from "../entities/Insumo.js";
import { registrarLog } from "../services/log.service.js";
import { Like } from "typeorm"; 

const insumoRepository = AppDataSource.getRepository(Insumo);

// Función para quitar acentos y pasar a minúsculas automáticamente
const normalizeStr = (str) => {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Obtener todo el inventario
export const obtenerInsumos = async (req, res) => {
    try {
        if (!req.query.page) {
            const todos = await insumoRepository.find({ order: { nombre: "ASC" } });
            return res.json(todos);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        
        const skip = (page - 1) * limit;

        let whereConditions = {};
        if (search) {
            whereConditions.nombre = Like(`%${search}%`);
        }

        const [insumosPaginados, total] = await insumoRepository.findAndCount({
            where: whereConditions,
            order: { nombre: "ASC" },
            skip: skip,
            take: limit
        });

        const todosLosInsumos = await insumoRepository.find({ order: { nombre: "ASC" } });
        
        // CÁLCULOS INTELIGENTES Y A PRUEBA DE ERRORES
        const kpiFibra = todosLosInsumos
            .filter(i => normalizeStr(i.nombre).includes('fibra') && i.unidad_medida === 'Metros')
            .reduce((sum, i) => sum + Number(i.cantidad), 0);
            
        const kpiUTP = todosLosInsumos
            .filter(i => (normalizeStr(i.nombre).includes('utp') || normalizeStr(i.nombre).includes('cat')) && i.unidad_medida === 'Metros')
            .reduce((sum, i) => sum + Number(i.cantidad), 0);
            
        const kpiConectoresRJ45 = todosLosInsumos
            .filter(i => {
                const n = normalizeStr(i.nombre);
                return (n.includes('rj45') || (n.includes('conector') && !n.includes('fibra') && !n.includes('fast'))) && i.unidad_medida === 'Piezas';
            }).reduce((sum, i) => sum + Number(i.cantidad), 0);

        const kpiConectoresFibra = todosLosInsumos
            .filter(i => {
                const n = normalizeStr(i.nombre);
                return (n.includes('fast') || n.includes('mecanico') || (n.includes('conector') && n.includes('fibra'))) && i.unidad_medida === 'Piezas';
            }).reduce((sum, i) => sum + Number(i.cantidad), 0);

        res.json({
            insumos: insumosPaginados,
            total: total,
            kpis: { 
                fibra: kpiFibra, 
                utp: kpiUTP, 
                conectoresRJ45: kpiConectoresRJ45,
                conectoresFibra: kpiConectoresFibra
            },
            catalogo: todosLosInsumos 
        });

    } catch (error) {
        console.error("Error al obtener insumos:", error);
        res.status(500).json({ message: "Error interno al obtener insumos" });
    }
};

// Registrar un nuevo tipo de material
export const crearInsumo = async (req, res) => {
    try {
        const { nombre, cantidad, unidad_medida } = req.body;

        if (!nombre || cantidad === undefined || !unidad_medida) {
            return res.status(400).json({ message: "Nombre, cantidad y unidad de medida son obligatorios" });
        }

        const nuevoInsumo = insumoRepository.create({
            nombre,
            cantidad,
            unidad_medida
        });

        const resultado = await insumoRepository.save(nuevoInsumo);

        // --- REGISTRO DE AUDITORÍA ---
        registrarLog(
            req.user?.username || "Administrador",
            "CREAR_INSUMO",
            `Se registró un nuevo insumo al catálogo: "${nombre}" (Stock inicial: ${cantidad} ${unidad_medida})`,
            "Insumo",
            resultado.id
        );

        res.status(201).json(resultado);
    } catch (error) {
        console.error("Error al crear insumo:", error);
        res.status(500).json({ message: "Error interno al guardar el insumo" });
    }
};

// Actualizar la cantidad de un insumo (sumar o restar stock)
export const actualizarCantidad = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body; // Cantidad total final

        const insumo = await insumoRepository.findOneBy({ id: parseInt(id) });

        if (!insumo) {
            return res.status(404).json({ message: "Insumo no encontrado" });
        }

        const stockAnterior = insumo.cantidad;
        insumo.cantidad = cantidad;
        const resultado = await insumoRepository.save(insumo);

        // --- REGISTRO DE AUDITORÍA (Muestra el cambio exacto) ---
        registrarLog(
            req.user?.username || "Administrador",
            "EDITAR_INSUMO",
            `Se actualizó el stock de "${insumo.nombre}". Modificación: de ${stockAnterior} a ${cantidad} ${insumo.unidad_medida}`,
            "Insumo",
            resultado.id
        );
        
        res.json(resultado);
    } catch (error) {
        console.error("Error al actualizar insumo:", error);
        res.status(500).json({ message: "Error interno al actualizar el insumo" });
    }
};

// Eliminar un material del catálogo
export const eliminarInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const insumo = await insumoRepository.findOneBy({ id: parseInt(id) });

        if (!insumo) {
            return res.status(404).json({ message: "Insumo no encontrado" });
        }

        const nombreInsumo = insumo.nombre;
        const idInsumo = insumo.id;

        await insumoRepository.remove(insumo);

        // --- REGISTRO DE AUDITORÍA ---
        registrarLog(
            req.user?.username || "Administrador",
            "ELIMINAR_INSUMO",
            `Se eliminó permanentemente el insumo del catálogo: "${nombreInsumo}"`,
            "Insumo",
            idInsumo
        );

        res.json({ message: "Insumo eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar insumo:", error);
        res.status(500).json({ message: "Error interno al eliminar el insumo" });
    }
};