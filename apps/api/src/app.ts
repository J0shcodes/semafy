import express from "express"
import { errorHandler } from "./middleware/errorHandler"
import { analyzerRouter } from "./routes/analyze"

const app = express()

app.use(express.json())

app.use("/api", analyzerRouter)

app.use(errorHandler)

export default app