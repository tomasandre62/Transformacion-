# Coface Transforma+ — MVP React + JSON compartido

MVP interno para captar, visualizar, apoyar y priorizar oportunidades de transformación. La versión v3 elimina `localStorage` como repositorio de ideas y utiliza **un archivo JSON real en el servidor**.

## Arquitectura

```text
Navegadores de usuarios
        │
        │  HTTP /api
        ▼
React + Vite
        │
        ▼
Node.js API (sin frameworks)
        │
        ├─ lee data/db.json
        ├─ aplica el cambio
        └─ escribe data/db.json de forma atómica
```

La base viva es:

```text
data/db.json
```

`data/seed.json` contiene el dataset original para restaurar la demostración.

## Qué se guarda en el JSON

Cada idea mantiene, entre otros datos:

- ID correlativo.
- autor y área.
- tipo de oportunidad.
- situación actual y resultado esperado.
- beneficios.
- horas y personas impactadas.
- estado.
- impacto y esfuerzo.
- apoyos y usuarios que apoyaron.
- nota de Transformación.
- historial de estados.

Crear una idea, apoyar/quitar apoyo o modificar su priorización **escribe físicamente el archivo `data/db.json`**.

## Ejecutar

Requiere Node.js 20+.

```bash
npm install
npm run dev
```

Luego abre la URL que indique Vite, normalmente:

```text
http://localhost:5173
```

`npm run dev` levanta simultáneamente:

- Vite: interfaz React.
- API JSON: `http://localhost:8787`.

Vite redirige `/api` hacia el servidor automáticamente.

### Comprobar la API

```text
GET /api/health
GET /api/database
POST /api/ideas
POST /api/ideas/:id/support
PATCH /api/ideas/:id
POST /api/reset
```

## Sincronización entre usuarios

Si varias personas abren **la misma instancia del servidor**, todas leen el mismo `data/db.json`.

Después de cada operación la interfaz recibe la versión recién escrita de la base. Además, cada navegador consulta silenciosamente la base cada 15 segundos y al volver a la pestaña, para incorporar cambios realizados por otras personas.

El frontend ignora respuestas de sincronización antiguas si ya recibió una versión más nueva de la base.

## Persistencia y concurrencia

Las mutaciones se serializan dentro del proceso Node. La escritura utiliza un archivo temporal y `rename`, evitando dejar un JSON parcialmente escrito si una operación falla a mitad de camino.

Esto es apropiado para **un MVP/piloto de baja concurrencia y una sola instancia**. No debe plantearse como base definitiva para una aplicación crítica.

## Deploy simple

Para generar frontend de producción:

```bash
npm run build
npm start
```

`npm start` sirve la API y el contenido de `dist/` desde el mismo proceso.

### Importante para ponerlo online

El hosting debe ofrecer **disco persistente**. Un filesystem efímero puede borrar o revertir `data/db.json` cuando se reinicia la instancia.

Para el piloto funcionan bien escenarios como:

- servidor interno/VM de Coface;
- contenedor único con volumen persistente;
- plataforma Node con persistent disk/volume.

Un deploy puramente estático en Vercel/Netlify no puede mantener esta base JSON viva por sí solo.

## Siguiente evolución lógica

La UI y la capa API están separadas para que `data/db.json` pueda sustituirse posteriormente por Microsoft Lists/Dataverse, SQL o Supabase sin rehacer el frontend.

Para uso corporativo real también faltaría sustituir el usuario demo por autenticación Microsoft Entra ID y aplicar permisos de colaborador/Transformación/administrador.

## Responsive

La v3 incluye una revisión específica para:

- 1440 px / desktop;
- 1024 px / laptop;
- 768 px / tablet;
- 390–480 px / móvil.

Se reforzaron tarjetas, filtros, navegación, tablas, badges, títulos largos, pipeline, footer y modales para evitar superposiciones.

## Nota para Windows

Desde la versión 0.3.1, `npm run dev` no usa `npx.cmd` internamente. El launcher ejecuta directamente la instalación local de Vite mediante Node, evitando el error `spawn EINVAL` observado en Windows.

Si alguna política corporativa impidiera levantar ambos procesos desde el launcher, se pueden ejecutar por separado como diagnóstico:

```bash
npm run dev:api
```

y en una segunda terminal:

```bash
npm run dev:web
```

La aplicación seguirá disponible en `http://localhost:5173` y la API en `http://localhost:8787`.
# Transformacion-
