// Genera el .xlsx del pedido rellenando la plantilla mayorista (§10 CLAUDE.md).
// Port browser de src/export/excel.js del front. Devuelve un Blob.
import ExcelJS from 'exceljs';
import { SIZE_TO_COL } from './sizes.js';

const PLANTILLA_URL = '/static/Plantilla_Pedidos_mayoristas_ntf.xlsx';

// pedido: { cliente, fecha (dd/mm/aaaa), items: [{ sku, descripcion, precio,
//           cantidades: { [talle]: qty } }] }
export async function buildExcelPedido({ cliente, fecha, items }) {
  const res = await fetch(PLANTILLA_URL);
  if (!res.ok) throw new Error(`No se pudo cargar la plantilla (${res.status})`);
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  // Cabecera: valor concatenado en la misma celda combinada (verificado en F0).
  ws.getCell('A1').value = `Cliente: ${cliente || ''}`.trimEnd();
  ws.getCell('N1').value = `Fecha: ${fecha}`;

  let r = 3;
  for (const it of items) {
    ws.getCell(`A${r}`).value = it.sku;
    ws.getCell(`B${r}`).value = it.descripcion;
    ws.getCell(`C${r}`).value = it.precio;
    for (const [talle, qty] of Object.entries(it.cantidades)) {
      if (!qty) continue;
      const col = SIZE_TO_COL[talle];
      if (col) ws.getCell(`${col}${r}`).value = qty;
    }
    ws.getCell(`N${r}`).value = { formula: `SUM(D${r}:M${r})` };
    ws.getCell(`O${r}`).value = { formula: `N${r}*C${r}` };
    r++;
  }

  const ultima = r - 1;
  ws.getCell(`N${r}`).value = 'TOTAL';
  ws.getCell(`O${r}`).value = { formula: `SUM(O3:O${ultima})` };

  const out = await wb.xlsx.writeBuffer();
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function nombreArchivoPedido(cliente, fecha) {
  const nombre = (cliente || 'sin-cliente').replace(/[^\w\-]+/g, '_');
  return `Pedido_${nombre}_${(fecha || '').replace(/\//g, '-')}.xlsx`;
}

export function descargarBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
