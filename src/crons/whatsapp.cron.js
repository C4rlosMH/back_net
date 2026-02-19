import cron from "node-cron";
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { SystemLog } from "../entities/SystemLog.js";
import { enviarNotificacion } from "../services/whatsapp.service.js"; 

const clienteRepo = AppDataSource.getRepository(Cliente);
const logRepo = AppDataSource.getRepository(SystemLog);

export const iniciarCronWhatsApp = () => {
    // Se ejecuta a las 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log("CRON [WhatsApp]: Verificando notificaciones de mensajes...");
        
        try {
            const hoy = new Date();
            const diaHoy = hoy.getDate();
            
            // A) AVISO PREVIO (2 DÍAS ANTES)
            let diaObjetivoPrevio = diaHoy + 2;
            const clientesPorVencer = await clienteRepo.find({
                where: { dia_pago: diaObjetivoPrevio, estado: "ACTIVO" },
                relations: ["plan"]
            });

            for (const cliente of clientesPorVencer) {
                 await enviarNotificacion(cliente, 'ANTICIPADO');
            }

            // B) AVISO DE MOROSIDAD (3 DÍAS DESPUÉS DEL CORTE)
            let diaObjetivoMora = diaHoy - 3;
            if (diaObjetivoMora <= 0) {
                 const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
                 diaObjetivoMora = ultimoDiaMesAnterior + diaObjetivoMora;
            }

            const clientesMorosos = await clienteRepo.find({
                where: { dia_pago: diaObjetivoMora, estado: "ACTIVO" },
                relations: ["plan"]
            });

            let avisosMoraEnviados = 0;
            for (const cliente of clientesMorosos) {
                if (Number(cliente.saldo_actual) > 0) {
                    await enviarNotificacion(cliente, 'SUSPENSION');
                    avisosMoraEnviados++;
                }
            }
            
            if (clientesPorVencer.length > 0 || avisosMoraEnviados > 0) {
                console.log(`CRON [WhatsApp]: ${clientesPorVencer.length} preventivos, ${avisosMoraEnviados} de morosidad.`);
                
                await logRepo.save(logRepo.create({
                    usuario: "BOT_WHATSAPP",
                    accion: "ENVIO_MASIVO",
                    detalles: `Automático: ${clientesPorVencer.length} preventivos, ${avisosMoraEnviados} de morosidad.`
                }));
            }

        } catch (error) {
            console.error("Error enviando notificaciones Cron:", error);
        }
    },
    {
        scheduled: true,
        timezone: "America/Mexico_City"
    });
};