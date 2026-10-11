export const MINIMUM_REWARD_RISK=1.25
const positive=value=>Number.isFinite(Number(value))&&Number(value)>0
function decimal(value){const text=String(value),match=/^([+-]?)(\d*\.?\d+)(?:e([+-]?\d+))?$/i.exec(text);if(!match)throw Error('Invalid decimal');const digits=match[2].replace('.',''),fraction=match[2].split('.')[1]?.length||0,exponent=Number(match[3]||0);return {n:BigInt(digits)*(match[1]==='-'?-1n:1n),scale:fraction-exponent}}
export function firstTargetPayoff(entry,stop,target,side,costs=0){
 if(!['long','short'].includes(side)||![entry,stop,target].every(positive)||!Number.isFinite(Number(costs))||Number(costs)<0)return {complete:false,eligible:false,reason:'Finite entry, stop and TP1 prices are required.'}
 try{const ds=[entry,stop,target,costs].map(decimal),scale=Math.max(...ds.map(d=>d.scale)),[e,s,t,c]=ds.map(d=>d.n*10n**BigInt(scale-d.scale)),direction=side==='long'?1n:-1n,risk=(e-s)*direction+c,reward=(t-e)*direction-c
 if(risk<=0n||reward<=0n)return {complete:false,eligible:false,reason:'TP1/stop geometry or costs leave no positive payoff.'}
 const eligible=reward*4n>=risk*5n,r=Number(reward)/Number(risk)
 if(!Number.isFinite(r))return {complete:false,eligible:false,reason:'Derived TP1 R exceeds finite arithmetic.'}
 return {complete:true,eligible,r,reason:eligible?'TP1 reaches at least 1.25R.':'TP1 must reach at least 1.25R, including entered costs.'}
 }catch{return {complete:false,eligible:false,reason:'Price arithmetic could not be checked.'}}
}
export function referencePayoff(plan,costs=0){
 if(!plan)return {complete:false,eligible:false,reason:'No complete reference is recorded.'}
 if(!positive(plan.entry))return {complete:false,eligible:false,reason:'A finite positive reference entry is required.'}
 if(plan.entry_zone&&(!positive(plan.entry_zone.lower)||!positive(plan.entry_zone.upper)||plan.entry_zone.lower>=plan.entry_zone.upper||plan.entry<plan.entry_zone.lower||plan.entry>plan.entry_zone.upper))return {complete:false,eligible:false,reason:'The observed entry-zone bounds are incomplete or invalid.'}
 const entries=plan.entry_zone?[plan.entry_zone.lower,plan.entry_zone.upper]:[plan.entry]
 const results=entries.map(entry=>firstTargetPayoff(entry,plan.stop,plan.targets?.[0],plan.side,costs))
 if(results.some(r=>!r.complete))return {complete:false,eligible:false,reason:results.find(r=>!r.complete).reason}
 return {complete:true,eligible:results.every(r=>r.eligible),r:Math.min(...results.map(r=>r.r)),reason:results.every(r=>r.eligible)?'Worst allowed fill to TP1 reaches at least 1.25R.':'Worst allowed fill to TP1 must reach at least 1.25R, including entered costs.'}
}
export function payoffRLabel(payoff){if(!Number.isFinite(payoff?.r))return 'Unavailable';const rounded=Number(payoff.r.toFixed(2));return payoff.eligible&&payoff.r>MINIMUM_REWARD_RISK&&rounded<=MINIMUM_REWARD_RISK?'>1.25R':`${rounded}R`}

// A calculated TP never masquerades as observed evidence. Validate the exact
// calculation and unchanged anchors before the exit calculator uses its source.
export function calculatedTargetSource(plan){
 if(!plan?.target_policy?.fallback_applied)return plan
 const source=plan.source_reference,policy=plan.target_policy
 if(!source||policy.minimum_r!==1.25||policy.basis!=='calculated_risk_multiple'||plan.target_level_ids?.[0]!=='calculated_tp1')return null
 for(const key of ['side','entry','stop','entry_level_id','stop_level_id','plan_id','scenario_id','strategy','entry_zone'])if(JSON.stringify(plan[key])!==JSON.stringify(source[key]))return null
 const entry=plan.entry_zone?plan.entry_zone[plan.side==='long'?'upper':'lower']:plan.entry
 const direction=plan.side==='long'?1:-1,risk=(entry-plan.stop)*direction,expected=entry+direction*1.25*risk
 const target=plan.targets?.[0],tolerance=Number.EPSILON*Math.max(1,Math.abs(expected))*4
 if(!Number.isFinite(expected)||expected<=0||risk<=0||!Number.isFinite(target)||Math.abs(target-expected)>tolerance)return null
 if(plan.targets.length!==plan.target_level_ids.length||plan.targets.slice(1).some((value,index)=>{const sourceIndex=source.target_level_ids?.indexOf(plan.target_level_ids[index+1]);return sourceIndex<0||source.targets?.[sourceIndex]!==value}))return null
 return source
}
