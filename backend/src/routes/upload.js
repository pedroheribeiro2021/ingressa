const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const prisma = require("../prismaClient");
const router = express.Router();

const upload = multer({ dest: "uploads/" });

// 🔹 Upload de planilha
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file" });

    const ext = path.extname(file.originalname).toLowerCase();
    let workbook;
    if (ext === ".csv") {
      const csv = fs.readFileSync(file.path, "utf8");
      workbook = XLSX.read(csv, { type: "string" });
    } else {
      workbook = XLSX.readFile(file.path);
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const uploadRec = await prisma.upload.create({
      data: {
        filename: file.originalname,
        rows: { create: json.map((r) => ({ raw: r })) },
      },
      include: { rows: true },
    });

    const normalized = [];
    for (const row of json) {
      const categoria = row["Categoria"] || row["Category"] || row["Tipo"];
      const vendidoTotal =
        row["Vendido/Total"] || row["Sold/Total"] || row["Vendidos"];
      const price = row["Preço"] || row["Price"];
      if (!categoria) continue;

      let sold = null,
        total = null;
      if (typeof vendidoTotal === "string" && vendidoTotal.includes("/")) {
        const parts = vendidoTotal.split("/").map((p) => p.replace(/\D/g, ""));
        sold = parseInt(parts[0] || "0", 10);
        total = parseInt(parts[1] || "0", 10);
      } else if (
        typeof row["Vendidos"] === "number" &&
        typeof row["Total"] === "number"
      ) {
        sold = row["Vendidos"];
        total = row["Total"];
      }

      normalized.push({ categoria, sold, total, price });
    }

    const event = await prisma.event.create({
      data: {
        name: `Import ${new Date().toISOString()}`,
        categories: {
          create: normalized.map((n) => ({
            name: n.categoria,
            sold: n.sold || 0,
            total: n.total || 0,
            price: n.price ? parseFloat(n.price) : null,
          })),
        },
      },
      include: { categories: true },
    });

    fs.unlinkSync(file.path);
    res.json({ uploadId: uploadRec.id, eventId: event.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "parse_error", details: err.message });
  }
});

// 🔹 Listar todos os uploads
router.get("/", async (req, res) => {
  try {
    const uploads = await prisma.upload.findMany({
      select: {
        id: true,
        filename: true,
        uploadedAt: true,
        _count: {
          select: { rows: true },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    res.json(uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "list_error", details: err.message });
  }
});

// 🔹 Obter detalhes de um upload específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const upload = await prisma.upload.findUnique({
      where: { id: Number(id) },
      include: { rows: true },
    });
    if (!upload) return res.status(404).json({ error: "Upload not found" });
    res.json(upload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "detail_error", details: err.message });
  }
});

module.exports = router;
