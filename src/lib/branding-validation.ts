const MAX_LOGO_BYTES = 400 * 1024;
const VALID_DATA_URL = /^data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/]+=*$/i;

export function validateLogoBase64(
  logoBase64: string
): { ok: true } | { ok: false; error: string } {
  if (!logoBase64 || typeof logoBase64 !== 'string') {
    return { ok: false, error: 'Logo inválido.' };
  }

  if (!VALID_DATA_URL.test(logoBase64)) {
    return { ok: false, error: 'Formato no válido. Solo se permiten PNG, JPG o SVG en base64.' };
  }

  const base64Part = logoBase64.split(',')[1] ?? '';
  const sizeBytes = Math.ceil((base64Part.length * 3) / 4);
  if (sizeBytes > MAX_LOGO_BYTES) {
    return { ok: false, error: 'La imagen supera el límite de 400KB.' };
  }

  return { ok: true };
}
