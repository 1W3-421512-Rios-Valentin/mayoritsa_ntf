// Document action en `cliente`: genera y descarga el historial Excel del cliente
// (un libro con una hoja por pedido).
import { useState } from 'react';
import { useClient } from 'sanity';
import { DownloadIcon } from '@sanity/icons';
import { buildHistorialCliente, nombreArchivoHistorial } from '../lib/excelHistorialCliente.js';
import { descargarBlob } from '../lib/excelPedido.js';

export function descargarHistorialAction(props) {
  const client = useClient({ apiVersion: '2024-01-01' });
  const [loading, setLoading] = useState(false);

  if (props.type !== 'cliente') return null;

  return {
    label: loading ? 'Generando…' : 'Descargar historial Excel',
    icon: DownloadIcon,
    disabled: loading,
    onHandle: async () => {
      setLoading(true);
      try {
        const cliente = props.published || props.draft || {};
        const id = (props.published?._id || props.id || '').replace(/^drafts\./, '');
        const pedidos = await client.fetch(
          `*[_type=="pedido" && cliente._ref==$id] | order(fecha asc){
            fecha, tipoComprobante, items[]{sku, descripcion, precio, cantidades}
          }`,
          { id }
        );
        const blob = await buildHistorialCliente(cliente, pedidos);
        descargarBlob(blob, nombreArchivoHistorial(cliente));
      } catch (err) {
        console.error(err);
        // eslint-disable-next-line no-alert
        alert('No se pudo generar el historial: ' + (err?.message || err));
      } finally {
        setLoading(false);
        props.onComplete();
      }
    },
  };
}
