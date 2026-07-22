// src/components/StoresView.tsx
import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/store';
import { Store, Plus, Trash2, Upload, Search, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export const StoresView: React.FC = () => {
  const { stores, addStore, addStoresBatch, deleteStore, autoFixBanners } = useAppStore();
  const [newStoreName, setNewStoreName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ajout manuel d'un magasin
  const handleAddSingleStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    addStore(newStoreName.trim());
    setNewStoreName('');
  };

  // Traitement de l'importation CSV
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const extractedNames: string[] = [];

      lines.forEach((line, index) => {
        const cleaned = line.trim();
        if (!cleaned) return;

        // Si la première ligne ressemble à une en-tête (ex: "Nom", "Name", "Magasin"), on l'ignore
        if (index === 0 && (cleaned.toLowerCase().includes('nom') || cleaned.toLowerCase().includes('name') || cleaned.toLowerCase().includes('magasin'))) {
          return;
        }

        // On prend la première valeur si c'est séparé par virgule ou point-virgule
        const storeName = cleaned.split(/[,;]/)[0].replace(/^["']|["']$/g, '').trim();
        if (storeName) {
          extractedNames.push(storeName);
        }
      });

      if (extractedNames.length > 0) {
        addStoresBatch(extractedNames);
        setImportMessage(`${extractedNames.length} magasin(s) importé(s) avec succès !`);
        setTimeout(() => setImportMessage(null), 4000);
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filtrage des magasins
  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Store className="text-orange-500" size={28} />
            Gestion des Magasins
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez votre répertoire de magasins et importez facilement vos listes CSV.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stores.length > 0 && (
            <button
              onClick={autoFixBanners}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl font-medium transition flex items-center gap-1.5 shadow-2xs border border-slate-750 cursor-pointer"
            >
              ⚡ Réorganiser automatiquement les bannières
            </button>
          )}

          <div className="text-right bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-2xs">
            <span className="text-xs text-gray-400 font-semibold uppercase">Total Magasins</span>
            <p className="text-2xl font-bold text-gray-800">{stores.length}</p>
          </div>
        </div>
      </div>

      {/* Message de succès import */}
      {importMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {importMessage}
        </div>
      )}

      {/* Blocs d'action : Ajout unique + Import CSV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module : Ajout manuel */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Plus size={18} className="text-orange-500" /> Ajouter un magasin
          </h2>
          <form onSubmit={handleAddSingleStore} className="flex gap-2">
            <input
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="Nom du magasin (ex: Canac Lévis)..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            />
            <button
              type="submit"
              disabled={!newStoreName.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
            >
              Ajouter
            </button>
          </form>
        </div>

        {/* Module : Importation CSV */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-orange-500" /> Importer une liste CSV
          </h2>
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileInputRef}
            onChange={handleCSVImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50/30 text-gray-600 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Upload size={18} className="text-orange-500" />
            Parcourir et charger un fichier CSV
          </button>
          <p className="text-xs text-gray-400 text-center">
            Format accepté : Fichier CSV avec 1 nom de magasin par ligne (ou colonne "Nom").
          </p>
        </div>
      </div>

      {/* Liste des magasins */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Recherche dans la liste */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer les magasins par nom..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            />
          </div>
        </div>

        {/* Tableau / Liste */}
        {filteredStores.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Store size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">Aucun magasin trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredStores.map((store, index) => (
              <div
                key={store.id}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 w-8">{index + 1}.</span>
                  <span className="font-semibold text-gray-800 text-sm">{store.name}</span>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm(`Voulez-vous vraiment supprimer "${store.name}" ?`)) {
                      deleteStore(store.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-red-50"
                  title="Supprimer le magasin"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};