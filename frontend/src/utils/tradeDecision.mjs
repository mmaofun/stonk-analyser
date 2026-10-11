import {referencePayoff} from './payoffPolicy.mjs'
const validIdentity=value=>typeof value==='string' && /^[a-z][a-z0-9_-]{0,47}$/.test(value)

export const isFutureReferenceReport=run=>run?.version>=12&&run?.verdict?.plan_purpose==='future_conditional_reference'

export const isNoTrade = run => run?.verdict?.trade_readiness?.decision === 'no_trade'

export function referenceTradePlans(run) {
  const future=isFutureReferenceReport(run)
  if (isNoTrade(run)&&!future) return []
  const plans=run?.verdict?.plans || []
  const scenarios=run?.verdict?.strategy_scenarios
  return Array.isArray(scenarios) ? plans.filter(plan=>validIdentity(plan.plan_id) && validIdentity(plan.scenario_id) && scenarios.some(scenario=>
    validIdentity(scenario.id) && validIdentity(scenario.plan_id) &&
    scenario.status==='developing' && (future?scenario.plan_status==='complete_reference'&&plan.plan_purpose==='future_conditional_reference'&&plan.entry_permission===false:!scenario.no_trade_reason) && scenario.id===plan.scenario_id &&
    scenario.plan_id===plan.plan_id && scenario.strategy===plan.strategy && scenario.side===plan.side)) : plans
}

export const visibleTradePlans=run=>referenceTradePlans(run).filter(plan=>referencePayoff(plan).eligible)
export const rejectedTradePlans=run=>referenceTradePlans(run).filter(plan=>!referencePayoff(plan).eligible)

export function tradeActionLabel(run) {
  if (isNoTrade(run)) return isFutureReferenceReport(run)?'No trade now · future references only':'No trade — stand aside'
  const plans=visibleTradePlans(run)
  return plans.length ? visiblePlanAssessment(run,plans[0]).action_label || 'Conditional setup · wait for confirmation' : 'No entry confirmed'
}

export function visibleActionPaths(run) {
  const scenarios=run?.verdict?.strategy_scenarios
  if (Array.isArray(scenarios)) {
    const plans=visibleTradePlans(run)
    return scenarios.map(scenario=>{
      const planIndex=scenario.status==='developing' && (isFutureReferenceReport(run)?scenario.plan_status==='complete_reference':!scenario.no_trade_reason) && scenario.plan_id
        ? plans.findIndex(plan=>plan.plan_id===scenario.plan_id && plan.scenario_id===scenario.id && plan.strategy===scenario.strategy && plan.side===scenario.side) : -1
      return {...scenario,steps:scenario.steps||[],plan_index:planIndex<0?null:planIndex,
        action:scenario.status==='developing' ? planIndex>=0?isFutureReferenceReport(run)?'conditional_reference':'conditional_entry':'reassess' : 'unavailable'}
    })
  }
  const paths=run?.verdict?.action_paths
  if (!paths) return []
  const plans=visibleTradePlans(run)
  return ['long','short'].filter(side=>paths[side]).map(side=>{
    const path=paths[side]
    const planIndex=plans.findIndex(plan=>plan.side===side)
    // Derive permission from the currently visible plans, never from stale path metadata.
    return {...path,side,steps:path.steps||[],plan_index:planIndex<0?null:planIndex,
      action:path.status==='unavailable'?'unavailable':planIndex>=0?'conditional_entry':'reassess'}
  })
}

export function visiblePlanAssessment(run,plan) {
  const original=run?.verdict?.plans || []
  const index=original.findIndex(candidate=>candidate===plan || (plan?.plan_id && candidate.plan_id===plan.plan_id && candidate.scenario_id===plan.scenario_id))
  return index<0 ? {} : run?.plan_assessments?.[index] || {}
}

export const strategyLabel=family=>({breakout_retest:'Breakout / retest',sweep_reclaim:'Sweep / reclaim',range_reversion:'Range-edge reversion',support_resistance:'Support / resistance reaction',trend_pullback:'Trend pullback'}[family]||family)

export function rankedReferencePlans(run) {
  const plans=visibleTradePlans(run)
  const needsReview=plan=>{
    const assessment=visiblePlanAssessment(run,plan)
    const payoff=referencePayoff(plan)
    return ['unavailable','payoff_review_required','explanation_review_required'].includes(assessment.status)||Boolean(assessment.explanation_issue)||!payoff.eligible
  }
  const coherent=plans.filter(plan=>!needsReview(plan)),review=plans.filter(needsReview)
  return {plans:[...coherent,...review],primary:coherent[0]||null,needsReview}
}
