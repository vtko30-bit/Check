import { describe, expect, it } from 'vitest';
import { escapeHtml } from '@/lib/html-escape';

describe('escapeHtml', () => {
  it('escapa caracteres peligrosos', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('deja texto seguro intacto', () => {
    expect(escapeHtml('Tarea normal')).toBe('Tarea normal');
  });
});
