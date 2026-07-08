// Parseo del CSV "Listado de Stock por Casilleros" → artículos para importar.
import { normalizeTalle, isValidTalle, classifyTipoTalle, tallesForTipo } from './sizes.js';

// Cada celda viene como ="valor" (formato Excel). Se limpia el envoltorio.
function unwrap(s) {
  s = (s ?? '').trim();
  if (s.startsWith('="') && s.endsWith('"')) return s.slice(2, -1);
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

// Decodifica el archivo (Windows-1252) y parsea las filas de datos.
// Columnas: [0] Talle · [1] Código · [2] Artículo · [3] Marca · [4] Rubro.
export async function parseStockFile(file) {
  const buf = await file.arrayBuffer();
  const text = new TextDecoder('windows-1252').decode(buf);
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = lines[i].split(';').map(unwrap);
    const codigo = (c[1] || '').trim();
    if (!codigo || codigo.toLowerCase() === 'totales:') continue;
    rows.push({
      talle: c[0],
      codigo,
      articulo: (c[2] || '').trim(),
      rubro: (c[4] || '').trim(),
    });
  }
  return groupArticulos(rows);
}

// Agrupa por Código → un artículo por Código, con talles válidos y tipoTalle.
// Descarta los artículos sin ningún talle válido.
export function groupArticulos(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.codigo)) {
      map.set(r.codigo, {
        codigo: r.codigo,
        descripcion: r.articulo,
        rubro: r.rubro,
        talles: new Set(),
      });
    }
    map.get(r.codigo).talles.add(r.talle);
  }

  const articulos = [];
  let omitidos = 0;
  for (const a of map.values()) {
    const validSet = [...new Set([...a.talles].map(normalizeTalle).filter(isValidTalle))];
    const tipoTalle = classifyTipoTalle(validSet);
    if (!tipoTalle) { omitidos++; continue; }
    articulos.push({
      codigo: a.codigo,
      descripcion: a.descripcion,
      rubro: a.rubro,
      validSet,
      tipoTalle, // sugerido (editable en la UI)
    });
  }
  articulos.sort((x, y) => x.descripcion.localeCompare(y.descripcion));
  return { articulos, omitidos };
}

export { tallesForTipo };
