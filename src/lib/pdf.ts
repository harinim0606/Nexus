import { PDFDocument, rgb } from 'pdf-lib';

export const generateCertificate = async (
  templateBase64: string,
  name: string,
  eventName: string,
  date: string
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(Buffer.from(templateBase64, 'base64'));
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  firstPage.drawText(name, {
    x: width / 2 - 100,
    y: height / 2,
    size: 24,
    color: rgb(0, 0, 0),
  });

  firstPage.drawText(`For participating in ${eventName}`, {
    x: width / 2 - 150,
    y: height / 2 - 50,
    size: 16,
    color: rgb(0, 0, 0),
  });

  firstPage.drawText(date, {
    x: width / 2 - 50,
    y: height / 2 - 100,
    size: 14,
    color: rgb(0, 0, 0),
  });

  return pdfDoc.save();
};