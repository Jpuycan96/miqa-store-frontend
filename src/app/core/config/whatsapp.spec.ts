import { contactWhatsAppUrl, productWhatsAppUrl, WHATSAPP_NUMBER } from './whatsapp';

describe('contactWhatsAppUrl', () => {
  it('encodes the general project message using the configured number', () => {
    const link = contactWhatsAppUrl();
    const url = new URL(link);
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/' + WHATSAPP_NUMBER);
    expect(url.searchParams.get('text')).toBe('Hola, estoy consultando desde la web de MIQA.\nTengo una idea/proyecto y quisiera recibir asesoría.');
    expect(Array.from(url.searchParams.keys())).toEqual(['text']);
    expect(link).toContain('%0A');
    expect(link).toContain('asesor%C3%ADa');
  });
});

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
