import {acknowledgedJob} from './analysisResponses.mjs'
// Deployment policy is separate from Vue so transport and navigation use one rule.
export function deploymentConfig(env = {}) {
  const publicMode = env.VITE_DEPLOYMENT_MODE === 'public'
  const previewMode = env.VITE_DEPLOYMENT_MODE === 'preview'
  return { publicMode, previewMode, apiBase: previewMode?'':String(env.VITE_API_BASE_URL || (publicMode ? '' : 'http://127.0.0.1:5001')).replace(/\/+$/, '') }
}

export const isPendingAnalysis = status => ['queued', 'running', 'preparing'].includes(status)

export function safeReturnPath(value) {
  if (typeof value !== 'string' || !/^\/(?:$|(?:stock-lab|chart-lab|saved|pricing)(?:[/?#]|$))/.test(value) || /[\\\r\n]/.test(value)) return '/'
  return value
}

export function apiAuthHeaders({ publicMode, apiBase, target, token, headers = {}, origin = 'http://localhost' }) {
  const result = new Headers(headers)
  // Neither the local bridge bearer nor unrelated caller credentials belong here.
  result.delete('Authorization')
  if (!publicMode) return result
  const base = new URL(apiBase || '/', origin)
  const destination = new URL(target, origin)
  const allowedPath = `${base.pathname.replace(/\/$/, '')}/api/`
  if (destination.origin !== base.origin || !destination.pathname.startsWith(allowedPath)) throw new Error('Refusing to send account credentials outside the research API.')
  if (!token) throw new Error('Please sign in to access your research.')
  result.set('Authorization', `Bearer ${token}`)
  return result
}

export function researchSources(publicMode) {
  const sources = [
    ['charts', 'Chart analyses', '/api/chart/analyses', body => body.analyses],
    ['stocks', 'Company research', '/api/stocklab/analyses', body => body.analyses],
  ]
  if (!publicMode) sources.push(
    ['markets', 'Market research', '/api/market/state', body => body.history],
    ['simulations', 'Simulations', '/api/simulation/history?limit=200', body => body.data],
    ['projects', 'Knowledge graph projects', '/api/graph/project/list?limit=200', body => body.data],
  )
  return sources
}

export function createJobTransport(transport, { publicMode, createKey = () => crypto.randomUUID(), owner = () => '' } = {}) {
  const keys = new Map()
  return async (url, options = {}) => {
    if (!publicMode) return transport(url, options)
    const body = options.body instanceof FormData
      ? JSON.stringify([...options.body.entries()].map(([name, value]) => [name, typeof value === 'string' ? value : [value.name, value.size, value.lastModified, value.type]]))
      : String(options.body || '')
    const fingerprint = JSON.stringify([owner(), url, body])
    if (!keys.has(fingerprint)) keys.set(fingerprint, createKey())
    const headers = new Headers(options.headers)
    headers.set('Idempotency-Key', keys.get(fingerprint))
    const response = await transport(url, { ...options, headers })
    // A lost response or failed request keeps its identity for a user's retry.
    // A confirmed submission means their next explicit request is a new job.
    if (response.ok) {
      // HTTP success alone is ambiguous: a proxy can return HTML or lose the
      // created ID. Keep the same key until a usable acknowledgement arrives.
      try { if (acknowledgedJob(await response.clone().json())) keys.delete(fingerprint) }
      catch { /* Preserve the submission identity without consuming its body. */ }
    }
    return response
  }
}
