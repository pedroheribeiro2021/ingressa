const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const eventsRoute = require("./routes/events");
const uploadRoutes = require("./routes/upload");
const eventDetailsRoute = require("./routes/eventDetails");

app.use("/api/events", eventsRoute);
app.use("/api/uploads", uploadRoutes);
app.use("/api/events", eventDetailsRoute);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
