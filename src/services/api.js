import seedDatabase from '../../data/seed.json'

const API = '/api'
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')
const staticDatabase = structuredClone(seedDatabase)
const readOnlyMessage = 'Esta demo está publicada en GitHub Pages, que no admite la API ni la base JSON. Para guardar cambios, usa la versión alojada en un servidor Node.'

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Error ${response.status}: no fue posible completar la operación.`)
  }
  return payload
}

export async function getDatabase() {
  if (isGitHubPages) return structuredClone(staticDatabase)
  return request('/database')
}

export async function createIdea(input) {
  if (isGitHubPages) throw new Error(readOnlyMessage)
  return request('/ideas', { method: 'POST', body: JSON.stringify(input) })
}

export async function toggleIdeaSupport(id) {
  if (isGitHubPages) throw new Error(readOnlyMessage)
  return request(`/ideas/${encodeURIComponent(id)}/support`, { method: 'POST', body: JSON.stringify({}) })
}

export async function patchIdea(id, patch) {
  if (isGitHubPages) throw new Error(readOnlyMessage)
  return request(`/ideas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function resetDemoDatabase() {
  if (isGitHubPages) throw new Error(readOnlyMessage)
  return request('/reset', { method: 'POST', body: JSON.stringify({}) })
}
