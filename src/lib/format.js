// Formato de precio ARS: miles con punto (§17).
const fmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatARS(n) {
  return fmt.format(Number(n) || 0);
}
