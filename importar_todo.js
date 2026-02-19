import fs from "fs";
import { AppDataSource } from "./src/config/data-source.js";
import { Cliente } from "./src/entities/Cliente.js";
import { Plan } from "./src/entities/Plan.js";
import { Equipo } from "./src/entities/Equipo.js";
import { faker } from "@faker-js/faker";
import { CajaDistribucion } from "./src/entities/CajaDistribucion.js";

const marcasModem = ["Huawei", "ZTE", "Nokia", "FiberHome"];
const modelosModem = ["EG8145V5", "F670L", "G-240W-B", "HG8245H"];

const marcasAntena = ["Ubiquiti", "MikroTik", "Mimosa", "Cambium"];
const modelosAntena = ["LiteBeam 5AC Gen2", "SXTsq 5 ac", "C5x", "Force 300"];

const marcasRouter = ["TP-Link", "Mercusys", "Tenda", "Xiaomi"];
const modelosRouter = ["Archer C50", "MW302R", "AC1200", "Mi Router 4A"];

async function importarDatosYEquipos() {
    try {
        await AppDataSource.initialize();
        console.log("Conexion a la base de datos establecida.");

        const clienteRepo = AppDataSource.getRepository(Cliente);
        const planRepo = AppDataSource.getRepository(Plan);
        const cajaRepo = AppDataSource.getRepository(CajaDistribucion);
        const equipoRepo = AppDataSource.getRepository(Equipo);

        const csv = fs.readFileSync("importacion.csv", "utf-8");
        const lineas = csv.split("\n");

        if (lineas.length < 2) {
            console.error("El archivo CSV esta vacio o no tiene datos.");
            process.exit(1);
        }

        const encabezados = lineas[0].replace(/\r/g, "").split(",").map(h => h.trim().toLowerCase());

        const idxNombre = encabezados.indexOf("nombre");
        const idxDia = encabezados.indexOf("dia");
        const idxTelefono = encabezados.indexOf("telefono");
        const idxDireccion = encabezados.indexOf("direccion");
        const idxTipo = encabezados.indexOf("tipo_conexion");
        const idxIp = encabezados.findIndex(h => h === "ip" || h === "ip_asignada"); 
        const idxNombreCaja = encabezados.indexOf("nombre_caja");
        const idxEstado = encabezados.indexOf("estado");
        const idxLat = encabezados.indexOf("latitud");
        const idxLon = encabezados.indexOf("longitud");
        const idxPlan = encabezados.indexOf("plan");
        
        // Nuevas columnas financieras
        const idxDeudaHistorica = encabezados.findIndex(h => h === "deuda_historica" || h === "deuda_historcia");
        const idxDeudaCorriente = encabezados.indexOf("deuda_corriente");
        const idxSaldoFavor = encabezados.indexOf("saldo_favor");

        if (idxNombre === -1) {
            console.error("Error: No se encontro la columna 'Nombre' en los encabezados.");
            process.exit(1);
        }

        let importados = 0;
        let equiposCreados = 0;

        for (const linea of lineas.slice(1)) {
            if (!linea.trim() || linea.replace(/,/g, '').trim() === '') continue;

            const columnas = linea.replace(/\r/g, "").split(",");

            const nombre = columnas[idxNombre]?.trim();
            if (!nombre) continue;

            const diaStr = idxDia !== -1 ? columnas[idxDia]?.trim() : null;
            const dia = parseInt(diaStr);
            const telefono = idxTelefono !== -1 ? columnas[idxTelefono]?.trim() || null : null;
            const direccion = idxDireccion !== -1 ? columnas[idxDireccion]?.trim() || null : null;
            const tipoConexion = idxTipo !== -1 ? columnas[idxTipo]?.trim()?.toUpperCase() : null;
            const ipAsignada = idxIp !== -1 ? columnas[idxIp]?.trim() || null : null;
            const nombreCaja = idxNombreCaja !== -1 ? columnas[idxNombreCaja]?.trim() || null : null;
            const estadoExtraido = idxEstado !== -1 ? columnas[idxEstado]?.trim() : null;
            const estado = estadoExtraido ? estadoExtraido : "ACTIVO";
            
            const latitud = idxLat !== -1 && columnas[idxLat] ? parseFloat(columnas[idxLat]) : null;
            const longitud = idxLon !== -1 && columnas[idxLon] ? parseFloat(columnas[idxLon]) : null;
            const planNombre = idxPlan !== -1 ? columnas[idxPlan]?.trim() : null;

            // Procesar valores financieros
            const deudaHistorica = idxDeudaHistorica !== -1 && columnas[idxDeudaHistorica] ? parseFloat(columnas[idxDeudaHistorica]) : 0;
            const deudaCorriente = idxDeudaCorriente !== -1 && columnas[idxDeudaCorriente] ? parseFloat(columnas[idxDeudaCorriente]) : 0;
            const saldoFavor = idxSaldoFavor !== -1 && columnas[idxSaldoFavor] ? parseFloat(columnas[idxSaldoFavor]) : 0;

            let planAsignado = null;
            if (planNombre) planAsignado = await planRepo.findOneBy({ nombre: planNombre });

            let cajaAsignada = null;
            if (tipoConexion === "FIBRA" && nombreCaja) {
                cajaAsignada = await cajaRepo.findOneBy({ nombre: nombreCaja });
            }

            const fechaInstalacion = faker.date.past({ years: 1 });

            const nuevoCliente = clienteRepo.create({
                nombre_completo: nombre,
                dia_pago: isNaN(dia) ? 15 : dia,
                telefono: telefono,
                direccion: direccion,
                ip_asignada: ipAsignada,
                estado: estado,
                latitud: latitud,
                longitud: longitud,
                plan: planAsignado,
                caja: cajaAsignada,
                fecha_instalacion: fechaInstalacion,
                // Lógica de saldos separada
                saldo_actual: isNaN(deudaCorriente) ? 0 : deudaCorriente,
                deuda_historica: isNaN(deudaHistorica) ? 0 : deudaHistorica,
                saldo_a_favor: isNaN(saldoFavor) ? 0 : saldoFavor,
                saldo_aplazado: 0 
            });

            await clienteRepo.save(nuevoCliente);

            const nombreFormateado = nombre.toUpperCase().replace(/\s+/g, '_');
            const equiposGenerados = [];

            if (tipoConexion === "FIBRA") {
                equiposGenerados.push(equipoRepo.create({
                    nombre: `MODEM_${nombreFormateado}`,
                    marca: faker.helpers.arrayElement(marcasModem),
                    modelo: faker.helpers.arrayElement(modelosModem),
                    tipo: "MODEM",
                    mac_address: faker.internet.mac().toUpperCase(),
                    serie: faker.string.alphanumeric({ length: 12, casing: 'upper' }),
                    ip: "192.168.1.254", 
                    precio_compra: 350,
                    fecha_compra: faker.date.past({ years: 2 }),
                    estado: "INSTALADO",
                    cliente: nuevoCliente
                }));
            } else {
                equiposGenerados.push(equipoRepo.create({
                    nombre: `AP_${nombreFormateado}`,
                    marca: faker.helpers.arrayElement(marcasAntena),
                    modelo: faker.helpers.arrayElement(modelosAntena),
                    tipo: "ANTENA",
                    mac_address: faker.internet.mac().toUpperCase(),
                    serie: faker.string.alphanumeric({ length: 12, casing: 'upper' }),
                    precio_compra: 800,
                    fecha_compra: faker.date.past({ years: 2 }),
                    estado: "INSTALADO",
                    cliente: nuevoCliente
                }));

                equiposGenerados.push(equipoRepo.create({
                    nombre: `ROUTER_${nombreFormateado}`,
                    marca: faker.helpers.arrayElement(marcasRouter),
                    modelo: faker.helpers.arrayElement(modelosRouter),
                    tipo: "ROUTER",
                    mac_address: faker.internet.mac().toUpperCase(),
                    serie: faker.string.alphanumeric({ length: 12, casing: 'upper' }),
                    ip: "192.168.1.1", 
                    precio_compra: 500,
                    fecha_compra: faker.date.past({ years: 2 }),
                    estado: "INSTALADO",
                    cliente: nuevoCliente
                }));
            }

            await equipoRepo.save(equiposGenerados);
            
            importados++;
            equiposCreados += equiposGenerados.length;
        }

        console.log(`\nImportacion exitosa. Fechas de instalacion y saldos asignados correctamente.`);
        console.log(`- Clientes agregados: ${importados}`);
        console.log(`- Equipos generados: ${equiposCreados}`);
        process.exit(0);

    } catch (error) {
        console.error("Error critico:", error);
        process.exit(1);
    }
}

importarDatosYEquipos();