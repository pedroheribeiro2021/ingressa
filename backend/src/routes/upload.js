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

    // 🔹 Nova lógica: consolidar vendas por categoria e lote (formato Shotgun)
    const normalizedMap = new Map();

    for (const row of json) {
      const categoria = row["CATEGORIA"]?.trim();
      const status = row["STATUS"]?.toLowerCase();
      const nomeCompra = row["NOME DA COMPRA"]?.trim();
      const dataCompra = row["DATA DA COMPRA"]
        ? new Date(row["DATA DA COMPRA"])
        : null;
      const diaInicial = row["DIA QUE O INGRESSO É VÁLIDO"]
        ? new Date(row["DIA QUE O INGRESSO É VÁLIDO"])
        : null;
      const diaFinal = row["DIA FINAL QUE O INGRESSO É VÁLIDO"]
        ? new Date(row["DIA FINAL QUE O INGRESSO É VÁLIDO"])
        : null;

      if (!categoria || !nomeCompra) continue;

      // Tenta identificar o lote a partir do nome da compra
      const loteMatch = nomeCompra.match(/Lote\s*(\d+)/i);
      const loteNome = loteMatch ? `Lote ${loteMatch[1]}` : "Lote único";

      // Chave de agrupamento (categoria + lote)
      const key = `${categoria}__${loteNome}`;

      if (!normalizedMap.has(key)) {
        normalizedMap.set(key, {
          categoria,
          lote: loteNome,
          sold: 0,
          total: 0,
          validCount: 0,
          invalidCount: 0,
          dataCompraMaisRecente: dataCompra,
          diaInicial,
          diaFinal,
        });
      }

      const entry = normalizedMap.get(key);

      // Contagem por status
      if (status === "valid") entry.validCount++;
      else entry.invalidCount++;

      entry.sold++;
      entry.total++;
      if (
        !entry.dataCompraMaisRecente ||
        dataCompra > entry.dataCompraMaisRecente
      )
        entry.dataCompraMaisRecente = dataCompra;
    }

    // Converter mapa em array
    const normalized = Array.from(normalizedMap.values());

    // 🔹 Persist normalized como categorias + lotes
    const event = await prisma.event.create({
      data: {
        name: `Import ${new Date().toISOString()}`,
        categories: {
          create: normalized.map((n) => ({
            name: n.categoria,
            sold: n.validCount,
            total: n.total,
            lots: {
              create: [
                {
                  name: n.lote,
                  sold: n.validCount,
                  total: n.total,
                },
              ],
            },
          })),
        },
      },
      include: { categories: { include: { lots: true } } },
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
