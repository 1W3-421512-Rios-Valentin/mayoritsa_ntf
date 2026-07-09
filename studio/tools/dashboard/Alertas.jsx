// Pestaña Alertas: inactividad por ciclos 7-15-21-28-35 días + caída de ritmo.
import React, { useMemo } from 'react';
import { Stack, Flex, Box, Text, Card, Badge } from '@sanity/ui';
import { actividadClientes, bucketInactividad } from '../../lib/metrics.js';

const ddmm = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

export default function Alertas({ pedidos, clientes }) {
  const filas = useMemo(() => {
    return actividadClientes(pedidos, clientes)
      .map((a) => ({ ...a, bucket: bucketInactividad(a.diasInactivo) }))
      .sort((x, y) => {
        // más crítico primero: nunca pidió al final de los críticos
        const dx = x.diasInactivo == null ? -1 : x.diasInactivo;
        const dy = y.diasInactivo == null ? -1 : y.diasInactivo;
        return dy - dx;
      });
  }, [pedidos, clientes]);

  const criticos = filas.filter((f) => f.bucket.tone === 'critical' && f.pedidos > 0);
  const caidas = filas.filter((f) => f.caidaRitmo);
  const nunca = filas.filter((f) => f.pedidos === 0);

  return (
    <Stack space={4}>
      <Flex gap={3} wrap="wrap">
        <Card padding={3} radius={3} shadow={1} tone="critical" style={{ flex: 1, minWidth: 170 }}>
          <Text size={0}>Inactivos +29 días</Text>
          <Text size={4} weight="bold">{criticos.length}</Text>
        </Card>
        <Card padding={3} radius={3} shadow={1} tone="caution" style={{ flex: 1, minWidth: 170 }}>
          <Text size={0}>Caída de ritmo</Text>
          <Text size={4} weight="bold">{caidas.length}</Text>
        </Card>
        <Card padding={3} radius={3} shadow={1} style={{ flex: 1, minWidth: 170 }}>
          <Text size={0} muted>Nunca pidieron</Text>
          <Text size={4} weight="bold">{nunca.length}</Text>
        </Card>
      </Flex>

      {caidas.length > 0 && (
        <Card padding={3} radius={3} shadow={1} tone="caution">
          <Stack space={2}>
            <Text size={1} weight="semibold">⚠ Caída de ritmo (llevan más de 1,5× su frecuencia habitual sin pedir)</Text>
            {caidas.map((f) => (
              <Text key={f.clienteId} size={1}>
                {f.nombre}: {f.diasInactivo} días sin pedir (su promedio es cada {f.gapPromedio} días)
              </Text>
            ))}
          </Stack>
        </Card>
      )}

      <Card padding={3} radius={3} shadow={1}>
        <Stack space={3}>
          <Text size={1} weight="semibold">Actividad por cliente (ciclo 7 · 15 · 21 · 28 · 35)</Text>
          <Stack space={1}>
            {filas.map((f) => (
              <Card key={f.clienteId} padding={2} radius={2} tone="default" border>
                <Flex align="center" gap={3} wrap="wrap">
                  <Box style={{ flex: 1, minWidth: 180 }}>
                    <Text size={1} weight="semibold">{f.nombre}</Text>
                    <Text size={0} muted>
                      {f.pedidos} pedido(s) · último: {ddmm(f.ultimo)}
                      {f.gapPromedio != null ? ` · pide cada ~${f.gapPromedio} días` : ''}
                    </Text>
                  </Box>
                  {f.caidaRitmo && <Badge tone="caution">ritmo ↓</Badge>}
                  <Badge tone={f.bucket.tone} fontSize={1} padding={2}>
                    {f.diasInactivo != null ? `${f.diasInactivo} días · ` : ''}{f.bucket.label}
                  </Badge>
                </Flex>
              </Card>
            ))}
            {!filas.length && <Text size={1} muted>Todavía no hay clientes cargados.</Text>}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
