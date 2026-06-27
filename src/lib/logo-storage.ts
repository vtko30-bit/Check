import { put } from '@vercel/blob';

export function shouldUseBlobStorage(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN?.trim();
}

export async function uploadCompanyLogo(dataUrl: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return dataUrl;

  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('Formato de imagen inválido para subir a almacenamiento.');
  }

  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mime.includes('svg') ? 'svg' : mime.includes('jpeg') ? 'jpg' : 'png';

  const blob = await put(`branding/company-logo.${ext}`, buffer, {
    access: 'public',
    token,
    addRandomSuffix: true,
    contentType: mime,
  });

  return blob.url;
}
