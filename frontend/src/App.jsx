import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import UploadListPage from "./pages/UploadListPage";
import EventDetailsPage from "./pages/EventDetailsPage";

export default function App() {
  return (
    <div className="min-h-screen p-6">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ingressa — Painel</h1>
          <nav className="space-x-4">
            <Link to="/" className="text-slate-600 hover:text-slate-800">
              Upload
            </Link>
            <Link to="/uploads" className="text-slate-600 hover:text-slate-800">
              Uploads
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/uploads" element={<UploadListPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
        </Routes>
      </main>
    </div>
  );
}
