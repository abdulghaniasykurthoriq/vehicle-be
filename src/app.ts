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


export function createApp(deps?: Partial<ReturnType<typeof buildServices>>) {
  const app = express();
  app.use(helmet());
  app.use(morgan("dev"));

  app.use(
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
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

  app.use("/auth", authRouter({ auth: services.auth }));


  const spec = initSwagger();
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  app.get("/health", (req, res) => res.json({ ok: true }));

  return app;
}

function buildServices() {
  return {
    auth: new AuthService(prisma),

  };
}

export type Services = ReturnType<typeof buildServices>;
