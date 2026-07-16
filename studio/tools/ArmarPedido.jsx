// Tool "Armar pedido": arma el pedido con cantidades por talle, lo GUARDA como
// documento `pedido` (dataset interno, con el .xlsx adjunto) y descarga el Excel.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card, Container, Stack, Flex, Box, Button, Text, Heading,
  TextInput, Select, Spinner, Badge, useToast,
} from '@sanity/ui';
import { useClient } from 'sanity';
import { SCALES } from '../lib/sizes.js';
import { buildExcelPedido, nombreArchivoPedido, descargarBlob } from '../lib/excelPedido.js';

const fmtARS = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;
const hoyISO = () => new Date().toISOString().slice(0, 10);
const isoADdmm = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const randomKey = () => Math.random().toString(36).slice(2, 12);

export default function ArmarPedido() {
  const interno = useClient({ apiVersion: '2024-01-01' });
  const produccion = useMemo(() => interno.withConfig({ dataset: 'production' }), [interno]);
  const toast = useToast();

  // --- Cliente ---
  const [clientes, setClientes] = useState(null);
  const [clienteSel, setClienteSel] = useState(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: '', localidad: '', provincia: '' });
  const [fecha, setFecha] = useState(hoyISO());

  // --- Artículos ---
  const [productos, setProductos] = useState(null);
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('');
  const [cants, setCants] = useState({}); // sku -> { talle: qty }
  const [guardando, setGuardando] = useState(false);

  const cargarClientes = useCallback(() => {
    interno.fetch('*[_type=="cliente"] | order(nombre asc){_id, nombre, localidad}')
      .then(setClientes).catch(() => setClientes([]));
  }, [interno]);
  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  useEffect(() => {
    produccion.fetch(`*[_type=="producto" && activo == true] | order(categoria asc, orden asc){
      sku, descripcion, precio, categoria, tipoTalle, talles,
      "fotoUrl": fotos[0].asset->url
    }`).then(setProductos).catch(() => setProductos([]));
  }, [produccion]);

  const clientesFiltrados = useMemo(() => {
    const q = buscaCliente.trim().toLowerCase();
    if (!q) return clientes || [];
    return (clientes || []).filter((c) => c.nombre.toLowerCase().includes(q));
  }, [clientes, buscaCliente]);

  const categorias = useMemo(
    () => [...new Set((productos || []).map((p) => p.categoria).filter(Boolean))].sort(),
    [productos]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (productos || []).filter((p) => {
      if (cat && p.categoria !== cat) return false;
      if (!q) return true;
      return `${p.sku} ${p.descripcion} ${p.categoria ?? ''}`.toLowerCase().includes(q);
    });
  }, [productos, busca, cat]);

  const setQty = (sku, talle, val) => {
    setCants((prev) => ({ ...prev, [sku]: { ...prev[sku], [talle]: val } }));
  };

  // Items con cantidad > 0 (snapshot para guardar/exportar).
  const items = useMemo(() => {
    const out = [];
    for (const p of productos || []) {
      const c = cants[p.sku];
      if (!c) continue;
      const cantidades = {};
      let unidades = 0;
      for (const [talle, v] of Object.entries(c)) {
        const q = Math.max(0, parseInt(v, 10) || 0);
        if (q > 0) { cantidades[talle] = q; unidades += q; }
      }
      if (unidades > 0) {
        out.push({
          sku: p.sku, descripcion: p.descripcion, categoria: p.categoria || '',
          precio: p.precio, cantidades, unidades, subtotal: unidades * p.precio,
        });
      }
    }
    return out;
  }, [productos, cants]);

  const totalU = items.reduce((n, i) => n + i.unidades, 0);
  const totalM = items.reduce((n, i) => n + i.subtotal, 0);

  async function crearCliente() {
    if (!nuevo.nombre.trim()) return;
    try {
      const doc = await interno.create({
        _type: 'cliente', nombre: nuevo.nombre.trim(),
        localidad: nuevo.localidad.trim() || undefined,
        provincia: nuevo.provincia.trim() || undefined,
        activo: true,
      });
      toast.push({ status: 'success', title: `Cliente "${doc.nombre}" creado` });
      setNuevo({ nombre: '', localidad: '', provincia: '' });
      setNuevoOpen(false);
      setClienteSel({ _id: doc._id, nombre: doc.nombre });
      cargarClientes();
    } catch (err) {
      toast.push({ status: 'error', title: 'No se pudo crear el cliente', description: String(err.message || err) });
    }
  }

  async function guardar() {
    if (!clienteSel) {
      toast.push({ status: 'warning', title: 'Elegí un cliente antes de guardar.' });
      return;
    }
    if (!items.length) {
      toast.push({ status: 'warning', title: 'Agregá al menos una cantidad.' });
      return;
    }
    setGuardando(true);
    try {
      const fechaTexto = isoADdmm(fecha);
      const blob = await buildExcelPedido({ cliente: clienteSel.nombre, fecha: fechaTexto, items });
      const filename = nombreArchivoPedido(clienteSel.nombre, fechaTexto);
      const asset = await interno.assets.upload('file', blob, { filename });
      await interno.create({
        _type: 'pedido',
        cliente: { _type: 'reference', _ref: clienteSel._id },
        fecha,
        items: items.map((i) => ({
          _type: 'item', _key: randomKey(),
          sku: i.sku, descripcion: i.descripcion, categoria: i.categoria, precio: i.precio,
          cantidades: Object.entries(i.cantidades).map(([talle, cantidad]) => ({
            _type: 'cantidadTalle', _key: randomKey(), talle, cantidad,
          })),
          unidades: i.unidades, subtotal: i.subtotal,
        })),
        totalUnidades: totalU,
        totalMonto: totalM,
        archivo: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
      });
      descargarBlob(blob, filename);
      toast.push({ status: 'success', title: 'Pedido guardado y Excel descargado' });
      setCants({});
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'Error al guardar el pedido', description: String(err.message || err) });
    } finally {
      setGuardando(false);
    }
  }

  const cargando = clientes == null || productos == null;

  return (
    <Container width={5} padding={4}>
      <Stack space={4}>
        <Heading size={3}>Armar pedido</Heading>
        {cargando && <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>Cargando…</Text></Flex>}

        {!cargando && (
          <>
            {/* Cabecera: cliente + fecha */}
            <Card padding={3} radius={3} shadow={1}>
              <Flex gap={3} wrap="wrap" align="flex-end">
                <Stack space={2} style={{ minWidth: 260, flex: 1 }}>
                  <Text size={1} weight="semibold">Cliente</Text>
                  {clienteSel ? (
                    <Flex gap={2} align="center">
                      <Badge tone="positive" fontSize={2} padding={3}>{clienteSel.nombre}</Badge>
                      <Button mode="ghost" text="Cambiar" onClick={() => { setClienteSel(null); setBuscaCliente(''); }} />
                    </Flex>
                  ) : (
                    <Stack space={2}>
                      <TextInput
                        placeholder="Buscar cliente…"
                        value={buscaCliente}
                        onChange={(e) => setBuscaCliente(e.currentTarget.value)}
                      />
                      <Card radius={2} tone="transparent" style={{ maxHeight: 180, overflow: 'auto' }}>
                        <Stack space={1}>
                          {clientesFiltrados.slice(0, 30).map((c) => (
                            <Card key={c._id} padding={2} radius={2} tone="default"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setClienteSel(c)}>
                              <Text size={1}>{c.nombre}{c.localidad ? ` · ${c.localidad}` : ''}</Text>
                            </Card>
                          ))}
                          {!clientesFiltrados.length && <Box padding={2}><Text size={1} muted>Sin resultados.</Text></Box>}
                        </Stack>
                      </Card>
                      <Button mode="ghost" tone="primary" text="＋ Nuevo cliente" onClick={() => setNuevoOpen((v) => !v)} />
                      {nuevoOpen && (
                        <Card padding={3} radius={2} tone="primary">
                          <Stack space={2}>
                            <TextInput placeholder="Nombre *" value={nuevo.nombre}
                              onChange={(e) => setNuevo({ ...nuevo, nombre: e.currentTarget.value })} />
                            <Flex gap={2}>
                              <TextInput placeholder="Localidad" value={nuevo.localidad}
                                onChange={(e) => setNuevo({ ...nuevo, localidad: e.currentTarget.value })} />
                              <TextInput placeholder="Provincia" value={nuevo.provincia}
                                onChange={(e) => setNuevo({ ...nuevo, provincia: e.currentTarget.value })} />
                            </Flex>
                            <Button tone="primary" text="Crear cliente" disabled={!nuevo.nombre.trim()} onClick={crearCliente} />
                            <Text size={0} muted>Después podés completar el pin del mapa desde la ficha del cliente.</Text>
                          </Stack>
                        </Card>
                      )}
                    </Stack>
                  )}
                </Stack>
                <Stack space={2}>
                  <Text size={1} weight="semibold">Fecha</Text>
                  <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.currentTarget.value)} />
                </Stack>
              </Flex>
            </Card>

            {/* Buscador de artículos */}
            <Flex gap={3} wrap="wrap">
              <Box flex={1} style={{ minWidth: 220 }}>
                <TextInput placeholder="Buscar artículo por SKU, descripción o categoría…"
                  value={busca} onChange={(e) => setBusca(e.currentTarget.value)} />
              </Box>
              <Select value={cat} onChange={(e) => setCat(e.currentTarget.value)} style={{ minWidth: 180 }}>
                <option value="">Todas las categorías</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Flex>

            {/* Artículos */}
            <Card padding={2} radius={3} shadow={1}>
              <Box style={{ maxHeight: '48vh', overflow: 'auto' }}>
                <Stack space={2}>
                  {filtrados.map((p) => {
                    const talles = p.talles?.length ? p.talles : (SCALES[p.tipoTalle] || []);
                    const c = cants[p.sku] || {};
                    let unidades = 0;
                    for (const v of Object.values(c)) unidades += Math.max(0, parseInt(v, 10) || 0);
                    const sub = unidades * p.precio;
                    return (
                      <Card key={p.sku} padding={2} radius={2} tone={unidades > 0 ? 'primary' : 'default'} border>
                        <Flex gap={3} align="center" wrap="wrap">
                          {p.fotoUrl
                            ? <img src={`${p.fotoUrl}?w=64&h=64&fit=crop&auto=format`} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                            : <Box style={{ width: 48, height: 48, borderRadius: 6, background: 'var(--card-border-color)' }} />}
                          <Stack space={2} style={{ minWidth: 180, flex: 1 }}>
                            <Text size={1} weight="semibold" textOverflow="ellipsis">{p.descripcion}</Text>
                            <Text size={0} muted>{p.sku} · {p.categoria || 's/cat'} · {fmtARS(p.precio)}</Text>
                          </Stack>
                          <Flex gap={2} wrap="wrap">
                            {talles.map((t) => (
                              <Stack key={t} space={1} style={{ alignItems: 'center' }}>
                                <Text size={0} muted>{t}</Text>
                                <TextInput
                                  type="number" min={0}
                                  value={c[t] ?? ''}
                                  onChange={(e) => setQty(p.sku, t, e.currentTarget.value)}
                                  style={{ width: 52, textAlign: 'center' }}
                                  padding={2}
                                  placeholder="0"
                                />
                              </Stack>
                            ))}
                          </Flex>
                          <Stack space={2} style={{ width: 110, textAlign: 'right' }}>
                            <Text size={1} weight="semibold">{unidades > 0 ? fmtARS(sub) : '—'}</Text>
                            <Text size={0} muted>{unidades} u.</Text>
                          </Stack>
                        </Flex>
                      </Card>
                    );
                  })}
                  {!filtrados.length && <Box padding={3}><Text size={1} muted>Sin artículos para ese filtro.</Text></Box>}
                </Stack>
              </Box>
            </Card>

            {/* Resumen fijo */}
            <Card padding={3} radius={3} shadow={2} tone="primary">
              <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Text size={2} weight="semibold">
                  {items.length} artículo(s) · {totalU} unidades · {fmtARS(totalM)}
                </Text>
                <Flex gap={2}>
                  <Button mode="ghost" text="Limpiar" disabled={guardando} onClick={() => setCants({})} />
                  <Button
                    tone="positive"
                    text={guardando ? 'Guardando…' : 'Guardar pedido y descargar Excel'}
                    disabled={guardando || !items.length || !clienteSel}
                    onClick={guardar}
                  />
                </Flex>
              </Flex>
            </Card>
          </>
        )}
      </Stack>
    </Container>
  );
}
