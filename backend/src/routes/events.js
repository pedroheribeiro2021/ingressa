const express = require("express");
const prisma = require("../prismaClient");
const router = express.Router();

router.get("/", async (req, res) => {
  const events = await prisma.event.findMany({
    include: { categories: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(events);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const event = await prisma.event.findUnique({
    where: { id },
    include: { categories: { include: { lots: true } } },
  });
  if (!event) return res.status(404).json({ error: "Not found" });
  res.json(event);
});

router.get("/:id/dashboard", async (req, res) => {
  const id = parseInt(req.params.id);
  const event = await prisma.event.findUnique({
    where: { id },
    include: { categories: true },
  });
  if (!event) return res.status(404).json({ error: "Not found" });

  const categories = event.categories.map((c) => {
    const sold = c.sold || 0;
    const total = c.total || 0;
    const percent = total > 0 ? Number(((sold / total) * 100).toFixed(2)) : 0;
    const revenue =
      c.price && sold ? Number((parseFloat(c.price) * sold).toFixed(2)) : null;
    return { id: c.id, name: c.name, sold, total, percent, revenue };
  });

  const totalRevenue = categories.reduce((acc, c) => acc + (c.revenue || 0), 0);
  res.json({ eventId: id, categories, totalRevenue });
});

module.exports = router;
