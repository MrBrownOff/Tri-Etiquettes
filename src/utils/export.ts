import { LabelItem, StoreItem } from '../store/store';

export const generateExports = (labels: LabelItem[], stores: StoreItem[]) => {
  const jsonPayload = {
    labels: labels.map(l => ({
      reference: l.reference,
      stores: l.stores.map(storeId => stores.find(s => s.id === storeId)?.name).filter(Boolean)
    }))
  };

  const jsonBlob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);

  let csvContent = "Reference;Magasins\n";
  labels.forEach(l => {
    const storeNames = l.stores
      .map(storeId => stores.find(s => s.id === storeId)?.name)
      .filter(Boolean)
      .join('|');
    csvContent += `${l.reference};${storeNames}\n`;
  });

  const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const csvUrl = URL.createObjectURL(csvBlob);

  return { jsonUrl, csvUrl };
};