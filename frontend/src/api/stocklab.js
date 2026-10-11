import { apiBase, apiFetch, jobFetch } from './platform'
import {readApiObject,requireJobReceipt} from '../utils/analysisResponses.mjs'
const BASE = apiBase + '/api/stocklab'

export async function stockRequest(path, options = {}) {
  const response = await (options.method==='POST'&&!path.endsWith('/cancel')?jobFetch:apiFetch)(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const result = await readApiObject(response,'Stock Lab request failed')
  return options.method==='POST'&&!path.endsWith('/cancel')?requireJobReceipt(result):result
}

export const exportUrl = (id, format = 'json') => `${BASE}/analyses/${id}/export?format=${format}`
export {money} from '../utils/stockCurrency.mjs'
export const number = value => Number.isFinite(value) ? new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value) : '—'
export const percent = value => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%` : '—'
export const date = value => value ? new Date(value).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
