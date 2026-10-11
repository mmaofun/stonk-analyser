// Fictional, labelled interface examples. No saved customer report is bundled.
import {plans} from './plans.mjs'
const at=i=>new Date(Date.UTC(2026,9,8,9,0,i)).toISOString()
const names=['Research lead','Opportunity researcher','Risk and evidence','Financials','Final reviewer','Products','Competition','Customers','Valuation','Strategy review']
const researcherNames=count=>Array.from({length:count},(_,i)=>({id:`researcher_${i}`,name:names[i]}))
export function stockExample(tier='free'){
 const p=plans.find(x=>x.id===tier)||plans[0],researchers=researcherNames(p.researchers)
 const r={id:'example-stock-'+p.id,ticker:'DEMO',company:'Example Company',market:'US',horizon:'years',status:'complete',created_at:at(0),updated_at:at(120),report_version:2,is_sample:true,
  execution_profile:{version:1,tier:p.id,kind:'stock',researcher_count:p.researchers,opinion_count:p.opinion_agents,total_agents:p.total_agents,researchers},
  dossier:{price:{value:100,currency:'USD',as_of:at(0)},sources:[{id:'sample',title:'Illustrative project data',url:'',content:'Fictional example, created to demonstrate the interface.'}],
   bars:Array.from({length:80},(_,i)=>({timestamp:Date.UTC(2026,6,21+i)/1000,close:80+i*.25+Math.sin(i*.4)*2,volume:20000+i*160}))},
  verdict:{verdict:'watch',evidence_strength:'moderate',business_assessment:'In this fictional example, new product demand could support growth if customers adopt it and margins hold.',summary:'Compare the opportunity with its valuation and execution risks.',supporting:[{text:'The example models higher demand alongside improving operating margins.',evidence_ids:['sample']}],opposing:[{text:'Slower adoption or a lower valuation multiple could put pressure on the price.',evidence_ids:['sample']}]},
  one_year:{status:'complete',as_of:'2026-10-08',target_date:'2027-10-08',reference_price:100,currency:'USD',low:{target_price:80,return:-.2},central:{target_price:110,return:.1},high:{target_price:140,return:.4}},
  roles:researchers.map(x=>({...x,layer:'core',status:'complete',responded:true})),research:[],investors:[],investor_rounds:{0:{},1:{}},agent_errors:[]}
 r.dossier.bars.at(-1).close=100
 r.research=researchers.map((actor,i)=>({id:`example-case-${i}`,actor_id:actor.id,layer:'company',area:'growth',side:i%2?'against':'for',name:actor.name,completed_at:at(i+1),result:{conclusion:i%2?'The sample outlook depends on demand becoming revenue. The team should test that assumption.':'The sample company could benefit from product adoption, provided it converts demand into cash flow.',claims:[],unknowns:['This is illustrative data.']}}))
 for(let i=0;i<p.opinion_agents;i++){
  const id=`investor_${i}`,peer=`investor_${(i+1)%p.opinion_agents}`,target=[118,97,105,89,102][i%5],high=(target-80)/60,weights={low:1-high,central:0,high}
  const person={id,name:`${['Growth','Value','Quality','Risk','Momentum'][i%5]} investor ${i+1}`,strategy:['growth','value','quality','risk','momentum'][i%5],strategy_name:['Growth','Value','Quality','Risk','Momentum'][i%5],connections:[peer]}
  const decision={actor_id:id,recorded_at:at(30+i),evidence_ids:['sample'],target_allocation:.4,reservation_return:0,rationale:'This illustrative view uses a different adoption and valuation assumption.',strongest_risk:'The growth assumptions may not materialise.',message:i%2?'I want stronger adoption evidence before increasing conviction.':'The opportunity is interesting if the company meets these milestones.',one_year_weights:weights,
   one_year_view:{actor_id:id,basis:'saved_one_year_scenario_mix',policy_version:1,horizon_months:12,reference_price:100,currency:'USD',as_of:'2026-10-08',target_date:'2027-10-08',scenario_prices:{low:80,central:110,high:140},weights,target_price:target,return:target/100-1,evidence_ids:['sample']}}
  r.investors.push({...person,decision});r.roles.push({...person,layer:'investor',status:'complete',responded:true});r.investor_rounds[0][id]={...decision,recorded_at:at(15+i)};r.investor_rounds[1][id]=decision
 }
 return r
}
export function chartExample(tier='free'){
 const p=plans.find(x=>x.id===tier)||plans[0],researchers=researcherNames(p.researchers)
 const levels=[{id:'P',kind:'current_price',price:102},{id:'S',kind:'support',price:100},{id:'L',kind:'swing_low',price:96},{id:'R',kind:'resistance',price:110},{id:'H',kind:'swing_high',price:114}].map(l=>({...l,image_index:0,basis:'printed_label',evidence:'Illustrative chart level.'}))
 const plan=(id,side,entry,stop,target)=>({plan_id:id,scenario_id:id+'-case',strategy:id==='range'?'range_reversion':'support_resistance',side,entry,stop,targets:[target],reward_risk:[Math.abs(target-entry)/Math.abs(entry-stop)],entry_permission:false,plan_purpose:'future_conditional_reference',trigger:side==='long'?'Wait for support to hold and price to recover.':'Wait for resistance to reject price and confirm the reaction.',invalidation:side==='long'?'The example support fails.':'The example resistance is accepted as support.',rationale:'An illustrative conditional setup using the displayed structural levels.'})
 const positions=[plan('range','long',100,96,110),plan('rejection','short',110,114,102)]
 const scenarios=positions.map(x=>({id:x.scenario_id,plan_id:x.plan_id,strategy:x.strategy,side:x.side,status:'developing',plan_status:'complete_reference',rationale:x.rationale,evidence_ids:['S','R'],steps:[{event_type:'rejection_hold_inside',condition:x.trigger,level_ids:['S','R']}],invalidation:{condition:x.invalidation,level_ids:['S','R']}}))
 scenarios.push(...[{id:'breakout',strategy:'breakout_retest',side:'long'},{id:'sweep',strategy:'sweep_reclaim',side:'long'}].map(x=>({...x,plan_id:null,status:'developing',plan_status:'watch_only',missing_structure_types:['future_extreme'],missing_structure:['A new structural stop can only be evaluated after the future move.'],evidence_ids:['S','R'],steps:[{event_type:'reassess',condition:'Reassess after the required move and confirmation are visible.',level_ids:['S','R']}]})))
 const roster=researchers.map(x=>({...x,family:'Chart_Research',capability:'price',active:true,inactive_reason:null}))
 const opinions=roster.map((x,i)=>({...x,stance:i%2?'mixed':'bullish',thesis:i%2?'The example range is still intact. I would wait for a clear reaction.':'A confirmed support reaction could form a conditional long; a failure would change the scenario.',evidence_ids:['S','R'],recorded_at:at(i)}))
 const participants=Array.from({length:p.opinion_agents},(_,i)=>({id:`trader_${i}`,name:`${i%2?'Range':'Trend'} trader ${i+1}`,behavior:i%2?'reversion':'trend',family:i%2?'Mean_Reversion':'Trend_Following'}))
 const openings=participants.map((x,i)=>({...x,message_id:'openings:'+x.id,stance:i%2?'mixed':'bullish',thesis:i%2?'The example needs confirmation at the range boundary.':'I am watching the example support and the next confirmed move.',evidence_ids:['S','R'],recorded_at:at(20+i)}))
 const questions=participants.map((x,i)=>({...x,message_id:'questions:'+x.id,target_id:participants[(i+1)%participants.length].id,question:'What would make you change your view at this level?',evidence_ids:['S'],recorded_at:at(60+i)}))
 const replies=participants.map((x,i)=>({...x,message_id:'replies:'+x.id,responding_to_id:participants[(i+participants.length-1)%participants.length].id,in_reply_to:'questions:'+participants[(i+participants.length-1)%participants.length].id,response:'I would change my view if the boundary failed and the next candle confirmed that move.',thesis:openings[i].thesis,stance:openings[i].stance,evidence_ids:['S','R'],recorded_at:at(100+i)}))
 return {id:'example-chart-'+p.id,version:13,status:'complete',created_at:at(0),is_sample:true,asset:'DEMO',images:[{name:'Illustrative chart',width:800,height:460}],roster,opinions,participant_count:participants.length,
  execution_profile:{tier:p.id,researcher_count:p.researchers,opinion_count:p.opinion_agents,total_agents:p.total_agents},
  observation:{is_chart:true,is_sample:true,asset:'DEMO',summary:'Illustrative range chart.',price_scale_readable:true,chart_timeframes:['1h'],levels},
  trader_dialogue:{version:2,status:'complete',participants,participant_count:participants.length,cohorts:[{id:'trend',name:'Trend followers'},{id:'reversion',name:'Range traders'}],openings,questions,replies,cross_group_replies:[]},
  verdict:{bias:'mixed',headline:'An example range with conditional scenarios.',explanation:'The example requires a confirmed reaction before a setup can be reassessed.',plan_purpose:'future_conditional_reference',trade_readiness:{decision:'no_trade',summary:'Wait for confirmation.',conditions:[]},plans:positions,strategy_scenarios:scenarios,agreement:[],disagreements:[],discussion:[],wait_for:['A confirmed reaction at the relevant level.']}}
}
