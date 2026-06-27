import { describe, expect, it } from 'vitest';
import { validateLogoBase64 } from '@/lib/branding-validation';

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('validateLogoBase64', () => {
  it('acepta PNG base64 válido pequeño', () => {
    expect(validateLogoBase64(tinyPng)).toEqual({ ok: true });
  });

  it('rechaza formato no permitido', () => {
    expect(validateLogoBase64('data:text/plain;base64,YQ==')).toEqual({
      ok: false,
      error: 'Formato no válido. Solo se permiten PNG, JPG o SVG en base64.',
    });
  });

  it('rechaza cadena vacía', () => {
    expect(validateLogoBase64('')).toEqual({ ok: false, error: 'Logo inválido.' });
  });
});
