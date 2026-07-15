// Documento `cliente` (dataset interno).
import GeopointLeaflet from '../components/GeopointLeaflet.jsx';

export default {
  name: 'cliente',
  title: 'Cliente',
  type: 'document',
  fields: [
    {
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    { name: 'codCliente', title: 'Cód. Cliente (sistema)', type: 'string', readOnly: true },
    { name: 'cuit', title: 'CUIT', type: 'string' },
    { name: 'localidad', title: 'Localidad', type: 'string' },
    { name: 'provincia', title: 'Provincia', type: 'string' },
    { name: 'direccion', title: 'Dirección', type: 'string' },
    { name: 'transporte', title: 'Transporte', type: 'string' },
    { name: 'telefono', title: 'Teléfono', type: 'string' },
    { name: 'email', title: 'Email', type: 'string' },
    {
      name: 'ubicacion',
      title: 'Ubicación (mapa)',
      type: 'geopoint',
      components: { input: GeopointLeaflet },
      description: 'Click en el mapa para fijar el pin (usado en el dashboard).',
    },
    { name: 'notas', title: 'Notas', type: 'text', rows: 3 },
    {
      name: 'activo',
      title: 'Activo',
      type: 'boolean',
      initialValue: true,
    },
  ],
  orderings: [
    {
      title: 'Nombre',
      name: 'nombreAsc',
      by: [{ field: 'nombre', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'nombre', localidad: 'localidad', provincia: 'provincia' },
    prepare({ title, localidad, provincia }) {
      const lugar = [localidad, provincia].filter(Boolean).join(', ');
      return { title, subtitle: lugar || undefined };
    },
  },
};
