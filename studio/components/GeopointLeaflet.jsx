// Input custom para campos geopoint: mapa Leaflet (OpenStreetMap, sin API key).
// Click en el mapa fija/mueve el pin.
import React, { useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { set, unset } from 'sanity';
import { Stack, Text, Button } from '@sanity/ui';

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng); },
  });
  return null;
}

export default function GeopointLeaflet(props) {
  const { value, onChange } = props;
  const pos = value && typeof value.lat === 'number' && typeof value.lng === 'number'
    ? { lat: value.lat, lng: value.lng }
    : null;
  const center = pos || DEFAULT_CENTER;

  const pick = useCallback(
    (latlng) => onChange(set({ _type: 'geopoint', lat: latlng.lat, lng: latlng.lng })),
    [onChange]
  );

  return (
    <Stack space={2}>
      <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--card-border-color)' }}>
        <MapContainer center={[center.lat, center.lng]} zoom={pos ? 12 : 4} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <ClickHandler onPick={pick} />
          {pos && (
            <CircleMarker
              center={[pos.lat, pos.lng]}
              radius={9}
              pathOptions={{ color: '#2276fc', fillColor: '#2276fc', fillOpacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>
      <Text size={0} muted>
        {pos
          ? `Pin: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} — click en el mapa para moverlo.`
          : 'Hacé click en el mapa para fijar la ubicación del cliente.'}
      </Text>
      {pos && (
        <Button mode="ghost" tone="critical" text="Quitar pin" onClick={() => onChange(unset())} />
      )}
    </Stack>
  );
}
