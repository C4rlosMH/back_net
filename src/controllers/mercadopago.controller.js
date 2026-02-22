import { Payment } from 'mercadopago';
import { mpClient, generarLinkDePago } from '../services/mercadopago.service.js';
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { activarClientePPPoE } from "../services/mikrotik.service.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

// --- CANDADO EN MEMORIA ANTI-RAFAGAS ---
const pagosEnProceso = new Set();

export const generarLinkPrueba = async (req, res) => {
    try {
        const { id } = req.params;
        const cliente = await clienteRepo.findOne({ where: { id: parseInt(id) } });

        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        const link = await generarLinkDePago(cliente, 350, "Pago de Mensualidad - Miranda Net");

        res.json({ url_pago: link });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const generarLinkCobro = async (req, res) => {
    try {
        const { id } = req.params;
        const { monto, concepto } = req.body; // Ahora recibimos estos datos desde el frontend

        // Validamos que nos envien la informacion necesaria
        if (!monto || !concepto) {
            return res.status(400).json({ message: "El monto y concepto son obligatorios" });
        }

        const cliente = await clienteRepo.findOne({ where: { id: parseInt(id) } });

        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

        // Usamos las variables dinamicas en lugar de los 350 fijos
        const { generarLinkDePago } = await import("../services/mercadopago.service.js");
        const link = await generarLinkDePago(cliente, Number(monto), concepto);

        res.json({ url_pago: link });
    } catch (error) {
        console.error("[MercadoPago] Error al generar link:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const webhookMercadoPago = async (req, res) => {
    // 1. Regla de oro: Responder 200 OK inmediatamente
    res.status(200).send("OK"); 

    try {
        const queryParams = req.query;

        // Filtramos para procesar solo las alertas de tipo "payment"
        if (queryParams.topic === 'payment' || queryParams.type === 'payment') {
            
            const paymentId = queryParams.id || queryParams['data.id'];
            
            if (paymentId) {
                const paymentIdStr = paymentId.toString();

                // --- 1. DEFENSA INSTANTANEA (Memoria RAM) ---
                if (pagosEnProceso.has(paymentIdStr)) {
                    // Si el candado esta activo, abortamos este hilo silenciosamente
                    return; 
                }
                // Ponemos el candado para este ID de pago
                pagosEnProceso.add(paymentIdStr);

                try {
                    // --- 2. DEFENSA EN BASE DE DATOS (Doble validacion) ---
                    const pagoExistente = await movimientoRepo.findOne({ 
                        where: { referencia: paymentIdStr, metodo_pago: 'mercadopago' } 
                    });

                    if (pagoExistente) {
                        return; // Terminamos la ejecucion si ya existe en historial
                    }

                    // Consultamos los detalles del pago en Mercado Pago
                    const payment = new Payment(mpClient);
                    const paymentData = await payment.get({ id: paymentId });

                    // Verificamos que el pago este aprobado
                    if (paymentData.status === 'approved') {
                        
                        const idCliente = parseInt(paymentData.external_reference);
                        const montoPagado = Number(paymentData.transaction_amount);

                        console.log(`\n[PAGO APROBADO] Recibimos $${montoPagado} del cliente ID: ${idCliente}`);

                        // Buscamos al cliente en la base de datos
                        const cliente = await clienteRepo.findOne({ where: { id: idCliente } });

                        if (cliente) {
                            // --- 3. MATEMATICAS FINANCIERAS ---
                            let deudaActual = Number(cliente.saldo_actual);
                            deudaActual -= montoPagado;
                            
                            if (deudaActual < 0) {
                                const sobrante = Math.abs(deudaActual);
                                cliente.saldo_a_favor = Number(cliente.saldo_a_favor) + sobrante;
                                cliente.saldo_actual = 0;
                                console.log(`[Finanzas] Deuda saldada. Se agregaron $${sobrante} al saldo a favor.`);
                            } else {
                                cliente.saldo_actual = deudaActual;
                                console.log(`[Finanzas] Deuda actualizada. Nuevo saldo_actual: $${cliente.saldo_actual}`);
                            }

                            // --- 4. LOGICA DE REACTIVACION (MIKROTIK) ---
                            if ((cliente.estado === 'SUSPENDIDO' || cliente.estado === 'CORTADO') && cliente.saldo_actual <= 0) {
                                console.log(`[Sistema] El cliente ${cliente.nombre_completo} cubrio su deuda. Iniciando reactivacion en RouterOS...`);
                                
                                const reactivado = await activarClientePPPoE(cliente.usuario_pppoe);

                                if (reactivado) {
                                    cliente.estado = 'ACTIVO';
                                    console.log(`[MikroTik] Cliente reactivado exitosamente. Internet restaurado.`);
                                } else {
                                    console.error(`[MikroTik] Error de comunicacion al intentar reactivar el servicio.`);
                                }
                            }

                            // --- 5. GUARDAR CLIENTE ---
                            await clienteRepo.save(cliente);
                            console.log(`[Base de Datos] Perfil del cliente actualizado correctamente.`);

                            // --- 6. CREAR HISTORIAL (MOVIMIENTO FINANCIERO) ---
                            const nuevoMovimiento = movimientoRepo.create({
                                tipo: "pago_mensualidad", 
                                monto: montoPagado,
                                descripcion: `Pago automatico via Mercado Pago (Folio: ${paymentIdStr})`,
                                metodo_pago: "mercadopago",
                                referencia: paymentIdStr,
                                usuario_responsable: "SISTEMA",
                                cliente: cliente
                            });
                            
                            await movimientoRepo.save(nuevoMovimiento);
                            console.log(`[Finanzas] Movimiento financiero registrado en el historial.\n`);
                        }
                    }
                } finally {
                    // --- 7. LIBERAR MEMORIA ---
                    // Quitamos el candado de la RAM despues de 1 minuto
                    setTimeout(() => pagosEnProceso.delete(paymentIdStr), 60000);
                }
            }
        }
    } catch (error) {
        console.error("[Webhook Error] Falla al procesar el pago:", error.message);
    }
};