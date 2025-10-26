import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import router from "~/routes";
import { errorHandler, notFoundHandler } from "~/utils/handler";
import { morganMiddleware } from "./middlewares/morgan.middleware";

const app = express();

// MIDDLEWARES
// log by morgan
app.use(morganMiddleware)

// protected by helmet
app.use(helmet());

// convert request to json
app.use(express.json());

// parse cookies
app.use(cookieParser());

// cho phép gửi cookie từ FE
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// API routes
app.use(router);

// DEFAULT HANDLER
// not found handler
app.use(notFoundHandler)

// error handler
app.use(errorHandler)

export default app;
