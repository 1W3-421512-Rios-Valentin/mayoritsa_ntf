import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { UploadIcon, ImagesIcon, TagIcon, UsersIcon, BasketIcon, ArchiveIcon, BarChartIcon, DocumentsIcon } from '@sanity/icons';
import { catalogoTypes, internoTypes } from './schemas/index.js';
import BulkImport from './tools/BulkImport.jsx';
import BulkPhotos from './tools/BulkPhotos.jsx';
import ArmarPedido from './tools/ArmarPedido.jsx';
import ImportHistorial from './tools/ImportHistorial.jsx';
import ImportFacturacion from './tools/ImportFacturacion.jsx';
import Dashboard from './tools/dashboard/Dashboard.jsx';
import { descargarHistorialAction } from './actions/descargarHistorial.js';

const projectId = '1uuj4tpg';

// Estructura del workspace Interno: carpetas de pedidos por cliente.
const internoStructure = (S) =>
  S.list()
    .title('Contenido')
    .items([
      S.documentTypeListItem('cliente').title('Clientes'),
      S.listItem()
        .title('Pedidos por cliente')
        .id('pedidos-por-cliente')
        .child(
          S.documentTypeList('cliente')
            .title('Elegí un cliente')
            .child((clienteId) =>
              S.documentList()
                .title('Pedidos')
                .schemaType('pedido')
                .filter('_type == "pedido" && cliente._ref == $clienteId')
                .params({ clienteId })
                .defaultOrdering([{ field: 'fecha', direction: 'desc' }])
            )
        ),
      S.documentTypeListItem('pedido').title('Todos los pedidos'),
      S.documentTypeListItem('devolucion').title('Devoluciones'),
    ]);

export default defineConfig([
  {
    name: 'catalogo',
    title: 'Catálogo',
    icon: TagIcon,
    basePath: '/catalogo',
    projectId,
    dataset: 'production',

    plugins: [structureTool()],

    tools: (prev) => [
      ...prev,
      {
        name: 'carga-masiva',
        title: 'Carga masiva',
        icon: UploadIcon,
        component: BulkImport,
      },
      {
        name: 'fotos-masivas',
        title: 'Fotos masivas',
        icon: ImagesIcon,
        component: BulkPhotos,
      },
    ],

    schema: {
      types: catalogoTypes,
    },
  },
  {
    name: 'interno',
    title: 'Interno (pedidos)',
    icon: UsersIcon,
    basePath: '/interno',
    projectId,
    dataset: 'interno',

    plugins: [structureTool({ structure: internoStructure })],

    tools: (prev) => [
      ...prev,
      {
        name: 'armar-pedido',
        title: 'Armar pedido',
        icon: BasketIcon,
        component: ArmarPedido,
      },
      {
        name: 'dashboard',
        title: 'Dashboard',
        icon: BarChartIcon,
        component: Dashboard,
      },
      {
        name: 'importar-facturacion',
        title: 'Importar facturación',
        icon: DocumentsIcon,
        component: ImportFacturacion,
      },
      {
        name: 'importar-historial',
        title: 'Importar historial',
        icon: ArchiveIcon,
        component: ImportHistorial,
      },
    ],

    document: {
      actions: (prev, context) =>
        context.schemaType === 'cliente' ? [...prev, descargarHistorialAction] : prev,
    },

    schema: {
      types: internoTypes,
    },
  },
]);
