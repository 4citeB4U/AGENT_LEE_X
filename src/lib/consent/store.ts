/* LEEWAY HEADER
TAG: FRONTEND.CONSENT.STORE
SPDX-License-Identifier: MIT
*/

export type ConsentState = {
  mic?: boolean
  camera?: boolean
  updatedAt?: number
  history?: Array<{ k: 'mic'|'camera'|'dismiss'; v: boolean; at: number }>
}

const KEY = 'agentlee:consent:v1'

export function getConsent(): ConsentState {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export function setConsent(partial: Partial<ConsentState>) {
  const cur = getConsent()
  const next: ConsentState = { ...cur, ...partial, updatedAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function log(k: 'mic'|'camera'|'dismiss', v: boolean){
  const cur = getConsent()
  const history = Array.isArray(cur.history) ? cur.history.slice(-50) : []
  history.push({ k, v, at: Date.now() })
  setConsent({ ...cur, history })
}
