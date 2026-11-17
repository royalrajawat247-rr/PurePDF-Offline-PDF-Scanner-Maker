import { jsPDF } from 'jspdf';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {
  CompressionPreset,
  PageSizeOption,
  ScanQualityPreset,
  WatermarkColor,
  WatermarkPosition,
} from '../types';
import { getCompressionPresetConfig, getScanQualityConfig } from './documentMath';
import { optimizeImageForQuality } from './imageFilters';
import { encryptPdfBytes } from './pdfCrypto';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

async function loadImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number; img: HTMLImageElement }> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for PDF generation.'));
    img.src = dataUrl;
  });
  return {
    width: img.naturalWidth || img.width || 800,
    height: img.naturalHeight || img.height || 1000,
    img,
  };
}

function detectImageFormat(dataUrl: string): 'JPEG' | 'PNG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

export async function generatePdfFromImages(
  images: Array<{ dataUrl: string }>,
  options: {
    pageSize: PageSizeOption;
    marginMm?: number;
    title?: string;
    scanQuality?: ScanQualityPreset;
  }
): Promise<{ bytes: Uint8Array; pageCount: number; thumbnailDataUrl: string }> {
  if (images.length === 0) {
    throw new Error('Add at least one image to build a PDF.');
  }

  const scanQuality = options.scanQuality ?? 'high-hd';
  const qualityCfg = getScanQualityConfig(scanQuality);
  const margin = options.marginMm ?? 8;
  let doc: jsPDF | null = null;
  let firstThumbnail = images[0].dataUrl;

  for (let i = 0; i < images.length; i++) {
    const processedUrl =
      scanQuality === 'high-hd'
        ? images[i].dataUrl
        : await optimizeImageForQuality(images[i].dataUrl, scanQuality).catch(
            () => images[i].dataUrl
          );
    if (i === 0) {
      firstThumbnail = processedUrl;
    }

    const { width, height } = await loadImageDimensions(processedUrl);
    const isLandscape = width > height;

    let pageW = 210;
    let pageH = 297;
    if (options.pageSize === 'letter') {
      pageW = isLandscape ? 279.4 : 215.9;
      pageH = isLandscape ? 215.9 : 279.4;
    } else if (options.pageSize === 'a4') {
      pageW = isLandscape ? 297 : 210;
      pageH = isLandscape ? 210 : 297;
    } else {
      // Auto: preserve image proportions normalized to ~210mm width
      const pxToMm = 210 / Math.max(width, 1);
      pageW = Math.max(80, Math.round(width * pxToMm));
      pageH = Math.max(80, Math.round(height * pxToMm));
    }

    const orientation = pageW > pageH ? 'landscape' : 'portrait';
    if (!doc) {
      doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [pageW, pageH],
        compress: true,
      });
    } else {
      doc.addPage([pageW, pageH], orientation);
    }

    const activeMargin = options.pageSize === 'auto' ? 0 : margin;
    const availW = Math.max(10, pageW - activeMargin * 2);
    const availH = Math.max(10, pageH - activeMargin * 2);
    const ratio = Math.min(availW / width, availH / height);
    const drawW = width * ratio;
    const drawH = height * ratio;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    doc.addImage(
      processedUrl,
      detectImageFormat(processedUrl),
      x,
      y,
      drawW,
      drawH,
      undefined,
      qualityCfg.pdfCompression
    );
  }

  if (options.title && doc) {
    doc.setProperties({ title: options.title });
  }

  const ab = doc!.output('arraybuffer');
  const bytes = new Uint8Array(ab);
  return {
    bytes,
    pageCount: images.length,
    thumbnailDataUrl: firstThumbnail,
  };
}

export async function renderPdfThumbnails(
  pdfBytes: Uint8Array,
  maxPages = 16,
  scale = 0.45
): Promise<{ pageCount: number; thumbnails: string[] }> {
  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
  try {
    loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(),
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    const count = Math.min(pdf.numPages, maxPages);
    const thumbnails: string[] = [];

    for (let p = 1; p <= count; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        thumbnails.push(canvas.toDataURL('image/jpeg', 0.8));
      }
      canvas.width = 0;
      canvas.height = 0;
    }

    return { pageCount: pdf.numPages, thumbnails };
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Unable to render PDF page previews.'
    );
  } finally {
    if (loadingTask) {
      await loadingTask.destroy().catch(() => {});
    }
  }
}

export async function getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
  try {
    const doc = await PDFDocument.load(pdfBytes);
    return doc.getPageCount();
  } catch {
    throw new Error('Unable to read PDF. Make sure it is a valid, unencrypted PDF.');
  }
}

export async function mergePdfFiles(
  buffers: Uint8Array[]
): Promise<{ bytes: Uint8Array; pageCount: number; thumbnailDataUrl?: string }> {
  if (buffers.length < 2) {
    throw new Error('Select at least 2 PDF files to merge.');
  }
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const copied = await merged.copyPages(src, src.getPageIndices());
    for (const page of copied) {
      merged.addPage(page);
    }
  }
  const bytes = await merged.save({ useObjectStreams: false });
  const preview = await renderPdfThumbnails(bytes, 1, 0.35).catch(() => ({
    pageCount: merged.getPageCount(),
    thumbnails: [],
  }));
  return {
    bytes,
    pageCount: merged.getPageCount(),
    thumbnailDataUrl: preview.thumbnails[0],
  };
}

export async function splitPdfFile(
  buffer: Uint8Array,
  pageIndicesZeroBased: number[]
): Promise<{ bytes: Uint8Array; pageCount: number; thumbnailDataUrl?: string }> {
  if (pageIndicesZeroBased.length === 0) {
    throw new Error('Select at least one page to extract.');
  }
  const src = await PDFDocument.load(buffer);
  const max = src.getPageCount();
  const validIndices = pageIndicesZeroBased.filter((i) => i >= 0 && i < max);
  if (validIndices.length === 0) {
    throw new Error('Selected page numbers are out of range.');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, validIndices);
  for (const page of copied) {
    out.addPage(page);
  }
  const bytes = await out.save({ useObjectStreams: false });
  const preview = await renderPdfThumbnails(bytes, 1, 0.35).catch(() => ({
    pageCount: out.getPageCount(),
    thumbnails: [],
  }));
  return {
    bytes,
    pageCount: out.getPageCount(),
    thumbnailDataUrl: preview.thumbnails[0],
  };
}

export async function compressPdfFile(
  buffer: Uint8Array,
  preset: CompressionPreset,
  onProgress?: (pct: number) => void
): Promise<{ bytes: Uint8Array; pageCount: number; thumbnailDataUrl?: string }> {
  const cfg = getCompressionPresetConfig(preset);
  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
  try {
    loadingTask = pdfjsLib.getDocument({
      data: buffer.slice(),
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;

    let outDoc: jsPDF | null = null;
    let firstThumb: string | undefined;

    for (let p = 1; p <= total; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: cfg.renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      const jpegUrl = canvas.toDataURL('image/jpeg', cfg.jpegQuality);
      canvas.width = 0;
      canvas.height = 0;
      if (!firstThumb) firstThumb = jpegUrl;

      const baseViewport = page.getViewport({ scale: 1 });
      const widthMm = (baseViewport.width * 25.4) / 72;
      const heightMm = (baseViewport.height * 25.4) / 72;
      const orientation = widthMm > heightMm ? 'landscape' : 'portrait';

      if (!outDoc) {
        outDoc = new jsPDF({
          orientation,
          unit: 'mm',
          format: [widthMm, heightMm],
          compress: true,
        });
      } else {
        outDoc.addPage([widthMm, heightMm], orientation);
      }
      outDoc.addImage(jpegUrl, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
      onProgress?.(Math.round((p / total) * 100));
    }

    if (!outDoc) {
      throw new Error('Could not render PDF pages for compression.');
    }
    const bytes = new Uint8Array(outDoc.output('arraybuffer'));
    return {
      bytes,
      pageCount: total,
      thumbnailDataUrl: firstThumb,
    };
  } finally {
    if (loadingTask) {
      await loadingTask.destroy().catch(() => {});
    }
  }
}

export async function signAndLockPdf(
  buffer: Uint8Array,
  signatureDataUrl: string | null,
  placement: {
    pageNumber: number;
    position: 'bottom-right' | 'bottom-center' | 'bottom-left';
  },
  password?: string
): Promise<{ bytes: Uint8Array; pageCount: number; thumbnailDataUrl?: string; isPdfEncrypted: boolean }> {
  const doc = await PDFDocument.load(buffer);
  const pageCount = doc.getPageCount();

  if (signatureDataUrl) {
    const pngBytes = await fetch(signatureDataUrl).then((r) => r.arrayBuffer());
    const sigImage = await doc.embedPng(pngBytes);
    const targetIdx = Math.max(0, Math.min(pageCount - 1, placement.pageNumber - 1));
    const page = doc.getPage(targetIdx);
    const { width, height } = page.getSize();

    const targetW = Math.min(150, width * 0.28);
    const aspect = sigImage.height / Math.max(1, sigImage.width);
    const targetH = targetW * aspect;
    const margin = 36;
    const y = Math.max(24, Math.min(height - targetH - 24, margin));

    let x = width - targetW - margin;
    if (placement.position === 'bottom-center') {
      x = (width - targetW) / 2;
    } else if (placement.position === 'bottom-left') {
      x = margin;
    }

    page.drawImage(sigImage, {
      x,
      y,
      width: targetW,
      height: targetH,
    });
  }

  let bytes = await doc.save({ useObjectStreams: false });
  const preview = await renderPdfThumbnails(bytes, 1, 0.35).catch(() => ({
    pageCount,
    thumbnails: [],
  }));

  let isPdfEncrypted = false;
  if (password && password.trim().length > 0) {
    bytes = encryptPdfBytes(bytes, password.trim());
    isPdfEncrypted = true;
  }

  return {
    bytes,
    pageCount,
    thumbnailDataUrl: preview.thumbnails[0],
    isPdfEncrypted,
  };
}

export interface RenderedJpgPage {
  pageNumber: number;
  filename: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function renderPdfToJpgPages(
  pdfBytes: Uint8Array,
  options: { baseName: string; scale?: number; quality?: number } = { baseName: 'document' },
  onProgress?: (pct: number) => void
): Promise<RenderedJpgPage[]> {
  const scale = options.scale ?? 1.8;
  const quality = options.quality ?? 0.9;
  const cleanBase = options.baseName.replace(/\.pdf$/i, '').trim() || 'document';
  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;

  try {
    loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(),
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;
    const pages: RenderedJpgPage[] = [];

    for (let p = 1; p <= total; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Part = dataUrl.slice(dataUrl.indexOf(',') + 1);
        const approxBytes = Math.round((base64Part.length * 3) / 4);
        pages.push({
          pageNumber: p,
          filename: `${cleanBase}-page-${p}.jpg`,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          sizeBytes: approxBytes,
        });
      }
      canvas.width = 0;
      canvas.height = 0;
      onProgress?.(Math.round((p / total) * 100));
    }

    return pages;
  } finally {
    if (loadingTask) {
      await loadingTask.destroy().catch(() => {});
    }
  }
}

export async function watermarkPdfFile(
  buffer: Uint8Array,
  options: {
    text: string;
    position: WatermarkPosition;
    opacity: number;
    fontSize: number;
    color: WatermarkColor;
  }
): Promise<{ bytes: Uint8Array; pageCount: number; thumbnailDataUrl?: string }> {
  const cleanText = options.text.trim();
  if (!cleanText) {
    throw new Error('Enter watermark text before stamping.');
  }

  const doc = await PDFDocument.load(buffer);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageCount = doc.getPageCount();
  const safeOpacity = Math.max(0.08, Math.min(0.85, options.opacity));
  const safeSize = Math.max(12, Math.min(96, options.fontSize));

  const colorRgb =
    options.color === 'blue'
      ? rgb(0.145, 0.388, 0.922)
      : options.color === 'red'
        ? rgb(0.863, 0.149, 0.149)
        : rgb(0.2, 0.255, 0.333);

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const effectiveSize = Math.min(safeSize, Math.max(14, width * 0.12));
    const textWidth = font.widthOfTextAtSize(cleanText, effectiveSize);

    if (options.position === 'diagonal') {
      const angleRad = Math.PI / 4;
      const dx = (textWidth / 2) * Math.cos(angleRad);
      const dy = (textWidth / 2) * Math.sin(angleRad);
      page.drawText(cleanText, {
        x: width / 2 - dx,
        y: height / 2 - dy,
        size: effectiveSize,
        font,
        color: colorRgb,
        opacity: safeOpacity,
        rotate: degrees(45),
      });
    } else if (options.position === 'top-right') {
      const margin = 28;
      const smallSize = Math.min(effectiveSize, 24);
      const smallW = font.widthOfTextAtSize(cleanText, smallSize);
      page.drawText(cleanText, {
        x: Math.max(margin, width - smallW - margin),
        y: height - smallSize - margin,
        size: smallSize,
        font,
        color: colorRgb,
        opacity: safeOpacity,
      });
    } else {
      const margin = 26;
      const smallSize = Math.min(effectiveSize, 22);
      const smallW = font.widthOfTextAtSize(cleanText, smallSize);
      page.drawText(cleanText, {
        x: Math.max(16, (width - smallW) / 2),
        y: margin,
        size: smallSize,
        font,
        color: colorRgb,
        opacity: safeOpacity,
      });
    }
  }

  const bytes = await doc.save({ useObjectStreams: false });
  const preview = await renderPdfThumbnails(bytes, 1, 0.35).catch(() => ({
    pageCount,
    thumbnails: [],
  }));

  return {
    bytes,
    pageCount,
    thumbnailDataUrl: preview.thumbnails[0],
  };
}
