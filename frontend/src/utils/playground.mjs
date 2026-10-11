const hash=text=>[...String(text)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261)
export function playgroundLayout(people,seed='playground',canvasWidth=900,spaceScale=1){
 const width=Math.max(260,canvasWidth),height=Math.ceil(Math.max(210,Math.ceil(people.length*5100/Math.max(180,width-84))+68)*spaceScale),padding={x:42,y:34},points=[]
 let state=hash(seed)||1
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296}
 for(const person of [...people].sort((a,b)=>a.id.localeCompare(b.id))){let best=null,bestScore=-1
 for(let attempt=0;attempt<650;attempt++){const p={x:padding.x+random()*(width-2*padding.x),y:padding.y+random()*(height-2*padding.y)};const hub=Math.max(Math.abs(p.x-width/2)/62,Math.abs(p.y-height/2)/48);const score=Math.min(hub,...points.map(q=>Math.max(Math.abs(p.x-q.x)/72,Math.abs(p.y-q.y)/54)));if(score>bestScore){best=p;bestScore=score}}
 points.push({...person,...best})}
 if(points.some((p,i)=>points.slice(i+1).some(q=>Math.abs(p.x-q.x)<72&&Math.abs(p.y-q.y)<54)))return playgroundLayout(people,seed,canvasWidth,spaceScale*1.2)
 return {width,height,nodes:points}
}
export function playgroundConnections(events,people,{evidence=false}={}){
 const known=new Set(people.map(p=>p.id)),edges=new Map()
 for(const event of events)if(known.has(event.author))for(const recipient of event.recipients||[])if(known.has(recipient)&&recipient!==event.author){const id=event.author+'→'+recipient+':'+event.kind;edges.set(id,{id,source:event.author,target:recipient,kind:event.kind,eventId:event.id,recorded:true})}
 if(evidence)for(const p of people)edges.set('evidence:'+p.id,{id:'evidence:'+p.id,source:'evidence-hub',target:p.id,kind:'evidence',recorded:false})
 return [...edges.values()]
}
export function playgroundPath(a,b){const dx=b.x-a.x,dy=b.y-a.y,bend=Math.min(58,Math.hypot(dx,dy)*.17);return `M ${a.x} ${a.y} Q ${(a.x+b.x)/2-dy/Math.max(1,Math.hypot(dx,dy))*bend} ${(a.y+b.y)/2+dx/Math.max(1,Math.hypot(dx,dy))*bend} ${b.x} ${b.y}`}
export function playbackEvents(events){return events.map(event=>({...event,recipients:[...(event.recipients||[])],replay:true}))}
export function participantMessages(events,id='',limit=45){return events.filter(e=>!id||e.author===id||e.recipients?.includes(id)).slice(-limit)}
export function participantShortLabel(person,lens='specialists'){
 const label=person.label||person.name||person.id
 if(lens==='traders'){
  const ordinal=label.match(/\d+\s*$/)?.[0]?.trim()||person.id?.match(/\d+$/)?.[0]
  const base=({market_maker:'Market maker',trend:'Trend',reversion:'Reversion',breakout:'Breakout',liquidity:'Level',noise:'Discretion',execution:'Execution',leveraged:'Leveraged',value:'Value',quality:'Quality',growth:'Growth',income:'Income',event:'Events',macro:'Macro',momentum:'Momentum'}[person.behavior||person.strategy]||person.strategy_name||label.replace(/\d+\s*$/,'').replace(/ (investors?|traders?)\s*$/i,'')).trim()
  return ordinal?`${base.length>12?base.slice(0,10)+'…':base} ${ordinal}`:base.length>14?base.slice(0,12)+'…':base
 }
 const side=person.side||(/(?:_| · )(against|for)$/.exec(person.id||label)?.[1])
 const base=label.replace(/^ICT /,'').replace(/\s*·\s*(for|against)$/i,'').replace(/ (trader|analyst|researcher|specialist)$/i,'')
 if(['for','against'].includes(side))return `${base.length>12?base.slice(0,10)+'…':base} ${side==='for'?'+':'−'}`
 return base.length>14?base.slice(0,12)+'…':base
}
