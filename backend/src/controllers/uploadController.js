// src/controllers/uploadController.js
import { lerPlanilha } from "../services/planilhaService.js";
import { getUploads, getUploadById } from "../models/uploadModel.js";
import fs from "fs";

export const uploadArquivo = (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const dados = lerPlanilha(file.path);

    // Exclui o arquivo temporário após leitura
    fs.unlinkSync(file.path);

    res.status(200).json({
      message: "Planilha lida com sucesso",
      totalRegistros: dados.length,
      amostra: dados.slice(0, 5), // mostra só os 5 primeiros
    });
  } catch (error) {
    console.error("Erro ao processar planilha:", error);
    res.status(500).json({ error: "Falha ao processar a planilha" });
  }
};

export async function listUploads(req, res) {
  try {
    const uploads = await getUploads();
    res.status(200).json(uploads);
  } catch (error) {
    console.error("Error listing uploads:", error);
    res.status(500).json({ error: "Error listing uploads" });
  }
}

// 🔹 Obter um upload específico
export async function getUploadDetails(req, res) {
  try {
    const { id } = req.params;
    const upload = await getUploadById(id);
    if (!upload) return res.status(404).json({ error: "Upload not found" });

    // futuramente podemos buscar os dados processados do evento aqui
    res.status(200).json(upload);
  } catch (error) {
    console.error("Error getting upload details:", error);
    res.status(500).json({ error: "Error getting upload details" });
  }
}
