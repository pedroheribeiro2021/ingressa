const express = require("express");
const prisma = require("../prismaClient");
const router = express.Router();

// 🔹 Retorna detalhes estruturados de um evento
router.get("/:id/details", async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
      include: {
        categories: {
          include: {
            lots: true, // incluir os lotes associados
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Montar resposta estruturada
    const categories = event.categories.map((category) => {
      const sold = category.sold || 0;
      const total = category.total || 0;
      const price = category.price ? Number(category.price) : 0;
      const occupancy =
        total > 0 ? Math.round((sold / total) * 100 * 100) / 100 : 0;

      const lots = category.lots.map((lot) => ({
        id: lot.id,
        name: lot.name,
        sold: lot.sold,
        total: lot.total,
        occupancy:
          lot.total > 0
            ? Math.round((lot.sold / lot.total) * 100 * 100) / 100
            : 0,
      }));

      return {
        id: category.id,
        name: category.name,
        sold,
        total,
        price,
        occupancy,
        lots,
      };
    });

    const totalSold = categories.reduce((sum, c) => sum + c.sold, 0);
    const totalAvailable = categories.reduce((sum, c) => sum + c.total, 0);
    const totalRevenue = categories.reduce(
      (sum, c) => sum + c.sold * c.price,
      0
    );

    res.json({
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      shotgunId: event.shotgunId,
      createdAt: event.createdAt,
      summary: {
        totalCategories: categories.length,
        totalLots: categories.reduce((sum, c) => sum + c.lots.length, 0),
        totalSold,
        totalAvailable,
        occupancy:
          totalAvailable > 0
            ? Math.round((totalSold / totalAvailable) * 100 * 100) / 100
            : 0,
        totalRevenue,
      },
      categories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "details_error", details: err.message });
  }
});

module.exports = router;
