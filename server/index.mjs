import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DB_PATH = path.join(ROOT, 'data', 'db.json')
const SEED_PATH = path.join(ROOT, 'data', 'seed.json')
const DIST_PATH = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--serve')

const STATUS_NOTES = {
  'Recibida': 'La idea quedó registrada y está esperando una primera revisión del equipo de Transformación.',
  'En evaluación': 'Transformación inició el análisis de impacto, alcance y factibilidad.',
  'Priorizada': 'La oportunidad fue seleccionada para discovery o planificación.',
  'En desarrollo': 'La iniciativa se encuentra en ejecución o validación de solución.',
  'Implementada': 'La mejora fue implementada. El siguiente paso es medir el impacto conseguido.',
  'No priorizada': 'La idea sigue registrada, pero no será trabajada por ahora. Puede reevaluarse más adelante.',
}
const ALLOWED_PATCH = new Set(['status', 'impact', 'effort', 'reviewNote'])
const VALID_STATUSES = new Set(Object.keys(STATUS_NOTES))
let mutationQueue = Promise.resolve()

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function readDatabase() {
  return JSON.parse(await fs.readFile(DB_PATH, 'utf8'))
}

async function writeDatabase(database) {
  const next = { ...database, schemaVersion: 3, updatedAt: new Date().toISOString() }
  const temp = `${DB_PATH}.${process.pid}.tmp`
  await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  await fs.rename(temp, DB_PATH)
  return next
}

function mutate(mutator) {
  const operation = mutationQueue.then(async () => {
    const database = await readDatabase()
    const result = await mutator(database)
    const updated = await writeDatabase(database)
    return { database: updated, result }
  })
  mutationQueue = operation.catch(() => {})
  return operation
}

function nextIdeaId(ideas) {
  const year = new Date().getFullYear()
  const max = ideas.reduce((acc, idea) => {
    const match = String(idea.id || '').match(/(\d+)$/)
    return Math.max(acc, match ? Number(match[1]) : 0)
  }, 0)
  return `IDEA-${year}-${String(max + 1).padStart(3, '0')}`
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

async function readBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > 1024 * 1024) throw new Error('Payload demasiado grande.')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function validateNewIdea(input) {
  const title = String(input.title || '').trim()
  const description = String(input.description || '').trim()
  const desired = String(input.desired || '').trim()
  if (title.length < 5) throw new Error('El título debe tener al menos 5 caracteres.')
  if (description.length < 10) throw new Error('Describe brevemente la situación actual.')
  return { title, description, desired }
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, storage: 'data/db.json', mode: 'file-backed-json' })
  }

  if (req.method === 'GET' && url.pathname === '/api/database') {
    const database = await readDatabase()
    return sendJson(res, 200, database)
  }

  if (req.method === 'POST' && url.pathname === '/api/ideas') {
    const input = await readBody(req)
    const clean = validateNewIdea(input)
    const { database, result } = await mutate(db => {
      const id = nextIdeaId(db.ideas)
      const createdAt = today()
      const idea = {
        id,
        ...clean,
        type: String(input.type || 'Idea'),
        area: String(input.area || 'Otro'),
        author: db.currentUser.name,
        authorId: db.currentUser.id,
        createdAt,
        status: 'Recibida',
        benefit: Array.isArray(input.benefit) ? input.benefit.map(String) : [],
        hours: Math.max(0, Number(input.hours || 0)),
        people: Math.max(1, Number(input.people || 1)),
        votes: 0,
        supportedBy: [],
        impact: 3,
        effort: 3,
        participate: Boolean(input.participate),
        reviewNote: '',
        history: [{ status: 'Recibida', date: createdAt, note: 'Idea registrada correctamente en Transforma+.' }],
      }
      db.ideas.unshift(idea)
      return idea
    })
    return sendJson(res, 201, { database, idea: result })
  }

  const supportMatch = url.pathname.match(/^\/api\/ideas\/([^/]+)\/support$/)
  if (req.method === 'POST' && supportMatch) {
    const id = decodeURIComponent(supportMatch[1])
    const { database, result } = await mutate(db => {
      const idea = db.ideas.find(item => item.id === id)
      if (!idea) throw Object.assign(new Error('Idea no encontrada.'), { statusCode: 404 })
      const userId = db.currentUser.id
      const supportedBy = Array.isArray(idea.supportedBy) ? idea.supportedBy : []
      const alreadySupported = supportedBy.includes(userId)
      idea.supportedBy = alreadySupported ? supportedBy.filter(value => value !== userId) : [...supportedBy, userId]
      idea.votes = Math.max(0, Number(idea.votes || 0) + (alreadySupported ? -1 : 1))
      return { supported: !alreadySupported, votes: idea.votes }
    })
    return sendJson(res, 200, { database, ...result })
  }

  const ideaMatch = url.pathname.match(/^\/api\/ideas\/([^/]+)$/)
  if (req.method === 'PATCH' && ideaMatch) {
    const id = decodeURIComponent(ideaMatch[1])
    const input = await readBody(req)
    const patch = Object.fromEntries(Object.entries(input).filter(([key]) => ALLOWED_PATCH.has(key)))
    const { database, result } = await mutate(db => {
      const idea = db.ideas.find(item => item.id === id)
      if (!idea) throw Object.assign(new Error('Idea no encontrada.'), { statusCode: 404 })
      const previousStatus = idea.status
      if (patch.status && !VALID_STATUSES.has(patch.status)) throw Object.assign(new Error('Estado no válido.'), { statusCode: 400 })
      if ('impact' in patch) patch.impact = Math.min(5, Math.max(1, Number(patch.impact)))
      if ('effort' in patch) patch.effort = Math.min(5, Math.max(1, Number(patch.effort)))
      if ('reviewNote' in patch) patch.reviewNote = String(patch.reviewNote || '').slice(0, 1000)
      Object.assign(idea, patch)
      if (patch.status && patch.status !== previousStatus) {
        idea.history = Array.isArray(idea.history) ? idea.history : []
        idea.history.push({ status: patch.status, date: today(), note: STATUS_NOTES[patch.status] || 'Estado actualizado por Transformación.' })
      }
      return idea
    })
    return sendJson(res, 200, { database, idea: result })
  }

  if (req.method === 'POST' && url.pathname === '/api/reset') {
    const seed = JSON.parse(await fs.readFile(SEED_PATH, 'utf8'))
    const operation = mutationQueue.then(() => writeDatabase(seed))
    mutationQueue = operation.catch(() => {})
    const database = await operation
    return sendJson(res, 200, database)
  }

  return sendJson(res, 404, { error: 'Ruta API no encontrada.' })
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon',
}

async function serveStatic(req, res, url) {
  if (!isProduction) return sendJson(res, 404, { error: 'Frontend servido por Vite en modo desarrollo.' })
  let requested = decodeURIComponent(url.pathname)
  if (requested === '/') requested = '/index.html'
  let filePath = path.normalize(path.join(DIST_PATH, requested))
  if (!filePath.startsWith(DIST_PATH)) return sendJson(res, 403, { error: 'Ruta no permitida.' })
  try {
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html')
    const content = await fs.readFile(filePath)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' })
    return res.end(content)
  } catch {
    const index = await fs.readFile(path.join(DIST_PATH, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(index)
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url)
    return await serveStatic(req, res, url)
  } catch (error) {
    console.error(error)
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Error interno del servidor.' })
  }
})

server.listen(PORT, () => {
  console.log(`Transforma+ API disponible en http://localhost:${PORT}`)
  console.log(`Base activa: ${DB_PATH}`)
})
