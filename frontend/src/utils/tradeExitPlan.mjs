import {firstTargetPayoff,referencePayoff,calculatedTargetSource} from './payoffPolicy.mjs'
import {isNoTrade,visibleTradePlans,visiblePlanAssessment,strategyLabel,isFutureReferenceReport,referenceTradePlans} from './tradeDecision.mjs'

const structural=new Set(['support','resistance','swing_high','swing_low'])
const finitePositive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0
const stable=value=>{
  if(Array.isArray(value))return value.map(stable)
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
  return value
}
export const freshExitInputs=()=>({entry:'',confirmed:false,costs:'',tp1Share:''})

export function exitPlanKey(run,plan) {
  if(!plan)return ''
  const original=run?.verdict?.plans||[]
  const index=original.findIndex(candidate=>candidate===plan||(plan.plan_id&&candidate.plan_id===plan.plan_id&&candidate.scenario_id===plan.scenario_id))
  return JSON.stringify([run?.id||'',index,plan.plan_id||null,plan.scenario_id||null,plan.strategy||null,plan.side])
}

export function exitPlanOptions(run) {
  return visibleTradePlans(run).map(plan=>({key:exitPlanKey(run,plan),plan,assessment:visiblePlanAssessment(run,plan),
    label:`${plan.strategy?strategyLabel(plan.strategy):'Conditional setup'} · ${plan.side==='long'?'Long':'Short'} · scenario ${(run.verdict.plans||[]).indexOf(plan)+1}`,
  }))
}

export function exitResetToken(run,key) {
  const option=exitPlanOptions(run).find(item=>item.key===key)
  const observation=run?.observation?{...run.observation,levels:[...(run.observation.levels||[])].sort((a,b)=>a.id.localeCompare(b.id))}:null
  return JSON.stringify(stable({report:run?.id,selected:key,plan:option?.plan||null,assessment:option?.assessment||null,
    readiness:run?.verdict?.trade_readiness||null,scenarios:run?.verdict?.strategy_scenarios||run?.verdict?.action_paths||null,
    observation,images:(run?.images||[]).map(image=>({sha256:image.sha256,stored_name:image.stored_name})),
  }))
}

export function exitPlanSourceIssue(run,option) {
  if(isNoTrade(run)&&!isFutureReferenceReport(run))return 'This saved assessment says no trade. Reassess current chart structure before using a management plan.'
  if(!option)return 'No exact supported plan is available. A confirmation checkbox cannot create a plan.'
  const plan=option.plan
  if(!referencePayoff(plan).eligible)return referencePayoff(plan).reason
  if(!['long','short'].includes(plan.side)||(!isFutureReferenceReport(run)&&plan.no_trade_reason)||['historical','invalidated','unavailable'].includes(plan.status))return 'This scenario is blocked or not actionable; reassess it.'
  if(!isFutureReferenceReport(run)&&(run?.verdict?.trade_readiness?.conditions||[]).some(condition=>condition.applies_to==='both'||condition.applies_to===plan.side))return 'An active no-trade condition blocks this side. Reassess the saved assessment; reporting confirmation does not clear it.'
  const paths=run?.verdict?.action_paths
  if(paths?.[plan.side]&&paths[plan.side].status!=='conditional')return 'The saved path does not establish this side. Reassess it before planning exits.'
  if(!finitePositive(plan.entry)||!finitePositive(plan.stop)||!Array.isArray(plan.targets)||!plan.targets.length||plan.targets.length>2||!plan.targets.every(finitePositive))return 'Saved entry, stop and targets must be finite positive prices. Refresh the chart assessment.'
  const direction=plan.side==='long'?1:-1
  if(direction*(plan.entry-plan.stop)<=0||plan.targets.some(target=>direction*(target-plan.entry)<=0)||plan.targets.length===2&&direction*(plan.targets[1]-plan.targets[0])<=0)return 'Saved stop or target geometry is invalid for this side. Reassess; these prices are not moved to repair it.'
  const levels=run?.observation?.levels||[]
  if(run?.observation?.is_chart===false||run?.observation?.price_scale_readable===false)return 'The source chart does not establish readable prices; reassess with a clearer chart.'
  if(!run?.observation||run.observation.is_chart!==true||run.observation.price_scale_readable!==true||!levels.length||!plan.entry_level_id||!plan.stop_level_id||!Array.isArray(plan.target_level_ids)||plan.target_level_ids.length!==plan.targets.length)return 'Readable observed entry, stop and target level evidence is required. Reopen or reassess the source report.'
  if(levels.length) {
    const source=calculatedTargetSource(plan)
    if(!source)return 'The calculated target does not match 1.25R from the unchanged observed entry and stop. Reassess the reference.'
    const ids=[source.entry_level_id,source.stop_level_id,...(source.target_level_ids||[])]
    const selected=ids.map(id=>levels.find(level=>level.id===id))
    const prices=[source.entry,source.stop,...source.targets]
    if(ids.length!==prices.length||selected.some((level,index)=>!level||!finitePositive(level.price)||level.price!==prices[index])||selected.slice(1).some(level=>!structural.has(level.kind))||selected[0]?.kind==='indicator_value')return 'Saved exits do not match their observed chart levels. Reassess source evidence before using them.'
    if(new Set(selected.map(level=>level.image_index)).size!==1)return 'A plan cannot mix exit levels from different screenshots.'
  } else if(plan.entry_level_id||plan.stop_level_id||plan.target_level_ids?.length) {
    return 'The observed level evidence for this plan is unavailable. Reopen or reassess the source report.'
  }
  if(plan.timeframe&&run?.observation?.chart_timeframes?.length&&!run.observation.chart_timeframes.includes(plan.timeframe))return 'The plan references an unseen chart timeframe. Reassess it.'
  if(isFutureReferenceReport(run)&&plan.entry_zone){
    const zone=plan.entry_zone,observed=(run.observation.entry_zones||[]).find(item=>item.id===zone.id)
    const lower=levels.find(level=>level.id===zone.lower_level_id),upper=levels.find(level=>level.id===zone.upper_level_id)
    if(!observed||observed.lower_level_id!==zone.lower_level_id||observed.upper_level_id!==zone.upper_level_id||!lower||!upper||zone.lower!==lower.price||zone.upper!==upper.price||zone.lower>=zone.upper||[lower.image_index,upper.image_index].some(index=>index!==zone.image_index)||direction*(zone.lower-plan.stop)<=0||direction*(zone.upper-plan.stop)<=0||[zone.lower,zone.upper].some(entry=>direction*(plan.targets[0]-entry)<=0))return 'Observed entry-zone evidence or endpoint geometry does not match the saved reference. Reassess it.'
  }
  return null
}

function numberInput(value) {
  if(value===null||value===undefined||typeof value==='string'&&!value.trim())return {blank:true}
  if(typeof value!=='number'&&typeof value!=='string')return {invalid:true}
  if(typeof value==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))return {invalid:true}
  const numeric=Number(value)
  return Number.isFinite(numeric)?{value:numeric}:{invalid:true}
}

export function calculateTradeExit(run,key,inputs=freshExitInputs()) {
  const option=exitPlanOptions(run).find(item=>item.key===key)
  const rejected=referenceTradePlans(run).find(plan=>exitPlanKey(run,plan)===key)
  if(!option&&rejected)return {valid:false,mode:'unavailable',errors:[referencePayoff(rejected).reason],review_required:true}
  const sourceIssue=exitPlanSourceIssue(run,option)
  if(sourceIssue)return {valid:false,mode:'unavailable',errors:[sourceIssue],review_required:true}
  const plan=option.plan,assessment=option.assessment,errors=[]
  const actual=numberInput(inputs.entry),costInput=numberInput(inputs.costs),shareInput=numberInput(inputs.tp1Share)
  if(actual.invalid||!actual.blank&&actual.value<=0)errors.push('Enter a finite actual fill price above zero.')
  if(inputs.confirmed===true&&actual.blank)errors.push('Supply your actual entry before reviewing user-confirmed management.')
  if(costInput.invalid||!costInput.blank&&costInput.value<0)errors.push('Additional aggregate costs must be a finite, non-negative amount in chart-price units; blank excludes costs.')
  if(shareInput.invalid||!shareInput.blank&&(shareInput.value<0||shareInput.value>100))errors.push('TP1 exit share must be a number from 0 to 100 percent.')
  if(plan.targets.length===1&&!shareInput.blank)errors.push('This plan has one target. Clear the TP1 split assumption; no TP2 is supplied.')
  if(errors.length)return {valid:false,mode:'reassess',errors,review_required:true}
  const entry=actual.blank?plan.entry:actual.value,direction=plan.side==='long'?1:-1
  const risk=direction*(entry-plan.stop),rewards=plan.targets.map(target=>direction*(target-entry))
  if(isFutureReferenceReport(run)&&plan.entry_zone&&!actual.blank&&(entry<plan.entry_zone.lower||entry>plan.entry_zone.upper))errors.push('Your fill is outside the observed conditional entry zone. Reassess whether the original setup/exits still apply; the zone is unchanged.')
  if(risk<=0)errors.push('The entered fill is at or beyond the saved stop on the wrong side. Reassess current structure; the stop is unchanged.')
  if(rewards[0]<=0)errors.push('The entered fill is at or beyond TP1. The earlier target cannot be treated as a reachable future exit; reassess the setup.')
  if(!Number.isFinite(risk)||rewards.some(reward=>!Number.isFinite(reward)))errors.push('These inputs exceed finite price arithmetic; review the entry and saved levels.')
  if(errors.length)return {valid:false,mode:'reassess',errors,review_required:true}
  const costsIncluded=!costInput.blank,costs=costsIncluded?costInput.value:null
  const adjustedRisk=costsIncluded?risk+costs:null
  const targets=plan.targets.map((price,index)=>({price,reward:rewards[index],gross_r:rewards[index]/risk,
    adjusted_reward:costsIncluded?rewards[index]-costs:null,adjusted_r:costsIncluded?(rewards[index]-costs)/adjustedRisk:null}))
  const breakEven=costsIncluded?entry+direction*costs:null
  const riskPercent=risk/entry*100
  if(!Number.isFinite(riskPercent)||targets.some(target=>!Number.isFinite(target.gross_r)))return {valid:false,mode:'reassess',errors:['Derived risk percentage or target R exceeds finite arithmetic. Reassess the entered price and saved levels.'],review_required:true}
  if(costsIncluded&&(!Number.isFinite(adjustedRisk)||!Number.isFinite(breakEven)||breakEven<=0||!Number.isFinite(adjustedRisk/entry*100)||targets.some(target=>!Number.isFinite(target.adjusted_reward)||!Number.isFinite(target.adjusted_r))))return {valid:false,mode:'reassess',errors:['The additional cost estimate gives an unavailable or non-positive break-even reference, or exceeds finite arithmetic. Review that amount and the reachable exits.'],review_required:true}
  const payoff=firstTargetPayoff(entry,plan.stop,plan.targets[0],plan.side,costsIncluded?costs:0)
  const conservative=referencePayoff(plan,costsIncluded?costs:0)
  if(!conservative.eligible)return {valid:false,mode:'reassess',errors:['Worst allowed reference fill with entered costs: '+conservative.reason],review_required:true,entry,stop:plan.stop,targets}
  if(!payoff.eligible)return {valid:false,mode:'reassess',errors:[payoff.reason],review_required:true,entry,stop:plan.stop,targets}
  let allocation=null
  if(plan.targets.length===2&&!shareInput.blank) {
    const share=shareInput.value/100,remainder=1-share
    const weighted=share*rewards[0]+remainder*rewards[1]
    const afterTP1Stop=share*rewards[0]-remainder*risk
    allocation={tp1_share:share,remainder_share:remainder,weighted_reward:weighted,gross_r:weighted/risk,
      adjusted_reward:costsIncluded?weighted-costs:null,adjusted_r:costsIncluded?(weighted-costs)/adjustedRisk:null,
      tp1_then_stop_reward:afterTP1Stop,tp1_then_stop_r:afterTP1Stop/risk,
      tp1_then_stop_adjusted_reward:costsIncluded?afterTP1Stop-costs:null,tp1_then_stop_adjusted_r:costsIncluded?(afterTP1Stop-costs)/adjustedRisk:null,
      remaining_stop_risk:remainder*risk}
  }
  if(allocation&&Object.values(allocation).some(value=>value!==null&&!Number.isFinite(value)))return {valid:false,mode:'reassess',errors:['The partial-exit assumptions exceed finite payoff arithmetic. Review the entered price, costs and allocation.'],review_required:true}
  const warnings=[]
  if(plan.target_policy?.fallback_applied)warnings.push('TP1 is calculated at 1.25R, not an observed chart target. Review any support or resistance before it; the source target is retained separately.')
  if(isFutureReferenceReport(run)){
    if(isNoTrade(run))warnings.push('No trade now remains the saved entry-readiness decision. These are future reference levels; your checkbox does not clear current blockers.')
    if(run.verdict.freshness?.verified_current_market!==true)warnings.push('Chart market time/currentness is unverified or stale. User-reported fill/confirmation does not refresh source structure; review a current chart before using these references.')
  }
  if(assessment.status==='explanation_review_required'||assessment.explanation_issue)warnings.push(assessment.explanation_issue||'The saved explanation conflicts with its price math. Resolve this before using the management interpretation.')
  if(assessment.status==='payoff_review_required')warnings.push('The saved reference scenario was flagged for poor payoff; confirmation does not remove that assessment.')
  if(targets[0].gross_r<1-1e-10)warnings.push('At this entry, TP1 offers less gross reward than the distance to the saved stop.')
  if(costsIncluded&&targets[0].adjusted_r<1-1e-10)warnings.push('Including the additional cost estimate, TP1 offers less reward than estimated stop loss.')
  if(costsIncluded&&targets[0].adjusted_reward<=0)warnings.push('The additional cost estimate consumes TP1 payoff. Reassess costs, reachable exits and trade location.')
  const confirmed=inputs.confirmed===true&&!actual.blank
  return {valid:true,mode:warnings.length?'review_required':confirmed?'user_confirmed':actual.blank?'reference_preview':'entry_preview',
    review_required:warnings.length>0,warnings,confirmation_user_reported:confirmed,actual_entry_supplied:!actual.blank,
    entry,side:plan.side,stop:plan.stop,risk,risk_percent:riskPercent,targets,costs_included:costsIncluded,costs,
    adjusted_risk:adjustedRisk,adjusted_risk_percent:costsIncluded?adjustedRisk/entry*100:null,break_even:breakEven,
    allocation,approximate:Boolean(plan.approximate||Object.values(plan.level_bases||{}).flat().includes('axis_estimate')||(run.observation?.levels||[]).some(level=>[plan.entry_level_id,plan.stop_level_id,...plan.target_level_ids].includes(level.id)&&level.basis==='axis_estimate')),
  }
}
