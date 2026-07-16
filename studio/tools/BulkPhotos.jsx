import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Card, Container, Stack, Flex, Box, Button, Text, Heading, Badge, Spinner, useToast,
} from '@sanity/ui';
import { useClient } from 'sanity';
import { matchFiles, isImage } from '../lib/matchPhotos.js';

const MAX_RENDER = 300;
const randomKey = () => Math.random().toString(36).slice(2, 12);

// Recorre archivos y subcarpetas de un drop.
async function filesFromDataTransfer(dt) {
  const items = [...(dt.items || [])];
  const entries = items.map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!entries.length) return [...(dt.files || [])];
  const out = [];
  async function walk(entry) {
    if (entry.isFile) {
      await new Promise((res) => entry.file((f) => { out.push(f); res(); }, () => res()));
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

function Thumb({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? (
    <img src={url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
  ) : <Box style={{ width: 44, height: 44 }} />;
}

export default function BulkPhotos() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const toast = useToast();
  const inputRef = useRef(null);

  const [productos, setProductos] = useState(null); // [{_id, sku, descripcion, nFotos}]
  const [files, setFiles] = useState([]);           // [{name, file}]
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  // Habilitar selección de carpeta en el input.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('webkitdirectory', '');
      inputRef.current.setAttribute('directory', '');
    }
  }, []);

  const cargarProductos = useCallback(() => {
    client.fetch('*[_type=="producto" && defined(sku)]{_id, sku, descripcion, "nFotos": count(fotos)}')
      .then((ps) => setProductos(ps))
      .catch(() => setProductos([]));
  }, [client]);
  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  const setFromFileList = useCallback((list) => {
    const arr = [...list].filter((f) => isImage(f.name)).map((f) => ({ name: f.name, file: f }));
    setFiles(arr);
    setResult(null);
  }, []);

  async function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const fs = await filesFromDataTransfer(e.dataTransfer);
    setFromFileList(fs);
  }

  const prodBySku = useMemo(() => {
    const m = new Map();
    for (const p of productos || []) m.set(String(p.sku), p);
    return m;
  }, [productos]);

  const { matched, sinMatch } = useMemo(() => {
    if (!productos) return { matched: new Map(), sinMatch: [] };
    return matchFiles(files, productos.map((p) => p.sku));
  }, [files, productos]);

  const grupos = useMemo(() => [...matched.entries()], [matched]);
  const totalFotos = useMemo(() => grupos.reduce((n, [, arr]) => n + arr.length, 0), [grupos]);
  const conFotosPrevias = useMemo(
    () => grupos.filter(([sku]) => (prodBySku.get(sku)?.nFotos || 0) > 0).length,
    [grupos, prodBySku]
  );

  async function subir() {
    if (!grupos.length) return;
    setUploading(true);
    setResult(null);
    setProgress({ done: 0, total: totalFotos });
    let done = 0;
    let productosOk = 0;
    const errores = [];
    for (const [sku, arr] of grupos) {
      const prod = prodBySku.get(sku);
      if (!prod) continue;
      try {
        const refs = [];
        for (const f of arr) {
          const asset = await client.assets.upload('image', f.file, { filename: f.name });
          refs.push({ _type: 'image', _key: randomKey(), asset: { _type: 'reference', _ref: asset._id } });
          done++;
          setProgress({ done, total: totalFotos });
        }
        await client.patch(prod._id).set({ fotos: refs }).commit();
        productosOk++;
      } catch (err) {
        console.error(err);
        errores.push({ sku, msg: String(err?.message || err) });
      }
    }
    setUploading(false);
    setResult({ productos: productosOk, fotos: done, errores, sinMatch: sinMatch.length });
    toast.push({ status: errores.length ? 'warning' : 'success', title: `Fotos actualizadas en ${productosOk} producto(s)` });
    cargarProductos();
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Container width={5} padding={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading size={3}>Carga masiva de fotos</Heading>
          <Text size={1} muted>
            Elegí (o arrastrá) la carpeta con las fotos. Cada archivo tiene que
            llamarse con el SKU del producto (ej. <code>19468.jpg</code>, y varias por
            producto como <code>19468_2.jpg</code>). Se <b>reemplazan</b> las fotos de
            los productos que matcheen; la primera foto queda de portada.
          </Text>
        </Stack>

        {/* Zona de carpeta / drag&drop */}
        <Card
          padding={5}
          radius={3}
          tone={dragOver ? 'primary' : 'transparent'}
          shadow={1}
          style={{ border: '2px dashed var(--card-border-color)', textAlign: 'center' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <Stack space={3}>
            <Text muted>Arrastrá acá la carpeta con las fotos…</Text>
            <Box>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFromFileList(e.currentTarget.files || [])}
              />
            </Box>
            <Text size={0} muted>…o usá el botón para elegir una carpeta.</Text>
          </Stack>
        </Card>

        {productos == null && <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>Cargando productos…</Text></Flex>}

        {files.length > 0 && productos != null && (
          <>
            <Flex gap={3} wrap="wrap" align="center">
              <Badge tone="primary">{files.length} imagen(es)</Badge>
              <Badge tone="positive">{grupos.length} producto(s) con match</Badge>
              {conFotosPrevias > 0 && <Badge tone="caution">{conFotosPrevias} ya tenían fotos (se reemplazan)</Badge>}
              {sinMatch.length > 0 && <Badge tone="critical">{sinMatch.length} sin match</Badge>}
            </Flex>

            <Card padding={2} radius={2} shadow={1}>
              <Box style={{ maxHeight: '48vh', overflow: 'auto' }}>
                <Stack space={1}>
                  {grupos.slice(0, MAX_RENDER).map(([sku, arr]) => {
                    const prod = prodBySku.get(sku);
                    const prev = prod?.nFotos || 0;
                    return (
                      <Card key={sku} padding={2} radius={2} tone="default">
                        <Flex align="center" gap={3}>
                          <Thumb file={arr[0].file} />
                          <Stack space={2} style={{ flex: 1, minWidth: 0 }}>
                            <Text size={1} weight="semibold" textOverflow="ellipsis">{prod?.descripcion || '(sin descripción)'}</Text>
                            <Text size={0} muted>{sku} · {arr.length} foto(s){prev > 0 ? ` · reemplaza ${prev}` : ''}</Text>
                          </Stack>
                        </Flex>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
              {grupos.length > MAX_RENDER && (
                <Box padding={2}><Text size={0} muted>Mostrando {MAX_RENDER} de {grupos.length} productos.</Text></Box>
              )}
            </Card>

            {sinMatch.length > 0 && (
              <Card padding={3} radius={2} tone="critical">
                <Text size={1} weight="semibold">Sin match ({sinMatch.length}): estos archivos no coinciden con ningún SKU</Text>
                <Text size={0} muted style={{ marginTop: 6 }}>
                  {sinMatch.slice(0, 30).map((f) => f.name).join(', ')}{sinMatch.length > 30 ? '…' : ''}
                </Text>
              </Card>
            )}

            {uploading && (
              <Stack space={2}>
                <Text size={1} muted>Subiendo {progress.done} / {progress.total} foto(s)…</Text>
                <Box style={{ height: 8, borderRadius: 4, background: 'var(--card-border-color)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--card-focus-ring-color, #4a7cff)', transition: 'width .2s' }} />
                </Box>
              </Stack>
            )}

            <Flex justify="flex-end">
              <Button
                tone="primary"
                text={uploading ? 'Subiendo…' : `Subir y reemplazar fotos (${grupos.length})`}
                disabled={uploading || !grupos.length}
                onClick={subir}
              />
            </Flex>
          </>
        )}

        {result && (
          <Card padding={3} radius={2} tone={result.errores.length ? 'caution' : 'positive'}>
            <Stack space={2}>
              <Text size={1}>✓ Productos actualizados: {result.productos} · Fotos subidas: {result.fotos}
                {result.sinMatch > 0 ? ` · Sin match: ${result.sinMatch}` : ''}</Text>
              {result.errores.length > 0 && (
                <Text size={0} muted>Errores en: {result.errores.map((e) => e.sku).join(', ')}</Text>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
