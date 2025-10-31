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

    // 🔹 CORREÇÃO: Criar evento primeiro, depois categorias e lotes com upsert
    const event = await prisma.event.create({
      data: {
        name: `Import ${new Date().toISOString()}`,
      },
    });

    // 🔹 CORREÇÃO: Criar categorias e lotes usando upsert com valores ABSOLUTOS (não incrementais)
    for (const n of normalized) {
      console.log(
        `Processando: ${n.categoria} - ${n.validCount} ingressos válidos de ${n.total} totais`
      );

      // Usar upsert para categoria
      const category = await prisma.category.upsert({
        where: {
          name_eventId: {
            name: n.categoria,
            eventId: event.id,
          },
        },
        update: {
          // CORREÇÃO: Atualizar com os valores absolutos, não incrementar
          sold: n.validCount,
          total: n.total,
        },
        create: {
          name: n.categoria,
          eventId: event.id,
          sold: n.validCount,
          total: n.total,
        },
      });

      // Usar upsert para lote
      await prisma.lot.upsert({
        where: {
          name_categoryId: {
            name: n.lote,
            categoryId: category.id,
          },
        },
        update: {
          // CORREÇÃO: Atualizar com os valores absolutos, não incrementar
          sold: n.validCount,
          total: n.total,
        },
        create: {
          name: n.lote,
          categoryId: category.id,
          sold: n.validCount,
          total: n.total,
        },
      });
    }

    // 🔹 Buscar o evento completo com as relações para retornar
    const eventWithRelations = await prisma.event.findUnique({
      where: { id: event.id },
      include: { categories: { include: { lots: true } } },
    });

    fs.unlinkSync(file.path);
    res.json({ uploadId: uploadRec.id, eventId: eventWithRelations.id });
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

// 🔹 Processar upload e gerar categorias/lotes
router.post("/:uploadId/process", async (req, res) => {
  const { uploadId } = req.params;

  try {
    const upload = await prisma.upload.findUnique({
      where: { id: Number(uploadId) },
      include: { rows: true },
    });

    if (!upload) {
      return res.status(404).json({ error: "upload_not_found" });
    }

    // 🔹 Buscar evento vinculado ao upload (assumindo o primeiro evento criado)
    const event = await prisma.event.findFirst({
      orderBy: { id: "desc" },
    });

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    // 🔹 Estrutura de agrupamento
    const categoryMap = new Map();

    for (const row of upload.rows) {
      const raw = row.raw;

      const categoryName = raw["CATEGORIA"]?.trim();
      if (!categoryName) continue;

      const status = (raw["STATUS"] || "").toLowerCase();
      if (status !== "valid") continue;

      const nomeCompra = raw["NOME DA COMPRA"] || "";
      const lotMatch = nomeCompra.match(/lote\s*(\d+)/i);
      const lotName = lotMatch ? `Lote ${lotMatch[1]}` : "Lote Único";

      // 🔹 Agrupar categorias e lotes
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, new Map());
      }

      const lotMap = categoryMap.get(categoryName);
      lotMap.set(lotName, (lotMap.get(lotName) || 0) + 1);
    }

    let totalCategories = 0;
    let totalLots = 0;
    let totalSold = 0;

    // 🔹 Persistir categorias e lotes
    for (const [categoryName, lots] of categoryMap.entries()) {
      totalCategories++;

      const category = await prisma.category.upsert({
        where: { name_eventId: { name: categoryName, eventId: event.id } },
        update: {},
        create: {
          name: categoryName,
          eventId: event.id,
          total: 0,
          sold: 0,
        },
      });

      for (const [lotName, soldCount] of lots.entries()) {
        totalLots++;
        totalSold += soldCount;

        await prisma.lot.upsert({
          where: {
            name_categoryId: { name: lotName, categoryId: category.id },
          },
          update: { sold: soldCount, total: soldCount },
          create: {
            name: lotName,
            categoryId: category.id,
            sold: soldCount,
            total: soldCount,
          },
        });

        await prisma.category.update({
          where: { id: category.id },
          data: {
            sold: { increment: soldCount },
            total: { increment: soldCount },
          },
        });
      }
    }

    const summary = {
      totalCategories,
      totalLots,
      totalSold,
    };

    res.json({
      eventId: event.id,
      summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "process_error",
      details: err.message,
    });
  }
});

module.exports = router;
