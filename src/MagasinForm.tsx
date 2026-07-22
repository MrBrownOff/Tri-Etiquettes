import React, { useState } from 'react';
import { Magasin } from './types';
import { Plus } from 'lucide-react';

interface MagasinFormProps {
  onAddMagasin: (magasin: Magasin) => void;
}

export const MagasinForm: React.FC<MagasinFormProps> = ({ onAddMagasin }) => {
  const [nom, setNom] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const nouveauMagasin: Magasin = {
      id: crypto.randomUUID(),
      nom: nom.trim(),
    };

    onAddMagasin(nouveauMagasin);
    setNom('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <input
        type="text"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom du magasin (ex: Canac Lévis)..."
        required
        className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-slate-500 transition"
      />
      <button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
      >
        <Plus size={14} />
        Ajouter
      </button>
    </form>
  );
};