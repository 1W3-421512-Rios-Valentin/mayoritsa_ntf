// Tool "Importar facturación": carga el CSV del sistema, reconstruye clientes,
// pedidos (FA/FB) y devoluciones (NCA), y los guarda en el dataset interno.
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Card, Container, Stack, Flex, Box, Button, Text, Heading, Badge, Spinner, useToast,
} from '@sanity/ui';
import { useClient } from 'sanity';
import { parseFacturacion } from '../lib/parseFacturacion.js';

const randomKey = () => Math.random().toString(36).slice(2, 12);
const fmtARS = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;
const idSafe = (s) => String(s).replace(/[^a-zA-Z0-9._-]/g, '-');

const clienteId = (cod) => `cliente.${idSafe(cod)}`;
const pedidoId = (p) => `pedido.${idSafe(p.codCliente)}.${idSafe(p.tipoComprobante)}.${idSafe(p.fecha)}`;
const devolucionId = (d) => `devolucion.${idSafe(d.codCliente)}.${idSafe(d.fecha)}`;

function itemsDoc(items) {
  return items.map((i) => ({
    _type: 'item', _key: randomKey(),
    sku: i.sku, descripcion: i.descripcion, categoria: i.categoria, precio: i.precio,
    cantidades: i.cantidades.map((c) => ({ _type: 'cantidadTalle', _key: randomKey(), talle: c.talle, cantidad: c.cantidad })),
    unidades: i.unidades, subtotal: i.subtotal,
  }));
}

export default function ImportFacturacion() {
  const interno = useClient({ apiVersion: '2024-01-01' });
  const produccion = useMemo(() => interno.withConfig({ dataset: 'production' }), [interno]);
  const toast = useToast();
  const inputRef = useRef(null);

  const [catPorSku, setCatPorSku] = useState(null);
  const [data, setData] = useState(null);       // {clientes, pedidos, devoluciones}
  const [existentes, setExistentes] = useState(new Set());
  const [status, setStatus] = useState('idle'); // idle|parsing|ready
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    produccion.fetch('*[_type=="producto" && defined(sku)]{sku, categoria}')
      .then((ps) => setCatPorSku(new Map(ps.map((p) => [String(p.sku).toLowerCase(), p.categoria || '']))))
      .catch(() => setCatPorSku(new Map()));
  }, [produccion]);

  const procesar = useCallback(async (file) => {
    setStatus('parsing');
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const text = new TextDecoder('windows-1252').decode(buf);
      const parsed = parseFacturacion(text, { catPorSku: catPorSku || new Map() });
      setData(parsed);
      // dedupe: qué ids ya existen
      const ids = [
        ...parsed.pedidos.map(pedidoId),
        ...parsed.devoluciones.map(devolucionId),
      ];
      const ya = await interno.fetch('*[_id in $ids]._id', { ids });
      setExistentes(new Set(ya));
      setStatus('ready');
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'No se pudo leer el CSV', description: String(err.message || err) });
      setStatus('idle');
    }
  }, [catPorSku, interno, toast]);

  function onFile(e) { const f = e.currentTarget.files?.[0]; if (f) procesar(f); }
  async function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) procesar(f);
  }

  const resumen = useMemo(() => {
    if (!data) return null;
    const fechas = [...data.pedidos, ...data.devoluciones].map((x) => x.fecha).filter(Boolean).sort();
    const skuSinCat = new Set();
    for (const p of data.pedidos) for (const it of p.items) if (!it.categoria) skuSinCat.add(it.sku);
    const nuevosPedidos = data.pedidos.filter((p) => !existentes.has(pedidoId(p))).length;
    const nuevasDev = data.devoluciones.filter((d) => !existentes.has(devolucionId(d))).length;
    return {
      facturado: data.pedidos.reduce((n, p) => n + p.totalMonto, 0),
      devuelto: data.devoluciones.reduce((n, p) => n + p.totalMonto, 0),
      desde: fechas[0], hasta: fechas[fechas.length - 1],
      skuSinCat: skuSinCat.size,
      nuevosPedidos, nuevasDev,
    };
  }, [data, existentes]);

  async function importar() {
    if (!data) return;
    const clientes = data.clientes;
    const pedidos = data.pedidos.filter((p) => !existentes.has(pedidoId(p)));
    const devols = data.devoluciones.filter((d) => !existentes.has(devolucionId(d)));
    setImporting(true);
    setProgress({ done: 0, total: clientes.length + pedidos.length + devols.length });
    let done = 0;
    const bump = (n = 1) => { done += n; setProgress((p) => ({ ...p, done })); };
    try {
      // Clientes (createIfNotExists: no pisa pins/datos ya cargados).
      let tx = interno.transaction();
      for (const c of clientes) {
        tx = tx.createIfNotExists({
          _id: clienteId(c.codCliente), _type: 'cliente',
          nombre: c.nombre, codCliente: c.codCliente, cuit: c.cuit || undefined,
          direccion: c.direccion || undefined, telefono: c.telefono || undefined, activo: true,
        });
      }
      await tx.commit(); bump(clientes.length);

      const chunk = (arr, n) => arr.reduce((a, _, i) => (i % n ? a : [...a, arr.slice(i, i + n)]), []);

      for (const grupo of chunk(pedidos, 40)) {
        let t = interno.transaction();
        for (const p of grupo) {
          t = t.createIfNotExists({
            _id: pedidoId(p), _type: 'pedido',
            cliente: { _type: 'reference', _ref: clienteId(p.codCliente) },
            fecha: p.fecha, tipoComprobante: p.tipoComprobante,
            nroComprobante: p.nroComprobante || undefined,
            items: itemsDoc(p.items), totalUnidades: p.totalUnidades, totalMonto: p.totalMonto,
          });
        }
        await t.commit(); bump(grupo.length);
      }

      for (const grupo of chunk(devols, 40)) {
        let t = interno.transaction();
        for (const d of grupo) {
          t = t.createIfNotExists({
            _id: devolucionId(d), _type: 'devolucion',
            cliente: { _type: 'reference', _ref: clienteId(d.codCliente) },
            fecha: d.fecha, items: itemsDoc(d.items),
            totalUnidades: d.totalUnidades, totalMonto: d.totalMonto,
          });
        }
        await t.commit(); bump(grupo.length);
      }

      setResult({ clientes: clientes.length, pedidos: pedidos.length, devoluciones: devols.length });
      toast.push({ status: 'success', title: `Importado: ${pedidos.length} pedidos, ${devols.length} devoluciones` });
      // refrescar dedupe
      const ids = [...data.pedidos.map(pedidoId), ...data.devoluciones.map(devolucionId)];
      setExistentes(new Set(await interno.fetch('*[_id in $ids]._id', { ids })));
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'Error al importar', description: String(err.message || err) });
    } finally {
      setImporting(false);
    }
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Container width={4} padding={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading size={3}>Importar facturación</Heading>
          <Text size={1} muted>
            Subí el CSV del sistema (Estadísticas). Se reconstruyen clientes, pedidos
            (facturas FA/FB) y devoluciones (NCA). Reimportar el mismo archivo no duplica.
          </Text>
        </Stack>

        <Card
          padding={5} radius={3} shadow={1}
          tone={dragOver ? 'primary' : 'transparent'}
          style={{ border: '2px dashed var(--card-border-color)', textAlign: 'center' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <Stack space={3}>
            <Text muted>Arrastrá el CSV acá…</Text>
            <Box><input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} /></Box>
          </Stack>
        </Card>

        {catPorSku == null && <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>Cargando catálogo…</Text></Flex>}
        {status === 'parsing' && <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>Leyendo CSV…</Text></Flex>}

        {status === 'ready' && resumen && (
          <>
            <Flex gap={2} wrap="wrap">
              <Badge tone="primary">{data.clientes.length} clientes</Badge>
              <Badge tone="positive">{data.pedidos.length} pedidos ({resumen.nuevosPedidos} nuevos)</Badge>
              <Badge tone="caution">{data.devoluciones.length} devoluciones ({resumen.nuevasDev} nuevas)</Badge>
            </Flex>

            <Card padding={3} radius={3} shadow={1}>
              <Stack space={2}>
                <Text size={1}>Período: <b>{resumen.desde}</b> → <b>{resumen.hasta}</b></Text>
                <Text size={1}>Facturado (ventas): <b>{fmtARS(resumen.facturado)}</b></Text>
                <Text size={1}>Devuelto (NCA): <b>{fmtARS(resumen.devuelto)}</b></Text>
                {resumen.skuSinCat > 0 && (
                  <Text size={0} muted>{resumen.skuSinCat} SKU no están en el catálogo → categoría vacía.</Text>
                )}
              </Stack>
            </Card>

            {importing && (
              <Stack space={2}>
                <Text size={1} muted>Importando {progress.done} / {progress.total}…</Text>
                <Box style={{ height: 8, borderRadius: 4, background: 'var(--card-border-color)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#4a7cff', transition: 'width .2s' }} />
                </Box>
              </Stack>
            )}

            <Flex justify="flex-end">
              <Button
                tone="primary"
                text={importing ? 'Importando…' : `Importar (${resumen.nuevosPedidos + resumen.nuevasDev} nuevos)`}
                disabled={importing || (resumen.nuevosPedidos + resumen.nuevasDev === 0)}
                onClick={importar}
              />
            </Flex>
          </>
        )}

        {result && (
          <Card padding={3} radius={2} tone="positive">
            <Text size={1}>
              ✓ Clientes: {result.clientes} · Pedidos nuevos: {result.pedidos} · Devoluciones nuevas: {result.devoluciones}
            </Text>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
