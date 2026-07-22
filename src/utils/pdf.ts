import * as pdfjsLib from 'pdfjs-dist';
import { initOCR, extractReferenceFromImage } from './ocr';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const processPDF = async (
  file: File,
  onProgress: (current: number, total: number) => void
) => {
  const workerInstance = await initOCR();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const extractedLabels = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Appel conforme à la version qui accepte workerInstance
    const ocrResult = await extractReferenceFromImage(canvas, workerInstance);

    extractedLabels.push({
      id: crypto.randomUUID(),
      ...ocrResult,
      stores: [],
      isValidated: false
    });

    onProgress(pageNum, pdf.numPages);
  }

  return extractedLabels;
};