import {stockInvestorPriceView} from './stockResultsView.mjs'
const rows=value=>Array.isArray(value)?value:[]
const hash=value=>[...String(value)].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261)

export function swarmPanels(participants,roles=[]){
  const roleMap=new Map(rows(roles).map(r=>[r.id,r]))
  const actual=rows(participants?.traders).map(p=>roleMap.get(p.id)?.status==='running'?{...p,lifecycle:{state:'running'},status:'Updating this perspective'}:p)
  const investors=actual.length?actual:rows(roles).filter(r=>r.layer==='investor'&&r.id&&r.name).map(r=>({...r,label:r.name,strategy:r.area,planned:true,state:'pending',status:'Queued for the investor stage'}))
  const unique=[...new Map(investors.map(p=>[p.id,p])).values()].sort((a,b)=>a.id.localeCompare(b.id))
  return [
    {id:'investors-a',label:'Investors · 1',kind:'investors',planned:!actual.length,people:unique.filter((_,i)=>i%2===0)},
    {id:'investors-b',label:'Investors · 2',kind:'investors',planned:!actual.length,people:unique.filter((_,i)=>i%2===1)},
    {id:'research',label:'Research team',kind:'research',planned:false,people:rows(participants?.analysts)},
  ]
}

export function scatterSwarm(people,previous={},width=300,height=350){
  const nodes=[]
  const occupied=people.map(p=>previous[p.id]).filter(Boolean)
  for(const person of [...people].sort((a,b)=>a.id.localeCompare(b.id))){
    let state=hash(person.id)||1
    const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296}
    let point=previous[person.id],best=-1
    if(!point){
      for(let attempt=0;attempt<180;attempt++){
        const candidate={x:25+random()*(width-50),y:30+random()*(height-60)}
        const distance=Math.min(...[...nodes,...occupied].map(n=>Math.hypot(candidate.x-n.x,candidate.y-n.y)),1000)
        if(distance>best){best=distance;point=candidate}
      }
    }
    const seed=hash(person.id)
    nodes.push({...person,...point,color:['#f47e35','#d4a64b','#5eadd1','#aa89d0','#71b7a4'][seed%5],delay:-(seed%43)/10,driftX:(seed%7)-3,driftY:((seed>>4)%7)-3})
  }
  return nodes
}

export function swarmRelationships(nodes,events){
  const known=new Map(nodes.map(n=>[n.id,n])),edges=new Map()
  for(const event of rows(events))for(const recipient of rows(event.recipients)){
    const a=known.get(event.author),b=known.get(recipient)
    if(a&&b&&a.id!==b.id)edges.set(`message:${event.id}:${b.id}`,{id:`message:${event.id}:${b.id}`,source:a.id,target:b.id,kind:'message',eventId:event.id,label:'Recorded exchange'})
  }
  for(const node of nodes)for(const peer of rows(node.connections)){
    if(known.has(peer)&&peer!==node.id)edges.set(`peer:${node.id}:${peer}`,{id:`peer:${node.id}:${peer}`,source:node.id,target:peer,kind:'peer',label:'Assigned peer connection'})
  }
  for(const a of nodes.filter(n=>n.panel==='research'&&n.area))for(const b of nodes.filter(n=>n.panel==='research'&&n.area===a.area&&n.id>a.id&&n.side!==a.side)){
    edges.set(`topic:${a.id}:${b.id}`,{id:`topic:${a.id}:${b.id}`,source:a.id,target:b.id,kind:'topic',label:'Shared research topic · supporting and opposing cases'})
  }
  return [...edges.values()]
}

export function richSwarmEvents(run,events){
  const knownSources=new Set(rows(run.dossier?.sources).map(s=>s.id)),out=[]
  for(const event of rows(events)){
    const row=rows(run.research).find(r=>r.id===event.author)
    const round=event.kind==='private view'?'0':'1'
    const candidate=event.kind==='one-year price view'?run.one_year_investor_reviews?.[event.author]:run.investor_rounds?.[round]?.[event.author]||rows(run.investors).find(p=>p.id===event.author)?.decision
    const view=candidate?.actor_id===event.author?candidate:null
    out.push({...event,recipients:[...rows(event.recipients)],rationale:view?.rationale&&view.rationale!==event.text?view.rationale:'',evidenceIds:rows(view?.evidence_ids).filter(id=>knownSources.has(id)),oneYearView:view?stockInvestorPriceView(run,view):null})
    if(event.lens==='specialists'&&event.id.startsWith('research:')&&row?.result){
      const claim=rows(row.result.claims).find(c=>c.text&&c.text!==event.text&&rows(c.evidence_ids).some(id=>knownSources.has(id)))
      if(claim)out.push({...event,id:`detail:${event.id}`,recipients:[],kind:'saved research detail',text:claim.text,sourceEventId:event.id,evidenceIds:rows(claim.evidence_ids).filter(id=>knownSources.has(id))})
    }
  }
  return out
}

export function swarmPollInterval(status,view){return ['queued','running'].includes(status)&&['overview','discussion'].includes(view)?900:1800}
export const replayGap=speed=>650/([1,2,4,8].includes(speed)?speed:4)
