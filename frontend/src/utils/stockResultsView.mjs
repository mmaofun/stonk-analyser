import {stockForecast} from './stockForecast.mjs'

const rows=value=>Array.isArray(value)?value:[]
export const stockWorkflowPhase=(run,requested='results')=>!run?'ticker':['queued','running','preparing','stopping'].includes(run.status)||requested==='analysis'||!run.verdict?'analysis':'results'
const number=value=>typeof value==='number'&&Number.isFinite(value)
export function stockProjection(run){
  const forecast=stockForecast(run)
  if(!forecast.available)return {...forecast,points:[]}
  const byTime=new Map(rows(run?.dossier?.bars).filter(p=>number(p.close)&&p.close>0&&number(p.timestamp)).map(p=>[p.timestamp,p]))
  const points=[...byTime.values()].sort((a,b)=>a.timestamp-b.timestamp)
  return {...forecast,points}
}

const ratingIndex=change=>change>=.10-1e-10?0:change>=.02-1e-10?1:change<=-.10+1e-10?4:change<=-.02+1e-10?3:2
const same=(a,b)=>number(a)&&number(b)&&Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-9+1e-6
const cited=(value,known)=>Array.isArray(value)&&value.length>0&&value.every(id=>known.has(id))
const latestView=(run,person)=>{
  const response=run?.investor_rounds?.['1']?.[person.id],privateView=run?.investor_rounds?.['0']?.[person.id]
  const direct=response?.actor_id===person.id?response:person.decision?.actor_id===person.id?person.decision:privateView?.actor_id===person.id?privateView:null
  // A later ordinary analysis owns its fresh targets. Supplemental reviews fill
  // the older trading-only reports without masking regenerated current views.
  const review=run?.one_year_investor_reviews?.[person.id]
  const current=[direct,review].filter(d=>d?.actor_id===person.id&&stockInvestorPriceView(run,d))
  if(current.length)return current.sort((a,b)=>(Date.parse(b.recorded_at||b.one_year_view?.recorded_at)||0)-(Date.parse(a.recorded_at||a.one_year_view?.recorded_at)||0)||b.one_year_view.policy_version-a.one_year_view.policy_version)[0]
  if(review)return review.actor_id===person.id?review:null
  return direct
}
function investorPriceView(decision,forecast,known,annualEPS){
  const view=decision?.one_year_view,keys=['low','central','high']
  if(!view||view.horizon_months!==12||view.actor_id!==decision.actor_id)return null
  if(!same(view.reference_price,forecast.reference)||view.currency!==forecast.currency||view.as_of!==forecast.asOf||view.target_date!==forecast.target)return null
  if(!cited(view.evidence_ids,known)||!cited(decision.evidence_ids,known))return null
  if(view.basis==='independent_annual_eps_pe'&&view.policy_version===2){
    const a=decision.one_year_assumption,b=view.assumption,labels=['Strong buy','Buy','Hold','Sell','Strong sell'],recommendation=decision.outlook_rating
    if(!number(annualEPS)||annualEPS<=0||!same(view.annual_eps,annualEPS)||!a||!b||!cited(a.evidence_ids,known)||!cited(b.evidence_ids,known))return null
    if(!number(a.eps_growth)||a.eps_growth<-.9||a.eps_growth>2||!number(a.exit_pe)||a.exit_pe<1||a.exit_pe>Math.max(150,forecast.reference/annualEPS*2)||!same(a.eps_growth,b.eps_growth)||!same(a.exit_pe,b.exit_pe))return null
    const eps=annualEPS*(1+a.eps_growth),target=eps*a.exit_pe,change=target/forecast.reference-1
    const valid=recommendation==='Hold'||['Strong buy','Buy'].includes(recommendation)&&change>1e-10||['Sell','Strong sell'].includes(recommendation)&&change<-1e-10
    if(!labels.includes(recommendation)||!valid||!same(view.future_eps,eps)||!same(view.target_price,target)||!same(view.return,change))return null
    return {id:decision.actor_id,targetPrice:target,priceReturn:change,recommendation,policy:2}
  }
  if(view.basis!=='saved_one_year_scenario_mix'||view.policy_version!==1)return null
  const prices=Object.fromEntries(forecast.cases.map(c=>[c.key,c.price])),weights=view.weights
  if(keys.some(k=>!same(view.scenario_prices?.[k],prices[k])||!number(weights?.[k])||weights[k]<0||weights[k]>1||!same(decision.one_year_weights?.[k],weights[k])))return null
  if(Math.abs(keys.reduce((sum,k)=>sum+weights[k],0)-1)>1e-8)return null
  const target=keys.reduce((sum,k)=>sum+weights[k]*prices[k],0)
  if(!same(view.target_price,target)||!same(view.return,target/forecast.reference-1)||target<=0)return null
  return {id:decision.actor_id,targetPrice:target,priceReturn:target/forecast.reference-1}
}
export function stockInvestorPriceView(run,decision){
  const forecast=stockForecast(run)
  if(!forecast.available||!same(forecast.reference,run?.dossier?.price?.value))return null
  const view=investorPriceView(decision,forecast,new Set(rows(run?.dossier?.sources).map(s=>s.id)),run?.one_year?.valuation_annual_eps)
  return view?{...view,currency:forecast.currency,targetDate:forecast.target}:null
}
// One-year targets and exchange order limits are distinct. Older reports retain
// their original investor decisions and use only their actual saved annual cases.
export function stockAgentRating(run){
  const labels=['Strong buy','Buy','Hold','Sell','Strong sell'],counts=[0,0,0,0,0],seen=new Set(),votes=[]
  const forecast=stockForecast(run),known=new Set(rows(run?.dossier?.sources).map(s=>s.id))
  const decisions=[]
  for(const person of rows(run?.investors)){
    if(!person?.id||seen.has(person.id))continue
    seen.add(person.id)
    const decision=latestView(run,person)
    if(decision)decisions.push(decision)
  }
  const mode=Object.keys(run?.one_year_investor_reviews||{}).length||decisions.some(d=>d.one_year_view||d.one_year_weights)?'investors':'annual_research'
  if(forecast.available&&same(forecast.reference,run?.dossier?.price?.value)){
    if(mode==='investors'){
      for(const decision of decisions){const vote=investorPriceView(decision,forecast,known,run?.one_year?.valuation_annual_eps);if(vote)votes.push(vote)}
    }else{
      for(const side of ['for','against']){
        const value=run?.one_year?.cases?.[side]?.central
        if(!number(value?.target_price)||value.target_price<=0||!same(value.return,value.target_price/forecast.reference-1)||!cited(value.evidence_ids,known))continue
        votes.push({id:'annual_'+side,targetPrice:value.target_price,priceReturn:value.return})
      }
    }
  }
  for(const vote of votes){vote.index=vote.recommendation?labels.indexOf(vote.recommendation):ratingIndex(vote.priceReturn);counts[vote.index]++}
  const total=votes.length,meanReturn=total?votes.reduce((sum,v)=>sum+v.priceReturn,0)/total:null
  const score=total?counts.reduce((sum,v,i)=>sum+v*(2-i),0)/(total*2):0
  const independentRecommendations=votes.some(v=>v.policy===2)
  const selected=independentRecommendations?(score>.75?0:score>.25?1:score<-.75?4:score<-.25?3:2):total?ratingIndex(meanReturn):2
  const central=forecast.available?forecast.cases.find(c=>c.key==='central')?.return:null
  const differsFromProjection=total&&number(central)&&Math.sign(meanReturn)!==Math.sign(central)&&Math.abs(meanReturn)>=.02&&Math.abs(central)>=.02
  return {total,label:total?labels[selected]:'Views are forming',categoryIndex:selected,score,counts,labels,votes,mode,meanReturn,independentRecommendations,
    meanTarget:total?forecast.reference*(1+meanReturn):null,differsFromProjection,
    teamSize:seen.size,subtitle:seen.size?`${seen.size} investors · ${total} ${mode==='investors'?'one-year views':'saved annual views'}`:`${total} saved one-year research views`}
}
export function stockReasoning(run){
  const year=run?.one_year||{},sources=rows(run?.dossier?.sources),known=new Set(sources.map(s=>s.id))
  const supporting=rows(run?.verdict?.supporting).filter(claim=>claim?.text&&rows(claim.evidence_ids).some(id=>known.has(id)))
  const opportunities=rows(year.business_driver_snapshot||run?.decision_framework?.opportunities).filter(o=>o?.name&&o.status!=='unavailable')
  return {growth:year.high?.transmission_reason||year.arguments?.for?.thesis||run?.annual_arguments?.for?.thesis||'',supporting,opportunities}
}
export function projectionGeometry(forecast){
  if(!forecast?.available)return null
  const prices=[forecast.reference,...forecast.points.map(p=>p.close),...forecast.cases.map(c=>c.price)]
  const lo=Math.min(...prices),hi=Math.max(...prices),pad=Math.max((hi-lo)*.12,hi*.03),bottom=lo-pad,top=hi+pad
  const y=value=>270-(value-bottom)/(top-bottom)*220
  const history=forecast.points.map((p,i)=>({x:25+i*420/Math.max(1,forecast.points.length-1),y:y(p.close),...p}))
  const endpoints=forecast.cases.map(c=>({...c,x:720,y:y(c.price)}))
  return {history,endpoints,reference:{x:445,y:y(forecast.reference)},ticks:Array.from({length:5},(_,i)=>{const value=top-(top-bottom)*i/4;return {value,y:y(value)}})}
}
