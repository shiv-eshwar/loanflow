import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { applicationsRouter } from "./routes/applications";

export const app = express();

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  }),
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/applications", applicationsRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);
