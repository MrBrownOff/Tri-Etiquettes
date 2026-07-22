// src/store/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StoreItem {
  id: string;
  name: string;
  banner?: string;
}

export interface LabelItem {
  id: string;
  reference: string;
  filename: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  name: string;
  banner: string; // ex: "Canac", "BMR", "Rona", "Patrick Morin", "Indépendant"
  stores: string[]; // Liste des IDs de magasins assignés
  quantity?: number; // Quantité commandée (0-99)
}

// Détection automatique de la bannière à partir du nom du magasin
export const detectBannerFromName = (name: string, explicitBanner?: string): string => {
  // Si une bannière valide a déjà été fournie manuellement, on la garde
  if (explicitBanner && explicitBanner !== 'Indépendant' && explicitBanner.trim() !== '') {
    return explicitBanner.trim();
  }

  const upper = name.toUpperCase();

  if (upper.includes('BMR')) return 'BMR';
  if (upper.includes('CANAC')) return 'Canac';
  if (upper.includes('RONA')) return 'Rona';
  if (upper.includes('PATRICK MORIN')) return 'Patrick Morin';
  return 'Indépendant';
};

interface AppState {
  labels: LabelItem[];
  stores: StoreItem[];

  // Actions Magasins
  addStore: (name: string, banner?: string) => void;
  addStoresBatch: (stores: (string | { name: string; banner?: string })[]) => void;
  updateStoreBanner: (storeIds: string[], banner: string) => void;
  deleteStore: (id: string) => void;
  deleteStoresBatch: (storeIds: string[]) => void;
  autoFixBanners: () => void;

  // Actions Étiquettes
  setLabels: (labels: LabelItem[]) => void;
  updateLabel: (id: string, updatedFields: Partial<LabelItem>) => void;
  assignStoresToLabels: (labelIds: string[], storeIds: string[]) => void;
  removeStoresFromLabels: (labelIds: string[], storeIds: string[]) => void;
  clearLabels: () => void;

  // Gestion de Projet (JSON)
  exportProject: () => void;
  importProject: (jsonData: { labels: LabelItem[]; stores: StoreItem[] }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      labels: [],
      stores: [
        { id: '1', name: 'Canac Lévis', banner: 'Canac' },
        { id: '2', name: 'Rona', banner: 'Rona' },
        { id: '3', name: 'Home Depot', banner: 'Home Depot' },
      ],

      addStore: (name, banner) =>
        set((state) => ({
          stores: [
            ...state.stores,
            {
              id: crypto.randomUUID(),
              name: name.trim(),
              banner: detectBannerFromName(name, banner),
            },
          ],
        })),

      addStoresBatch: (newStoresInput) =>
        set((state) => {
          const newStores = newStoresInput
            .map((s) => {
              if (typeof s === 'string') {
                return { name: s.trim(), banner: undefined };
              }
              return { name: s.name.trim(), banner: s.banner?.trim() };
            })
            .filter((s) => s.name.length > 0)
            .map((s) => ({
              id: crypto.randomUUID(),
              name: s.name,
              banner: detectBannerFromName(s.name, s.banner),
            }));
          return { stores: [...state.stores, ...newStores] };
        }),

      autoFixBanners: () =>
        set((state) => ({
          stores: state.stores.map((s) => ({
            ...s,
            banner: detectBannerFromName(s.name, s.banner),
          })),
        })),

      updateStoreBanner: (storeIds, banner) =>
        set((state) => ({
          stores: state.stores.map((s) =>
            storeIds.includes(s.id) ? { ...s, banner: banner.trim() } : s
          ),
        })),

      deleteStore: (id) =>
        set((state) => ({
          stores: state.stores.filter((s) => s.id !== id),
          // Nettoie aussi les magasins supprimés sur les étiquettes
          labels: state.labels.map((l) => ({
            ...l,
            stores: l.stores.filter((sId) => sId !== id),
          })),
        })),

      deleteStoresBatch: (storeIds) =>
        set((state) => ({
          stores: state.stores.filter((s) => !storeIds.includes(s.id)),
          // Nettoie aussi les magasins supprimés sur les étiquettes
          labels: state.labels.map((l) => ({
            ...l,
            stores: l.stores.filter((sId) => !storeIds.includes(sId)),
          })),
        })),

      setLabels: (labels) => set({ labels }),

      updateLabel: (id, updatedFields) =>
        set((state) => ({
          labels: state.labels.map((l) => (l.id === id ? { ...l, ...updatedFields } : l)),
        })),

      assignStoresToLabels: (labelIds, storeIds) =>
        set((state) => ({
          labels: state.labels.map((l) => {
            if (labelIds.includes(l.id)) {
              const newStores = Array.from(new Set([...l.stores, ...storeIds]));
              return { ...l, stores: newStores };
            }
            return l;
          }),
        })),

      removeStoresFromLabels: (labelIds, storeIds) =>
        set((state) => ({
          labels: state.labels.map((l) => {
            if (labelIds.includes(l.id)) {
              return { ...l, stores: l.stores.filter((id) => !storeIds.includes(id)) };
            }
            return l;
          }),
        })),

      clearLabels: () => set({ labels: [] }),

      // Exporter tout le projet en JSON
      exportProject: () => {
        const data = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          stores: get().stores,
          labels: get().labels,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `labelflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      },

      // Importer un projet JSON existant
      importProject: (jsonData) => {
        if (jsonData.stores && jsonData.labels) {
          set({
            stores: jsonData.stores,
            labels: jsonData.labels,
          });
        }
      },
    }),
    {
      name: 'labelflow-storage', // Clé de sauvegarde automatique dans LocalStorage
    }
  )
);