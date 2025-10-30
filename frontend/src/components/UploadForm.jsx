import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Selecione um arquivo");

    const form = new FormData();
    form.append("file", file);

    try {
      setLoading(true);
      const res = await api.post("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { uploadId, eventId } = res.data;
      // opcional: auto-processar
      await api.post(`/uploads/${uploadId}/process`);
      // navegar para evento já processado
      navigate(`/events/${eventId}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar arquivo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={(e) => setFile(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <button
          disabled={!file || loading}
          className="px-4 py-2 bg-sky-600 text-white rounded"
        >
          {loading ? "Processando..." : "Enviar e Processar"}
        </button>
        <button
          type="button"
          onClick={() => setFile(null)}
          className="px-4 py-2 border rounded"
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
