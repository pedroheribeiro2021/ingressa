const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const prisma = require("../prismaClient");
const router = express.Router();

const upload = multer({ dest: "uploads/" });

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

    // assumir primeira planilha
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // salvar upload
    const uploadRec = await prisma.upload.create({
      data: {
        filename: file.originalname,
        rows: { create: json.map((r) => ({ raw: r })) },
      },
      include: { rows: true },
    });

    // normalizar baseado no formato Shotgun:
    // Implementar função que transforma json (cada linha) em categorias, lots, etc.
    // Exemplo rápido: procurar colunas "Categoria", "Vendidos/Total", "Lot name", "Price"
    const normalized = [];
    for (const row of json) {
      // Exemplo de mapeamento — ajustar ao layout real da planilha Shotgun:
      const categoria = row["Categoria"] || row["Category"] || row["Tipo"];
      const vendidoTotal =
        row["Vendido/Total"] || row["Sold/Total"] || row["Vendidos"];
      const price = row["Preço"] || row["Price"];
      if (!categoria) continue;

      // parse "500/5000"
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

    // persist normalized: por enquanto criar um EVENT temporário "Import {date}"
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

    // remover arquivo temporário
    fs.unlinkSync(file.path);
    res.json({ uploadId: uploadRec.id, eventId: event.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "parse_error", details: err.message });
  }
});

module.exports = router;
