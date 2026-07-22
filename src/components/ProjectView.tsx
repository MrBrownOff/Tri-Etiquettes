// src/components/ProjectView.tsx
import React, { useRef, useState } from 'react';
import { useAppStore } from '../store/store';
import { Save, Download, Upload, CheckCircle2 } from 'lucide-react';
import { generateExports } from '../utils/export';

export const ProjectView: React.FC = () => {
  const { labels, stores, exportProject, importProject } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Import de la sauvegarde JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importProject(json);
        setStatusMessage('Projet restauré avec succès !');
        setTimeout(() => setStatusMessage(null), 4000);
      } catch (err) {
        alert('Fichier JSON de sauvegarde invalide.');
      }
    };
    reader.readAsText(file);
  };

  // Export CSV final d'affectation
  const handleExportCSV = () => {
    const { csvUrl } = generateExports(labels, stores);
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `affectations_magasins_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Save className="text-orange-500" size={28} />
          Sauvegarde & Exports
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Sauvegardez l'état complet de votre travail en JSON ou gérez vos exports CSV.
        </p>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sauvegarde JSON */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Download size={18} className="text-orange-500" /> Sauvegarde (.JSON)
          </h2>
          <p className="text-xs text-gray-500">
            Télécharge un fichier JSON contenant la liste exacte de vos étiquettes et magasins pour reprendre votre travail plus tard sans rien perdre.
          </p>
          <button
            onClick={exportProject}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            <Download size={16} /> Exporter le projet (.JSON)
          </button>
        </div>

        {/* Restauration JSON */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Upload size={18} className="text-orange-500" /> Restauration (.JSON)
          </h2>
          <p className="text-xs text-gray-500">
            Chargez un fichier `.json` précédemment exporté pour restaurer votre projet.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            ref={fileInputRef}
            onChange={handleImportJSON}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-gray-200 hover:border-orange-400 hover:bg-orange-50/30 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            <Upload size={16} className="text-orange-500" /> Importer un projet (.JSON)
          </button>
        </div>
      </div>

      {/* Export métier final */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Download size={18} className="text-emerald-600" /> Export final des affectations (CSV)
        </h2>
        <p className="text-xs text-gray-500">
          Générez le fichier CSV d'affectation final prêt pour l'analyse sur Excel ou votre ERP.
        </p>
        <button
          onClick={handleExportCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2"
        >
          <Download size={16} /> Générer le fichier CSV d'affectations
        </button>
      </div>
    </div>
  );
};