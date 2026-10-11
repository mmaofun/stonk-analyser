import { researchRecords } from '../utils/researchRecords.mjs'
import { apiBase, apiFetch, publicMode } from './platform'
import { researchSources } from '../utils/platform.mjs'
export const researchApi = apiBase

export async function loadResearchLibrary({signal}={}) {
  const sources=researchSources(publicMode)
  const results=await Promise.allSettled(sources.map(async([key,label,path,pick])=>{
    const response=await apiFetch(researchApi+path,{signal})
    const body=await response.json()
    if(!response.ok||body.success===false)throw new Error(body.error||`${label} could not be loaded`)
    return [key,pick(body)||[]]
  }))
  if(signal?.aborted)throw new DOMException('Request cancelled','AbortError')
  const data={},errors=[]
  results.forEach((result,i)=>{if(result.status==='fulfilled')data[result.value[0]]=result.value[1];else errors.push(`${sources[i][1]}: ${result.reason.message||'Unavailable'}`)})
  return {records:researchRecords(data),errors}
}
