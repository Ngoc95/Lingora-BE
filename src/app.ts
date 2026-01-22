import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import router from "./routes";
import { errorHandler, notFoundHandler } from "./utils/handler";
import { morganMiddleware } from "./middlewares/morgan.middlewares";
// Import event listeners to register them
import "./event-listeners";

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
// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://lingora-web-app.vercel.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow Chrome Extension origins
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
