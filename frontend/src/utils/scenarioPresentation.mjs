import {rankedReferencePlans,rejectedTradePlans} from './tradeDecision.mjs'
export function scenarioDescription(scenario){return ({breakout_retest:scenario.side==='short'?'Broken support becomes resistance, creating a possible continuation lower.':'Price breaks the range ceiling, then holds it as support.',sweep_reclaim:scenario.side==='short'?'A move above resistance fails, then price returns below it.':'A move below support fails, then price recovers into the range.',range_reversion:scenario.side==='short'?'Resistance holds and price turns back toward the other side of the range.':'Support holds and price bounces back toward the other side of the range.',support_resistance:'Price tests a recorded level and needs a confirmed reaction.',trend_pullback:'Price pulls back within the trend and needs a confirmed continuation.'}[scenario.strategy]||'A conditional path based on the recorded chart structure.')}
export function scenarioTrigger(scenario,plan){const text=scenario?.steps?.[0]?.condition||plan?.trigger||'Not recorded';return text.length>96?text.slice(0,93).replace(/\s+\S*$/,'')+'…':text}
export function planImageIndex(run,plan){
 if(!plan)return null
 const valid=value=>Number.isInteger(value)&&value>=0&&value<(run.images||[]).length
 const plotted=plan.plot_levels||[],observed=run.observation?.levels||[],entry=[plotted.find(l=>l.id===plan.entry_level_id),observed.find(l=>l.id===plan.entry_level_id)]
 for(const level of entry)if(valid(level?.image_index))return level.image_index
 if(valid(plan.entry_zone?.image_index))return plan.entry_zone.image_index
 for(const id of [plan.stop_level_id,...plan.target_level_ids||[]])for(const level of [plotted.find(l=>l.id===id),observed.find(l=>l.id===id)])if(valid(level?.image_index))return level.image_index
 return null
}

export function resultScenarioGroups(run){const ranking=rankedReferencePlans(run),rejected=rejectedTradePlans(run);const watchlists=(run?.verdict?.strategy_scenarios||[]).filter(scenario=>!rejected.some(plan=>plan.scenario_id===scenario.id)&&(scenario.plan_status!=='complete_reference'||!ranking.plans.some(plan=>plan.scenario_id===scenario.id)));return {plans:ranking.plans,rejected,watchlists}}
export function incompleteScenarioDisplay(run,scenario){
 const labels={structural_stop:'Structural SL anchor missing',entry_anchor:'Entry anchor missing',first_target:'TP1 anchor missing',target_anchor:'Target anchor missing',future_extreme:'Future extreme not observed',strategy_context:'Strategy context missing',entry_zone:'Observed entry zone missing',price_scale:'Readable price scale missing'}
 const missing=(scenario.missing_structure_types||[]).map(type=>labels[type]||type.replaceAll('_',' '))
 const ids=[...new Set([...(scenario.evidence_ids||[]),...(scenario.steps||[]).flatMap(step=>step.level_ids||[]),...(scenario.invalidation?.level_ids||[])])]
 const references=ids.map(id=>run?.observation?.levels?.find(level=>level.id===id)).filter(level=>level&&typeof level.price==='number'&&Number.isFinite(level.price)&&level.price>0)
 return {label:missing.length?'Incomplete levels · '+missing.join(' · '):'Incomplete position levels',missing,reasons:[...(scenario.missing_structure||[])],references}
}

export function scenarioSequence(scenario,plan){
 const labels={trend_context:'Trend context',level_approach:'Price approaches',boundary_touch:'Price reaches',penetration:'Sweep the level',acceptance_outside:'Break and hold',reclaim_rejection:'Reclaim / reject',retest_hold:'Retest and confirm',rejection_hold_inside:'Confirm rejection',reaction_hold:'Confirm the reaction',pullback_reset:'Wait for a pullback',hold_resume:'Confirm continuation',reset_hold:'Entry after confirmation',reassess:'Final check / reassess'}
 const steps=(scenario?.steps||[]).filter(step=>step.condition).map(step=>({label:labels[step.event_type]||'Confirmation',condition:step.condition}))
 return steps.length?steps:plan?.trigger?[{label:'Trigger and confirmation',condition:plan.trigger}]:[]
}

export function scenarioCancellation(scenario,plan){
 return scenario?.invalidation?.condition||plan?.invalidation||(scenario?.steps||[]).filter(step=>step.event_type==='reassess').map(step=>step.condition).join(' ')||''
}
