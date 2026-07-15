// Pestaña Productos: análisis COMPLETO de todos los productos vendidos.
// Tabla ordenable + buscador, con filtros de fecha y cliente.
import React, { useState, useMemo } from 'react';
import { Stack, Flex, Box, Text, TextInput, Select, Card } from '@sanity/ui';
import { filtrar, analisisProductos, fmtARS } from '../../lib/metrics.js';
import { Kpi } from './charts.jsx';

const COLS = [
  { key: 'sku', label: 'SKU', num: false, w: '90px' },
  { key: 'descripcion', label: 'Descripción', num: false, w: 'minmax(220px,1fr)' },
  { key: 'categoria', label: 'Categoría', num: false, w: '130px' },
  { key: 'vendidas', label: 'Vend.', num: true, w: '70px' },
  { key: 'montoVendido', label: '$ Vendido', num: true, w: '120px' },
  { key: 'devueltas', label: 'Devue.', num: true, w: '70px' },
  { key: 'netoUnidades', label: 'Neto u.', num: true, w: '70px' },
  { key: 'netoMonto', label: '$ Neto', num: true, w: '120px' },
];
const GRID = COLS.map((c) => c.w).join(' ');

export default function Productos({ pedidos, clientes, devoluciones = [] }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [busca, setBusca] = useState('');
  const [sortKey, setSortKey] = useState('montoVendido');
  const [sortDir, setSortDir] = useState('desc');

  const rango = { desde: desde || undefined, hasta: hasta || undefined, clienteId: clienteId || undefined };
  const peds = useMemo(() => filtrar(pedidos, rango), [pedidos, desde, hasta, clienteId]);
  const devs = useMemo(() => filtrar(devoluciones, rango), [devoluciones, desde, hasta, clienteId]);

  const filas = useMemo(() => {
    let rows = analisisProductos(peds, devs);
    const q = busca.trim().toLowerCase();
    if (q) rows = rows.filter((r) => `${r.sku} ${r.descripcion} ${r.categoria}`.toLowerCase().includes(q));
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return rows;
  }, [peds, devs, busca, sortKey, sortDir]);

  const totVend = filas.reduce((n, r) => n + r.vendidas, 0);
  const totDev = filas.reduce((n, r) => n + r.devueltas, 0);
  const totMonto = filas.reduce((n, r) => n + r.netoMonto, 0);

  const clickSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <Stack space={4}>
      <Card padding={3} radius={3} shadow={1}>
        <Flex gap={3} wrap="wrap" align="flex-end">
          <Stack space={1}><Text size={0} muted>Desde</Text>
            <TextInput type="date" value={desde} onChange={(e) => setDesde(e.currentTarget.value)} /></Stack>
          <Stack space={1}><Text size={0} muted>Hasta</Text>
            <TextInput type="date" value={hasta} onChange={(e) => setHasta(e.currentTarget.value)} /></Stack>
          <Stack space={1} style={{ minWidth: 200 }}><Text size={0} muted>Cliente</Text>
            <Select value={clienteId} onChange={(e) => setClienteId(e.currentTarget.value)}>
              <option value="">Todos los clientes</option>
              {clientes.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </Select></Stack>
          <Box flex={1} style={{ minWidth: 200 }}>
            <Stack space={1}><Text size={0} muted>Buscar</Text>
              <TextInput placeholder="SKU, descripción o categoría…" value={busca} onChange={(e) => setBusca(e.currentTarget.value)} /></Stack>
          </Box>
        </Flex>
      </Card>

      <Flex gap={3} wrap="wrap">
        <Kpi label="Productos distintos" value={filas.length} />
        <Kpi label="Unidades vendidas" value={totVend.toLocaleString('es-AR')} />
        <Kpi label="Unidades devueltas" value={totDev.toLocaleString('es-AR')} />
        <Kpi label="$ Neto" value={fmtARS(totMonto)} />
      </Flex>

      <Card padding={2} radius={3} shadow={1}>
        <Box style={{ overflow: 'auto', maxHeight: '58vh' }}>
          <Box style={{ minWidth: 780 }}>
            {/* Encabezado */}
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '6px 8px', position: 'sticky', top: 0, background: 'var(--card-bg-color)', zIndex: 1, borderBottom: '2px solid var(--card-border-color)' }}>
              {COLS.map((c) => (
                <Text key={c.key} size={0} weight="semibold"
                  style={{ cursor: 'pointer', textAlign: c.num ? 'right' : 'left', userSelect: 'none' }}
                  onClick={() => clickSort(c.key)}>
                  {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </Text>
              ))}
            </div>
            {filas.map((r) => (
              <div key={r.sku} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '5px 8px', borderTop: '1px solid var(--card-border-color)' }}>
                <Text size={0}>{r.sku}</Text>
                <Text size={0} textOverflow="ellipsis" title={r.descripcion}>{r.descripcion}</Text>
                <Text size={0} muted textOverflow="ellipsis">{r.categoria || '—'}</Text>
                <Text size={0} style={{ textAlign: 'right' }}>{r.vendidas}</Text>
                <Text size={0} style={{ textAlign: 'right' }}>{fmtARS(r.montoVendido)}</Text>
                <Text size={0} style={{ textAlign: 'right' }}>{r.devueltas || ''}</Text>
                <Text size={0} weight="semibold" style={{ textAlign: 'right' }}>{r.netoUnidades}</Text>
                <Text size={0} weight="semibold" style={{ textAlign: 'right' }}>{fmtARS(r.netoMonto)}</Text>
              </div>
            ))}
            {!filas.length && <Box padding={3}><Text size={1} muted>Sin productos para este filtro.</Text></Box>}
          </Box>
        </Box>
      </Card>
      <Text size={0} muted>{filas.length} producto(s) · tocá una columna para ordenar.</Text>
    </Stack>
  );
}
