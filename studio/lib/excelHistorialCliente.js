// Genera un Excel de historial por cliente: un libro con UNA HOJA POR PEDIDO,
// cada hoja con el layout de la planilla mayorista (solo la tabla).
import ExcelJS from 'exceljs';
import { SIZE_TO_COL } from './sizes.js';

const NUMS = ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52'];
const LETRAS = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'TU'];
const COLS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

const ddmm = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const bold = { font: { bold: true } };

function nombreHojaUnico(usados, fecha, tipo) {
  let base = (ddmm(fecha) || 'sin-fecha').replace(/\//g, '-');
  if (tipo && tipo !== 'FA') base += ` ${tipo}`;
  let name = base;
  let i = 2;
  while (usados.has(name)) name = `${base} (${i++})`;
  usados.add(name);
  return name.slice(0, 31); // límite de Excel
}

function armarHoja(ws, cliente, pedido) {
  ws.getCell('A1').value = `Cliente: ${cliente?.nombre || ''}`.trimEnd();
  ws.mergeCells('A1:C1');
  ws.getCell('A1').style = bold;
  NUMS.forEach((n, i) => { ws.getCell(`${COLS[i]}1`).value = Number(n); });
  ws.getCell('N1').value = `Fecha: ${ddmm(pedido.fecha)}`;
  ws.mergeCells('N1:O1');
  ws.getCell('N1').style = bold;

  ws.getCell('A2').value = 'codigo';
  ws.getCell('B2').value = 'descripcion';
  ws.getCell('C2').value = 'precio';
  LETRAS.forEach((l, i) => { ws.getCell(`${COLS[i]}2`).value = l; });
  ws.getCell('N2').value = 'Total';
  ws.getCell('O2').value = 'Sub-Total';
  ['A2', 'B2', 'C2', 'N2', 'O2', ...COLS.map((c) => `${c}2`)].forEach((a) => { ws.getCell(a).style = bold; });

  let r = 3;
  for (const it of pedido.items || []) {
    ws.getCell(`A${r}`).value = it.sku;
    ws.getCell(`B${r}`).value = it.descripcion;
    ws.getCell(`C${r}`).value = it.precio;
    for (const { talle, cantidad } of it.cantidades || []) {
      const col = SIZE_TO_COL[talle];
      if (col && cantidad) ws.getCell(`${col}${r}`).value = cantidad;
    }
    ws.getCell(`N${r}`).value = { formula: `SUM(D${r}:M${r})` };
    ws.getCell(`O${r}`).value = { formula: `N${r}*C${r}` };
    r++;
  }
  const ultima = r - 1;
  ws.getCell(`N${r}`).value = 'TOTAL';
  ws.getCell(`N${r}`).style = bold;
  ws.getCell(`O${r}`).value = ultima >= 3 ? { formula: `SUM(O3:O${ultima})` } : 0;
  ws.getCell(`O${r}`).style = bold;

  ws.getColumn('A').width = 9;
  ws.getColumn('B').width = 42;
  ws.getColumn('C').width = 9;
  COLS.forEach((c) => { ws.getColumn(c).width = 4; });
  ws.getColumn('N').width = 7;
  ws.getColumn('O').width = 12;
}

// cliente: {nombre,...}; pedidos: array ordenada por fecha asc.
export async function buildHistorialCliente(cliente, pedidos) {
  const wb = new ExcelJS.Workbook();
  const usados = new Set();
  if (!pedidos.length) {
    armarHoja(wb.addWorksheet('sin pedidos'), cliente, { fecha: null, items: [] });
  }
  for (const p of pedidos) {
    const ws = wb.addWorksheet(nombreHojaUnico(usados, p.fecha, p.tipoComprobante));
    armarHoja(ws, cliente, p);
  }
  const out = await wb.xlsx.writeBuffer();
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function nombreArchivoHistorial(cliente) {
  const n = (cliente?.nombre || 'cliente').replace(/[^\w\-]+/g, '_');
  return `Historial_${n}.xlsx`;
}
