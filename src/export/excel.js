// Export Excel: rellena la plantilla mayorista real (§10) con ExcelJS.
import ExcelJS from 'exceljs';
import plantillaUrl from '../../assets/Plantilla_Pedidos_mayoristas_ntf.xlsx?url';
import { SIZE_TO_COL } from '../lib/sizes.js';

// pedido: { cliente, fecha (dd/mm/aaaa), items: [{ sku, descripcion, precio,
//           cantidades: { [talle]: qty } }] }
export async function exportExcel({ cliente, fecha, items }) {
  if (!items.length) return;

  const buf = await fetch(plantillaUrl).then((r) => r.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  // Cabecera: valor concatenado en la misma celda combinada (F0).
  ws.getCell('A1').value = `Cliente: ${cliente || ''}`.trimEnd();
  ws.getCell('N1').value = `Fecha: ${fecha}`;

  // Datos desde la fila 3.
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

  // Fila final TOTAL.
  const ultima = r - 1;
  ws.getCell(`N${r}`).value = 'TOTAL';
  ws.getCell(`O${r}`).value = { formula: `SUM(O3:O${ultima})` };

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const nombre = (cliente || 'sin-cliente').replace(/[^\w\-]+/g, '_');
  const fechaArch = fecha.replace(/\//g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Pedido_${nombre}_${fechaArch}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
