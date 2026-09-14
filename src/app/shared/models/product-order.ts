const nameOrder = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function sortProductsByName<T extends { name: string }>(products: readonly T[]): T[] {
  return [...products].sort((a, b) => nameOrder.compare(a.name, b.name));
}
