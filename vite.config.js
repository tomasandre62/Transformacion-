import { defineConfig } from 'vite'

export default defineConfig({
  // Las rutas relativas permiten publicar el build dentro de /<repositorio>/ en GitHub Pages.
  base: './',
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
})
