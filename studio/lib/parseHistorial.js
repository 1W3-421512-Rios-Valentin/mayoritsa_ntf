// Parser del historial de pedidos (ex-SharePoint): cada .xlsx es de un cliente
// y cada HOJA del libro es un pedido con la plantilla mayorista
// (datos desde fila 3: A=sku B=desc C=precio, cantidades en D–M).
import ExcelJS from 'exceljs';
import { COL_TO_NUMERO, COL_TO_LETRA } from './sizes.js';

const COLS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

// "Fecha: 12/05/2025", Date, "12-05-2025" → ISO yyyy-mm-dd (o null).
export function parseFecha(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw)) return raw.toISOString().slice(0, 10);
  const s = String(raw);
  const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m;
  y = y.length === 2 ? `20${y}` : y;
  const dd = String(d).padStart(2, '0');
  const mm = String(mo).padStart(2, '0');
  const iso = `${y}-${mm}-${dd}`;
  return isNaN(new Date(iso)) ? null : iso;
}

function cellText(cell) {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.result != null) return String(v.result);
    if (v instanceof Date) return v;
    if (v.text) return String(v.text);
  }
  return v;
}

function cellNumber(cell) {
  const v = cell?.value;
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && typeof v.result === 'number') return v.result;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Etiqueta del talle para una columna según el tipoTalle del producto.
function talleDeColumna(col, tipoTalle) {
  if (tipoTalle === 'letra') return COL_TO_LETRA[col];
  if (tipoTalle === 'unico') return col === 'M' ? 'TU' : COL_TO_LETRA[col];
  return COL_TO_NUMERO[col]; // numero o desconocido → etiqueta numérica
}

// Parsea un workbook: devuelve un pedido candidato por hoja con datos.
// tipoPorSku: Map<skuLower, tipoTalle> (del catálogo production).
export async function parseWorkbook(arrayBuffer, { filename, tipoPorSku }) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const pedidos = [];

  for (const ws of wb.worksheets) {
    const items = [];
    const skusDesconocidos = [];
    const last = ws.actualRowCount || 0;
    for (let r = 3; r <= last; r++) {
      const sku = String(cellText(ws.getCell(`A${r}`)) || '').trim();
      if (!sku) continue;
      if (/^total/i.test(sku)) continue;
      const descripcion = String(cellText(ws.getCell(`B${r}`)) || '').trim();
      const precio = cellNumber(ws.getCell(`C${r}`));
      const tipo = tipoPorSku.get(sku.toLowerCase());
      if (!tipo) skusDesconocidos.push(sku);

      const cantidades = [];
      let unidades = 0;
      for (const col of COLS) {
        const q = Math.round(cellNumber(ws.getCell(`${col}${r}`)));
        if (q > 0) {
          cantidades.push({ talle: talleDeColumna(col, tipo), cantidad: q });
          unidades += q;
        }
      }
      if (!unidades) continue; // fila sin cantidades: no es un item real
      items.push({ sku, descripcion, precio, cantidades, unidades, subtotal: unidades * precio });
    }
    if (!items.length) continue; // hoja sin pedido

    // Fecha: N1 → nombre de hoja → nombre de archivo → null (manual).
    const fecha =
      parseFecha(cellText(ws.getCell('N1'))) ||
      parseFecha(ws.name) ||
      parseFecha(filename) ||
      null;

    // Cliente según A1 ("Cliente: X") como dato auxiliar.
    const a1 = String(cellText(ws.getCell('A1')) || '');
    const clienteA1 = a1.replace(/^cliente\s*:\s*/i, '').trim() || null;

    pedidos.push({
      hoja: ws.name,
      fecha,
      clienteA1,
      items,
      skusDesconocidos,
      totalUnidades: items.reduce((n, i) => n + i.unidades, 0),
      totalMonto: items.reduce((n, i) => n + i.subtotal, 0),
    });
  }
  return pedidos;
}

// Deducción del cliente desde la ruta del archivo:
// raíz/<Cliente>/archivo.xlsx → <Cliente>; carpeta arrastrada directa → parts[0].
export function clienteDesdeRuta(path) {
  const parts = (path || '').split('/').filter(Boolean);
  if (parts.length >= 3) return parts[1];
  if (parts.length === 2) return parts[0];
  return null;
}
