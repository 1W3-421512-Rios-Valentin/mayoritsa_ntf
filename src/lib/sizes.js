// Fuente ÚNICA del mapeo talle → columna del Excel (§5).
// Usado por la UI de pedido y por el export Excel.
//
// Columnas físicas D–M compartidas por ambas escalas:
//   Col: D    E    F    G    H    I    J    K    L    M
//   num: 34   36   38   40   42   44   46   48   50   52
//   let: XXXS XXS  XS   S    M    L    XL   XXL  XXXL TU
//
// - tipoTalle "numero": escala 34…52 (D–M).
// - tipoTalle "letra":  escala XXXS…XXXL (D–L). TU cae en M.
// - tipoTalle "unico":  solo TU (columna M).

export const SIZE_TO_COL = {
  // escala numérica
  '34': 'D', '36': 'E', '38': 'F', '40': 'G', '42': 'H',
  '44': 'I', '46': 'J', '48': 'K', '50': 'L', '52': 'M',
  // escala por letra
  'XXXS': 'D', 'XXS': 'E', 'XS': 'F', 'S': 'G', 'M': 'H',
  'L': 'I', 'XL': 'J', 'XXL': 'K', 'XXXL': 'L',
  // único
  'TU': 'M',
};

// Escalas válidas por tipo de talle (orden = orden de columnas).
export const SCALES = {
  numero: ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52'],
  letra: ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'TU'],
  unico: ['TU'],
};
