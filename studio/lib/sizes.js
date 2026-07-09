// Sets de talles válidos + normalización (copia mínima para el Studio).
// La fuente canónica del sistema de talles vive en src/lib/sizes.js del front;
// acá solo se replica lo necesario para clasificar al importar (el mapeo
// talle→columna del Excel no se usa en la carga de productos).

export const NUMERO = ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52'];
export const LETRA = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'TU'];
const LETRA_NO_TU = LETRA.filter((t) => t !== 'TU');

// Mapeo talle → columna del Excel (mismas 10 columnas D–M que src/lib/sizes.js).
export const SIZE_TO_COL = {
  '34': 'D', '36': 'E', '38': 'F', '40': 'G', '42': 'H',
  '44': 'I', '46': 'J', '48': 'K', '50': 'L', '52': 'M',
  'XXXS': 'D', 'XXS': 'E', 'XS': 'F', 'S': 'G', 'M': 'H',
  'L': 'I', 'XL': 'J', 'XXL': 'K', 'XXXL': 'L',
  'TU': 'M',
};

// Columna → talle según escala (para leer la plantilla al importar historial).
export const COL_TO_NUMERO = { D: '34', E: '36', F: '38', G: '40', H: '42', I: '44', J: '46', K: '48', L: '50', M: '52' };
export const COL_TO_LETRA = { D: 'XXXS', E: 'XXS', F: 'XS', G: 'S', H: 'M', I: 'L', J: 'XL', K: 'XXL', L: 'XXXL', M: 'TU' };

// Escalas por tipoTalle (para la UI de cantidades del pedido).
export const SCALES = {
  numero: NUMERO,
  letra: LETRA,
  unico: ['TU'],
};

// Normaliza un talle de la planilla al vocabulario del sistema.
export function normalizeTalle(t) {
  t = (t || '').trim().toUpperCase();
  if (t === 'T,U' || t === 'T.U' || t === 'T U') return 'TU';
  if (t === '3XL') return 'XXXL';
  if (t === '2XL') return 'XXL';
  return t;
}

export function isValidTalle(t) {
  return NUMERO.includes(t) || LETRA.includes(t);
}

// Infiere el tipoTalle a partir de los talles válidos. Devuelve null si no hay.
export function classifyTipoTalle(valid) {
  const hasNum = valid.some((t) => NUMERO.includes(t));
  const hasLet = valid.some((t) => LETRA_NO_TU.includes(t));
  if (hasNum && !hasLet) return 'numero';
  if (hasLet && !hasNum) return 'letra';
  if (!hasNum && !hasLet && valid.includes('TU')) return 'unico';
  if (hasNum && hasLet) return 'letra'; // caso ambiguo (raro) → letra
  return null;
}

// Ordena/filtra los talles válidos según el tipoTalle elegido.
export function tallesForTipo(valid, tipo) {
  if (tipo === 'unico') return ['TU'];
  const scale = tipo === 'numero' ? NUMERO : LETRA;
  return scale.filter((t) => valid.includes(t));
}
