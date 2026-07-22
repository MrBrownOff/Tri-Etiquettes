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
  const total = orderedLabels.reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  // Page de garde — toujours condensée sur une seule page, quel que soit le nombre de références
  doc.setFontSize(16);
  doc.text('Bon de commande — Étiquettes', margin, margin);
  doc.setFontSize(9);
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-CA')} — ${orderedLabels.length} référence(s), ${total} étiquette(s) au total`,
    margin,
    margin + 5
  );

  const rows = orderedLabels.map((label) => ({
    ref: label.reference,
    qty: label.quantity ?? 0,
    storeNames: storeNamesForLabel(label, stores),
  }));

  const totalLineY = pageHeight - margin;
  const contentTop = margin + 12;
  const contentBottom = totalLineY - 6;
  const availableHeight = contentBottom - contentTop;

  // Bascule automatiquement sur deux colonnes si une seule colonne ne suffit pas à tenir sur la page
  const columns = rows.length > Math.floor(availableHeight / 4) ? 2 : 1;
  const rowsPerColumn = Math.ceil(rows.length / columns);
  const rowHeight = Math.min(6, Math.max(3, availableHeight / rowsPerColumn));
  const fontSize = Math.min(9, Math.max(5.5, rowHeight * 1.7));

  const gap = 8;
  const colWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const refColW = colWidth * 0.32;
  const qtyColW = colWidth * 0.14;
  const storeColW = colWidth - refColW - qtyColW;

  doc.setFontSize(fontSize);

  // Tronque une chaîne pour qu'elle tienne sur une seule ligne dans la largeur donnée
  const truncate = (text: string, maxWidth: number) => {
    if (doc.getTextWidth(text) <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxWidth) {
      t = t.slice(0, -1);
    }
    return `${t}…`;
  };

  for (let col = 0; col < columns; col++) {
    const colX = margin + col * (colWidth + gap);
    let y = contentTop;

    doc.setFont('helvetica', 'bold');
    doc.text('Réf.', colX, y);
    doc.text('Qté', colX + refColW, y);
    doc.text('Magasin(s)', colX + refColW + qtyColW, y);
    doc.setFont('helvetica', 'normal');
    y += rowHeight * 0.6;
    doc.line(colX, y, colX + colWidth, y);
    y += rowHeight * 0.9;

    const colRows = rows.slice(col * rowsPerColumn, (col + 1) * rowsPerColumn);
    for (const row of colRows) {
      doc.text(truncate(row.ref, refColW - 2), colX, y);
      doc.text(String(row.qty), colX + refColW, y);
      doc.text(truncate(row.storeNames, storeColW - 2), colX + refColW + qtyColW, y);
      y += rowHeight;
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total étiquettes à imprimer : ${total}`, margin, totalLineY);
  doc.setFont('helvetica', 'normal');

  // Pages d'étiquettes : une page par exemplaire commandé, sans légende superflue
  for (const label of orderedLabels) {
    const qty = label.quantity ?? 0;
    let image;
    try {
      image = await loadImage(getLabelImageSrc(label));
    } catch {
      continue;
    }

    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const ratio = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    const x = (pageWidth - w) / 2;
    const imgY = (pageHeight - h) / 2;

    for (let i = 0; i < qty; i++) {
      doc.addPage();
      doc.addImage(image.dataUrl, 'JPEG', x, imgY, w, h);
    }
  }

  doc.save(`commande_impression_etiquettes_${new Date().toISOString().slice(0, 10)}.pdf`);
};
