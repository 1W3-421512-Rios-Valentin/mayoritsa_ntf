import { defineConfig } from 'vite';

// GitHub Pages sirve el sitio bajo /<nombre-repo>/. En dev (localhost) se usa '/'.
// Si el repo tiene otro nombre, cambiar aquí.
const repo = 'mayoritsa_ntf';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${repo}/` : '/',
}));
