import { productWhatsAppUrl } from './whatsapp';

describe('productWhatsAppUrl', () => {
  it('encodes accents, punctuation and newlines without adding URL parameters', () => {
    const name = 'Impresión & diseño / "MIQA" #1?';
    const link = productWhatsAppUrl({ name });
    const url = new URL(link);
    expect(url.searchParams.get('text')).toBe(
      'Hola, estoy consultando desde la web de MIQA.\nQuisiera cotizar: ' + name + '.');
    expect(Array.from(url.searchParams.keys())).toEqual(['text']);
    expect(url.hash).toBe('');
    expect(link).toContain('%0A');
    expect(link).toContain('%26');
  });
});
