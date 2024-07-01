import express, { Request, Response, Router } from "express";
import { configDotenv } from "dotenv";
import ErrorHandler from "../middleware/errorHandler";
import cors from "cors";

const dotenv = configDotenv();
const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: process.env.CORS_ORIGIN,
    methods : "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 200,
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({ message: "Hello world!" });
});

app.use(`/api/device`, require("../routes/deviceRoutes"));
app.use(`/api/report`, require("../routes/reportRoutes"));

app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});

app.use(ErrorHandler);