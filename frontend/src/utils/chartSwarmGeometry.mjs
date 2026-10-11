const hash=value=>[...String(value)].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261)
export function chartDotPositions(people,previous={}){
 const nodes=[],occupied=people.map(p=>previous[p.id]).filter(Boolean)
 for(const person of [...people].sort((a,b)=>a.id.localeCompare(b.id))){let seed=hash(person.id)||1;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};let point=previous[person.id],best=-1
  if(!point)for(let i=0;i<180;i++){const p={x:25+random()*250,y:30+random()*290},distance=Math.min(...[...nodes,...occupied].map(n=>Math.hypot(p.x-n.x,p.y-n.y)),1000);if(distance>best){best=distance;point=p}}
  const n=hash(person.id);nodes.push({...person,...point,color:['#f47e35','#d4a64b','#5eadd1','#aa89d0','#71b7a4'][n%5],delay:-(n%43)/10,driftX:n%7-3,driftY:(n>>4)%7-3})
 }return nodes
}
export function chartRecordedEdges(nodes,events){const known=new Set(nodes.map(n=>n.id)),edges=[];for(const e of events)for(const target of e.recipients||[])if(known.has(e.author)&&known.has(target)&&target!==e.author)edges.push({id:e.id+':'+target,source:e.author,target,eventId:e.id,kind:'message',label:'Recorded exchange'});return edges}
