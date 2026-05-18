import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import axios from "axios";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { hospitalsRouter } from "./routes/hospitals.js";
import { triageRouter } from "./routes/triage.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "healthcare-assistant-api" });
});

app.get("/health/dependencies", async (_req, res) => {
  const triageBaseUrl = config.TRIAGE_SERVICE_URL.replace(/\/+$/, "");

  try {
    const response = await axios.get(`${triageBaseUrl}/health`, { timeout: 30_000 });
    res.json({
      ok: true,
      dependencies: {
        triage: {
          ok: true,
          url: triageBaseUrl,
          status: response.status,
          data: response.data
        }
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(503).json({
        ok: false,
        dependencies: {
          triage: {
            ok: false,
            url: triageBaseUrl,
            status: error.response?.status ?? null,
            code: error.code ?? null,
            message: error.message
          }
        }
      });
    }

    res.status(503).json({
      ok: false,
      dependencies: {
        triage: {
          ok: false,
          url: triageBaseUrl,
          message: "Unknown dependency error"
        }
      }
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/triage", triageRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use(errorHandler);

app.listen(config.API_PORT, "0.0.0.0", () => {
  console.log(`API listening on 0.0.0.0:${config.API_PORT}`);
});
