export const plans = Object.freeze([
  {id:'free',name:'Free',price_usd:0,daily_analyses:1,total_agents:5,researchers:3,opinion_agents:2,description:'A daily starting point for your research.'},
  {id:'pro',name:'Pro',price_usd:20,daily_analyses:5,total_agents:20,researchers:5,opinion_agents:15,description:'More perspectives for regular research.'},
  {id:'max',name:'Max',price_usd:50,daily_analyses:15,total_agents:50,researchers:10,opinion_agents:40,description:'The broadest team across both labs.'},
])
export const validPlan = value => plans.some(plan=>plan.id===value)
export function resetTime(value){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date):''}
export function progressDelay(status,hidden=false){return hidden?15000:status==='queued'?3000:1200}
