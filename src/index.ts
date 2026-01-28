import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./data-source";

//importar rutas
import AuthRoutes from "./routes/Auth.Routes";
import ClientRoutes from "./routes/Client.Routes";
import equipmentRoutes from "./routes/Equipment.Routes";
import PlanRoutes from "./routes/Plan.Routes";
import PaymentRoutes from "./routes/Payment.Routes";
import SystemLogRoutes from "./routes/SystemLog.Routes";

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

// Usar rutas
app.use("/api/auth", AuthRoutes);
app.use("/api/clients", ClientRoutes);
app.use("/api/equipments", equipmentRoutes);
app.use("/api/plans", PlanRoutes);
app.use("/api/payments", PaymentRoutes);
app.use("/api/logs", SystemLogRoutes);


// Inicializar Base de Datos y luego el Servidor
AppDataSource.initialize()
    .then(() => {
        console.log("Base de Datos conectada con TypeORM");
        
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch((error) => console.log("Error conectando a la BD:", error));