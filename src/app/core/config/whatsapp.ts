export const WHATSAPP_NUMBER = '51923034586';

/** Native click-to-chat link; works during SSR and without client-side JavaScript. */
export function productWhatsAppUrl(product: { name: string }): string {
  const message = `Hola, estoy consultando desde la web de MIQA.\nQuisiera cotizar: ${product.name}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
