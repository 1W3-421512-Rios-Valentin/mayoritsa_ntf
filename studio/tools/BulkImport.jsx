import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card, Container, Stack, Flex, Box, Button, Text, Heading, Label,
  TextInput, Select, Checkbox, Spinner, useToast,
} from '@sanity/ui';
import { useClient } from 'sanity';
import { parseStockFile, tallesForTipo } from '../lib/parseStock.js';

const MAX_RENDER = 400;

// Grilla de columnas de la tabla (checkbox · artículo · tipo · talles · categoría · precio)
const GRID_MIN = 820;
const ROW = {
  display: 'grid',
  gridTemplateColumns: '32px minmax(220px, 1fr) 120px 130px minmax(120px, 160px) 100px',
  gap: 12,
  alignItems: 'center',
};

export default function BulkImport() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const toast = useToast();

  const [status, setStatus] = useState('idle'); // idle | parsing | ready
  const [articulos, setArticulos] = useState([]);
  const [omitidos, setOmitidos] = useState(0);
  const [existing, setExisting] = useState(null); // Set<sku> | null (cargando)
  const [edits, setEdits] = useState({});         // codigo -> {selected, precio, tipoTalle, categoria}
  const [search, setSearch] = useState('');
  const [rubro, setRubro] = useState('');
  const [creating, setCreating] = useState(false);
  const [summary, setSummary] = useState(null);

  // SKUs ya existentes en Sanity (para omitir duplicados).
  const cargarExisting = useCallback(() => {
    client.fetch('*[_type=="producto" && defined(sku)].sku')
      .then((skus) => setExisting(new Set(skus.map(String))))
      .catch(() => setExisting(new Set()));
  }, [client]);
  useEffect(() => { cargarExisting(); }, [cargarExisting]);

  const setEdit = (codigo, patch) =>
    setEdits((prev) => ({ ...prev, [codigo]: { ...prev[codigo], ...patch } }));

  async function onFile(e) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setStatus('parsing');
    setSummary(null);
    try {
      const { articulos: arts, omitidos: om } = await parseStockFile(file);
      const initial = {};
      for (const a of arts) {
        initial[a.codigo] = { selected: false, precio: '', tipoTalle: a.tipoTalle, categoria: a.rubro };
      }
      setArticulos(arts);
      setOmitidos(om);
      setEdits(initial);
      setStatus('ready');
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'No se pudo leer el archivo', description: String(err.message || err) });
      setStatus('idle');
    }
  }

  const rubros = useMemo(
    () => [...new Set(articulos.map((a) => a.rubro).filter(Boolean))].sort(),
    [articulos]
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articulos.filter((a) => {
      if (rubro && a.rubro !== rubro) return false;
      if (!q) return true;
      return `${a.codigo} ${a.descripcion} ${a.rubro}`.toLowerCase().includes(q);
    });
  }, [articulos, search, rubro]);

  const existe = (codigo) => existing?.has(String(codigo));

  function seleccionarFiltrados(val) {
    setEdits((prev) => {
      const next = { ...prev };
      for (const a of filtrados) {
        if (existe(a.codigo)) continue;
        next[a.codigo] = { ...next[a.codigo], selected: val };
      }
      return next;
    });
  }

  const seleccionados = useMemo(
    () => articulos.filter((a) => edits[a.codigo]?.selected && !existe(a.codigo)),
    [articulos, edits, existing]
  );

  async function crear() {
    const conPrecio = seleccionados.filter((a) => Number(edits[a.codigo]?.precio) > 0);
    const sinPrecio = seleccionados.length - conPrecio.length;
    if (!conPrecio.length) {
      toast.push({ status: 'warning', title: 'Falta precio', description: 'Poné un precio > 0 en los artículos seleccionados.' });
      return;
    }
    setCreating(true);
    try {
      const tx = client.transaction();
      let creados = 0;
      for (const a of conPrecio) {
        const s = edits[a.codigo];
        const talles = tallesForTipo(a.validSet, s.tipoTalle);
        if (!talles.length) continue;
        const categoria = (s.categoria || '').trim();
        tx.create({
          _type: 'producto',
          sku: a.codigo,
          descripcion: a.descripcion,
          precio: Number(s.precio),
          tipoTalle: s.tipoTalle,
          talles,
          activo: true,
          ...(categoria ? { categoria } : {}),
        });
        creados++;
      }
      await tx.commit();
      toast.push({ status: 'success', title: `Se crearon ${creados} producto(s)` });
      setSummary({ creados, sinPrecio });
      // limpiar selección y refrescar existentes
      setEdits((prev) => {
        const next = { ...prev };
        for (const a of conPrecio) next[a.codigo] = { ...next[a.codigo], selected: false };
        return next;
      });
      cargarExisting();
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'Error al crear', description: String(err.message || err) });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Container width={5} padding={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading size={3}>Carga masiva de productos</Heading>
          <Text size={1} muted>
            Subí el CSV del "Listado de Stock por Casilleros", elegí los artículos,
            poné el precio mayorista y creá los productos. Los Códigos que ya existen
            se omiten automáticamente.
          </Text>
        </Stack>

        <Card padding={3} radius={2} shadow={1} tone="transparent">
          <Flex align="center" gap={3} wrap="wrap">
            <input type="file" accept=".csv,text/csv" onChange={onFile} />
            {status === 'parsing' && <Spinner muted />}
            {status === 'ready' && (
              <Text size={1} muted>
                {articulos.length} artículo(s) · {omitidos} omitido(s) por talle no compatible
                {existing == null ? ' · verificando existentes…' : ''}
              </Text>
            )}
          </Flex>
        </Card>

        {status === 'ready' && (
          <>
            <Flex gap={3} wrap="wrap" align="center">
              <Box flex={1} style={{ minWidth: 220 }}>
                <TextInput
                  placeholder="Buscar por código, descripción o rubro…"
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
              </Box>
              <Box style={{ minWidth: 200 }}>
                <Select value={rubro} onChange={(e) => setRubro(e.currentTarget.value)}>
                  <option value="">Todos los rubros</option>
                  {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Box>
              <Button mode="ghost" text="Seleccionar filtrados" onClick={() => seleccionarFiltrados(true)} />
              <Button mode="ghost" text="Quitar selección" onClick={() => seleccionarFiltrados(false)} />
            </Flex>

            <Card padding={2} radius={2} shadow={1}>
              <Box style={{ maxHeight: '55vh', overflow: 'auto' }}>
                <div style={{ minWidth: GRID_MIN }}>
                  {/* Encabezado */}
                  <div style={{ ...ROW, padding: '4px 8px', position: 'sticky', top: 0, zIndex: 1, background: 'var(--card-bg-color)' }}>
                    <span />
                    <Label size={0} muted>Artículo</Label>
                    <Label size={0} muted>Tipo talle</Label>
                    <Label size={0} muted>Talles</Label>
                    <Label size={0} muted>Categoría</Label>
                    <Label size={0} muted>Precio</Label>
                  </div>
                  {filtrados.slice(0, MAX_RENDER).map((a) => {
                    const s = edits[a.codigo] || {};
                    const yaExiste = existe(a.codigo);
                    const talles = tallesForTipo(a.validSet, s.tipoTalle || a.tipoTalle);
                    return (
                      <div
                        key={a.codigo}
                        style={{
                          ...ROW,
                          padding: '6px 8px',
                          borderTop: '1px solid var(--card-border-color)',
                          opacity: yaExiste ? 0.5 : 1,
                        }}
                      >
                        <Checkbox
                          checked={!!s.selected}
                          disabled={yaExiste}
                          onChange={(e) => setEdit(a.codigo, { selected: e.currentTarget.checked })}
                        />
                        <Stack space={2} style={{ minWidth: 0 }}>
                          <Text size={1} weight="semibold" textOverflow="ellipsis" title={a.descripcion}>
                            {a.descripcion}
                          </Text>
                          <Text size={0} muted textOverflow="ellipsis">
                            {a.codigo} · {a.rubro}{yaExiste ? ' · ya existe' : ''}
                          </Text>
                        </Stack>
                        <Select
                          value={s.tipoTalle || a.tipoTalle}
                          disabled={yaExiste}
                          onChange={(e) => setEdit(a.codigo, { tipoTalle: e.currentTarget.value })}
                        >
                          <option value="numero">número</option>
                          <option value="letra">letra</option>
                          <option value="unico">único</option>
                        </Select>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <Text size={0} muted style={{ whiteSpace: 'nowrap' }} title={talles.join(' ')}>
                            {talles.join(' ')}
                          </Text>
                        </div>
                        <TextInput
                          placeholder="Categoría"
                          value={s.categoria ?? a.rubro}
                          disabled={yaExiste}
                          onChange={(e) => setEdit(a.codigo, { categoria: e.currentTarget.value })}
                        />
                        <TextInput
                          type="number"
                          min={0}
                          placeholder="$"
                          value={s.precio ?? ''}
                          disabled={yaExiste}
                          onChange={(e) => setEdit(a.codigo, { precio: e.currentTarget.value })}
                        />
                      </div>
                    );
                  })}
                </div>
              </Box>
              {filtrados.length > MAX_RENDER && (
                <Box padding={2}>
                  <Text size={0} muted>Mostrando {MAX_RENDER} de {filtrados.length}. Refiná la búsqueda o el rubro.</Text>
                </Box>
              )}
            </Card>

            <Flex align="center" justify="space-between" gap={3} wrap="wrap">
              <Text size={1} muted>{seleccionados.length} seleccionado(s) para crear</Text>
              <Button
                tone="primary"
                text={creating ? 'Creando…' : `Crear ${seleccionados.length} producto(s)`}
                disabled={creating || !seleccionados.length || existing == null}
                onClick={crear}
              />
            </Flex>

            {summary && (
              <Card padding={3} radius={2} tone="positive">
                <Text size={1}>
                  ✓ Creados: {summary.creados}
                  {summary.sinPrecio > 0 && ` · Omitidos sin precio: ${summary.sinPrecio}`}
                </Text>
              </Card>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
