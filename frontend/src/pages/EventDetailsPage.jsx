import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import EventChart from "../components/EventChart";

export default function EventDetailsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/events/${id}/details`)
      .then((r) => setEvent(r.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="bg-white p-6 rounded">Carregando...</div>;
  if (!event)
    return <div className="bg-white p-6 rounded">Evento não encontrado</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">{event.name}</h2>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border rounded">
          <div className="text-sm text-slate-500">Total categories</div>
          <div className="text-2xl font-bold">
            {event.summary.totalCategories}
          </div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-slate-500">Total sold</div>
          <div className="text-2xl font-bold">{event.summary.totalSold}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-slate-500">Occupancy</div>
          <div className="text-2xl font-bold">{event.summary.occupancy}%</div>
        </div>
      </div>

      <div className="mb-6">
        <EventChart categories={event.categories} />
      </div>

      <div className="space-y-4">
        {event.categories.map((cat) => (
          <div key={cat.id} className="p-4 border rounded">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{cat.name}</h3>
              <div className="text-sm text-slate-500">
                {cat.sold} / {cat.total}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {cat.lots.map((l) => (
                <div key={l.id} className="p-2 border rounded text-sm">
                  <div className="font-medium">{l.name}</div>
                  <div>
                    {l.sold} / {l.total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
