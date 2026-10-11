import {resultScenarioGroups} from './scenarioPresentation.mjs'
import {exitPlanKey} from './tradeExitPlan.mjs'
import {strategyLabel} from './tradeDecision.mjs'
const rows=value=>Array.isArray(value)?value:[]
export const chartWorkflowPhase=(run,section='overview')=>!run?'upload':['queued','running','preparing','stopping'].includes(run.status)||section==='discussion'||!run.verdict?'analysis':'results'
export function chartScenarioOptions(run){
 const groups=resultScenarioGroups(run),seen=new Set(),out=[]
 for(const [index,scenario] of rows(run?.verdict?.strategy_scenarios).entries()){
  const match=p=>p.scenario_id===scenario.id&&(!scenario.plan_id||p.plan_id===scenario.plan_id)
  const plan=groups.plans.find(match),rejected=groups.rejected.find(match),id=scenario.id||`recorded-${index}`
  const reference=plan||rejected
  const key=reference?exitPlanKey(run,reference):`watch:${run.id}:${id}`
  if(seen.has(key))continue;seen.add(key)
  out.push({key,scenario,plan:reference||null,rejected:rejected||null,kind:plan?'reference':rejected?'rejected':'watch',label:strategyLabel(scenario.strategy),side:scenario.side})
 }
 for(const plan of groups.plans){const key=exitPlanKey(run,plan);if(!seen.has(key)){seen.add(key);out.push({key,plan,scenario:null,rejected:null,kind:'reference',label:strategyLabel(plan.strategy)||'Recorded setup',side:plan.side})}}
 return out
}
export function selectChartScenario(options,current){return options.some(o=>o.key===current)?current:options.find(o=>o.kind==='reference')?.key||options.find(o=>o.kind==='rejected')?.key||options[0]?.key||''}
export function chartSwarmPanels(participants){
 const people=[...new Map(rows(participants?.traders).map(p=>[p.id,p])).values()].sort((a,b)=>a.id.localeCompare(b.id))
 return [{id:'traders-a',label:'Traders · 1',people:people.filter((_,i)=>i%2===0)},{id:'traders-b',label:'Traders · 2',people:people.filter((_,i)=>i%2===1)},{id:'analysts',label:'Chart analysts',people:rows(participants?.analysts)}]
}
