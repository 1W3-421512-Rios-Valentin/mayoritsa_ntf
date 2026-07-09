// Métricas de negocio sobre los pedidos (lógica pura, sin UI).

export const fmtARS = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;

const DIA_MS = 24 * 60 * 60 * 1000;
const dias = (a, b) => Math.round((b - a) / DIA_MS);

export function filtrar(pedidos, { desde, hasta, clienteId } = {}) {
  return pedidos.filter((p) => {
    if (clienteId && p.cliente?._id !== clienteId) return false;
    if (desde && p.fecha < desde) return false;
    if (hasta && p.fecha > hasta) return false;
    return true;
  });
}

// Top artículos por unidades (con monto), sobre los items snapshot.
export function topArticulos(pedidos, n = 10) {
  const map = new Map();
  for (const p of pedidos) {
    for (const it of p.items || []) {
      const k = it.sku || '(sin sku)';
      if (!map.has(k)) map.set(k, { sku: k, descripcion: it.descripcion || '', unidades: 0, monto: 0 });
      const e = map.get(k);
      e.unidades += it.unidades || 0;
      e.monto += it.subtotal || 0;
      if (!e.descripcion && it.descripcion) e.descripcion = it.descripcion;
    }
  }
  return [...map.values()].sort((a, b) => b.unidades - a.unidades).slice(0, n);
}

export function ventasPorCategoria(pedidos) {
  const map = new Map();
  for (const p of pedidos) {
    for (const it of p.items || []) {
      const k = it.categoria || '(sin categoría)';
      if (!map.has(k)) map.set(k, { categoria: k, unidades: 0, monto: 0 });
      const e = map.get(k);
      e.unidades += it.unidades || 0;
      e.monto += it.subtotal || 0;
    }
  }
  return [...map.values()].sort((a, b) => b.monto - a.monto);
}

export function topClientes(pedidos, n = 10) {
  const map = new Map();
  for (const p of pedidos) {
    const id = p.cliente?._id || 'sin';
    if (!map.has(id)) map.set(id, { clienteId: id, nombre: p.cliente?.nombre || '(sin cliente)', pedidos: 0, unidades: 0, monto: 0 });
    const e = map.get(id);
    e.pedidos++;
    e.unidades += p.totalUnidades || 0;
    e.monto += p.totalMonto || 0;
  }
  return [...map.values()].sort((a, b) => b.monto - a.monto).slice(0, n);
}

// Bucket temporal: semana ISO / mes / trimestre.
function bucketDe(fechaISO, periodo) {
  const d = new Date(fechaISO + 'T00:00:00');
  const y = d.getFullYear();
  if (periodo === 'mes') return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (periodo === 'trimestre') return `${y}-T${Math.floor(d.getMonth() / 3) + 1}`;
  // semana ISO
  const t = new Date(d);
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const inicio = new Date(t.getFullYear(), 0, 1);
  const week = Math.ceil(((t - inicio) / DIA_MS + 1) / 7);
  return `${t.getFullYear()}-S${String(week).padStart(2, '0')}`;
}

export function pedidosPorPeriodo(pedidos, periodo = 'mes') {
  const map = new Map();
  for (const p of pedidos) {
    if (!p.fecha) continue;
    const k = bucketDe(p.fecha, periodo);
    if (!map.has(k)) map.set(k, { label: k, pedidos: 0, unidades: 0, monto: 0 });
    const e = map.get(k);
    e.pedidos++;
    e.unidades += p.totalUnidades || 0;
    e.monto += p.totalMonto || 0;
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// Por cliente: último pedido, días de inactividad y gap promedio entre pedidos.
export function actividadClientes(pedidos, clientes, hoy = new Date()) {
  const porCliente = new Map();
  for (const p of pedidos) {
    const id = p.cliente?._id;
    if (!id || !p.fecha) continue;
    if (!porCliente.has(id)) porCliente.set(id, []);
    porCliente.get(id).push(p.fecha);
  }
  const out = [];
  for (const c of clientes) {
    const fechas = (porCliente.get(c._id) || []).sort();
    if (!fechas.length) {
      out.push({ clienteId: c._id, nombre: c.nombre, pedidos: 0, ultimo: null, diasInactivo: null, gapPromedio: null, caidaRitmo: false });
      continue;
    }
    const ultimo = fechas[fechas.length - 1];
    const diasInactivo = dias(new Date(ultimo + 'T00:00:00'), hoy);
    let gapPromedio = null;
    if (fechas.length >= 2) {
      let suma = 0;
      for (let i = 1; i < fechas.length; i++) {
        suma += dias(new Date(fechas[i - 1] + 'T00:00:00'), new Date(fechas[i] + 'T00:00:00'));
      }
      gapPromedio = Math.round(suma / (fechas.length - 1));
    }
    const caidaRitmo = fechas.length >= 3 && gapPromedio > 0 && diasInactivo > gapPromedio * 1.5;
    out.push({ clienteId: c._id, nombre: c.nombre, pedidos: fechas.length, ultimo, diasInactivo, gapPromedio, caidaRitmo });
  }
  return out;
}

// Buckets de inactividad según el ciclo del negocio: 7-15-21-28-35.
export function bucketInactividad(diasInactivo) {
  if (diasInactivo == null) return { label: 'Nunca pidió', tone: 'default', orden: 6 };
  if (diasInactivo <= 7) return { label: '0–7 días', tone: 'positive', orden: 0 };
  if (diasInactivo <= 15) return { label: '8–15 días', tone: 'positive', orden: 1 };
  if (diasInactivo <= 21) return { label: '16–21 días', tone: 'caution', orden: 2 };
  if (diasInactivo <= 28) return { label: '22–28 días', tone: 'caution', orden: 3 };
  if (diasInactivo <= 35) return { label: '29–35 días', tone: 'critical', orden: 4 };
  return { label: '+35 días', tone: 'critical', orden: 5 };
}
