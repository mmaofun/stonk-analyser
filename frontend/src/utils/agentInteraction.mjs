import {playgroundLayout} from './playground.mjs'
const geometryCache=new Map()
export function stableAgentLayout(people,seed,width,minimumHeight=210){
 const ids=people.map(p=>p.id).sort(),key=JSON.stringify([seed,width,minimumHeight])
 let geometry=geometryCache.get(key)
 if(!geometry){let result=playgroundLayout(ids.map(id=>({id})),seed,width),scale=1;while(result.height<minimumHeight){scale*=minimumHeight/result.height;result=playgroundLayout(ids.map(id=>({id})),seed,width,scale)}geometry={width:result.width,height:result.height,nodes:result.nodes.map(({id,x,y})=>({id,x,y}))};geometryCache.set(key,geometry);if(geometryCache.size>32)geometryCache.delete(geometryCache.keys().next().value)}
 const known=new Set(geometry.nodes.map(p=>p.id))
 for(const id of ids.filter(id=>!known.has(id))){
  // Grow the canvas rather than moving participants already seen in this room.
  let state=[...String(seed)+id].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261)||1
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296}
  let best=null
  while(!best){let bestScore=-1
   for(let attempt=0;attempt<650;attempt++){const point={id,x:42+random()*(geometry.width-84),y:34+random()*(geometry.height-68)},score=Math.min(Math.max(Math.abs(point.x-geometry.width/2)/62,Math.abs(point.y-geometry.height/2)/48),...geometry.nodes.map(p=>Math.max(Math.abs(point.x-p.x)/72,Math.abs(point.y-p.y)/54)));if(score>=1&&score>bestScore){best=point;bestScore=score}}
   if(!best)geometry.height=Math.ceil(geometry.height*1.2)
  }
  geometry.nodes.push(best)
 }
 const current=new Map(people.map(p=>[p.id,p])),points=new Map(geometry.nodes.map(p=>[p.id,p]));return {width:geometry.width,height:geometry.height,nodes:ids.map(id=>({...current.get(id),...points.get(id)}))}
}
export function relationTone(event){if(event?.message?.disagreement===true||event?.message?.relation==='disagreement')return 'disagreement';return /reply|response/.test(event?.kind||'')?'reply':event?.kind==='question'?'question':'evidence'}
export function newRecordedEvents(previous,next){const known=new Set(previous.map(e=>e.id));return next.filter(e=>!known.has(e.id))}
export function followRecordedArrival(current,incoming,following){return {visible:[...current,...incoming.filter(e=>!current.some(old=>old.id===e.id))],spotlight:following?incoming.at(-1)||null:null,unread:following?0:incoming.length}}
export function messageSpotlight(event){return event?{eventIds:[event.id],people:[event.author,...event.recipients],sender:event.author,recipient:event.recipients[0]||''}:{eventIds:[],people:[],sender:'',recipient:''}}

export function participantOrdinal(person){return (person?.label||person?.name||'').match(/\d+\s*$/)?.[0]?.trim()||person?.id?.match(/\d+$/)?.[0]||''}

export function revealParticipantScroll(scrollTop,viewportHeight,nodeY,scale,maxScroll){const top=Math.max(0,(nodeY-27)*scale),bottom=(nodeY+57)*scale;if(top<scrollTop)return Math.max(0,Math.min(maxScroll,top));if(bottom>scrollTop+viewportHeight)return Math.max(0,Math.min(maxScroll,bottom-viewportHeight));return scrollTop}
