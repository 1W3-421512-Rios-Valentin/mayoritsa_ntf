// Tool "Resetear datos": borra TODOS los clientes, pedidos y devoluciones del
// dataset interno. Acción destructiva e irreversible → doble confirmación.
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Container, Stack, Flex, Box, Button, Text, Heading, TextInput, Spinner, useToast,
} from '@sanity/ui';
import { useClient } from 'sanity';

const PALABRA = 'BORRAR TODO';

export default function ResetDatos() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const toast = useToast();

  const [conteo, setConteo] = useState(null);
  const [texto, setTexto] = useState('');
  const [borrando, setBorrando] = useState(false);
  const [paso, setPaso] = useState('');
  const [result, setResult] = useState(null);

  const cargarConteo = useCallback(() => {
    client.fetch(`{
      "clientes": count(*[_type=="cliente"]),
      "pedidos": count(*[_type=="pedido"]),
      "devoluciones": count(*[_type=="devolucion"])
    }`).then(setConteo).catch(() => setConteo({ clientes: 0, pedidos: 0, devoluciones: 0 }));
  }, [client]);
  useEffect(() => { cargarConteo(); }, [cargarConteo]);

  async function borrarTodo() {
    if (texto.trim().toUpperCase() !== PALABRA) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('¿Seguro? Esto borra TODOS los clientes, pedidos y devoluciones. No se puede deshacer.')) return;

    setBorrando(true);
    setResult(null);
    try {
      // Orden: primero lo que referencia al cliente, después los clientes.
      setPaso('Borrando pedidos…');
      const p = await client.delete({ query: '*[_type == "pedido"]' });
      setPaso('Borrando devoluciones…');
      const d = await client.delete({ query: '*[_type == "devolucion"]' });
      setPaso('Borrando clientes…');
      const c = await client.delete({ query: '*[_type == "cliente"]' });

      const n = (r) => (r?.results?.length ?? r?.documentIds?.length ?? 0);
      setResult({ pedidos: n(p), devoluciones: n(d), clientes: n(c) });
      toast.push({ status: 'success', title: 'Datos borrados' });
      setTexto('');
      cargarConteo();
    } catch (err) {
      console.error(err);
      toast.push({ status: 'error', title: 'Error al borrar', description: String(err.message || err) });
    } finally {
      setBorrando(false);
      setPaso('');
    }
  }

  const habilitado = texto.trim().toUpperCase() === PALABRA && !borrando;
  const vacio = conteo && conteo.clientes + conteo.pedidos + conteo.devoluciones === 0;

  return (
    <Container width={3} padding={4}>
      <Stack space={4}>
        <Heading size={3}>Resetear datos</Heading>

        <Card padding={4} radius={3} shadow={1} tone="critical">
          <Stack space={4}>
            <Text size={1} weight="semibold">
              ⚠ Esto borra TODOS los clientes, pedidos y devoluciones del sistema interno.
              La acción es irreversible.
            </Text>

            {conteo == null ? (
              <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>Contando…</Text></Flex>
            ) : (
              <Box>
                <Text size={1}>Se van a borrar:</Text>
                <Text size={2} weight="bold">
                  {conteo.clientes} clientes · {conteo.pedidos} pedidos · {conteo.devoluciones} devoluciones
                </Text>
              </Box>
            )}

            {!vacio && (
              <Stack space={2}>
                <Text size={1} muted>Para confirmar, escribí <b>{PALABRA}</b>:</Text>
                <TextInput
                  value={texto}
                  onChange={(e) => setTexto(e.currentTarget.value)}
                  placeholder={PALABRA}
                  disabled={borrando}
                />
              </Stack>
            )}

            {borrando && (
              <Flex align="center" gap={2}><Spinner /><Text size={1}>{paso}</Text></Flex>
            )}

            <Flex justify="flex-end">
              <Button
                tone="critical"
                text={borrando ? 'Borrando…' : 'Borrar todo'}
                disabled={!habilitado || vacio}
                onClick={borrarTodo}
              />
            </Flex>
          </Stack>
        </Card>

        {result && (
          <Card padding={3} radius={2} tone="positive">
            <Text size={1}>
              ✓ Borrados: {result.clientes} clientes · {result.pedidos} pedidos · {result.devoluciones} devoluciones
            </Text>
          </Card>
        )}

        {vacio && !result && (
          <Text size={1} muted>No hay datos para borrar.</Text>
        )}
      </Stack>
    </Container>
  );
}
