import seedDatabase from '../../data/seed.json'

const API = import.meta.env.VITE_API_URL || '/api'
const DEMO_STORAGE_KEY = 'coface-transforma-demo-db-v1'
const staticHost = typeof window !== 'undefined' && (window.location.hostname.endsWith('.github.io') || window.location.hostname.endsWith('.vercel.app'))

const STATUS_NOTES = {
  Recibida: 'La idea quedó registrada y está esperando una primera revisión del equipo de Transformación.',
  'En evaluación': 'Transformación inició el análisis de impacto, alcance y factibilidad.',
  Priorizada: 'La oportunidad fue seleccionada para discovery o planificación.',
  'En desarrollo': 'La iniciativa se encuentra en ejecución o validación de solución.',
  Implementada: 'La mejora fue implementada. El siguiente paso es medir el impacto conseguido.',
  'No priorizada': 'La idea sigue registrada, pero no será trabajada por ahora. Puede reevaluarse más adelante.',
}

function clone(value) { return structuredClone(value) }

function readDemoDatabase() {
  try {
    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY)
    return saved ? JSON.parse(saved) : clone(seedDatabase)
  } catch { return clone(seedDatabase) }
}

function writeDemoDatabase(database) {
  const next = { ...database, schemaVersion: 3, updatedAt: new Date().toISOString() }
  try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next)) } catch { /* El demo sigue operativo aunque el navegador bloquee storage. */ }
  return next
}

function today() { return new Date().toISOString().slice(0, 10) }

function nextIdeaId(ideas) {
  const max = ideas.reduce((highest, idea) => Math.max(highest, Number(String(idea.id || '').match(/(\d+)$/)?.[1] || 0)), 0)
  return `IDEA-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Error ${response.status}: no fue posible completar la operación.`)
  return payload
}

export async function getDatabase() {
  return staticHost ? readDemoDatabase() : request('/database')
}

export async function createIdea(input) {
  if (!staticHost) return request('/ideas', { method: 'POST', body: JSON.stringify(input) })
  const database = readDemoDatabase()
  const title = String(input.title || '').trim()
  const description = String(input.description || '').trim()
  const desired = String(input.desired || '').trim()
  if (title.length < 5 || description.length < 10) throw new Error('Completa los campos obligatorios antes de enviar.')
  const createdAt = today()
  const idea = {
    id: nextIdeaId(database.ideas), title, description, desired, type: String(input.type || 'Idea'), area: String(input.area || 'Otro'),
    author: database.currentUser.name, authorId: database.currentUser.id, createdAt, status: 'Recibida', benefit: Array.isArray(input.benefit) ? input.benefit.map(String) : [],
    hours: Math.max(0, Number(input.hours || 0)), people: Math.max(1, Number(input.people || 1)), votes: 0, supportedBy: [], impact: 3, effort: 3,
    participate: Boolean(input.participate), reviewNote: '', history: [{ status: 'Recibida', date: createdAt, note: 'Idea registrada correctamente en la demo.' }],
  }
  database.ideas.unshift(idea)
  return { database: writeDemoDatabase(database), idea }
}

export async function toggleIdeaSupport(id) {
  if (!staticHost) return request(`/ideas/${encodeURIComponent(id)}/support`, { method: 'POST', body: JSON.stringify({}) })
  const database = readDemoDatabase()
  const idea = database.ideas.find(item => item.id === id)
  if (!idea) throw new Error('Idea no encontrada.')
  const userId = database.currentUser.id
  const alreadySupported = (idea.supportedBy || []).includes(userId)
  idea.supportedBy = alreadySupported ? idea.supportedBy.filter(value => value !== userId) : [...(idea.supportedBy || []), userId]
  idea.votes = Math.max(0, Number(idea.votes || 0) + (alreadySupported ? -1 : 1))
  return { database: writeDemoDatabase(database), supported: !alreadySupported, votes: idea.votes }
}

export async function patchIdea(id, patch) {
  if (!staticHost) return request(`/ideas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
  const database = readDemoDatabase()
  const idea = database.ideas.find(item => item.id === id)
  if (!idea) throw new Error('Idea no encontrada.')
  const previousStatus = idea.status
  if (patch.status && !STATUS_NOTES[patch.status]) throw new Error('Estado no válido.')
  if ('impact' in patch) idea.impact = Math.min(5, Math.max(1, Number(patch.impact)))
  if ('effort' in patch) idea.effort = Math.min(5, Math.max(1, Number(patch.effort)))
  if ('reviewNote' in patch) idea.reviewNote = String(patch.reviewNote || '').slice(0, 1000)
  if (patch.status && patch.status !== previousStatus) {
    idea.status = patch.status
    idea.history = [...(idea.history || []), { status: patch.status, date: today(), note: STATUS_NOTES[patch.status] }]
  }
  return { database: writeDemoDatabase(database), idea }
}

export async function resetDemoDatabase() {
  if (!staticHost) return request('/reset', { method: 'POST', body: JSON.stringify({}) })
  return writeDemoDatabase(clone(seedDatabase))
}
