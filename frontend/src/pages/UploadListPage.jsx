import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Link } from "react-router-dom";

export default function UploadListPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/uploads")
      .then((r) => setUploads(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Uploads</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : uploads.length === 0 ? (
        <p>Nenhum upload ainda.</p>
      ) : (
        <div className="space-y-3">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <div className="font-medium">{u.filename}</div>
                <div className="text-sm text-slate-500">
                  {new Date(u.uploadedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/events/${u.eventId || u.id}`}
                  className="px-3 py-1 bg-slate-100 rounded"
                >
                  Ver Evento
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
