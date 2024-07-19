import express, { Request, Response, Router } from "express";
import { configDotenv } from "dotenv";
import ErrorHandler from "../middleware/errorHandler";
import cors from "cors";
import path from "path";

const dotenv = configDotenv();
const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: process.env.CORS_ORIGIN,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 200,
    credentials: true,
};

app.use(cors(corsOptions));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Increase the limit for JSON body parser
app.use(express.json({ limit: '10mb' }));
// Also increase the limit for URL-encoded data if needed
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({ message: "Hello world!" });
});

app.use(`/api/device`, require("../routes/deviceRoutes"));
app.use(`/api/report`, require("../routes/reportRoutes"));
app.use(`/api/connection`, require("../routes/connectionsRoutes"));
app.use(`/api/dashboard`, require("../routes/dashboardSettingRoute"));

// Add specific error handling for PayloadTooLargeError
app.use((err: Error, req: Request, res: Response, next: Function) => {
    if (err instanceof SyntaxError && (err as any).status === 413) {
        return res.status(413).json({ error: 'Request entity too large' });
    }
    next(err);
});

app.use(ErrorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});