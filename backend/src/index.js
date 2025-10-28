require("dotenv").config();
const express = require("express");
const cors = require("cors");
const uploadRoute = require("./routes/upload");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/upload", uploadRoute);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
