import { MercadoPagoConfig, Preference } from 'mercadopago';
import 'dotenv/config';

// Inicializamos la conexion con tu cuenta usando el token de tu .env
export const mpClient = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

export const generarLinkDePago = async (cliente, monto, concepto) => {
    try {
        const preference = new Preference(mpClient);

        const response = await preference.create({
            body: {
                items: [
                    {
                        id: "MENSUALIDAD",
                        title: concepto,
                        quantity: 1,
                        unit_price: Number(monto),
                        currency_id: "MXN",
                    }
                ],
                payer: {
                    name: cliente.nombre_completo,
                    // MercadoPago suele requerir un email valido. Si tu cliente no tiene, usamos uno generico.
                    email: cliente.email || "pagos@mirandanet.com", 
                },
                // AQUI ESTA LA MAGIA: Guardamos el ID de tu cliente de forma invisible
                external_reference: cliente.id.toString(), 
                
                // Le decimos a MercadoPago a donde enviar la notificacion cuando este pago se complete
                notification_url: `${process.env.URL_CLOUDFLARE}/api/webhooks/mercadopago/webhook`,
                
                // Opcional: A donde enviar al cliente despues de pagar
                back_urls: {
                    success: "https://mirandanet.com/exito", // Cambiaremos esto luego
                    failure: "https://mirandanet.com/fallo",
                    pending: "https://mirandanet.com/pendiente"
                },
                auto_return: "approved",
            }
        });

        // Retornamos la URL oficial de cobro que le enviaremos al cliente
        return response.init_point; 

    } catch (error) {
        console.error("[MercadoPago] Error al generar el link:", error.message);
        throw new Error("No se pudo generar el link de pago");
    }
};