import React, { useState, useMemo } from 'react';

// --- TYPES ---
export interface Etiquette {
  id: string;
  nom: string;
  couleur: string;
}

export interface Banniere {
  id: string;
  nom: string;
}

export interface Magasin {
  id: string;
  nom: string;
  banniereId: string;
}

interface Props {
  etiquettes: Etiquette[];
  bannieres: Banniere[];
  magasins: Magasin[];
  onAssigner: (data: {
    etiquetteIds: string[];
    typeCible: 'banniere' | 'magasins';
    banniereId?: string;
    magasinIds?: string[];
  }) => void;
}

export const GestionEtiquettes: React.FC<Props> = ({
  etiquettes,
  bannieres,
  magasins,
  onAssigner,
}) => {
  // Sélection des étiquettes
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // État de la modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<'banniere' | 'magasins'>('banniere');
  const [selectedBanniereId, setSelectedBanniereId] = useState<string>('');
  const [selectedMagasinIds, setSelectedMagasinIds] = useState<string[]>([]);
  const [searchMagasin, setSearchMagasin] = useState('');

  // --- GESTION SELECTION ETIQUETTES ---
  const isAllSelected = etiquettes.length > 0 && selectedTagIds.length === etiquettes.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTagIds([]);
    } else {
      setSelectedTagIds(etiquettes.map((e) => e.id));
    }
  };

  const toggleSelectTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // --- FILTRAGE DES MAGASINS POUR LA MODAL ---
  const magasinsFiltres = useMemo(() => {
    return magasins.filter((m) =>
      m.nom.toLowerCase().includes(searchMagasin.toLowerCase())
    );
  }, [magasins, searchMagasin]);

  const toggleSelectMagasin = (id: string) => {
    setSelectedMagasinIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // --- SOUMISSION ---
  const handleConfirmAssignation = () => {
    onAssigner({
      etiquetteIds: selectedTagIds,
      typeCible: targetType,
      banniereId: targetType === 'banniere' ? selectedBanniereId : undefined,
      magasinIds: targetType === 'magasins' ? selectedMagasinIds : undefined,
    });

    // Réinitialisation
    setIsModalOpen(false);
    setSelectedTagIds([]);
    setSelectedMagasinIds([]);
    setSelectedBanniereId('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Gestion des Étiquettes</h1>

      {/* BARRE D'ACTION GROUPEE (Flottante ou en en-tête) */}
      {selectedTagIds.length > 0 && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between shadow-sm">
          <span className="text-indigo-900 font-medium">
            🎯 <strong>{selectedTagIds.length}</strong> étiquette(s) sélectionnée(s)
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow transition-colors"
          >
            Affecter à...
          </button>
        </div>
      )}

      {/* TABLEAU DES ETIQUETTES */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
            <tr>
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="p-4">Étiquette</th>
              <th className="p-4">Aperçu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {etiquettes.map((tag) => {
              const isChecked = selectedTagIds.includes(tag.id);
              return (
                <tr
                  key={tag.id}
                  onClick={() => toggleSelectTag(tag.id)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    isChecked ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectTag(tag.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-medium text-gray-800">{tag.nom}</td>
                  <td className="p-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: tag.couleur || '#6B7280' }}
                    >
                      {tag.nom}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FENÊTRE MODALE D'AFFECTATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative space-y-6">
            <h2 className="text-xl font-bold text-gray-900">
              Affecter ({selectedTagIds.length}) étiquette(s)
            </h2>

            {/* CHOIX DU TYPE DE CIBLE */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Appliquer à :</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetType('banniere')}
                  className={`p-3 border rounded-lg text-sm font-medium text-center transition-all ${
                    targetType === 'banniere'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  🏢 Une Bannière
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('magasins')}
                  className={`p-3 border rounded-lg text-sm font-medium text-center transition-all ${
                    targetType === 'magasins'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  🏪 Magasin(s)
                </button>
              </div>
            </div>

            {/* OPTION A : SÉLECTION BANNIÈRE */}
            {targetType === 'banniere' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Choisir la bannière</label>
                <select
                  value={selectedBanniereId}
                  onChange={(e) => setSelectedBanniereId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Sélectionner une bannière --</option>
                  {bannieres.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Toutes les étiquettes s'appliqueront automatiquement à l'ensemble des magasins liés à cette bannière.
                </p>
              </div>
            )}

            {/* OPTION B : SÉLECTION DE PLUSIEURS MAGASINS */}
            {targetType === 'magasins' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Rechercher un magasin..."
                  value={searchMagasin}
                  onChange={(e) => setSearchMagasin(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
                  {magasinsFiltres.map((m) => {
                    const isChecked = selectedMagasinIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center justify-between p-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                      >
                        <span className="text-gray-700">{m.nom}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectMagasin(m.id)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {selectedMagasinIds.length} magasin(s) sélectionné(s)
                </div>
              </div>
            )}

            {/* BOUTONS D'ACTION */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  targetType === 'banniere'
                    ? !selectedBanniereId
                    : selectedMagasinIds.length === 0
                }
                onClick={handleConfirmAssignation}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};