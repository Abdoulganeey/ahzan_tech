import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import {
  AGRO_PRICE_LIST_2026,
  LITHIUM_ASSAY_GRADE_PCT,
  LITHIUM_RATE_PER_PERCENT_USD,
  LUBRICANT_PRICE_LIST_2026,
} from '../data/priceLists';
import {
  COMMODITY_PRODUCTS,
  INCOTERMS_DATA,
  type IncotermCode,
} from '../data/tradeData';
import type { ManifestLineItem } from '../components/DealRoomModal';

const NAVY_HEX = '#163269';
const NAVY_RGB: [number, number, number] = [22, 50, 105];
const SLATE_900_RGB: [number, number, number] = [15, 23, 42];
const SLATE_700_RGB: [number, number, number] = [51, 65, 85];
const SLATE_500_RGB: [number, number, number] = [100, 116, 139];
const ICE_BLUE_RGB: [number, number, number] = [241, 245, 249];
const BORDER_RGB: [number, number, number] = [203, 213, 225];
const SECTION_BG_RGB: [number, number, number] = [226, 232, 240];

const LOGO_PATH = './assets/aistudio/IMG_2443_68d163ee.jpeg';
const SIGNATURE_PATH = './assets/aistudio/IMG_2328_b5a58b95.jpeg';
const QR_WHATSAPP_PATH = './assets/aistudio/IMG_2394_3daa3b3c.jpeg';
const QR_WECHAT_CEO_PATH = './assets/aistudio/IMG_2393_550da0e0.jpeg';
const QR_WECHAT_DESK_PATH = './assets/aistudio/IMG_2392_9b6196cb.jpeg';

export type PriceScheduleExportTab = 'minerals' | 'agro' | 'lubricants';

export interface PdfMarketOverrides {
  lithiumRatePerPercentUsd?: number;
  lithiumAssayPct?: number;
  agroIssueDate?: string;
  lubricantIssueDate?: string;
  quoteValidityDays?: number;
  fxNgnPerUsd?: number;
  fxXofPerUsd?: number;
}

export interface ManifestQuotePdfOptions {
  refId?: string;
  companyName?: string;
  contactName?: string;
  corporateEmail?: string;
  destinationPort?: string;
  incoterm: IncotermCode;
  paymentTerms: string;
  specifications?: string;
  manifestItems: ManifestLineItem[];
  singleProductId?: string;
  singleVolume?: string;
  singleEstimatedTotalUsd?: number;
  lang?: 'en' | 'fr';
  validityDays?: number;
}

interface PdfBrandAssets {
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  stampDataUrl: string | null;
  whatsappQrDataUrl: string | null;
  wechatCeoQrDataUrl: string | null;
  wechatDeskQrDataUrl: string | null;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadPlainPngDataUrl(src: string): Promise<string | null> {
  const img = await loadHtmlImage(src);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Isolates dark handwritten ink strokes from brown/tan paper onto a transparent PNG
 * so the CEO signature renders directly over white PDF letterhead without a paper box.
 */
async function loadCleanSignaturePng(src: string): Promise<string | null> {
  const img = await loadHtmlImage(src);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Estimate background luminance from corner border samples
  let bgSum = 0;
  let bgCount = 0;
  for (let y = 0; y < h; y += 8) {
    for (let x = 0; x < w; x += 8) {
      if (x < 30 || x > w - 30 || y < 30 || y > h - 30) {
        const idx = (y * w + x) * 4;
        bgSum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        bgCount++;
      }
    }
  }
  const paperLum = bgCount > 0 ? bgSum / bgCount : 155;
  const cutoff = Math.max(75, paperLum - 26);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < cutoff) {
        const strength = Math.min(1, (cutoff - lum) / 42);
        data[idx] = 15; // Crisp navy-black ink
        data[idx + 1] = 28;
        data[idx + 2] = 66;
        data[idx + 3] = Math.round(strength * 255);
        if (strength > 0.2) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      } else {
        data[idx + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    return canvas.toDataURL('image/png');
  }

  const pad = 12;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w - sx, maxX - minX + pad * 2);
  const sh = Math.min(h - sy, maxY - minY + pad * 2);

  const cropped = document.createElement('canvas');
  cropped.width = sw;
  cropped.height = sh;
  const cCtx = cropped.getContext('2d');
  if (!cCtx) return canvas.toDataURL('image/png');
  cCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped.toDataURL('image/png');
}

/**
 * Crops only the sharp QR matrix square from phone/app QR cards so contact QR codes
 * remain crisp and scannable inside compact PDF blocks.
 */
async function loadCroppedQrPng(
  src: string,
  scanBox: { topPct: number; bottomPct: number; leftPct: number; rightPct: number }
): Promise<string | null> {
  const img = await loadHtmlImage(src);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const x0 = Math.floor(w * scanBox.leftPct);
  const x1 = Math.floor(w * scanBox.rightPct);
  const y0 = Math.floor(h * scanBox.topPct);
  const y1 = Math.floor(h * scanBox.bottomPct);
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);

  const region = ctx.getImageData(x0, y0, rw, rh).data;
  let minX = rw;
  let minY = rh;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const idx = (y * rw + x) * 4;
      const r = region[idx];
      const g = region[idx + 1];
      const b = region[idx + 2];
      // Detect dark QR finder/module pixels
      if (r < 95 && g < 95 && b < 95) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return canvas.toDataURL('image/png');
  }

  // Enforce a square aspect ratio around the QR matrix plus clean white quiet-zone
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const side = Math.max(boxW, boxH);
  const cx = x0 + minX + boxW / 2;
  const cy = y0 + minY + boxH / 2;
  const quiet = Math.round(side * 0.08);
  const outSize = Math.round(side + quiet * 2);

  const out = document.createElement('canvas');
  out.width = outSize;
  out.height = outSize;
  const oCtx = out.getContext('2d');
  if (!oCtx) return null;

  oCtx.fillStyle = '#ffffff';
  oCtx.fillRect(0, 0, outSize, outSize);
  oCtx.drawImage(
    canvas,
    Math.max(0, cx - side / 2),
    Math.max(0, cy - side / 2),
    side,
    side,
    quiet,
    quiet,
    side,
    side
  );
  return out.toDataURL('image/png');
}

/**
 * Helper to draw curved text along a circular arc on an offscreen canvas.
 */
function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  radius: number,
  centerAngleRad: number,
  inward: boolean,
  letterSpacingRad: number
) {
  ctx.save();
  const totalAngle = (text.length - 1) * letterSpacingRad;
  let currentAngle = inward
    ? centerAngleRad + totalAngle / 2
    : centerAngleRad - totalAngle / 2;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    ctx.save();
    ctx.translate(
      centerX + Math.cos(currentAngle) * radius,
      centerY + Math.sin(currentAngle) * radius
    );
    ctx.rotate(currentAngle + (inward ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    currentAngle += inward ? -letterSpacingRad : letterSpacingRad;
  }
  ctx.restore();
}

/**
 * Generates an official transparent corporate ink stamp seal for Ahzan Tech Ltd.
 */
function generateCompanyStampSealPng(): string | null {
  const size = 480;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const inkColor = 'rgba(22, 50, 105, 0.9)';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-8 * Math.PI) / 180); // Natural wet-ink desk stamp angle
  ctx.translate(-cx, -cy);

  ctx.strokeStyle = inkColor;
  ctx.fillStyle = inkColor;

  // Outer serrated/security ring
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, 208, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 196, 0, Math.PI * 2);
  ctx.stroke();

  // Inner concentric seal rings
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 134, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 126, 0, Math.PI * 2);
  ctx.stroke();

  // Outer band curved text
  ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawArcText(
    ctx,
    'AHZAN TECH LTD • NIGERIA',
    cx,
    cy,
    165,
    -Math.PI / 2,
    false,
    0.132
  );

  ctx.font = 'bold 22px "Helvetica Neue", Arial, sans-serif';
  drawArcText(
    ctx,
    'CAC RC 2012723 • EXPORT DESK',
    cx,
    cy,
    165,
    Math.PI / 2,
    true,
    0.118
  );

  // Side 5-point stars at 9 o'clock and 3 o'clock
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('★', cx - 165, cy);
  ctx.fillText('★', cx + 165, cy);

  // Center banner & certification markings
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 110, cy - 28);
  ctx.lineTo(cx + 110, cy - 28);
  ctx.moveTo(cx - 110, cy + 28);
  ctx.lineTo(cx + 110, cy + 28);
  ctx.stroke();

  ctx.font = 'bold 17px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('OFFICIAL SEAL', cx, cy - 58);

  ctx.font = 'bold 25px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('APPROVED', cx, cy - 3);

  ctx.font = 'bold 14px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('LICENCE 65197 EL', cx, cy + 50);
  ctx.font = '600 13px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('KANO • LAGOS', cx, cy + 74);

  ctx.restore();
  return canvas.toDataURL('image/png');
}

async function loadAllBrandAssets(): Promise<PdfBrandAssets> {
  const [
    logoDataUrl,
    signatureDataUrl,
    whatsappQrDataUrl,
    wechatCeoQrDataUrl,
    wechatDeskQrDataUrl,
  ] = await Promise.all([
    loadPlainPngDataUrl(LOGO_PATH),
    loadCleanSignaturePng(SIGNATURE_PATH),
    loadCroppedQrPng(QR_WHATSAPP_PATH, {
      topPct: 0.38,
      bottomPct: 0.64,
      leftPct: 0.22,
      rightPct: 0.78,
    }),
    loadCroppedQrPng(QR_WECHAT_CEO_PATH, {
      topPct: 0.22,
      bottomPct: 0.80,
      leftPct: 0.12,
      rightPct: 0.88,
    }),
    loadCroppedQrPng(QR_WECHAT_DESK_PATH, {
      topPct: 0.22,
      bottomPct: 0.80,
      leftPct: 0.12,
      rightPct: 0.88,
    }),
  ]);

  return {
    logoDataUrl,
    signatureDataUrl,
    stampDataUrl: generateCompanyStampSealPng(),
    whatsappQrDataUrl,
    wechatCeoQrDataUrl,
    wechatDeskQrDataUrl,
  };
}

function formatIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function drawTemplateHeader(
  doc: jsPDF,
  assets: PdfBrandAssets,
  rightTitle: string,
  rightSub: string
): number {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top-left company hexagon emblem matching template PDF
  if (assets.logoDataUrl) {
    doc.addImage(assets.logoDataUrl, 'PNG', margin, 11, 14, 14);
  }

  // Center-left corporate masthead
  const textX = assets.logoDataUrl ? margin + 17 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY_RGB);
  doc.text('AHZAN TECH LTD', textX, 16.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_700_RGB);
  doc.text(
    'Origin: Federal Republic of Nigeria  •  EL No. 65197 (Jega LGA, Kebbi)  •  Ports: Apapa / Tin Can Island, Lagos',
    textX,
    21
  );
  doc.text(
    'Contact: Abdulganiyu Hamza (CEO)  •  Email: abdoul@ahzantechltd.com  •  Web: ahzantechltd.com',
    textX,
    25
  );
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500_RGB);
  doc.text(
    'CAC RC: 2012723  •  MCO EL 65197  •  Assays: ZMGN057 & Q38625/H260715-164  •  SCUML  •  FIRS TCC  •  NEPC',
    textX,
    29
  );

  // Right-aligned document title & date matching template
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY_RGB);
  doc.text(rightTitle, pageWidth - margin, 17, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_700_RGB);
  doc.text(rightSub, pageWidth - margin, 22.5, { align: 'right' });

  // Solid deep navy divider rule
  doc.setDrawColor(...NAVY_RGB);
  doc.setLineWidth(0.75);
  doc.line(margin, 33, pageWidth - margin, 33);

  return 37;
}

function drawCalloutBanner(
  doc: jsPDF,
  startY: number,
  boldPrefix: string,
  bodyText: string
): number {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - margin * 2;
  const fullText = `${boldPrefix} ${bodyText}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const lines = doc.splitTextToSize(fullText, boxWidth - 8);
  const boxHeight = Math.max(12, lines.length * 4 + 5.5);

  // Light slate/ice-blue background + thick left navy bar matching Ahzan_Tech_Ltd_Price_List template
  doc.setFillColor(...ICE_BLUE_RGB);
  doc.rect(margin, startY, boxWidth, boxHeight, 'F');
  doc.setFillColor(...NAVY_RGB);
  doc.rect(margin, startY, 1.4, boxHeight, 'F');

  doc.setTextColor(...SLATE_900_RGB);
  doc.text(lines, margin + 4.5, startY + 5);

  return startY + boxHeight + 4;
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageHeight - 18) {
    doc.addPage();
    return 16;
  }
  return currentY;
}

function drawRemarksAndAuthorization(
  doc: jsPDF,
  assets: PdfBrandAssets,
  startY: number,
  incotermCode: IncotermCode,
  issueDate: string,
  extraRemarks: string[],
  lang: 'en' | 'fr',
  validityDays = 10
) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - margin * 2;

  const disclaimerLines =
    lang === 'fr'
      ? [
          `1. Règles Incoterms® 2020 (CCI) : Toute cotation (${incotermCode}) est régie par les règles Incoterms® 2020 de la CCI. Le transfert des risques et coûts s'opère strictement au point nommé (mine, quai Apapa/Tin Can ou port de déchargement).`,
          `2. Conformité & Inspection : Chaque expédition fait l'objet d'un contrôle obligatoire SGS / Zuma Gani (ZMGN057) / Foshan Ceramics (Q38625/H260715-164), d'un certificat Form NXP/NESS, d'une licence NEPC et d'une conformité SCUML / FIRS TCC.`,
          `3. Validité & Réserve Contractuelle : Offre indicative valable ${validityDays} jours calendaires à compter du ${issueDate}, sans engagement jusqu'à signature de la facture proforma (PI) ou du contrat SPA.`,
          ...extraRemarks,
        ]
      : [
          `1. Incoterms® 2020 Legal Disclaimer: All delivery terms (${incotermCode}) are governed strictly by ICC Incoterms® 2020 rules. Title, risk, and freight/insurance obligations transfer strictly at the designated origin gate, Lagos port rail (Apapa/Tin Can), or named destination hub.`,
          `2. Mandatory Compliance & Assays: Every mineral lot references MCO Licence EL No. 65197 (Jega LGA, Kebbi State) backed by Zuma Gani Mining Assay No. ZMGN057 & Foshan Ceramics Research Institute Testing No. Q38625/H260715-164, CBN Form NXP / NESS, NEPC, SCUML & FIRS TCC.`,
          `3. Validity & Non-Binding Offer Notice: Indicative rates remain valid for ${validityDays} calendar days from ${issueDate} subject to L/C at sight (UCP 600) or confirmed 70/30 T/T execution. Issued E.&O.E. without final contract commitment until formal Proforma Invoice / SPA countersignature.`,
          ...extraRemarks,
        ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  const wrappedEntries = disclaimerLines.map((line) =>
    doc.splitTextToSize(line, boxWidth - 10)
  );
  const totalTextLines = wrappedEntries.reduce((sum, arr) => sum + arr.length, 0);
  const remarksHeight = 12 + totalTextLines * 3.35 + disclaimerLines.length * 1.2;

  let y = ensureSpace(doc, startY, remarksHeight + 54);

  // Remarks & Incoterms 2020 Legal Disclaimers Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_RGB);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, boxWidth, remarksHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY_RGB);
  doc.text(
    lang === 'fr'
      ? 'REMARQUES, CONDITIONS COMMERCIALES & MENTIONS INCOTERMS® 2020 :'
      : 'REMARKS, COMMERCIAL TERMS & INCOTERMS® 2020 LEGAL DISCLAIMERS:',
    margin + 4.5,
    y + 6.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(...SLATE_700_RGB);
  let cursorY = y + 11.5;
  for (const lines of wrappedEntries) {
    doc.text(lines, margin + 4.5, cursorY);
    cursorY += lines.length * 3.35 + 1.2;
  }

  y += remarksHeight + 6;
  y = ensureSpace(doc, y, 48);

  // Executive Authorization & Contact QR Block (2 columns)
  const colGap = 6;
  const leftColW = 90;
  const rightColW = boxWidth - leftColW - colGap;
  const blockH = 44;

  // Left card: Signature + Stamp Seal
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER_RGB);
  doc.rect(margin, y, leftColW, blockH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.3);
  doc.setTextColor(...NAVY_RGB);
  doc.text('FOR & ON BEHALF OF AHZAN TECH LTD', margin + 4, y + 5.5);

  // Draw CEO Signature PNG (clean transparent ink)
  if (assets.signatureDataUrl) {
    doc.addImage(assets.signatureDataUrl, 'PNG', margin + 5, y + 8.5, 42, 18);
  }

  // Draw Official Company Stamp Seal overlapping edge cleanly
  if (assets.stampDataUrl) {
    doc.addImage(assets.stampDataUrl, 'PNG', margin + 52, y + 5.5, 33, 33);
  }

  doc.setDrawColor(...SLATE_700_RGB);
  doc.setLineWidth(0.25);
  doc.line(margin + 4, y + 29.5, margin + 52, y + 29.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_900_RGB);
  doc.text('Abdulganiyu Hamza', margin + 4, y + 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.9);
  doc.setTextColor(...SLATE_500_RGB);
  doc.text('Founder & CEO  •  RC 2012723', margin + 4, y + 38);
  doc.text(`Issued: ${issueDate}`, margin + 4, y + 41.5);

  // Right card: Official Contact QR Codes (WhatsApp Business + WeChat)
  const rightX = margin + leftColW + colGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER_RGB);
  doc.rect(rightX, y, rightColW, blockH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.3);
  doc.setTextColor(...NAVY_RGB);
  doc.text('SCAN DIRECT CONTACT & VERIFICATION QR CHANNELS', rightX + 4, y + 5.5);

  const qrEntries = [
    {
      dataUrl: assets.whatsappQrDataUrl,
      label: 'WhatsApp Desk',
      sub: 'wa.me/ahzantechltd',
    },
    {
      dataUrl: assets.wechatCeoQrDataUrl,
      label: 'WeChat CEO',
      sub: 'Abdulganiyu Hamza',
    },
    {
      dataUrl: assets.wechatDeskQrDataUrl,
      label: 'WeChat Trade',
      sub: 'Avdoul Desk',
    },
  ];

  const qrBoxSize = 23.5;
  const qrStartX = rightX + 4.5;
  const qrStep = (rightColW - 9 - qrBoxSize) / 2;

  qrEntries.forEach((qr, idx) => {
    const qx = qrStartX + idx * qrStep;
    const qy = y + 8.5;
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.2);
    doc.rect(qx - 0.5, qy - 0.5, qrBoxSize + 1, qrBoxSize + 1);
    if (qr.dataUrl) {
      doc.addImage(qr.dataUrl, 'PNG', qx, qy, qrBoxSize, qrBoxSize);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(...SLATE_900_RGB);
    doc.text(qr.label, qx + qrBoxSize / 2, qy + qrBoxSize + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...SLATE_500_RGB);
    doc.text(qr.sub, qx + qrBoxSize / 2, qy + qrBoxSize + 7.2, { align: 'center' });
  });
}

function applyPageFooters(doc: jsPDF, docLabel: string) {
  const totalPages = doc.getNumberOfPages();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500_RGB);
    doc.text(`Ahzan Tech Ltd (RC 2012723)  •  ${docLabel}`, margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  }
}

export async function exportSchedulePdf(
  tab: PriceScheduleExportTab,
  lang: 'en' | 'fr' = 'en',
  overrides?: PdfMarketOverrides
): Promise<void> {
  const assets = await loadAllBrandAssets();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const defaultIssueDate = formatIsoDate();
  const lithiumRate = overrides?.lithiumRatePerPercentUsd ?? LITHIUM_RATE_PER_PERCENT_USD;
  const lithiumAssay = overrides?.lithiumAssayPct ?? LITHIUM_ASSAY_GRADE_PCT;
  const agroDate = overrides?.agroIssueDate || defaultIssueDate;
  const lubeDate = overrides?.lubricantIssueDate || defaultIssueDate;
  const validityDays = overrides?.quoteValidityDays ?? 10;
  const fxNgn = overrides?.fxNgnPerUsd ?? 1390;
  const fxXof = overrides?.fxXofPerUsd ?? 584.46;
  const issueDate =
    tab === 'agro' ? agroDate : tab === 'lubricants' ? lubeDate : defaultIssueDate;

  let title = 'PRICE LIST';
  let sub = issueDate;
  const bannerPrefix = 'Export Offer Basis:';
  let bannerBody = '';
  let footerLabel = 'Official Price Schedule';
  let head: string[][] = [];
  let body: RowInput[] = [];
  let extraRemarks: string[] = [];

  if (tab === 'minerals') {
    const benchmarkPrice = (lithiumAssay * lithiumRate).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    title = 'MINERAL QUOTE';
    sub = `Ref: EL-65197  •  ${issueDate}`;
    bannerBody =
      `Lithium-bearing spodumene/lepidolite ore (Jega LGA, Kebbi State, EL No. 65197) priced strictly at US$${lithiumRate.toFixed(2)} per 1% Li2O per dry metric ton (FOB Lagos). Assays: Zuma Gani ZMGN057 & Foshan Ceramics Q38625/H260715-164 at ${lithiumAssay.toFixed(2)}% Li2O ($${benchmarkPrice}/MT FOB).`;
    footerLabel = `Critical Minerals Rate Schedule ($${lithiumRate} / % Li2O)`;
    head = [
      ['Grade (% Li2O)', 'Contract Formula', 'FOB Price / MT', '20ft FCL (27 MT)', 'Assay & Origin Protocol'],
    ];
    const tiers = Array.from(new Set([3.5, 4.0, 4.5, lithiumAssay, 5.0, 5.5])).sort(
      (a, b) => a - b
    );
    body = tiers.map((grade) => {
      const perMt = grade * lithiumRate;
      const total20ft = Math.round(perMt * 27);
      const isVerified = grade === lithiumAssay;
      return [
        `${grade.toFixed(2)}% Li2O`,
        `${grade.toFixed(2)} × $${lithiumRate}`,
        `US$${perMt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / MT`,
        `US$${total20ft.toLocaleString('en-US')}`,
        isVerified
          ? 'Verified (ZMGN057 & Q38625 • EL 65197)'
          : 'Pro-Rata SGS / Bureau Veritas Umpire Assay',
      ];
    });
    extraRemarks = [
      `4. Lithium Umpire Pricing Basis: Final commercial invoice settles strictly on joint SGS / Bureau Veritas ICP-OES & XRF composite sample moisture-free Li2O % multiplied by US$${lithiumRate.toFixed(2)}/MT.`,
    ];
  } else if (tab === 'agro') {
    title = 'PRICE LIST';
    sub = issueDate;
    bannerBody =
      'All unit prices below are quoted FOB Lagos (USD) at direct origin-sourced wholesale rates for verified, pre-shipment inspected West African agro-commodities and processed food ingredients.';
    footerLabel = 'Exported African Food & Agro-Commodities Price List';
    head = [
      [
        'No.',
        'Commodity / Food Item',
        'Export Grade & Quality Spec',
        'Package',
        'FOB Price USD / Unit',
        'MOQ',
        'Load / 20ft FCL',
        'Amount / 20ft FCL',
      ],
    ];

    const groups: Array<{ title: string; filter: string }> = [
      {
        title: 'I. SPICES, BOTANICALS & OILSEEDS (BULK METRIC TON BASIS)',
        filter: 'Spices, Botanicals & Oilseeds',
      },
      {
        title: 'II. TREE NUTS, COCOA & EDIBLE OILS (BULK METRIC TON BASIS)',
        filter: 'Tree Nuts, Cocoa & Edible Oils',
      },
      {
        title: 'III. PROCESSED WEST AFRICAN FOOD INGREDIENTS & GRAINS (BULK & PACKAGED)',
        filter: 'Processed Foods & Grains',
      },
    ];

    groups.forEach((grp) => {
      body.push([
        {
          content: grp.title,
          colSpan: 8,
          styles: {
            fillColor: SECTION_BG_RGB,
            textColor: NAVY_RGB,
            fontStyle: 'bold',
            fontSize: 7.5,
          },
        },
      ]);
      AGRO_PRICE_LIST_2026.filter((r) => r.categoryGroup === grp.filter).forEach((row) => {
        body.push([
          String(row.no),
          row.commodity,
          row.spec,
          row.package,
          `US$${row.fobUsdPerUnit.toLocaleString('en-US', {
            minimumFractionDigits: row.unit === 'Ctn' ? 2 : 0,
          })} / ${row.unit}`,
          row.moq,
          row.loadPer20ft,
          `US$${row.amountPer20ftUsd.toLocaleString('en-US')}`,
        ]);
      });
    });

    extraRemarks = [
      '4. Packaging & Payment Schedule: Food-grade PP/jute bags (custom private label available). Lead time 15–25 working days; standard settlement 70% advance deposit / 30% prior to loading or Irrevocable L/C at Sight.',
    ];
  } else {
    title = 'LUBRICANT LIST';
    sub = `Kano Hub  •  ${issueDate}`;
    bannerBody =
      `Official Kano & West Africa wholesale rates for FLYSAK API SL / CI-4 engine lubricants (EXW Factory / FOB Nansha & Shanghai). FX Benchmark: 1 USD = NGN ${fxNgn.toLocaleString('en-US')} | 1 USD = ${fxXof} XOF CFA.`;
    footerLabel = 'Official Kano 2026 Lubricant Price Schedule (USD / NGN / XOF)';
    head = [
      ['Viscosity Grade', 'Pack Size', 'Packaging', 'Unit Price (USD)', 'Approx. NGN', 'Approx. XOF (CFA)'],
    ];

    const grades = Array.from(new Set(LUBRICANT_PRICE_LIST_2026.map((r) => r.grade)));
    grades.forEach((grade) => {
      body.push([
        {
          content: `API ${grade}`,
          colSpan: 6,
          styles: {
            fillColor: SECTION_BG_RGB,
            textColor: NAVY_RGB,
            fontStyle: 'bold',
            fontSize: 7.5,
          },
        },
      ]);
      LUBRICANT_PRICE_LIST_2026.filter((r) => r.grade === grade).forEach((row) => {
        body.push([
          row.grade,
          row.packSize,
          row.packaging,
          `$${row.usd.toFixed(2)}`,
          `NGN ${row.ngn.toLocaleString('en-US')}`,
          `${row.xof.toLocaleString('en-US')} CFA`,
        ]);
      });
    });

    extraRemarks = [
      '4. Container Capacities & FX Notice: 20ft FCL accommodates 80 × 200L Steel Drums or 756 × 20L Jerrycans. NGN and XOF figures are indicative spot conversions settled against confirmed USD value.',
    ];
  }

  let y = drawTemplateHeader(doc, assets, title, sub);
  y = drawCalloutBanner(doc, y, bannerPrefix, bannerBody);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head,
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.3,
      lineColor: BORDER_RGB,
      lineWidth: 0.2,
      textColor: SLATE_900_RGB,
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.6,
    },
    alternateRowStyles: {
      fillColor: [250, 252, 255],
    },
  });

  const tableEndY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y + 20;

  drawRemarksAndAuthorization(
    doc,
    assets,
    tableEndY + 6,
    'FOB',
    issueDate,
    extraRemarks,
    lang,
    validityDays
  );
  applyPageFooters(doc, footerLabel);

  const filenameMap: Record<PriceScheduleExportTab, string> = {
    minerals: `Ahzan_Tech_Lithium_Quote_${issueDate.replace(/\//g, '-')}.pdf`,
    agro: `Ahzan_Tech_Agro_Price_List_${issueDate.replace(/\//g, '-')}.pdf`,
    lubricants: `Ahzan_Tech_Lubricants_Schedule_${issueDate.replace(/\//g, '-')}.pdf`,
  };
  doc.save(filenameMap[tab]);
}

export async function exportManifestQuotePdf(
  options: ManifestQuotePdfOptions
): Promise<void> {
  const assets = await loadAllBrandAssets();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const issueDate = formatIsoDate();
  const quoteRef = options.refId || `AHT-QT-${String(Date.now()).slice(-6)}`;
  const lang = options.lang || 'en';
  const incotermInfo = INCOTERMS_DATA[options.incoterm];

  let y = drawTemplateHeader(
    doc,
    assets,
    'FORMAL QUOTE',
    `Ref: ${quoteRef}  •  ${issueDate}`
  );

  const buyerEntity = options.companyName?.trim() || 'Prospective International Offtaker';
  const buyerContact = options.contactName?.trim() || 'Authorized Procurement Desk';
  const buyerEmail = options.corporateEmail?.trim() || 'On File';
  const destPort = options.destinationPort?.trim() || 'Buyer-Nominated International Port';

  y = drawCalloutBanner(
    doc,
    y,
    'Formal B2B Export Quotation:',
    `Prepared for ${buyerEntity} (Attn: ${buyerContact} · ${buyerEmail}). Delivery Basis: ${options.incoterm} (${incotermInfo.name}) to ${destPort}. Payment Instrument: ${options.paymentTerms}.`
  );

  const rows: RowInput[] = [];
  let totalUsd = 0;

  if (options.manifestItems.length > 0) {
    options.manifestItems.forEach((item, idx) => {
      const matchedProduct = COMMODITY_PRODUCTS.find((p) => p.id === item.productId);
      const specSummary = matchedProduct
        ? `HS ${matchedProduct.hsCode} • ${matchedProduct.gradeOrPurity}`
        : 'Official Ahzan Tech 2026 Trade Schedule Specification (SGS Pre-Shipped)';
      const lineTotal =
        typeof item.estimatedTotalUsd === 'number' && item.estimatedTotalUsd > 0
          ? item.estimatedTotalUsd
          : null;
      if (lineTotal) totalUsd += lineTotal;

      rows.push([
        String(idx + 1),
        item.productName,
        specSummary,
        item.volumeSummary,
        item.incoterm,
        lineTotal ? `US$${lineTotal.toLocaleString('en-US')}` : 'Per Proforma SCO',
      ]);
    });
  } else {
    const product =
      COMMODITY_PRODUCTS.find((p) => p.id === options.singleProductId) ||
      COMMODITY_PRODUCTS[0];
    const lineTotal =
      typeof options.singleEstimatedTotalUsd === 'number' &&
      options.singleEstimatedTotalUsd > 0
        ? options.singleEstimatedTotalUsd
        : null;
    if (lineTotal) totalUsd += lineTotal;

    rows.push([
      '1',
      product.name,
      `HS ${product.hsCode} • ${product.gradeOrPurity} • ${product.assayRef}`,
      options.singleVolume?.trim() || product.minOrder,
      options.incoterm,
      lineTotal
        ? `US$${lineTotal.toLocaleString('en-US')}`
        : `From US$${product.fobUsdPerUnit.toLocaleString('en-US')} / ${product.unitLabel}`,
    ]);
  }

  rows.push([
    {
      content: `TOTAL INDICATIVE QUOTE VALUE (${options.incoterm} ${destPort.toUpperCase()})`,
      colSpan: 5,
      styles: {
        fillColor: ICE_BLUE_RGB,
        textColor: NAVY_RGB,
        fontStyle: 'bold',
        halign: 'right',
      },
    },
    {
      content:
        totalUsd > 0
          ? `US$${totalUsd.toLocaleString('en-US')}`
          : 'Confirmed at SCO',
      styles: {
        fillColor: ICE_BLUE_RGB,
        textColor: NAVY_RGB,
        fontStyle: 'bold',
      },
    },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        'No.',
        'Commodity / Line Item',
        'Grade, Assay & HS Specification',
        'Target Volume / FCL',
        'Incoterm',
        'Indicative Amount (USD)',
      ],
    ],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.8,
      cellPadding: 2.8,
      lineColor: BORDER_RGB,
      lineWidth: 0.2,
      textColor: SLATE_900_RGB,
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
  });

  const tableEndY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y + 30;

  const extraRemarks: string[] = [
    `4. Buyer Specifications & Notes: ${
      options.specifications?.trim() ||
      `SGS / Bureau Veritas joint sampling, ${options.incoterm} vessel dispatch, and standard export documentation suite (B/L, COO, Phytosanitary / Form NXP).`
    }`,
  ];

  drawRemarksAndAuthorization(
    doc,
    assets,
    tableEndY + 6,
    options.incoterm,
    issueDate,
    extraRemarks,
    lang,
    options.validityDays ?? 10
  );
  applyPageFooters(doc, `Formal Commercial Quote (${quoteRef})`);

  doc.save(`${quoteRef}-AhzanTech-Formal-Quote.pdf`);
}

export interface TradeStudioLineItem {
  sku: string;
  description: string;
  specification: string;
  unitLabel: string;
  quantity: number;
  unitUsd: number;
  moq?: string;
}

export interface InternationalTradeDocPdfOptions {
  docType: 'PRICE_LIST' | 'LOI' | 'MOU' | 'FCO' | 'PROFORMA_INVOICE' | 'SALES_CONTRACT' | 'MANDATE_NCNDA';
  referenceNo: string;
  counterpartyCompany: string;
  counterpartyContact: string;
  counterpartyEmail: string;
  counterpartyLocation: string;
  incoterm: IncotermCode;
  paymentTerms: string;
  destinationPort: string;
  validityDays: number;
  fxNgnPerUsd: number;
  fxXofPerUsd: number;
  marginPct: number;
  lines: TradeStudioLineItem[];
  customClauses?: string;
}

const STUDIO_DOC_HEADLINES: Record<
  InternationalTradeDocPdfOptions['docType'],
  { title: string; clauseTitle: string; leadText: (c: string, ref: string) => string }
> = {
  PRICE_LIST: {
    title: 'OFFICIAL PRICE LIST',
    clauseTitle: 'Schedule Pricing & FX Terms',
    leadText: (c, ref) =>
      `Official Ahzan Tech Ltd export schedule (${ref}) prepared for ${c}. All unit prices reflect origin sourcing with configured FX and container loading metrics.`,
  },
  LOI: {
    title: 'LETTER OF INTENT (LOI)',
    clauseTitle: 'Offtake & Allocation Intent',
    leadText: (c, ref) =>
      `Non-binding commercial Letter of Intent (${ref}) between Ahzan Tech Ltd (Seller/Exporter, EL No. 65197) and ${c} (Buyer/Offtaker) confirming target trial and annual contract quantities.`,
  },
  MOU: {
    title: 'MEMORANDUM OF UNDERSTANDING',
    clauseTitle: 'Strategic Cooperation Framework',
    leadText: (c, ref) =>
      `Strategic supply Memorandum of Understanding (${ref}) between Ahzan Tech Ltd and ${c} establishing multi-shipment off-take protocols, testing benchmarks (ZMGN057 & Q38625/H260715-164), and rolling L/C scheduling.`,
  },
  FCO: {
    title: 'FULL CORPORATE OFFER',
    clauseTitle: 'Binding Offer & Umpire Protocol',
    leadText: (c, ref) =>
      `Full Corporate Offer (${ref}) addressed strictly to ${c}. Ahzan Tech Ltd confirms ready-stock mineral and/or factory-direct commodity allocation under ICC Incoterms® 2020 and UCP 600 banking protocols.`,
  },
  PROFORMA_INVOICE: {
    title: 'PROFORMA INVOICE',
    clauseTitle: 'Banking, SWIFT MT700 & Escrow Basis',
    leadText: (c, ref) =>
      `Official Bankable Proforma Invoice (${ref}) issued to ${c} for SWIFT MT700 Documentary Credit issuance or confirmed escrow T/T mobilization.`,
  },
  SALES_CONTRACT: {
    title: 'SALES CONTRACT (SPA)',
    clauseTitle: 'Binding SPA Delivery & Li2O Bonus/Penalty',
    leadText: (c, ref) =>
      `International Sales & Purchase Agreement (${ref}) between Ahzan Tech Ltd (Seller, RC 2012723, MCO EL No. 65197) and ${c} (Buyer), governed by SGS umpire assay and ICC arbitration.`,
  },
  MANDATE_NCNDA: {
    title: 'MANDATE & NCNDA',
    clauseTitle: 'ICC Non-Circumvention & Commission Protection',
    leadText: (c, ref) =>
      `ICC Non-Circumvention, Non-Disclosure & Mandate Fee Protection Agreement (${ref}) protecting introductions, counterparty sourcing, and irrevocable commission disbursements with ${c}.`,
  },
};

export async function exportInternationalTradeDocPdf(
  options: InternationalTradeDocPdfOptions
): Promise<void> {
  const assets = await loadAllBrandAssets();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const issueDate = formatIsoDate();
  const meta = STUDIO_DOC_HEADLINES[options.docType];

  let y = drawTemplateHeader(
    doc,
    assets,
    meta.title,
    `Ref: ${options.referenceNo}  •  ${issueDate}`
  );

  y = drawCalloutBanner(
    doc,
    y,
    `${meta.clauseTitle}:`,
    `${meta.leadText(options.counterpartyCompany, options.referenceNo)} Counterparty Contact: ${options.counterpartyContact} (${options.counterpartyEmail}) · ${options.counterpartyLocation}. Delivery: ${options.incoterm} ${options.destinationPort} · Settlement: ${options.paymentTerms}.`
  );

  const multiplier = 1 + (options.marginPct || 0) / 100;
  let grandTotalUsd = 0;

  const rows: RowInput[] = options.lines.map((line, idx) => {
    const adjustedUnit = Number((line.unitUsd * multiplier).toFixed(2));
    const lineTotal = Math.round(adjustedUnit * line.quantity);
    grandTotalUsd += lineTotal;
    return [
      String(idx + 1),
      line.sku,
      `${line.description}\n${line.specification}`,
      `${line.quantity.toLocaleString('en-US')} ${line.unitLabel}`,
      `US$${adjustedUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `US$${lineTotal.toLocaleString('en-US')}`,
    ];
  });

  rows.push([
    {
      content: `TOTAL DOCUMENT VALUE (${options.incoterm} ${options.destinationPort.toUpperCase()}) · FX ₦${options.fxNgnPerUsd} / ${options.fxXofPerUsd} XOF`,
      colSpan: 5,
      styles: {
        fillColor: ICE_BLUE_RGB,
        textColor: NAVY_RGB,
        fontStyle: 'bold',
        halign: 'right',
      },
    },
    {
      content: `US$${grandTotalUsd.toLocaleString('en-US')}`,
      styles: {
        fillColor: ICE_BLUE_RGB,
        textColor: NAVY_RGB,
        fontStyle: 'bold',
      },
    },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      ['#', 'SKU / Ref', 'Item & Specification', 'Qty / Unit', 'Unit Price', 'Amount (USD)'],
    ],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.4,
      cellPadding: 2.3,
      lineColor: BORDER_RGB,
      lineWidth: 0.2,
      textColor: SLATE_900_RGB,
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 25, fontStyle: 'bold' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
  });

  const tableEndY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y + 30;

  const extraRemarks: string[] = [
    `4. Counterparty & Special Terms (${options.referenceNo}): ${
      options.customClauses?.trim() ||
      `Primary Origin: EL No. 65197 (Jega LGA, Kebbi State, Nigeria). Verified Assays: Zuma Gani ZMGN057 & Foshan Ceramics Q38625/H260715-164. Spot FX Reference: 1 USD = NGN ${options.fxNgnPerUsd} / ${options.fxXofPerUsd} XOF.`
    }`,
  ];

  drawRemarksAndAuthorization(
    doc,
    assets,
    tableEndY + 6,
    options.incoterm,
    issueDate,
    extraRemarks,
    'en',
    options.validityDays
  );
  applyPageFooters(doc, `${meta.title} (${options.referenceNo})`);

  doc.save(`${options.referenceNo}-${options.docType}-AhzanTech.pdf`);
}

export { NAVY_HEX };
