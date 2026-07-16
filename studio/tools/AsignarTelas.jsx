// Tool "Asignar telas": elegís una tela y le asignás (masivamente, pero
// seleccionando cuáles sí y cuáles no) los productos que la usan.
// Los productos se leen de `production`; la tela vive en `interno` y guarda los SKUs.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card, Container, Stack, Flex, Box, Button, Text, Heading, Label,
  TextInput, Select, Checkbox, Spinner, Badge, useToast,
} from '@sanity/ui';
import { useClient } from 'sanity';

const MAX_RENDER = 400;
const randomKey = () => Math.random().toString(36).slice(2, 12);

const ROW = {
  display: 'grid',
  gridTemplateColumns: '32px 90px minmax(220px, 1fr) 140px minmax(140px, 200px)',
  gap: 12,
  alignItems: 'center',
};
const GRID_MIN = 760;

export default function AsignarTelas() {
  const interno = useClient({ apiVersion: '2024-01-01' });
  const produccion = useMemo(() => interno.withConfig({ dataset: 'production' }), [interno]);
  const toast = useToast();

  const [telas, setTelas] = useState(null);
  const [productos, setProductos] = useState(null);
  const [telaId, setTelaId] = useState('');
  const [sel, setSel] = useState(new Set());     // skus seleccionados para la tela actual
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('');
  const [soloSinTela, setSoloSinTela] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nueva, setNueva] = useState({ codigoTela: '', nombre: '' });

  const cargarTelas = useCallback(() => {
    interno.fetch('*[_type=="tela"] | order(codigoTela asc){_id, codigoTela, nombre, productos[]{sku, descripcion, consumo}}')
      .then(setTelas).catch(() => setTelas([]));
  }, [interno]);
  useEffect(() => { cargarTelas(); }, [cargarTelas]);

  useEffect(() => {
    produccion.fetch('*[_type=="producto"] | order(categoria asc, descripcion asc){sku, descripcion, categoria}')
      .then(setProductos).catch(() => setProductos([]));
  }, [produccion]);

  const tela = useMemo(() => (telas || []).find((t) => t._id === telaId) || null, [telas, telaId]);

  // Al cambiar de tela, precargar su selección actual.
  useEffect(() => {
    setSel(new Set((tela?.productos || []).map((p) => p.sku)));
  }, [telaId, telas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mapa sku → [códigos de tela] (para los badges).
  const telasPorSku = useMemo(() => {
    const m = new Map();
    for (const t of telas || []) {
      for (const p of t.productos || []) {
        if (!m.has(p.sku)) m.set(p.sku, []);
        m.get(p.sku).push({ _id: t._id, codigo: t.codigoTela });
      }
    }
    return m;
  }, [telas]);

  const categorias = useMemo(
    () => [...new Set((productos || []).map((p) => p.categoria).filter(Boolean))].sort(),
    [productos]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (productos || []).filter((p) => {
      if (cat && p.categoria !== cat) return false;
      if (soloSinTela && (telasPorSku.get(p.sku) || []).length) return false;
      if (!q) return true;
      return `${p.sku} ${p.descripcion} ${p.categoria ?? ''}`.toLowerCase().includes(q);
    });
  }, [productos, busca, cat, soloSinTela, telasPorSku]);

  const toggle = (sku, on) => {
    setSel((prev) => {
      const n = new Set(prev);
      if (on) n.add(sku); else n.delete(sku);
      return n;
    });
  };
  const seleccionarFiltrados = (on) => {
    setSel((prev) => {
      const n = new Set(prev);
      for (const p of filtrados) { if (on) n.add(p.sku); else n.delete(p.sku); }
      return n;
    });
  };

  async function crearTela() {
    if (!nueva.codigoTela.trim()) return;
    try {
      const doc = await interno.create({
        _type: 'tela',
        codigoTela: nueva.codigoTela.trim(),
        nombre: nueva.nombre.trim() || undefined,
        activo: true,
      });
      toast.push({ status: 'success', title: `Tela ${doc.codigoTela} creada`, description: 'Completá su ficha técnica en Producción → Telas.' });
      setNueva({ codigoTela: '', nombre: '' });
      setNuevoOpen(false);
      cargarTelas();
      setTelaId(doc._id);
    } catch (err) {
      toast.push({ status: 'error', title: 'No se pudo crear la tela', description: String(err.message || err) });
    }
  }

  async function guardar() {
    if (!tela) return;
    setGuardando(true);
    try {
      const prevPorSku = new Map((tela.productos || []).map((p) => [p.sku, p]));
      const infoPorSku = new Map((productos || []).map((p) => [p.sku, p]));
      const productosDoc = [...sel].map((sku) => {
        const prev = prevPorSku.get(sku);
        return {
          _type: 'productoTela',
          _key: randomKey(),
          sku,
          descripcion: infoPorSku.get(sku)?.descripcion || prev?.descripcion || '',
          ...(prev?.consumo != null ? { consumo: prev.consumo } : {}),
        };
      });
      await interno.patch(tela._id).set({ productos: productosDoc }).commit();
      toast.push({ status: 'success', title: `${productosDoc.length} producto(s) asignados a ${tela.codigoTela}` });
      cargarTelas();
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'Error al guardar', description: String(err.message || err) });
    } finally {
      setGuardando(false);
    }
  }

  const cargando = telas == null || productos == null;

  return (
    <Container width={5} padding={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading size={3}>Asignar telas a productos</Heading>
          <Text size={1} muted>
            Elegí una tela y tildá los productos que la usan. Un producto puede tener
            varias telas (principal, rib, forro). Acá gestionás <b>solo la lista de la
            tela elegida</b>: destildar un producto le quita esta tela, no las otras.
          </Text>
        </Stack>

        {cargando && <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>Cargando…</Text></Flex>}

        {!cargando && (
          <>
            {/* Selección de tela */}
            <Card padding={3} radius={3} shadow={1}>
              <Flex gap={3} wrap="wrap" align="flex-end">
                <Stack space={1} style={{ minWidth: 280, flex: 1 }}>
                  <Text size={0} muted>Tela</Text>
                  <Select value={telaId} onChange={(e) => setTelaId(e.currentTarget.value)}>
                    <option value="">— Elegí una tela —</option>
                    {telas.map((t) => (
                      <option key={t._id} value={t._id}>
                        {[t.codigoTela, t.nombre].filter(Boolean).join(' — ')} ({(t.productos || []).length})
                      </option>
                    ))}
                  </Select>
                </Stack>
                <Button mode="ghost" tone="primary" text="＋ Nueva tela" onClick={() => setNuevoOpen((v) => !v)} />
              </Flex>
              {nuevoOpen && (
                <Card padding={3} radius={2} tone="primary" marginTop={3}>
                  <Stack space={2}>
                    <Flex gap={2} wrap="wrap">
                      <TextInput placeholder="Código de tela *" value={nueva.codigoTela}
                        onChange={(e) => setNueva({ ...nueva, codigoTela: e.currentTarget.value })} />
                      <TextInput placeholder="Nombre (opcional)" value={nueva.nombre}
                        onChange={(e) => setNueva({ ...nueva, nombre: e.currentTarget.value })} />
                    </Flex>
                    <Button tone="primary" text="Crear tela" disabled={!nueva.codigoTela.trim()} onClick={crearTela} />
                    <Text size={0} muted>Después completás composición, gramaje, rollo y proveedor en Producción → Telas.</Text>
                  </Stack>
                </Card>
              )}
            </Card>

            {!tela && <Text size={1} muted>Elegí una tela para empezar a asignar productos.</Text>}

            {tela && (
              <>
                <Flex gap={3} wrap="wrap" align="center">
                  <Box flex={1} style={{ minWidth: 220 }}>
                    <TextInput placeholder="Buscar por SKU, descripción o categoría…"
                      value={busca} onChange={(e) => setBusca(e.currentTarget.value)} />
                  </Box>
                  <Select value={cat} onChange={(e) => setCat(e.currentTarget.value)} style={{ minWidth: 180 }}>
                    <option value="">Todas las categorías</option>
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <Flex align="center" gap={2}>
                    <Checkbox id="sinTela" checked={soloSinTela} onChange={(e) => setSoloSinTela(e.currentTarget.checked)} />
                    <Text size={1}><label htmlFor="sinTela">Solo sin tela</label></Text>
                  </Flex>
                  <Button mode="ghost" text="Seleccionar filtrados" onClick={() => seleccionarFiltrados(true)} />
                  <Button mode="ghost" text="Quitar selección" onClick={() => seleccionarFiltrados(false)} />
                </Flex>

                <Card padding={2} radius={3} shadow={1}>
                  <Box style={{ maxHeight: '52vh', overflow: 'auto' }}>
                    <div style={{ minWidth: GRID_MIN }}>
                      <div style={{ ...ROW, padding: '4px 8px', position: 'sticky', top: 0, zIndex: 1, background: 'var(--card-bg-color)' }}>
                        <span />
                        <Label size={0} muted>SKU</Label>
                        <Label size={0} muted>Descripción</Label>
                        <Label size={0} muted>Categoría</Label>
                        <Label size={0} muted>Telas asignadas</Label>
                      </div>
                      {filtrados.slice(0, MAX_RENDER).map((p) => {
                        const marcado = sel.has(p.sku);
                        const suyas = telasPorSku.get(p.sku) || [];
                        return (
                          <div key={p.sku} style={{ ...ROW, padding: '6px 8px', borderTop: '1px solid var(--card-border-color)' }}>
                            <Checkbox checked={marcado} onChange={(e) => toggle(p.sku, e.currentTarget.checked)} />
                            <Text size={0}>{p.sku}</Text>
                            <Text size={1} textOverflow="ellipsis" title={p.descripcion}>{p.descripcion}</Text>
                            <Text size={0} muted textOverflow="ellipsis">{p.categoria || '—'}</Text>
                            <Flex gap={1} wrap="wrap">
                              {suyas.length
                                ? suyas.map((t) => (
                                    <Badge key={t._id} tone={t._id === tela._id ? 'primary' : 'default'} fontSize={0}>
                                      {t.codigo}
                                    </Badge>
                                  ))
                                : <Text size={0} muted>—</Text>}
                            </Flex>
                          </div>
                        );
                      })}
                    </div>
                  </Box>
                  {filtrados.length > MAX_RENDER && (
                    <Box padding={2}><Text size={0} muted>Mostrando {MAX_RENDER} de {filtrados.length}. Refiná la búsqueda.</Text></Box>
                  )}
                </Card>

                <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                  <Text size={1} muted>
                    {sel.size} producto(s) asignados a <b>{tela.codigoTela}</b>
                    {filtrados.length !== (productos || []).length ? ` · ${filtrados.length} en el filtro` : ''}
                  </Text>
                  <Button
                    tone="positive"
                    text={guardando ? 'Guardando…' : 'Guardar asignación'}
                    disabled={guardando}
                    onClick={guardar}
                  />
                </Flex>
              </>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
