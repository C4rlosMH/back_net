import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { CajaDistribucion } from "../entities/CajaDistribucion.js";

const clienteRepository = AppDataSource.getRepository(Cliente);
const cajaRepository = AppDataSource.getRepository(CajaDistribucion);

export const createClienteService = async (data) => {
    // 1. Si el cliente se va a conectar a una caja, validamos capacidad
    if (data.cajaId) {
        const caja = await cajaRepository.findOne({ 
            where: { id: data.cajaId },
            relations: ["clientes"] 
        });

        if (!caja) {
            throw new Error("La caja de distribución especificada no existe.");
        }

        // Contamos cuántos clientes tiene ya esa caja
        const ocupados = caja.clientes.length;

        if (ocupados >= caja.capacidad_total) {
            throw new Error(`La caja ${caja.nombre} está llena (${ocupados}/${caja.capacidad_total}). No se puede conectar más clientes.`);
        }
    }

    // 2. Si pasa la validación (o no tiene caja), creamos el cliente
    const nuevoCliente = clienteRepository.create(data);
    return await clienteRepository.save(nuevoCliente);
};

export const getClientesService = async () => {
    // Traemos los clientes junto con su plan y la caja a la que están conectados
    return await clienteRepository.find({
        relations: ["plan", "caja"], 
        order: { id: "DESC" }
    });
};