// Tool "Dashboard": Resumen / Alertas / Mapa sobre los pedidos del dataset interno.
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Stack, Flex, Text, Heading, Spinner, Tab, TabList, TabPanel, Button,
} from '@sanity/ui';
import { useClient } from 'sanity';
import Resumen from './Resumen.jsx';
import Alertas from './Alertas.jsx';
import Mapa from './Mapa.jsx';

export default function Dashboard() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const [pedidos, setPedidos] = useState(null);
  const [clientes, setClientes] = useState(null);
  const [tab, setTab] = useState('resumen');

  const cargar = useCallback(() => {
    client.fetch(`*[_type=="pedido"]{
      _id, fecha, totalUnidades, totalMonto,
      items[]{sku, descripcion, categoria, unidades, subtotal},
      cliente->{_id, nombre, ubicacion, localidad, provincia}
    }`).then(setPedidos).catch(() => setPedidos([]));
    client.fetch('*[_type=="cliente"] | order(nombre asc){_id, nombre, localidad, provincia, ubicacion}')
      .then(setClientes).catch(() => setClientes([]));
  }, [client]);
  useEffect(() => { cargar(); }, [cargar]);

  const cargando = pedidos == null || clientes == null;

  return (
    <Container width={5} padding={4}>
      <Stack space={4}>
        <Flex align="center" justify="space-between">
          <Heading size={3}>Dashboard</Heading>
          <Button mode="ghost" text="↻ Actualizar" onClick={cargar} />
        </Flex>

        {cargando ? (
          <Flex align="center" gap={2}><Spinner muted /><Text size={1} muted>Cargando datos…</Text></Flex>
        ) : (
          <>
            <TabList space={2}>
              <Tab id="tab-resumen" aria-controls="panel-resumen" label="Resumen"
                selected={tab === 'resumen'} onClick={() => setTab('resumen')} />
              <Tab id="tab-alertas" aria-controls="panel-alertas" label="Alertas"
                selected={tab === 'alertas'} onClick={() => setTab('alertas')} />
              <Tab id="tab-mapa" aria-controls="panel-mapa" label="Mapa"
                selected={tab === 'mapa'} onClick={() => setTab('mapa')} />
            </TabList>

            <TabPanel id="panel-resumen" aria-labelledby="tab-resumen" hidden={tab !== 'resumen'}>
              <Resumen pedidos={pedidos} clientes={clientes} />
            </TabPanel>
            <TabPanel id="panel-alertas" aria-labelledby="tab-alertas" hidden={tab !== 'alertas'}>
              <Alertas pedidos={pedidos} clientes={clientes} />
            </TabPanel>
            <TabPanel id="panel-mapa" aria-labelledby="tab-mapa" hidden={tab !== 'mapa'}>
              {tab === 'mapa' && <Mapa pedidos={pedidos} clientes={clientes} />}
            </TabPanel>
          </>
        )}
      </Stack>
    </Container>
  );
}
