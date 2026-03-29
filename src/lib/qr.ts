import QRCode from 'qrcode';

export const generateQR = async (data: string): Promise<string> => {
  return QRCode.toDataURL(data);
};