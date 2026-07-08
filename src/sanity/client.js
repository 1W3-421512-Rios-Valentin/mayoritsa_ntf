import { createClient } from '@sanity/client';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';

if (!projectId) {
  console.warn(
    '[sanity] Falta VITE_SANITY_PROJECT_ID. Copiá .env.example a .env y completá el projectId.'
  );
}

// Cliente de SOLO LECTURA: sin token, vía CDN (§3, §14).
export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: true,
});
