import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { initSwagger } from "./swagger";
import { prisma } from "./db";
import { AuthService } from "./services/authService";
import { authRouter } from "./routes/auth";
import { VehicleService } from "./services/vehicleService";
import { vehiclesRouter } from "./routes/vehicles";
import { UserService } from "./services/userService";
import { usersRouter } from "./routes/users";
import { ReportService } from "./services/reportService";
import { reportsRouter } from "./routes/reports";

export function createApp(deps?: Partial<ReturnType<typeof buildServices>>) {
  const app = express();
  app.use(helmet());
  app.use(morgan("dev"));
  app.set("trust proxy", true);
  app.use(
    cors({
      origin: [
        "https://103.183.75.108",
        "http://103.183.75.108",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "https://103-186-1-205.nip.io", // ✅ nip.io pakai strip
        "https://api.103-186-1-205.nip.io",
        "https://app.103-186-1-205.nip.io",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  const services = deps ?? buildServices();

  if (!services.auth) {
    throw new Error("AuthService is required");
  }
  if (!services.vehicles) {
    throw new Error("VehicleService is required");
  }
  if (!services.users) {
    throw new Error("UserService is required");
  }
  if (!services.reports) {
    throw new Error("ReportService is required");
  }

  app.use("/auth", authRouter({ auth: services.auth }));
  app.use("/vehicles", vehiclesRouter({ vehicles: services.vehicles }));
  app.use("/users", usersRouter({ users: services.users }));
  app.use("/reports", reportsRouter({ reports: services.reports }));

  const spec = initSwagger();
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  app.get("/health", (req, res) => res.json({ ok: true }));

  return app;
}

function buildServices() {
  return {
    auth: new AuthService(prisma),
    vehicles: new VehicleService(prisma),
    users: new UserService(prisma),
    reports: new ReportService(prisma),
  };
}

export type Services = ReturnType<typeof buildServices>;
