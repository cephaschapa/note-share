import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { authRouter } from "./routes/auth.routes.js";
import { notesRouter } from "./routes/notes.routes.js";

const app = express();

app.set("trust proxy", 1);

const port = Number(process.env.PORT || 4000);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:3000"];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.resolve(process.env.UPLOAD_DIR || "./uploads")),
);

app.get("/health", (_req, res) => {
  return res.json({
    status: "ok",
    service: "note-share-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/notes", notesRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);

    return res.status(500).json({
      message: err.message || "Internal server error",
    });
  },
);

app.listen(port, () => {
  console.log(`Note Share API is running on http://localhost:${port}`);
});
