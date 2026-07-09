// Mini-gráficos propios (CSS/SVG), sin libs de charts.
import React from 'react';
import { Card, Stack, Flex, Box, Text } from '@sanity/ui';

export function Kpi({ label, value, sub }) {
  return (
    <Card padding={3} radius={3} shadow={1} style={{ flex: 1, minWidth: 150 }}>
      <Stack space={2}>
        <Text size={0} muted>{label}</Text>
        <Text size={4} weight="bold">{value}</Text>
        {sub && <Text size={0} muted>{sub}</Text>}
      </Stack>
    </Card>
  );
}

// Lista de barras horizontales: rows = [{label, sublabel?, value, texto}]
export function BarrasH({ titulo, rows, color = '#4a7cff' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card padding={3} radius={3} shadow={1}>
      <Stack space={3}>
        <Text size={1} weight="semibold">{titulo}</Text>
        {!rows.length && <Text size={1} muted>Sin datos para este filtro.</Text>}
        <Stack space={2}>
          {rows.map((r, i) => (
            <Stack key={i} space={1}>
              <Flex justify="space-between" gap={2}>
                <Text size={1} textOverflow="ellipsis" style={{ minWidth: 0 }}>{r.label}</Text>
                <Text size={1} weight="semibold" style={{ whiteSpace: 'nowrap' }}>{r.texto}</Text>
              </Flex>
              <Box style={{ height: 8, borderRadius: 4, background: 'var(--card-border-color)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(r.value / max) * 100}%`, background: color, borderRadius: 4 }} />
              </Box>
              {r.sublabel && <Text size={0} muted>{r.sublabel}</Text>}
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

// Serie temporal de barras verticales: rows = [{label, value, texto}]
export function BarrasV({ titulo, rows, color = '#4a7cff', alto = 140 }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card padding={3} radius={3} shadow={1}>
      <Stack space={3}>
        <Text size={1} weight="semibold">{titulo}</Text>
        {!rows.length && <Text size={1} muted>Sin datos para este filtro.</Text>}
        <Box style={{ overflowX: 'auto' }}>
          <Flex gap={2} align="flex-end" style={{ height: alto, minWidth: rows.length * 46 }}>
            {rows.map((r, i) => (
              <Stack key={i} space={1} style={{ width: 42, alignItems: 'center' }}>
                <Text size={0} muted>{r.texto}</Text>
                <div
                  title={`${r.label}: ${r.texto}`}
                  style={{
                    width: 26,
                    height: Math.max(3, (r.value / max) * (alto - 46)),
                    background: color,
                    borderRadius: '4px 4px 0 0',
                  }}
                />
                <Text size={0} muted style={{ whiteSpace: 'nowrap' }}>{r.label.slice(2)}</Text>
              </Stack>
            ))}
          </Flex>
        </Box>
      </Stack>
    </Card>
  );
}
