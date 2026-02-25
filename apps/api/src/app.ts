import express from "express"
import cors from "cors"
import { errorHandler } from "./middleware/errorHandler"
import { analyzerRouter } from "./routes/analyze"

const app = express()

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000"
}))
app.use(express.json())

app.use("/api", analyzerRouter)

app.use(errorHandler)

export default app