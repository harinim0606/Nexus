import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type CertificateFieldBinding = 'participantName' | 'eventName' | 'email' | 'issuedDate';

export type CertificateTemplateV1 = {
  version?: number;
  width: number;
  height: number;
  backgroundDataUrl?: string;
  fields: Array<{
    id: string;
    binding: CertificateFieldBinding;
    x: number;
    y: number;
    fontSize?: number;
  }>;
};

export function parseCertificateTemplate(json: string | null | undefined): CertificateTemplateV1 {
  if (!json?.trim()) {
    return { width: 800, height: 600, fields: [] };
  }
  try {
    const raw = JSON.parse(json) as Partial<CertificateTemplateV1>;
    return {
      version: raw.version ?? 1,
      width: typeof raw.width === 'number' ? raw.width : 800,
      height: typeof raw.height === 'number' ? raw.height : 600,
      backgroundDataUrl: raw.backgroundDataUrl,
      fields: Array.isArray(raw.fields) ? raw.fields : [],
    };
  } catch {
    return { width: 800, height: 600, fields: [] };
  }
}

/** A4 portrait points */
const PDF_W = 595.28;
const PDF_H = 841.89;

export async function buildCertificatePdf(
  templateJson: string,
  vars: {
    participantName: string;
    eventName: string;
    email: string;
    issuedDate: string;
  }
): Promise<Uint8Array> {
  const tpl = parseCertificateTemplate(templateJson);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PDF_W, PDF_H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const scaleX = PDF_W / tpl.width;
  const scaleY = PDF_H / tpl.height;

  if (tpl.backgroundDataUrl) {
    const raw = tpl.backgroundDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const bytes = Buffer.from(raw, 'base64');
    let image;
    try {
      image = await pdf.embedPng(bytes);
    } catch {
      try {
        image = await pdf.embedJpg(bytes);
      } catch {
        image = null;
      }
    }
    if (image) {
      page.drawImage(image, { x: 0, y: 0, width: PDF_W, height: PDF_H });
    }
  }

  const val: Record<CertificateFieldBinding, string> = {
    participantName: vars.participantName,
    eventName: vars.eventName,
    email: vars.email,
    issuedDate: vars.issuedDate,
  };

  for (const f of tpl.fields) {
    const text = val[f.binding] ?? '';
    if (!text) continue;
    const fs = f.fontSize ?? 16;
    const pt = Math.max(8, Math.min(36, fs * 0.85));
    const x = f.x * scaleX;
    const pdfY = PDF_H - f.y * scaleY - pt;

    page.drawText(text, {
      x,
      y: Math.max(0, pdfY),
      size: pt,
      font,
      color: rgb(0.12, 0.14, 0.2),
    });
  }

  return pdf.save();
}
