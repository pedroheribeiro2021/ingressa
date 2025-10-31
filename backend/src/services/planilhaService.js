// src/services/planilhaService.js
import * as XLSX from "xlsx";

/**
 * Lê e converte uma planilha XLSX em JSON
 * @param {string} filePath caminho do arquivo salvo
 */
export function lerPlanilha(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const dados = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return dados;
}
