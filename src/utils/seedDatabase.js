import { AppDataSource } from "../config/data-source.js";
import { Plan } from "../entities/Plan.js";
import { CajaDistribucion } from "../entities/CajaDistribucion.js";
import { Cliente } from "../entities/Cliente.js";
import { Equipo } from "../entities/Equipo.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";

export const seedDatabase = async () => {
    try {
        // Solo imprimimos log, no borramos nada.
        // console.log("🌱 Verificando datos iniciales...");

        const planRepo = AppDataSource.getRepository(Plan);
        const cajaRepo = AppDataSource.getRepository(CajaDistribucion);
        const clienteRepo = AppDataSource.getRepository(Cliente);
        const equipoRepo = AppDataSource.getRepository(Equipo);
        const movRepo = AppDataSource.getRepository(MovimientoFinanciero);

        // --- 1. VERIFICAR/CREAR PLANES ---
        const planesData = [
            { nombre: "Residencial Básico 20MB", velocidad_mb: 20, precio_mensual: 350 },
            { nombre: "Familia Fibra 50MB", velocidad_mb: 50, precio_mensual: 500 },
            { nombre: "Gamer Pro 100MB", velocidad_mb: 100, precio_mensual: 800 },
            { nombre: "Empresarial Dedicado", velocidad_mb: 200, precio_mensual: 1500 },
        ];

        // Guardamos referencias para usarlas al crear clientes
        const planesMap = []; 
        for (const p of planesData) {
            let plan = await planRepo.findOne({ where: { nombre: p.nombre } });
            if (!plan) {
                plan = await planRepo.save(planRepo.create(p));
                console.log(`🔹 Plan creado: ${p.nombre}`);
            }
            planesMap.push(plan);
        }

        // --- 2. VERIFICAR/CREAR CAJAS ---
        const cajasData = [
            { nombre: "NAP-01 Centro", latitud: 19.4326, longitud: -99.1332, capacidad_total: 16, zona: "Centro" },
            { nombre: "NAP-02 Norte", latitud: 19.4400, longitud: -99.1300, capacidad_total: 8, zona: "Norte" },
            { nombre: "NAP-03 Sur", latitud: 19.4250, longitud: -99.1350, capacidad_total: 8, zona: "Sur" },
            { nombre: "NAP-04 Oeste", latitud: 19.4300, longitud: -99.1400, capacidad_total: 16, zona: "Oeste" },
        ];

        const cajasMap = [];
        for (const c of cajasData) {
            let caja = await cajaRepo.findOne({ where: { nombre: c.nombre } });
            if (!caja) {
                caja = await cajaRepo.save(cajaRepo.create(c));
                console.log(`🔹 Caja creada: ${c.nombre}`);
            }
            cajasMap.push(caja);
        }

        // --- 3. VERIFICAR/CREAR EQUIPOS ---
        const equiposData = [
            { tipo: "ROUTER", marca: "TP-Link", modelo: "WR840N", estado: "ALMACEN" },
            { tipo: "ROUTER", marca: "Huawei", modelo: "AX3", estado: "ALMACEN" },
            { tipo: "ANTENA", marca: "Ubiquiti", modelo: "LiteBeam M5", estado: "ALMACEN" },
            { tipo: "MODEM", marca: "Huawei", modelo: "HG8245", estado: "ALMACEN" },
        ];

        // Solo creamos más equipos si hay poquitos (menos de 5)
        const totalEquipos = await equipoRepo.count();
        if (totalEquipos < 5) {
            for (let i = 0; i < 10; i++) {
                const randomEq = equiposData[Math.floor(Math.random() * equiposData.length)];
                const uniqueSuffix = Math.floor(Math.random() * 10000);
                const mac = `AA:BB:CC:DD:${Math.floor(Math.random() * 99)}:${Math.floor(Math.random() * 99)}`;
                
                // Verificar que la MAC no exista
                const existe = await equipoRepo.findOne({ where: { mac_address: mac } });
                if (!existe) {
                    await equipoRepo.save(equipoRepo.create({
                        ...randomEq,
                        mac_address: mac,
                        serie: `SN-${Date.now()}-${uniqueSuffix}`
                    }));
                }
            }
            console.log("🔹 Inventario rellenado.");
        }

        // --- 4. VERIFICAR/CREAR CLIENTES ---
        const nombres = ["Juan Pérez", "Maria Lopez", "Carlos Ruiz", "Ana Gámez", "Pedro Torres"];

        for (let i = 0; i < nombres.length; i++) {
            const nombre = nombres[i];
            const existe = await clienteRepo.findOne({ where: { nombre_completo: nombre } });
            
            if (!existe) {
                const plan = planesMap[i % planesMap.length];
                const caja = cajasMap[i % cajasMap.length];
                const estado = i % 3 === 0 ? "CORTADO" : "ACTIVO";
                const saldo = estado === "CORTADO" ? 500 : 0;

                const nuevoCliente = await clienteRepo.save(clienteRepo.create({
                    nombre_completo: nombre,
                    telefono: `555-000${i}`,
                    direccion: `Calle Prueba ${i + 1}`,
                    latitud: caja.latitud + 0.001,
                    longitud: caja.longitud + 0.001,
                    estado: estado,
                    dia_corte: 15,
                    saldo_actual: saldo,
                    plan: plan,
                    cajaConectada: caja
                }));

                // Agregar historial financiero solo al crearlo
                if (estado === "ACTIVO") {
                    await movRepo.save(movRepo.create({
                        tipo: "ABONO",
                        monto: plan.precio_mensual,
                        descripcion: "Pago Mensualidad Inicial",
                        metodo_pago: "EFECTIVO",
                        cliente: nuevoCliente
                    }));
                }
                console.log(`🔹 Cliente creado: ${nombre}`);
            }
        }
        
    } catch (error) {
        console.error("❌ Error en seeding:", error);
    }
};