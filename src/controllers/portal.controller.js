import { getPerfilClienteService, getHistorialPagosService, aplazarPagoService } from "../services/portal.service.js";
import { generarLinkDePago } from "../services/mercadopago.service.js";

export const getPerfilCliente = async (req, res) => {
    try {
        // El id viene inyectado de forma segura desde el JWT gracias al middleware checkAuth
        const { id } = req.user; 
        
        const perfil = await getPerfilClienteService(id);
        
        res.json(perfil);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// NUEVA FUNCIÓN: Generar pago seguro para el cliente
export const generarPagoPortal = async (req, res) => {
    try {
        const { id } = req.user; 
        // El frontend nos dirá qué opción eligió el cliente
        const { tipo_pago, monto_personalizado } = req.body; 
        
        const cliente = await getPerfilClienteService(id);
        const deudaTotal = Number(cliente.saldo_actual) + Number(cliente.deuda_historica) - Number(cliente.saldo_a_favor);

        let montoAPagar = 0;
        let concepto = "";

        // Evaluamos la opción seleccionada por el cliente
        switch (tipo_pago) {
            case "DEUDA_TOTAL":
                if (deudaTotal <= 0) {
                    return res.status(400).json({ message: "No tienes deuda pendiente." });
                }
                montoAPagar = deudaTotal;
                concepto = `Pago de Deuda Total - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            case "MENSUALIDAD":
                // Pagar el mes por adelantado o su tarifa base si no tiene deuda acumulada
                if (!cliente.plan) {
                    return res.status(400).json({ message: "No tienes un plan asignado." });
                }
                montoAPagar = Number(cliente.plan.precio_mensual);
                concepto = `Pago de Mensualidad (${cliente.plan.nombre}) - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            case "OTRO_MONTO":
                // El cliente decide cuánto abonar
                if (!monto_personalizado || Number(monto_personalizado) < 20) {
                    return res.status(400).json({ message: "El monto minimo para abonar es de $20.00" });
                }
                montoAPagar = Number(monto_personalizado);
                concepto = `Abono a cuenta - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            default:
                return res.status(400).json({ message: "Tipo de pago no valido." });
        }

        // Generamos el link con TU servicio de Mercado Pago usando el monto calculado
        const url_pago = await generarLinkDePago(cliente, montoAPagar, concepto);

        // Devolvemos la URL al frontend para que redireccione al cliente
        res.json({ url_pago, monto_a_pagar: montoAPagar });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getHistorialPagos = async (req, res) => {
    try {
        const { id } = req.user; 
        
        const historial = await getHistorialPagosService(id);
        
        // Devolvemos el arreglo de pagos (puede estar vacio si es un cliente nuevo)
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const aplazarPagoPortal = async (req, res) => {
    try {
        const { id, numero_suscriptor } = req.user; 

        const resultado = await aplazarPagoService(id);

        // Dejamos evidencia en el panel de auditoria
        registrarLogCliente(
            numero_suscriptor,
            "APLAZAMIENTO_PAGO",
            `El cliente utilizo la funcion de aplazar su mensualidad.`,
            id
        );

        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};