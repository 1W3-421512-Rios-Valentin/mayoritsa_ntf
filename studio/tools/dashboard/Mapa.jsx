// Pestaña Mapa: clientes con pin (tamaño/color según volumen de compra).
import React, { useMemo } from 'react';
import { Stack, Flex, Text, Card, Badge } from '@sanity/ui';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fmtARS } from '../../lib/metrics.js';

const CENTRO_AR = [-38.4, -63.6];

export default function Mapa({ pedidos, clientes }) {
  const stats = useMemo(() => {
    const map = new Map();
    for (const p of pedidos) {
      const id = p.cliente?._id;
      if (!id) continue;
      if (!map.has(id)) map.set(id, { pedidos: 0, monto: 0 });
      const e = map.get(id);
      e.pedidos++;
      e.monto += p.totalMonto || 0;
    }
    return map;
  }, [pedidos]);

  const conPin = clientes.filter((c) => c.ubicacion && typeof c.ubicacion.lat === 'number');
  const sinPin = clientes.filter((c) => !c.ubicacion || typeof c.ubicacion.lat !== 'number');
  const maxMonto = Math.max(1, ...conPin.map((c) => stats.get(c._id)?.monto || 0));

  return (
    <Stack space={4}>
      <Card radius={3} shadow={1} style={{ overflow: 'hidden' }}>
        <div style={{ height: '55vh' }}>
          <MapContainer center={CENTRO_AR} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {conPin.map((c) => {
              const s = stats.get(c._id) || { pedidos: 0, monto: 0 };
              const escala = s.monto / maxMonto;
              const radio = 7 + escala * 15;
              const color = escala > 0.66 ? '#0a7d32' : escala > 0.33 ? '#f59e0b' : '#4a7cff';
              return (
                <CircleMarker
                  key={c._id}
                  center={[c.ubicacion.lat, c.ubicacion.lng]}
                  radius={radio}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.7 }}
                >
                  <Popup>
                    <strong>{c.nombre}</strong><br />
                    {[c.localidad, c.provincia].filter(Boolean).join(', ')}<br />
                    {s.pedidos} pedido(s) · {fmtARS(s.monto)}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </Card>

      <Flex gap={2} wrap="wrap" align="center">
        <Badge tone="positive">{conPin.length} con ubicación</Badge>
        {sinPin.length > 0 && <Badge tone="caution">{sinPin.length} sin ubicación</Badge>}
        <Text size={0} muted>El tamaño/color del pin refleja el volumen histórico de compra.</Text>
      </Flex>

      {sinPin.length > 0 && (
        <Card padding={3} radius={3} shadow={1} tone="caution">
          <Stack space={2}>
            <Text size={1} weight="semibold">Clientes sin ubicación (completar el pin en su ficha):</Text>
            <Text size={1}>{sinPin.map((c) => c.nombre).join(' · ')}</Text>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
