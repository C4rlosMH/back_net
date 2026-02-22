import { Payment } from 'mercadopago';
import { mpClient, generarLinkDePago } from '../services/mercadopago.service.js';
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";

// --- IMPORTAMOS LOS SERVICIOS CENTRALES ---
import { registrarPagoService } from '../services/pago.service.js';
import { registrarLog } from '../services/log.service.js';

const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

const pagosEnProceso = new Set();

export const generarLinkCobro = async (req, res) => {
    try {
        const { id } = req.params;
        const { monto, concepto } = req.body; 

        if (!monto || !concepto) {
            return res.status(400).json({ message: "El monto y concepto son obligatorios" });
        }

        const cliente = await clienteRepo.findOne({ where: { id: parseInt(id) } });

        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

        const link = await generarLinkDePago(cliente, Number(monto), concepto);
        res.json({ url_pago: link });
    } catch (error) {
        console.error("[MercadoPago] Error al generar link:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const webhookMercadoPago = async (req, res) => {
    res.status(200).send("OK"); 

    try {
        const queryParams = req.query;

        if (queryParams.topic === 'payment' || queryParams.type === 'payment') {
            const paymentId = queryParams.id || queryParams['data.id'];
            
            if (paymentId) {
                const paymentIdStr = paymentId.toString();

                // 1. Candado en memoria
                if (pagosEnProceso.has(paymentIdStr)) return; 
                pagosEnProceso.add(paymentIdStr);

                try {
                    // 2. Candado en base de datos
                    const pagoExistente = await movimientoRepo.findOne({ 
                        where: { referencia: paymentIdStr } 
                    });

                    if (pagoExistente) return; 

                    const payment = new Payment(mpClient);
                    const paymentData = await payment.get({ id: paymentId });

                    if (paymentData.status === 'approved') {
                        const idCliente = parseInt(paymentData.external_reference);
                        const montoPagado = Number(paymentData.transaction_amount);

                        console.log(`\n[Webhook] Delegando pago de $${montoPagado} al servicio central...`);

                        // 3. DELEGAMOS AL SERVICIO CENTRAL DE PAGOS
                        // Esto arregla los KPIs, la Confiabilidad y el Saldo a Favor automaticamente
                        await registrarPagoService({
                            clienteId: idCliente,
                            monto: montoPagado,
                            monto_descuento: 0,
                            descripcion: `Pago via Mercado Pago (Folio: ${paymentIdStr})`,
                            metodo_pago: "MERCADOPAGO", // Se registrara en la columna de 'Banco' en el Dashboard
                            referencia: paymentIdStr
                        });

                        // 4. Registramos el evento en el log general del sistema
                        registrarLog(
                            "Sistema Webhook",
                            "PAGO_MERCADOPAGO",
                            `Mercado Pago acredito un pago automático de $${montoPagado} al cliente ID: ${idCliente}`,
                            "MovimientoFinanciero",
                            paymentIdStr
                        );
                        
                        console.log(`[Webhook] Operacion financiera sincronizada y completada.\n`);
                    }
                } finally {
                    setTimeout(() => pagosEnProceso.delete(paymentIdStr), 60000);
                }
            }
        }
    } catch (error) {
        console.error("[Webhook Error] Falla al procesar el pago:", error.message);
    }
};