// Tool "Importar historial": arrastrás la carpeta raíz (carpeta por cliente,
// cada .xlsx del cliente con una HOJA por pedido) y crea clientes + pedidos
// en el dataset interno, adjuntando el workbook original.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card, Container, Stack, Flex, Box, Button, Text, Heading, TextInput,
  Badge, Spinner, useToast,
} from '@sanity/ui';
import { useClient } from 'sanity';
import { parseWorkbook, clienteDesdeRuta } from '../lib/parseHistorial.js';

const randomKey = () => Math.random().toString(36).slice(2, 12);
const fmtARS = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;

// Drag&drop con rutas (fullPath) para deducir la carpeta del cliente.
async function filesWithPaths(dt) {
  const items = [...(dt.items || [])];
  const entries = items.map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  const out = [];
  async function walk(entry) {
    if (entry.isFile) {
      await new Promise((res) => entry.file((f) => { out.push({ file: f, path: entry.fullPath }); res(); }, () => res()));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readBatch = () => new Promise((res) => reader.readEntries((es) => res(es), () => res([])));
      let batch;
      do { batch = await readBatch(); for (const e of batch) await walk(e); } while (batch.length);
    }
  }
  for (const e of entries) await walk(e);
  return out;
}

export default function ImportHistorial() {
  const interno = useClient({ apiVersion: '2024-01-01' });
  const produccion = useMemo(() => interno.withConfig({ dataset: 'production' }), [interno]);
  const toast = useToast();
  const inputRef = React.useRef(null);

  const [tipoPorSku, setTipoPorSku] = useState(null);
  const [existentes, setExistentes] = useState(null); // Set "clienteLc|fecha|hojaOrigen"
  const [clientesMap, setClientesMap] = useState(null); // Map nombreLc → _id
  const [grupos, setGrupos] = useState([]); // [{cliente, pedidos:[{key,archivo,path,file,hoja,fecha,...}]}]
  const [edits, setEdits] = useState({});   // key → {selected, fecha}
  const [status, setStatus] = useState('idle'); // idle|parsing|ready
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('webkitdirectory', '');
      inputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    produccion.fetch('*[_type=="producto" && defined(sku)]{sku, tipoTalle}')
      .then((ps) => setTipoPorSku(new Map(ps.map((p) => [String(p.sku).toLowerCase(), p.tipoTalle]))))
      .catch(() => setTipoPorSku(new Map()));
  }, [produccion]);

  const cargarInterno = useCallback(() => {
    interno.fetch('*[_type=="pedido" && defined(hojaOrigen)]{fecha, hojaOrigen, "cliente": cliente->nombre}')
      .then((ps) => setExistentes(new Set(ps.map((p) => `${(p.cliente || '').toLowerCase()}|${p.fecha}|${p.hojaOrigen}`))))
      .catch(() => setExistentes(new Set()));
    interno.fetch('*[_type=="cliente"]{_id, nombre}')
      .then((cs) => setClientesMap(new Map(cs.map((c) => [c.nombre.toLowerCase(), c._id]))))
      .catch(() => setClientesMap(new Map()));
  }, [interno]);
  useEffect(() => { cargarInterno(); }, [cargarInterno]);

  const procesar = useCallback(async (entradas) => {
    // entradas: [{file, path}] — solo .xlsx
    setStatus('parsing');
    setResult(null);
    try {
      const xlsx = entradas.filter((e) => /\.xlsx$/i.test(e.file.name) && !e.file.name.startsWith('~$'));
      const porCliente = new Map();
      const initial = {};
      for (const e of xlsx) {
        const buf = await e.file.arrayBuffer();
        let pedidos;
        try {
          pedidos = await parseWorkbook(buf, { filename: e.file.name, tipoPorSku: tipoPorSku || new Map() });
        } catch (err) {
          console.warn(`No se pudo leer ${e.file.name}:`, err);
          continue;
        }
        const cliente = clienteDesdeRuta(e.path) || pedidos[0]?.clienteA1 || '(sin cliente)';
        if (!porCliente.has(cliente)) porCliente.set(cliente, []);
        for (const p of pedidos) {
          const key = `${e.path}::${p.hoja}`;
          const hojaOrigen = `${e.file.name} / ${p.hoja}`;
          porCliente.get(cliente).push({ ...p, key, hojaOrigen, archivo: e.file.name, path: e.path, file: e.file });
          initial[key] = { selected: true, fecha: p.fecha || '' };
        }
      }
      const gs = [...porCliente.entries()]
        .map(([cliente, pedidos]) => ({ cliente, pedidos }))
        .sort((a, b) => a.cliente.localeCompare(b.cliente));
      setGrupos(gs);
      setEdits(initial);
      setStatus('ready');
      if (!gs.length) toast.push({ status: 'warning', title: 'No se encontraron pedidos en esa carpeta.' });
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'Error al leer la carpeta', description: String(err.message || err) });
      setStatus('idle');
    }
  }, [tipoPorSku, toast]);

  async function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    procesar(await filesWithPaths(e.dataTransfer));
  }
  function onPick(e) {
    const fs = [...(e.currentTarget.files || [])].map((f) => ({ file: f, path: '/' + (f.webkitRelativePath || f.name) }));
    procesar(fs);
  }

  const yaImportado = useCallback((cliente, ped, fecha) =>
    existentes?.has(`${cliente.toLowerCase()}|${fecha}|${ped.hojaOrigen}`), [existentes]);

  const setEdit = (key, patch) => setEdits((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const seleccionados = useMemo(() => {
    const out = [];
    for (const g of grupos) {
      for (const p of g.pedidos) {
        const s = edits[p.key];
        if (s?.selected && !yaImportado(g.cliente, p, s.fecha)) out.push({ cliente: g.cliente, pedido: p, fecha: s.fecha });
      }
    }
    return out;
  }, [grupos, edits, yaImportado]);

  const sinFecha = seleccionados.filter((s) => !s.fecha).length;

  async function importar() {
    if (sinFecha > 0) {
      toast.push({ status: 'warning', title: `Hay ${sinFecha} pedido(s) sin fecha`, description: 'Completá la fecha (en rojo) o destildalos.' });
      return;
    }
    setImporting(true);
    setProgress({ done: 0, total: seleccionados.length });
    const cMap = new Map(clientesMap);
    const assetPorPath = new Map();
    let creados = 0, clientesNuevos = 0;
    const errores = [];
    for (const { cliente, pedido, fecha } of seleccionados) {
      try {
        // Cliente (dedupe por nombre).
        let cId = cMap.get(cliente.toLowerCase());
        if (!cId) {
          const doc = await interno.create({ _type: 'cliente', nombre: cliente, activo: true });
          cId = doc._id;
          cMap.set(cliente.toLowerCase(), cId);
          clientesNuevos++;
        }
        // Workbook original (una vez por archivo; Sanity deduplica por hash).
        let assetId = assetPorPath.get(pedido.path);
        if (!assetId) {
          const asset = await interno.assets.upload('file', pedido.file, { filename: pedido.archivo });
          assetId = asset._id;
          assetPorPath.set(pedido.path, assetId);
        }
        await interno.create({
          _type: 'pedido',
          cliente: { _type: 'reference', _ref: cId },
          fecha,
          hojaOrigen: pedido.hojaOrigen,
          items: pedido.items.map((i) => ({
            _type: 'item', _key: randomKey(),
            sku: i.sku, descripcion: i.descripcion,
            categoria: '', // se completa abajo si el SKU está en el catálogo
            precio: i.precio,
            cantidades: i.cantidades.map((c) => ({ _type: 'cantidadTalle', _key: randomKey(), ...c })),
            unidades: i.unidades, subtotal: i.subtotal,
          })),
          totalUnidades: pedido.totalUnidades,
          totalMonto: pedido.totalMonto,
          archivo: { _type: 'file', asset: { _type: 'reference', _ref: assetId } },
        });
        creados++;
      } catch (err) {
        console.error(err);
        errores.push({ hoja: pedido.hojaOrigen, msg: String(err.message || err) });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setImporting(false);
    setResult({ creados, clientesNuevos, errores });
    toast.push({ status: errores.length ? 'warning' : 'success', title: `Importados ${creados} pedido(s)` });
    cargarInterno();
  }

  const cargando = tipoPorSku == null || existentes == null || clientesMap == null;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Container width={5} padding={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading size={3}>Importar historial de pedidos</Heading>
          <Text size={1} muted>
            Arrastrá la carpeta raíz (una subcarpeta por cliente; cada .xlsx del cliente
            con una hoja por pedido). Los pedidos ya importados se detectan y omiten.
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
            <Text muted>Arrastrá acá la carpeta con los pedidos…</Text>
            <Box><input ref={inputRef} type="file" multiple onChange={onPick} /></Box>
          </Stack>
        </Card>

        {(cargando || status === 'parsing') && (
          <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>
            {status === 'parsing' ? 'Leyendo archivos…' : 'Cargando datos…'}</Text></Flex>
        )}

        {status === 'ready' && !cargando && grupos.length > 0 && (
          <>
            <Flex gap={2} wrap="wrap">
              <Badge tone="primary">{grupos.length} cliente(s)</Badge>
              <Badge tone="positive">{seleccionados.length} pedido(s) a importar</Badge>
              {sinFecha > 0 && <Badge tone="critical">{sinFecha} sin fecha (completar)</Badge>}
            </Flex>

            <Card padding={2} radius={2} shadow={1}>
              <Box style={{ maxHeight: '48vh', overflow: 'auto' }}>
                <Stack space={3}>
                  {grupos.map((g) => (
                    <Box key={g.cliente}>
                      <Box padding={2}>
                        <Text size={1} weight="bold">📁 {g.cliente}</Text>
                      </Box>
                      <Stack space={1}>
                        {g.pedidos.map((p) => {
                          const s = edits[p.key] || {};
                          const dup = yaImportado(g.cliente, p, s.fecha);
                          const faltaFecha = !s.fecha;
                          return (
                            <Card key={p.key} padding={2} radius={2} tone={dup ? 'transparent' : 'default'}
                              style={{ opacity: dup ? 0.5 : 1, marginLeft: 12 }}>
                              <Flex align="center" gap={3} wrap="wrap">
                                <input
                                  type="checkbox"
                                  checked={!!s.selected && !dup}
                                  disabled={dup}
                                  onChange={(e) => setEdit(p.key, { selected: e.currentTarget.checked })}
                                />
                                <Stack space={2} style={{ flex: 1, minWidth: 200 }}>
                                  <Text size={1}>{p.archivo} — hoja «{p.hoja}»</Text>
                                  <Text size={0} muted>
                                    {p.items.length} artículo(s) · {p.totalUnidades} u. · {fmtARS(p.totalMonto)}
                                    {dup ? ' · ya importado' : ''}
                                    {p.skusDesconocidos.length ? ` · ${p.skusDesconocidos.length} SKU fuera del catálogo` : ''}
                                  </Text>
                                </Stack>
                                <Box style={{ width: 160 }}>
                                  <TextInput
                                    type="date"
                                    value={s.fecha || ''}
                                    disabled={dup}
                                    onChange={(e) => setEdit(p.key, { fecha: e.currentTarget.value })}
                                    style={faltaFecha && !dup ? { outline: '2px solid #e46a7b', borderRadius: 4 } : undefined}
                                  />
                                </Box>
                              </Flex>
                            </Card>
                          );
                        })}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
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
                tone="positive"
                text={importing ? 'Importando…' : `Importar ${seleccionados.length} pedido(s)`}
                disabled={importing || !seleccionados.length}
                onClick={importar}
              />
            </Flex>
          </>
        )}

        {result && (
          <Card padding={3} radius={2} tone={result.errores.length ? 'caution' : 'positive'}>
            <Stack space={2}>
              <Text size={1}>
                ✓ Pedidos importados: {result.creados} · Clientes nuevos: {result.clientesNuevos}
              </Text>
              {result.errores.length > 0 && (
                <Text size={0} muted>Errores: {result.errores.map((e) => e.hoja).join(' · ')}</Text>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
