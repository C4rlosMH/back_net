import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./data-source";
import { seedDatabase } from "./utils/seed";

//importar rutas
import AuthRoutes from "./routes/Auth.Routes";
import ClientRoutes from "./routes/Client.Routes";
import equipmentRoutes from "./routes/Equipment.Routes";
import PlanRoutes from "./routes/Plan.Routes";
import PaymentRoutes from "./routes/Payment.Routes";
import SystemLogRoutes from "./routes/SystemLog.Routes";
import ReportRoutes from "./routes/Report.routes";
import UserRoutes from "./routes/User.Routes";

const app = express();
const PORT = process.env.PORT;

app.use(cors({
  origin: '*', // Permite conexiones desde cualquier lugar (Útil para desarrollo)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Usar rutas
app.use("/api/auth", AuthRoutes);
app.use("/api/clients", ClientRoutes);
app.use("/api/equipments", equipmentRoutes);
app.use("/api/plans", PlanRoutes);
app.use("/api/payments", PaymentRoutes);
app.use("/api/logs", SystemLogRoutes);
app.use("/api/reports", ReportRoutes);
app.use("/api/users", UserRoutes);


// Inicializar Base de Datos y luego el Servidor
AppDataSource.initialize()
    .then(async() => {
        await seedDatabase();
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch((error) => console.log("Error conectando a la BD:", error));