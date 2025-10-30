import React from "react";
import UploadForm from "../components/UploadForm";

export default function UploadPage() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">
        Importar planilha (Shotgun)
      </h2>
      <UploadForm />
    </div>
  );
}
