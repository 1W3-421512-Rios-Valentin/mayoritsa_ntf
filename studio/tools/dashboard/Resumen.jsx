// Pestaña Resumen: KPIs + rankings + serie temporal, con filtros fecha/cliente.
import React, { useState, useMemo } from 'react';
import { Stack, Flex, Box, Text, TextInput, Select, Card } from '@sanity/ui';
import { filtrar, topArticulos, ventasPorCategoria, topClientes, pedidosPorPeriodo, actividadClientes, fmtARS } from '../../lib/metrics.js';
import { Kpi, BarrasH, BarrasV } from './charts.jsx';

export default function Resumen({ pedidos, clientes }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [periodo, setPeriodo] = useState('mes');

  const filtrados = useMemo(
    () => filtrar(pedidos, { desde: desde || undefined, hasta: hasta || undefined, clienteId: clienteId || undefined }),
    [pedidos, desde, hasta, clienteId]
  );

  const totalM = filtrados.reduce((n, p) => n + (p.totalMonto || 0), 0);
  const totalU = filtrados.reduce((n, p) => n + (p.totalUnidades || 0), 0);
  const clientesActivos = new Set(filtrados.map((p) => p.cliente?._id).filter(Boolean)).size;

  const arts = topArticulos(filtrados, 10);
  const cats = ventasPorCategoria(filtrados);
  const tops = topClientes(filtrados, 10);
  const serie = pedidosPorPeriodo(filtrados, periodo);

  // Tiempo promedio entre pedidos (sobre el filtro de cliente, con todas las fechas).
  const actividad = useMemo(() => {
    const base = clienteId ? clientes.filter((c) => c._id === clienteId) : clientes;
    return actividadClientes(filtrar(pedidos, { clienteId: clienteId || undefined }), base)
      .filter((a) => a.gapPromedio != null)
      .sort((a, b) => a.gapPromedio - b.gapPromedio);
  }, [pedidos, clientes, clienteId]);

  return (
    <Stack space={4}>
      {/* Filtros */}
      <Card padding={3} radius={3} shadow={1}>
        <Flex gap={3} wrap="wrap" align="flex-end">
          <Stack space={1}><Text size={0} muted>Desde</Text>
            <TextInput type="date" value={desde} onChange={(e) => setDesde(e.currentTarget.value)} /></Stack>
          <Stack space={1}><Text size={0} muted>Hasta</Text>
            <TextInput type="date" value={hasta} onChange={(e) => setHasta(e.currentTarget.value)} /></Stack>
          <Stack space={1} style={{ minWidth: 220 }}><Text size={0} muted>Cliente</Text>
            <Select value={clienteId} onChange={(e) => setClienteId(e.currentTarget.value)}>
              <option value="">Todos los clientes</option>
              {clientes.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </Select></Stack>
        </Flex>
      </Card>

      {/* KPIs */}
      <Flex gap={3} wrap="wrap">
        <Kpi label="Pedidos" value={filtrados.length} />
        <Kpi label="Unidades" value={totalU.toLocaleString('es-AR')} />
        <Kpi label="Facturación" value={fmtARS(totalM)} />
        <Kpi label="Clientes con pedidos" value={clientesActivos} />
      </Flex>

      {/* Pedidos por período */}
      <Flex gap={2} align="center">
        <Text size={1} weight="semibold">Pedidos por período:</Text>
        <Select value={periodo} onChange={(e) => setPeriodo(e.currentTarget.value)} style={{ width: 140 }}>
          <option value="semana">Semanal</option>
          <option value="mes">Mensual</option>
          <option value="trimestre">Trimestral</option>
        </Select>
      </Flex>
      <BarrasV titulo={`Facturación por ${periodo}`} rows={serie.map((s) => ({ label: s.label, value: s.monto, texto: `${s.pedidos}p` }))} />

      <Flex gap={3} wrap="wrap">
        <Box style={{ flex: 1, minWidth: 320 }}>
          <BarrasH
            titulo="Artículos más vendidos (unidades)"
            rows={arts.map((a) => ({
              label: `${a.sku} — ${a.descripcion}`,
              value: a.unidades,
              texto: `${a.unidades} u. · ${fmtARS(a.monto)}`,
            }))}
          />
        </Box>
        <Box style={{ flex: 1, minWidth: 320 }}>
          <BarrasH
            titulo="Ventas por categoría"
            color="#0a7d32"
            rows={cats.map((c) => ({
              label: c.categoria,
              value: c.monto,
              texto: fmtARS(c.monto),
            }))}
          />
        </Box>
      </Flex>

      <Flex gap={3} wrap="wrap">
        <Box style={{ flex: 1, minWidth: 320 }}>
          <BarrasH
            titulo="Top clientes por volumen"
            color="#8b5cf6"
            rows={tops.map((c) => ({
              label: c.nombre,
              value: c.monto,
              texto: `${fmtARS(c.monto)} · ${c.pedidos} ped.`,
            }))}
          />
        </Box>
        <Box style={{ flex: 1, minWidth: 320 }}>
          <BarrasH
            titulo="Tiempo promedio entre pedidos (días)"
            color="#f59e0b"
            rows={actividad.slice(0, 10).map((a) => ({
              label: a.nombre,
              value: a.gapPromedio,
              texto: `${a.gapPromedio} días · ${a.pedidos} ped.`,
            }))}
          />
        </Box>
      </Flex>
    </Stack>
  );
}
