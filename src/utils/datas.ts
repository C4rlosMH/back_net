import { AppDataSource } from "../data-source";
import { User } from "../entity/Auth";
import { Plan } from "../entity/Plan";
import { Client } from "../entity/Client";
import { Equipment } from "../entity/Equipment";
import { Payment } from "../entity/Payments";
import { ClientStatus, EquipmentStatus, EquipmentType, PaymentMethod, PaymentType } from "../entity/Enums";
import bcrypt from "bcryptjs";

export const datasDatabase = async () => {
    try {
        const userRepo = AppDataSource.getRepository(User);
        const planRepo = AppDataSource.getRepository(Plan);
        const clientRepo = AppDataSource.getRepository(Client);
        const equipmentRepo = AppDataSource.getRepository(Equipment);
        const paymentRepo = AppDataSource.getRepository(Payment);

        // 1. CREAR USUARIO ADMIN
        if (await userRepo.count() === 0) {
            console.log("🌱 Creando Administrador...");
            const admin = new User();
            admin.username = "admin";
            admin.name = "Administrador Principal";
            admin.role = "ADMIN";
            admin.password = await bcrypt.hash("123qwe987", 10);
            await userRepo.save(admin);
        }

        // 2. CREAR PLANES (CORREGIDO: Ahora usa downloadSpeed y uploadSpeed)
        if (await planRepo.count() === 0) {
            console.log("🌱 Creando Planes de Internet...");
            const plans = [
                { name: "Básico Hogar", price: 350, downloadSpeed: 20, uploadSpeed: 5 },
                { name: "Familiar Plus", price: 500, downloadSpeed: 50, uploadSpeed: 20 },
                { name: "Gamer Pro", price: 800, downloadSpeed: 100, uploadSpeed: 50 },
                { name: "Empresarial", price: 1200, downloadSpeed: 200, uploadSpeed: 100 }
            ];
            // Usamos save directamente con el objeto, TypeORM lo mapea
            await planRepo.save(plans);
        }

        // 3. CREAR CLIENTES Y EQUIPOS
        if (await clientRepo.count() === 0) {
            console.log("🌱 Creando Clientes y Equipos...");
            
            const planesDb = await planRepo.find();
            const clientsData = [
                { name: "Juan Pérez", address: "Calle 10 #23, Centro", phone: "9981112233" },
                { name: "María López", address: "Av. Tulum SM 20", phone: "9982223344" },
                { name: "Carlos Sánchez", address: "Fracc. Las Américas", phone: "9983334455" },
                { name: "Ana Torres", address: "Col. Donceles 28", phone: "9984445566" },
                { name: "Tacos El Paisa", address: "Av. Kabah Local 4", phone: "9985556677" },
            ];

            for (const cData of clientsData) {
                const client = new Client();
                client.name = cData.name;
                client.address = cData.address;
                client.phone = cData.phone;
                client.status = Math.random() > 0.8 ? ClientStatus.SUSPENDIDO : ClientStatus.ACTIVO;
                client.cutOffDay = Math.random() > 0.5 ? 15 : 30;
                // Asignamos un plan aleatorio de los que acabamos de crear
                client.plan = planesDb[Math.floor(Math.random() * planesDb.length)];
                client.balance = Math.random() > 0.7 ? -client.plan.price : 0; 
                
                const savedClient = await clientRepo.save(client);

                // Crear Equipo
                const equipment = new Equipment();
                equipment.name = `CPE - ${savedClient.name.split(' ')[0]}`;
                equipment.type = Math.random() > 0.5 ? EquipmentType.ANTENA : EquipmentType.ROUTER;
                equipment.status = EquipmentStatus.INSTALADO;
                equipment.brand = "Ubiquiti";
                equipment.sn = `SN${Math.floor(Math.random() * 1000000)}`;
                equipment.mac = `AA:BB:CC:${Math.floor(Math.random() * 99)}:${Math.floor(Math.random() * 99)}`;
                equipment.adminPass = "admin123"; // Valor por defecto para que no falle
                equipment.client = savedClient; 
                
                await equipmentRepo.save(equipment);

                // Historial de Pagos
                if (client.status === ClientStatus.ACTIVO) {
                    const payment = new Payment();
                    payment.amount = Number(client.plan.price);
                    payment.paymentDate = new Date();
                    payment.concept = "Mensualidad Anterior";
                    payment.method = PaymentMethod.EFECTIVO;
                    payment.type = PaymentType.FULL;
                    payment.client = savedClient;
                    await paymentRepo.save(payment);
                }
            }
        }

        // 4. CREAR EQUIPOS EN BODEGA
        if (await equipmentRepo.count({ where: { status: EquipmentStatus.BODEGA } }) === 0) {
            console.log("🌱 Llenando la Bodega...");
            const bodegaItems = [];
            for (let i = 0; i < 5; i++) {
                bodegaItems.push({
                    name: `Router Disponible ${i+1}`,
                    type: EquipmentType.ROUTER,
                    status: EquipmentStatus.BODEGA,
                    brand: "TP-Link",
                    sn: `BOD${i}998877`,
                    mac: `DD:EE:FF:00:11:${10+i}`,
                    adminPass: "admin"
                });
            }
            await equipmentRepo.save(bodegaItems);
        }

        console.log("✅ Seed completado con éxito.");

    } catch (error) {
        console.error("❌ Error en el seed:", error);
    }
};