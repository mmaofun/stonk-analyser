const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)

function invalidUpdate(message='The research service sent an incomplete update. Please retry.',status=502){
 const error=new Error(message);error.status=status;return error
}

export async function readApiObject(response,fallback='The research request could not be completed.'){
 let body
 try{body=await response.json()}catch{throw invalidUpdate('The research service returned an unreadable response. Please retry.',response.ok?502:response.status)}
 if(!record(body))throw invalidUpdate(undefined,response.ok?502:response.status)
 if(!response.ok||body.success===false){
  const error=new Error(typeof body.error==='string'?body.error:fallback)
  error.status=response.status;throw error
 }
 return body
}

export const acknowledgedJob=body=>record(body)&&body.success!==false&&typeof body.id==='string'&&/^[a-f0-9]{32}$/.test(body.id)

export function requireJobReceipt(body){
 if(!acknowledgedJob(body))throw invalidUpdate('The analysis acknowledgement was incomplete. Check saved analyses before retrying.')
 return body
}

export function requireAnalysisResponse(body,expectedId){
 const run=body?.analysis
 if(!record(body)||body.success===false||!record(run)||run.id!==expectedId||typeof run.status!=='string'||!run.status)throw invalidUpdate()
 // Reject malformed updates before replacing the last usable screen. Nullable
 // optional stages are valid while work is pending or evidence is unavailable.
 for(const key of ['images','roles','roster','research','events','opinions','challenges','replies','investors','scenarios','agent_errors','round_errors']){
  if(run[key]!=null&&(!Array.isArray(run[key])||run[key].some(row=>!record(row))))throw invalidUpdate()
 }
 for(const key of ['observation','verdict','dossier','trader_dialogue','trader_review','investor_rounds','one_year','evidence_review','decision_framework']){
  if(run[key]!=null&&!record(run[key]))throw invalidUpdate()
 }
 if(run.observation&&!Array.isArray(run.observation.levels))throw invalidUpdate()
 if(run.dossier&&(!Array.isArray(run.dossier.sources)||!record(run.dossier.metrics)||!Array.isArray(run.dossier.failures)))throw invalidUpdate()
 if(run.verdict){
  for(const key of ['supporting','opposing','change_conditions','uncertainties','plans','strategy_scenarios'])if(run.verdict[key]!=null&&!Array.isArray(run.verdict[key]))throw invalidUpdate()
 }
 if(run.evidence_review&&(!Array.isArray(run.evidence_review.unresolved)||!Array.isArray(run.evidence_review.rejected_claims)))throw invalidUpdate()
 return run
}

export function requireHistoryResponse(body){
 if(!record(body)||!Array.isArray(body.analyses)||body.analyses.some(row=>!record(row)||typeof row.id!=='string'||row.status!=null&&typeof row.status!=='string'))throw invalidUpdate()
 return body.analyses
}
