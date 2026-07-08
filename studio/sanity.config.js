import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemas/index.js';

export default defineConfig({
  name: 'default',
  title: 'Catálogo Mayorista NTF',

  projectId: '1uuj4tpg',
  dataset: 'production',

  plugins: [structureTool()],

  schema: {
    types: schemaTypes,
  },
});
