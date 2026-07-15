// Parser del CSV de facturación del sistema (Estadsticas_*.csv).
// Windows-1252, separador ';'. Una fila = un renglón de comprobante.
// Columnas (0-index):
//  0 Cod.Cliente · 1 Cliente · 2 CUIT · 3 Dirección · 4 Teléfono ·
//  5 T.Comp (FA/FB=venta, NCA=devolución) · 6 N.Comp · 7 F.Comp (dd/mm/aaaa) ·
//  8 Cod.Artículo (SKU) · 9 Artículo · 10 Marca · 11 Lote (=TALLE) ·
//  12 P.Unitario · 13 Cantidad · 14 P.Total · resto ignorado.
import { normalizeTalle } from './sizes.js';

const num = (s) => {
  if (s == null) return 0;
  const n = parseFloat(String(s).trim().replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// dd/mm/aaaa → ISO yyyy-mm-dd
function fechaISO(s) {
  const m = String(s || '').match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m;
  y = y.length === 2 ? `20${y}` : y;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Talle: normaliza al vocabulario del sistema (2XL→XXL, 4XL→XXXL, etc.).
function talleFactura(raw) {
  const t = normalizeTalle(raw);
  if (t === '2XL') return 'XXL';
  if (t === '4XL') return 'XXXL';
  return t; // números, letras válidas y raros (10, etc.) quedan como vienen
}

function parseLineas(text) {
  const lines = text.split(/\r?\n/);
  const filas = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = lines[i].split(';');
    const codCliente = (c[0] || '').trim();
    const tipo = (c[5] || '').trim().toUpperCase();
    if (!codCliente || !tipo) continue;
    filas.push({
      codCliente,
      cliente: (c[1] || '').trim(),
      cuit: (c[2] || '').trim(),
      direccion: (c[3] || '').trim(),
      telefono: (c[4] || '').trim(),
      tipo,
      nroComp: (c[6] || '').trim(),
      fecha: fechaISO(c[7]),
      sku: (c[8] || '').trim(),
      articulo: (c[9] || '').trim(),
      talle: talleFactura(c[11]),
      precio: Math.round(Math.abs(num(c[12]))),
      cantidad: Math.round(num(c[13])),
    });
  }
  return filas;
}

// Clave de comprobante. El N.Comp del export viene casi siempre corrupto a
// "2,222E+11" (Excel), así que agrupamos SIEMPRE por cliente + tipo + fecha.
function claveComprobante(f) {
  return `${f.codCliente}|${f.tipo}|${f.fecha}`;
}

function armarComprobante(filas, catPorSku) {
  const bySku = new Map();
  for (const f of filas) {
    if (!f.sku) continue;
    if (!bySku.has(f.sku)) {
      bySku.set(f.sku, {
        sku: f.sku,
        descripcion: f.articulo,
        categoria: catPorSku?.get(f.sku.toLowerCase()) || '',
        precio: f.precio,
        cantidades: new Map(),
      });
    }
    const it = bySku.get(f.sku);
    const q = Math.abs(f.cantidad);
    if (q > 0 && f.talle) it.cantidades.set(f.talle, (it.cantidades.get(f.talle) || 0) + q);
  }
  const items = [];
  let totalUnidades = 0;
  let totalMonto = 0;
  for (const it of bySku.values()) {
    const cantidades = [...it.cantidades.entries()].map(([talle, cantidad]) => ({ talle, cantidad }));
    const unidades = cantidades.reduce((n, c) => n + c.cantidad, 0);
    if (!unidades) continue;
    const subtotal = unidades * it.precio;
    items.push({ sku: it.sku, descripcion: it.descripcion, categoria: it.categoria, precio: it.precio, cantidades, unidades, subtotal });
    totalUnidades += unidades;
    totalMonto += subtotal;
  }
  return { items, totalUnidades, totalMonto };
}

export function parseFacturacion(text, { catPorSku } = {}) {
  const filas = parseLineas(text);

  // Clientes por CodCliente.
  const clientesMap = new Map();
  for (const f of filas) {
    if (!clientesMap.has(f.codCliente)) {
      clientesMap.set(f.codCliente, {
        codCliente: f.codCliente, nombre: f.cliente, cuit: f.cuit,
        direccion: f.direccion, telefono: f.telefono,
      });
    }
  }

  // Comprobantes.
  const comps = new Map();
  for (const f of filas) {
    const k = claveComprobante(f);
    if (!comps.has(k)) comps.set(k, { codCliente: f.codCliente, tipo: f.tipo, nroComp: f.nroComp, fecha: f.fecha, filas: [] });
    comps.get(k).filas.push(f);
  }

  const pedidos = [];
  const devoluciones = [];
  for (const comp of comps.values()) {
    const { items, totalUnidades, totalMonto } = armarComprobante(comp.filas, catPorSku);
    if (!items.length) continue;
    const base = {
      codCliente: comp.codCliente,
      nroComprobante: /e\+?\d/i.test(comp.nroComp) ? '' : comp.nroComp,
      tipoComprobante: comp.tipo,
      fecha: comp.fecha,
      items, totalUnidades, totalMonto,
    };
    if (comp.tipo === 'NCA') devoluciones.push(base);
    else pedidos.push(base);
  }

  return { clientes: [...clientesMap.values()], pedidos, devoluciones };
}
