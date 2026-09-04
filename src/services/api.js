const API = '/api'

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
  return request('/database')
}

export async function createIdea(input) {
  return request('/ideas', { method: 'POST', body: JSON.stringify(input) })
}

export async function toggleIdeaSupport(id) {
  return request(`/ideas/${encodeURIComponent(id)}/support`, { method: 'POST', body: JSON.stringify({}) })
}

export async function patchIdea(id, patch) {
  return request(`/ideas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function resetDemoDatabase() {
  return request('/reset', { method: 'POST', body: JSON.stringify({}) })
}
