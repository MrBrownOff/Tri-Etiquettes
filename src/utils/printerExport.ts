import jsPDF from 'jspdf';
import { LabelItem, StoreItem } from '../store/store';

const getLabelImageSrc = (label: LabelItem): string =>
  label.thumbnailUrl || label.imageUrl || `${import.meta.env.BASE_URL}labels/${label.reference}.jpg`;

const loadImage = (src: string): Promise<{ dataUrl: string; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas non disponible'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error(`Impossible de charger l'image de l'étiquette : ${src}`));
    img.src = src;
  });

const storeNamesForLabel = (label: LabelItem, stores: StoreItem[]): string =>
  label.stores
    .map((id) => stores.find((s) => s.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(', ') || '—';

// Génère un PDF prêt pour l'imprimeur : une page de garde récapitulative,
// suivie d'une page par exemplaire commandé de chaque étiquette.
export const generatePrinterPDF = async (labels: LabelItem[], stores: StoreItem[]) => {
  const orderedLabels = labels.filter((l) => (l.quantity ?? 0) > 0);
  if (orderedLabels.length === 0) {
    throw new Error("Aucune étiquette n'a de quantité renseignée.");
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Page de garde
  doc.setFontSize(18);
  doc.text('Bon de commande — Étiquettes', margin, margin);
  doc.setFontSize(10);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-CA')}`, margin, margin + 7);

  const col = { file: margin, qty: margin + 95, stores: margin + 115 };
  let y = margin + 20;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Fichier', col.file, y);
  doc.text('Qté', col.qty, y);
  doc.text('Magasin(s)', col.stores, y);
  doc.setFont('helvetica', 'normal');
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  let total = 0;
  for (const label of orderedLabels) {
    const qty = label.quantity ?? 0;
    total += qty;
    const storeNames = storeNamesForLabel(label, stores);

    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    const fileLines = doc.splitTextToSize(label.filename || label.reference, col.qty - col.file - 5);
    const storeLines = doc.splitTextToSize(storeNames, pageWidth - margin - col.stores);
    const lineCount = Math.max(fileLines.length, storeLines.length);

    doc.text(fileLines, col.file, y);
    doc.text(String(qty), col.qty, y);
    doc.text(storeLines, col.stores, y);

    y += lineCount * 5 + 3;
  }

  if (y > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total étiquettes à imprimer : ${total}`, margin, y);
  doc.setFont('helvetica', 'normal');

  // Pages d'étiquettes : une page par exemplaire commandé
  for (const label of orderedLabels) {
    const qty = label.quantity ?? 0;
    let image;
    try {
      image = await loadImage(getLabelImageSrc(label));
    } catch {
      continue;
    }

    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2 - 10;
    const ratio = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    const x = (pageWidth - w) / 2;
    const imgY = (pageHeight - h) / 2 - 5;

    for (let i = 0; i < qty; i++) {
      doc.addPage();
      doc.addImage(image.dataUrl, 'JPEG', x, imgY, w, h);
      doc.setFontSize(9);
      doc.text(`${label.reference} (${i + 1}/${qty})`, pageWidth / 2, pageHeight - margin + 5, { align: 'center' });
    }
  }

  doc.save(`commande_impression_etiquettes_${new Date().toISOString().slice(0, 10)}.pdf`);
};
