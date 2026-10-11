import { reactive, ref } from 'vue'
import { validPlan } from '../utils/plans.mjs'
import { apiAuthHeaders, createJobTransport, deploymentConfig } from '../utils/platform.mjs'

export const { publicMode, previewMode, apiBase } = deploymentConfig(import.meta.env)
export const account = reactive({ initialized: false, session: null, config: null, info:null, error: '', recovery: false })
function savedPlan(){try{const value=localStorage.getItem('mirofish.planPreview');return validPlan(value)?value:previewMode?'free':''}catch{return previewMode?'free':''}}
export const localPlanPreview=ref(savedPlan())
export function selectLocalPlan(value){localPlanPreview.value=validPlan(value)?value:'';try{localStorage.setItem('mirofish.planPreview',localPlanPreview.value)}catch{}}
let client, initializing, allowanceTimer

export async function initializeAccount({ retry = false } = {}) {
  if (!publicMode) return null
  if (client && account.initialized && !retry) return client
  if (initializing) return initializing
  initializing = (async () => {
    account.error = ''
    try {
      const response = await fetch(`${apiBase}/api/platform/config`, { credentials: 'omit', signal: AbortSignal.timeout(15000) })
      const config = await response.json()
      if (!response.ok || config.success === false || config.mode !== 'public') throw new Error('The public research service is not configured yet.')
      account.config = config
      if (!config.supabase_url || !config.supabase_publishable_key) throw new Error('Account setup is not ready. The site owner needs to connect Supabase.')
      // Import only in public mode. No provider secret is ever loaded in this client.
      if (!client) {
        const { createClient } = await import('@supabase/supabase-js')
        client = createClient(config.supabase_url, config.supabase_publishable_key, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
        })
        client.auth.onAuthStateChange((event, session) => {
          account.session = session
          account.info = null
          clearTimeout(allowanceTimer)
          if (event === 'PASSWORD_RECOVERY') account.recovery = true
          if (event === 'SIGNED_OUT') account.recovery = false
          if (session) setTimeout(()=>refreshAccount().catch(()=>{}),0)
        })
      }
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      account.session = data.session
      account.initialized = true
      return client
    } catch (error) {
      account.error = error.name === 'TimeoutError' ? 'The research service is taking too long to respond. Try again.' : error.message
      account.initialized = true
      throw new Error(account.error)
    } finally { initializing = null }
  })()
  return initializing
}

export async function authorizationHeaders(target, headers = {}) {
  let token = null
  if (publicMode) {
    const supabase = await initializeAccount()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    account.session = data.session
    token = data.session?.access_token
  }
  return apiAuthHeaders({ publicMode, apiBase, target, headers, token, origin: window.location.origin })
}

export async function apiFetch(url, options = {}) {
  if(previewMode)throw new Error('This project preview uses examples only. Live analyses open in the hosted app.')
  const headers = await authorizationHeaders(url, options.headers)
  return fetch(url, { ...options, headers, ...(publicMode ? { credentials: 'omit' } : {}) })
}

const submitJob = createJobTransport(apiFetch, { publicMode, owner: () => account.session?.user.id || '' })
export async function jobFetch(url,options={}){
  const headers=new Headers(options.headers)
  if(!publicMode&&!previewMode&&validPlan(localPlanPreview.value))headers.set('X-Local-Plan-Preview',localPlanPreview.value)
  const response=await submitJob(url,{...options,headers})
  if(publicMode&&response.ok)refreshAccount().catch(()=>{})
  return response
}

export async function platformAction(path,body={},method='POST'){
  const response=await apiFetch(`${apiBase}/api/${path}`,{method,headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})})
  const value=await response.json()
  if(!response.ok||value.success===false)throw new Error(value.error||'This action could not finish. Please try again.')
  return value
}
export async function refreshAccount(){
  if(!publicMode||!account.session){account.info=null;return null}
  const id=account.session.user.id
  const info=await platformAction('platform/account',{},'GET')
  if(account.session?.user.id===id){account.info=info;clearTimeout(allowanceTimer);const wait=Date.parse(info.entitlement?.reset_at)-Date.now()+1000;if(Number.isFinite(wait)&&wait>0)allowanceTimer=setTimeout(()=>refreshAccount().catch(()=>{}),Math.min(wait,86401000))}
  return info
}

export async function downloadPrivateFile(url, filename) {
  const response = await apiFetch(url)
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'The download could not be opened. Please try again.')
  }
  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000)
}

export async function signOut() {
  const supabase = await initializeAccount()
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
  account.session = null
  account.info = null
  clearTimeout(allowanceTimer)
}
