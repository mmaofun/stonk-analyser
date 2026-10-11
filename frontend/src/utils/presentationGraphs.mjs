// Reposition saved identities for the workspace without altering their messages or connections.
export function spreadNodes(nodes,overrides={},width=920,height=430) {
  return nodes.map((node,i)=>{
    const angle=i*2.399963229728653,r=Math.sqrt((i+.5)/Math.max(nodes.length,1))
    const saved=overrides[node.id]
    const x=Number.isFinite(saved?.x)?saved.x:width/2+Math.cos(angle)*(width/2-70)*r
    const y=Number.isFinite(saved?.y)?saved.y:height/2+Math.sin(angle)*(height/2-40)*r
    return {...node,x:Math.max(22,Math.min(width-22,x)),y:Math.max(22,Math.min(height-22,y)),displayNumber:i+1}
  })
}

export function stockResearchNodes(run) {
  if(run.execution_profile)return (run.research||[]).map(row=>({...row,status:row.result?'complete':'pending'}))
  const findings=new Map((run.research||[]).map(row=>[row.id,row]))
  return (run.roles||[]).filter(role=>['company','strategy','followup'].includes(role.layer)).map(role=>{
    const row=findings.get(role.id),side=row?.side||(role.id.endsWith('_against')?'against':'for')
    return {...role,side,area:row?.area||role.id.replace(/^(company|strategy|followup)_/,'').replace(/_(for|against)$/,''),result:row?.result||null}
  })
}

export function investorExchange(person,rounds={},people=[]) {
  if(!person)return {privateView:null,peers:[],response:null}
  const viewAt=(round,id)=>{const value=rounds[round]?.[id];return value?.actor_id===id?value:null}
  const privateView=viewAt('0',person.id),response=viewAt('1',person.id)
  const peers=(person.connections||[]).map(id=>{
    const peer=people.find(p=>p.id===id),view=viewAt('0',id)
    return peer&&view?{id,name:peer.name,view}:null
  }).filter(Boolean)
  return {privateView,peers,response}
}
