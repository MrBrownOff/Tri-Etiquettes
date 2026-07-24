// src/store/store.ts
import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  WriteBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

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

// Trace historisée d'un PDF généré pour l'imprimeur : on ne conserve pas le fichier
// lui-même (ça demanderait Firebase Storage), seulement les informations qu'il contenait.
export interface PrintHistoryEntry {
  id: string;
  createdAt: Timestamp | null;
  totalReferences: number;
  totalQuantity: number;
  storeNames: string[];
  items: { reference: string; quantity: number; storeNames: string[] }[];
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
  printHistory: PrintHistoryEntry[];
  isLoading: boolean;

  // Actions Magasins
  addStore: (name: string, banner?: string) => Promise<void>;
  addStoresBatch: (stores: (string | { name: string; banner?: string })[]) => Promise<void>;
  updateStoreBanner: (storeIds: string[], banner: string) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  deleteStoresBatch: (storeIds: string[]) => Promise<void>;
  autoFixBanners: () => Promise<void>;

  // Actions Étiquettes
  addLabelsBatch: (labels: LabelItem[]) => Promise<void>;
  updateLabel: (id: string, updatedFields: Partial<LabelItem>) => void;
  deleteLabel: (id: string) => Promise<void>;
  assignStoresToLabels: (labelIds: string[], storeIds: string[]) => Promise<void>;
  removeStoresFromLabels: (labelIds: string[], storeIds: string[]) => Promise<void>;
  clearLabels: () => Promise<void>;

  // Gestion de Projet (JSON)
  exportProject: () => void;
  importProject: (jsonData: { labels: LabelItem[]; stores: StoreItem[] }) => Promise<void>;

  // Historique des impressions
  logPrintRun: (entry: {
    totalReferences: number;
    totalQuantity: number;
    storeNames: string[];
    items: { reference: string; quantity: number; storeNames: string[] }[];
  }) => Promise<void>;
}

const STORES_COLLECTION = 'stores';
const LABELS_COLLECTION = 'labels';
const PRINT_HISTORY_COLLECTION = 'printHistory';
const PRINT_HISTORY_LIMIT = 50;

const DEFAULT_STORES: Omit<StoreItem, 'id'>[] = [
  { name: 'Canac Lévis', banner: 'Canac' },
  { name: 'Rona', banner: 'Rona' },
  { name: 'Home Depot', banner: 'Home Depot' },
];

// Firestore limite un batch à 500 opérations ; on découpe par prudence.
const BATCH_LIMIT = 400;

const commitInChunks = async <T>(items: T[], applyOp: (batch: WriteBatch, item: T) => void) => {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((item) => applyOp(batch, item));
    await batch.commit();
  }
};

// Débounce des écritures Firestore par étiquette (évite une requête réseau par frappe
// clavier sur les champs référence/quantité) tout en gardant l'UI réactive localement.
const pendingLabelWrites = new Map<string, ReturnType<typeof setTimeout>>();
const LABEL_WRITE_DEBOUNCE_MS = 500;

export const useAppStore = create<AppState>()((set, get) => ({
  labels: [],
  stores: [],
  printHistory: [],
  isLoading: true,

  addStore: async (name, banner) => {
    const id = crypto.randomUUID();
    const batch = writeBatch(db);
    batch.set(doc(db, STORES_COLLECTION, id), {
      name: name.trim(),
      banner: detectBannerFromName(name, banner),
    });
    await batch.commit();
  },

  addStoresBatch: async (newStoresInput) => {
    const newStores = newStoresInput
      .map((s) => {
        if (typeof s === 'string') {
          return { name: s.trim(), banner: undefined as string | undefined };
        }
        return { name: s.name.trim(), banner: s.banner?.trim() };
      })
      .filter((s) => s.name.length > 0)
      .map((s) => ({
        id: crypto.randomUUID(),
        name: s.name,
        banner: detectBannerFromName(s.name, s.banner),
      }));

    await commitInChunks(newStores, (batch, s) => {
      batch.set(doc(db, STORES_COLLECTION, s.id), { name: s.name, banner: s.banner });
    });
  },

  autoFixBanners: async () => {
    await commitInChunks(get().stores, (batch, s) => {
      batch.update(doc(db, STORES_COLLECTION, s.id), { banner: detectBannerFromName(s.name, s.banner) });
    });
  },

  updateStoreBanner: async (storeIds, banner) => {
    await commitInChunks(storeIds, (batch, id) => {
      batch.update(doc(db, STORES_COLLECTION, id), { banner: banner.trim() });
    });
  },

  deleteStore: async (id) => {
    const affectedLabels = get().labels.filter((l) => l.stores.includes(id));
    const batch = writeBatch(db);
    batch.delete(doc(db, STORES_COLLECTION, id));
    await batch.commit();
    await commitInChunks(affectedLabels, (b, l) => {
      b.update(doc(db, LABELS_COLLECTION, l.id), { stores: arrayRemove(id) });
    });
  },

  deleteStoresBatch: async (storeIds) => {
    await commitInChunks(storeIds, (batch, id) => {
      batch.delete(doc(db, STORES_COLLECTION, id));
    });
    const affectedLabels = get().labels.filter((l) => l.stores.some((sId) => storeIds.includes(sId)));
    await commitInChunks(affectedLabels, (batch, l) => {
      batch.update(doc(db, LABELS_COLLECTION, l.id), {
        stores: l.stores.filter((sId) => !storeIds.includes(sId)),
      });
    });
  },

  addLabelsBatch: async (newLabels) => {
    await commitInChunks(newLabels, (batch, l) => {
      const { id, ...rest } = l;
      batch.set(doc(db, LABELS_COLLECTION, id), rest);
    });
  },

  updateLabel: (id, updatedFields) => {
    // Mise à jour optimiste immédiate pour garder la saisie fluide...
    set((state) => ({
      labels: state.labels.map((l) => (l.id === id ? { ...l, ...updatedFields } : l)),
    }));

    // ...écriture Firestore différée pour éviter une requête réseau par frappe.
    const existingTimeout = pendingLabelWrites.get(id);
    if (existingTimeout) clearTimeout(existingTimeout);
    pendingLabelWrites.set(
      id,
      setTimeout(() => {
        pendingLabelWrites.delete(id);
        updateDoc(doc(db, LABELS_COLLECTION, id), updatedFields).catch(() => {
          // L'étiquette a probablement été supprimée entre-temps : rien à faire.
        });
      }, LABEL_WRITE_DEBOUNCE_MS)
    );
  },

  deleteLabel: async (id) => {
    const pending = pendingLabelWrites.get(id);
    if (pending) {
      clearTimeout(pending);
      pendingLabelWrites.delete(id);
    }
    await deleteDoc(doc(db, LABELS_COLLECTION, id));
  },

  assignStoresToLabels: async (labelIds, storeIds) => {
    await commitInChunks(labelIds, (batch, id) => {
      batch.update(doc(db, LABELS_COLLECTION, id), { stores: arrayUnion(...storeIds) });
    });
  },

  removeStoresFromLabels: async (labelIds, storeIds) => {
    await commitInChunks(labelIds, (batch, id) => {
      batch.update(doc(db, LABELS_COLLECTION, id), { stores: arrayRemove(...storeIds) });
    });
  },

  clearLabels: async () => {
    await commitInChunks(get().labels, (batch, l) => {
      batch.delete(doc(db, LABELS_COLLECTION, l.id));
    });
  },

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

  // Importer un projet JSON existant (remplace les données partagées Firestore)
  importProject: async (jsonData) => {
    if (!jsonData.stores || !jsonData.labels) return;

    await commitInChunks(get().labels, (batch, l) => {
      batch.delete(doc(db, LABELS_COLLECTION, l.id));
    });
    await commitInChunks(get().stores, (batch, s) => {
      batch.delete(doc(db, STORES_COLLECTION, s.id));
    });
    await commitInChunks(jsonData.stores, (batch, s) => {
      const { id, ...rest } = s;
      batch.set(doc(db, STORES_COLLECTION, id), rest);
    });
    await commitInChunks(jsonData.labels, (batch, l) => {
      const { id, ...rest } = l;
      batch.set(doc(db, LABELS_COLLECTION, id), rest);
    });
  },

  logPrintRun: async (entry) => {
    await addDoc(collection(db, PRINT_HISTORY_COLLECTION), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  },
}));

let storesLoaded = false;
let labelsLoaded = false;
let defaultStoresSeeded = false;
let unsubscribeStores: (() => void) | null = null;
let unsubscribeLabels: (() => void) | null = null;
let unsubscribePrintHistory: (() => void) | null = null;

const markLoadedIfReady = () => {
  if (storesLoaded && labelsLoaded) {
    useAppStore.setState({ isLoading: false });
  }
};

// La synchronisation Firestore ne démarre qu'une fois l'utilisateur authentifié
// (les règles de sécurité exigent request.auth != null) et s'arrête à la déconnexion.
const startFirestoreSync = () => {
  storesLoaded = false;
  labelsLoaded = false;

  unsubscribeStores = onSnapshot(
    collection(db, STORES_COLLECTION),
    async (snapshot) => {
      // Amorce les magasins par défaut si la collection est vide au tout premier chargement.
      if (snapshot.empty && !storesLoaded && !defaultStoresSeeded) {
        defaultStoresSeeded = true;
        const batch = writeBatch(db);
        for (const s of DEFAULT_STORES) {
          batch.set(doc(collection(db, STORES_COLLECTION)), s);
        }
        await batch.commit();
        return; // le prochain snapshot contiendra les magasins par défaut
      }

      const stores = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as StoreItem);
      useAppStore.setState({ stores });
      storesLoaded = true;
      markLoadedIfReady();
    },
    (error) => console.error('Erreur de synchronisation des magasins :', error)
  );

  unsubscribeLabels = onSnapshot(
    collection(db, LABELS_COLLECTION),
    (snapshot) => {
      const labels = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as LabelItem);
      useAppStore.setState({ labels });
      labelsLoaded = true;
      markLoadedIfReady();
    },
    (error) => console.error('Erreur de synchronisation des étiquettes :', error)
  );

  unsubscribePrintHistory = onSnapshot(
    query(collection(db, PRINT_HISTORY_COLLECTION), orderBy('createdAt', 'desc'), limit(PRINT_HISTORY_LIMIT)),
    (snapshot) => {
      const printHistory = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PrintHistoryEntry);
      useAppStore.setState({ printHistory });
    },
    (error) => console.error("Erreur de synchronisation de l'historique d'impression :", error)
  );
};

const stopFirestoreSync = () => {
  unsubscribeStores?.();
  unsubscribeLabels?.();
  unsubscribePrintHistory?.();
  unsubscribeStores = null;
  unsubscribeLabels = null;
  unsubscribePrintHistory = null;
  defaultStoresSeeded = false;
  useAppStore.setState({ labels: [], stores: [], printHistory: [], isLoading: true });
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    startFirestoreSync();
  } else {
    stopFirestoreSync();
  }
});
