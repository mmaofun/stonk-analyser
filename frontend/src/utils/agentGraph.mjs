export function lifecycleLabel(record,fallback='Lifecycle not recorded') {
  if(!record)return fallback
  if(record.state==='output_saved')return record.reused_output?'Saved output reused · no new request':'Output saved'
  return {pending:'Request pending',running:'Shared model request in progress',failed:'Request failed',unknown:'Lifecycle unknown'}[record.state]||'Lifecycle unknown'
}

export function discussionGraph(run, {showData=false}={}) {
  const active=(run.roster||[]).filter(role=>role.active)
  const nodes=active.map(role=>{
    const opening=run.opinions?.find(item=>item.id===role.id)
    const reply=run.replies?.find(item=>item.id===role.id)
    return {id:role.id,label:role.name,type:'analyst',family:role.family,stance:reply?.stance||opening?.stance||'pending',
      status:lifecycleLabel(run.agent_lifecycle?.[role.id],reply?'Reply recorded':opening?'Opening recorded':'Lifecycle not recorded'),lifecycle:run.agent_lifecycle?.[role.id]||null,role,opening,reply}
  })
  const known=new Set(nodes.map(node=>node.id))
  const edges=[]
  for(const message of run.challenges||[]) {
    if(known.has(message.id)&&known.has(message.target_id)&&message.id!==message.target_id)
      edges.push({id:'question:'+message.id,source:message.id,target:message.target_id,kind:'question',label:'Question',message})
  }
  for(const message of run.replies||[]) {
    const question=run.challenges?.find(item=>item.id===message.responding_to_id&&item.target_id===message.id)
    if(question&&known.has(message.id)&&known.has(message.responding_to_id))
      edges.push({id:'reply:'+message.id,source:message.id,target:message.responding_to_id,kind:'reply',label:'Reply',message})
  }
  nodes.push({id:'chart-input',label:run.observation?'Chart evidence':'Chart reader',type:'input',
    status:lifecycleLabel(run.agent_lifecycle?.['chart-input'],run.observation?'Image observations saved':'Lifecycle not recorded'),lifecycle:run.agent_lifecycle?.['chart-input']||null,
    description:run.observation?.summary||'The uploaded chart is read before specialist discussion starts.'})
  nodes.push({id:'moderator',label:'Moderator',type:'moderator',status:lifecycleLabel(run.agent_lifecycle?.moderator,run.verdict?'Assessment saved':'Lifecycle not recorded'),lifecycle:run.agent_lifecycle?.moderator||null,
    stance:run.verdict?.bias||'pending',description:run.verdict?.explanation})
  if(run.population?.status==='complete')nodes.push({id:'participant-model',label:'Virtual market',type:'simulation',
    status:`${run.population.participant_count} virtual traders`,description:'Opening views partly condition this assumed market. Its outcomes feed the challenges, replies and moderator as a sensitivity test, not independent confirmation.'})
  if(showData) {
    for(const node of nodes.filter(node=>node.type==='analyst'&&node.opening))
      edges.push({id:'input:'+node.id,source:'chart-input',target:node.id,kind:'data',label:'Chart observations'})
    if(run.verdict||run.agent_lifecycle?.moderator?.state==='running')for(const reply of run.replies||[])if(known.has(reply.id))
      edges.push({id:'synthesis:'+reply.id,source:reply.id,target:'moderator',kind:'data',label:'Saved reply used in synthesis'})
    if(run.population?.status==='complete') {
      for(const opening of run.opinions||[])if(known.has(opening.id)&&['bullish','bearish','mixed'].includes(opening.stance))
        edges.push({id:'prior:'+opening.id,source:opening.id,target:'participant-model',kind:'data',label:'Opening used in family-capped model prior'})
      for(const challenge of run.challenges||[])if(known.has(challenge.id))
        edges.push({id:'model-input:'+challenge.id,source:'participant-model',target:challenge.id,kind:'data',label:'Assumed scenario results supplied for challenge'})
      if(run.verdict)edges.push({id:'model-synthesis',source:'participant-model',target:'moderator',kind:'data',label:'Assumed scenario results supplied to moderator'})
    }
  }
  return {nodes,edges}
}

export function marketGraph(population, caseId='1', expand=true, {mode='counterparties',matches=null}={}) {
  if(population?.status!=='complete')return {nodes:[],edges:[]}
  const scenario=population.scenarios.find(item=>item.id===caseId)||population.scenarios[0]
  const nodes=[{id:'exchange',label:'Virtual exchange',type:'exchange',description:'Matches simulated orders with available depth.'},
    {id:'external_liquidity_provider',label:'Liquidity provider',type:'provider',description:'A separate modeled account supplies the remaining depth and takes the other side of fills.'}]
  const edges=[]
  const activity=new Map((scenario.actor_activity||[]).map(item=>[item.id,item]))
  nodes.find(node=>node.type==='provider').flow=activity.get('external_liquidity_provider')
  for(const group of population.cohorts) {
    const groupId='cohort:'+group.id
    nodes.push({id:groupId,label:group.name,type:'cohort',count:group.count,group,description:group.behavior})
    if(!expand) {
      const flow=scenario.cohort_activity[group.family]||{}
      const gross=(flow.bought||0)+(flow.sold||0)
      if(gross>0)edges.push({id:'cohort-flow:'+group.id,source:groupId,target:'exchange',kind:'flow',label:'Simulated filled volume',volume:gross,flow})
    }
  }
  if(expand)for(const trader of population.participants) {
    const flow=activity.get(trader.id)
    nodes.push({id:trader.id,label:trader.name,type:'trader',groupId:'cohort:'+trader.behavior,trader,flow})
    if(mode==='orders')edges.push({id:'membership:'+trader.id,source:trader.id,target:'cohort:'+trader.behavior,kind:'membership',label:'Behavior group'})
    if(mode==='orders'&&flow&&(flow.order_submissions>0||flow.quote_updates>0))
      edges.push({id:'order:'+trader.id,source:trader.id,target:'exchange',kind:'order',label:'Orders / quote updates',flow})
    if(mode==='orders'&&flow&&(flow.bought>0||flow.sold>0))
      edges.push({id:'fill:'+trader.id,source:'exchange',target:trader.id,kind:'fill',label:'Simulated fills',volume:flow.bought+flow.sold,flow})
  }
  const provider=activity.get('external_liquidity_provider')
  if((!expand||mode==='orders')&&provider&&(provider.bought>0||provider.sold>0))
    edges.push({id:'provider-flow',source:'external_liquidity_provider',target:'exchange',kind:'flow',label:'Provider fills',volume:provider.bought+provider.sold,flow:provider})
  if(expand&&mode==='counterparties'&&matches?.status==='complete'&&matches.case_id===scenario.id) {
    const known=new Set(nodes.filter(node=>['trader','provider'].includes(node.type)).map(node=>node.id))
    for(const match of matches.matches||[])if(known.has(match.buyer_id)&&known.has(match.seller_id)&&match.buyer_id!==match.seller_id&&match.units>0)
      edges.push({id:`match:${match.buyer_id}:${match.seller_id}`,source:match.buyer_id,target:match.seller_id,
        kind:'match',label:'Matched buy',volume:match.units,match})
  }
  return {nodes,edges,scenario}
}

export function traderConversationGraph(dialogue,{round='cross_group'}={}) {
  if(!dialogue)return {nodes:[],edges:[]}
  const actors=new Map((dialogue.agents||[]).map(actor=>[actor.id,actor]))
  const openings=new Map((dialogue.openings||[]).map(item=>[item.id,item]))
  const nodes=(dialogue.cohorts||[]).map(group=>({id:'cohort:'+group.id,label:group.name,type:'cohort',count:group.count,group,description:group.behavior}))
  for(const trader of dialogue.participants||[]) {
    const memory=actors.get(trader.id)
    nodes.push({id:trader.id,label:trader.name,type:'trader',trader,groupId:'cohort:'+trader.behavior,
      dialogueAgent:memory,stance:memory?.latest_view?.stance||'pending',
      status:({waiting:'Awaiting view',view_saved:'Opening recorded',question_sent:'Question sent',replied:'Reply recorded',cross_replied:'Cross-group reply recorded'}[memory?.status]||'Awaiting view')})
  }
  const known=new Set((dialogue.participants||[]).map(actor=>actor.id)),edges=[]
  if(round==='cross_group'&&dialogue.shared_views?.length) {
    const shared=new Map(dialogue.shared_views.filter(item=>dialogue.replies?.some(reply=>reply.id===item.id&&reply.message_id===item.source_message_id&&reply.thesis===item.thesis)).map(item=>[item.id,item]))
    for(const [reader,authors] of Object.entries(dialogue.peer_network||{}))for(const author of authors) {
      const message=shared.get(author)
      if(known.has(reader)&&known.has(author)&&reader!==author&&message)
        edges.push({id:`shared:${author}:to:${reader}`,source:author,target:reader,kind:'shared_view',label:'Shared view',message})
    }
    for(const message of dialogue.cross_group_replies||[])for(const peer of message.peer_ids||[]) {
      if(known.has(message.id)&&known.has(peer)&&peer!==message.id&&dialogue.peer_network?.[message.id]?.includes(peer)&&message.read_message_ids?.includes(shared.get(peer)?.message_id))
        edges.push({id:`${message.message_id}:to:${peer}`,source:message.id,target:peer,kind:'reply',label:'Cross-group response',message})
    }
    nodes.push({id:'chart-input',label:'Shared chart',type:'input',description:`Traders compare actual saved views from ${dialogue.peer_count||3} other trading styles before deciding. Shared views retain their original message provenance.`})
    return {nodes,edges}
  }
  for(const message of dialogue.questions||[])if(known.has(message.id)&&known.has(message.target_id)&&message.id!==message.target_id)
    edges.push({id:message.message_id,source:message.id,target:message.target_id,kind:'question',label:'Trader question',
      message:{...message,target_thesis:openings.get(message.target_id)?.thesis}})
  for(const message of dialogue.replies||[]) {
    const question=dialogue.questions?.find(item=>item.message_id===message.in_reply_to&&item.target_id===message.id&&item.id===message.responding_to_id)
    if(question&&known.has(message.id)&&known.has(message.responding_to_id))edges.push({id:message.message_id,source:message.id,target:message.responding_to_id,kind:'reply',label:'Trader reply',message})
  }
  nodes.push({id:'chart-input',label:'Shared chart',type:'input',description:'All trader identities receive the same extracted chart evidence plus their own profile and addressed message history.'})
  return {nodes,edges}
}

// Identity-based ordering scatters styles together and stays stable during replay.
export function scatteredTraders(traders) {
  const hash=id=>{let value=2166136261;for(const c of id)value=Math.imul(value^c.charCodeAt(0),16777619);return value>>>0}
  const ordered=[...traders].sort((a,b)=>hash(a.id)-hash(b.id)||a.id.localeCompare(b.id))
  return new Map(ordered.map((node,index)=>{
    const angle=index*2.399963229728653-.6,r=Math.sqrt((index+2)/(ordered.length+2))
    return [node.id,{x:460+385*r*Math.cos(angle),y:305+235*r*Math.sin(angle)}]
  }))
}

export function clampNodePosition(point) {
  return {x:Math.max(45,Math.min(875,point.x)),y:Math.max(45,Math.min(590,point.y))}
}

export function layoutGraph(graph, view, {individual=false,positions:overrides={}}={}) {
  if(individual)graph={...graph,nodes:graph.nodes.filter(node=>node.type!=='cohort'),edges:graph.edges.filter(edge=>edge.kind!=='membership')}
  const positions=new Map()
  if(view==='discussion') {
    const analysts=graph.nodes.filter(node=>node.type==='analyst')
    analysts.forEach((node,index)=>{
      const angle=-Math.PI/2+index*2*Math.PI/Math.max(analysts.length,1)
      positions.set(node.id,{x:370+265*Math.cos(angle),y:310+230*Math.sin(angle)})
    })
    positions.set('chart-input',{x:340,y:245})
    positions.set('participant-model',{x:415,y:375})
    positions.set('moderator',{x:815,y:310})
  } else if(individual) {
    for(const [id,point] of scatteredTraders(graph.nodes.filter(node=>node.type==='trader')))positions.set(id,point)
    positions.set('chart-input',{x:460,y:305})
    positions.set('exchange',{x:460,y:305})
    positions.set('external_liquidity_provider',{x:460,y:615})
  } else {
    positions.set('exchange',{x:460,y:310})
    positions.set('chart-input',{x:460,y:310})
    positions.set('external_liquidity_provider',{x:460,y:595})
    const groups=graph.nodes.filter(node=>node.type==='cohort')
    groups.forEach((group,index)=>{
      const angle=-Math.PI/2+index*2*Math.PI/Math.max(groups.length,1)
      const center={x:460+315*Math.cos(angle),y:310+200*Math.sin(angle)}
      positions.set(group.id,center)
      const members=graph.nodes.filter(node=>node.groupId===group.id)
      members.forEach((node,i)=>{
        const angle=i*2.399963229728653
        const radius=29+45*Math.sqrt((i+.5)/Math.max(1,members.length))
        positions.set(node.id,{x:center.x+radius*Math.cos(angle),y:center.y+radius*Math.sin(angle)})
      })
    })
  }
  for(const node of graph.nodes)if(Number.isFinite(overrides[node.id]?.x)&&Number.isFinite(overrides[node.id]?.y))positions.set(node.id,clampNodePosition(overrides[node.id]))
  let traderNumber=0
  const drawRadius=graph.nodes.filter(node=>node.type==='trader').length<=60?18:6
  const nodes=graph.nodes.map(node=>({...node,...positions.get(node.id),...(node.type==='trader'?{number:++traderNumber,drawRadius}:{})}))
  return routeGraphEdges({...graph,nodes})
}

export function routeGraphEdges(graph) {
  const nodes=graph.nodes,positions=new Map(nodes.map(node=>[node.id,node]))
  const traderRadius=nodes.filter(node=>node.type==='trader').length<=60?18:6
  const groups=new Map()
  for(const edge of graph.edges) {
    const key=[edge.source,edge.target].sort().join('|')
    if(!groups.has(key))groups.set(key,[])
    groups.get(key).push(edge.id)
  }
  const edges=graph.edges.map(edge=>{
    const a=positions.get(edge.source),b=positions.get(edge.target)
    if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return null
    const pair=[edge.source,edge.target].sort(),group=groups.get(pair.join('|'))
    const first=positions.get(pair[0]),second=positions.get(pair[1])
    const dx=second.x-first.x,dy=second.y-first.y,length=Math.max(Math.hypot(dx,dy),1)
    const offset=(group.indexOf(edge.id)-(group.length-1)/2)*22
    const control={x:(a.x+b.x)/2-dy/length*offset,y:(a.y+b.y)/2+dx/length*offset}
    const radius=id=>positions.get(id)?.type==='trader'?(positions.get(id).drawRadius||traderRadius):20
    const trim=(from,to,distance)=>{const dx=to.x-from.x,dy=to.y-from.y,d=Math.max(Math.hypot(dx,dy),1);return {x:from.x+dx/d*distance,y:from.y+dy/d*distance}}
    const start=trim(a,control,radius(edge.source)),end=trim(b,control,radius(edge.target)+4)
    return {...edge,path:`M${start.x},${start.y} Q${control.x},${control.y} ${end.x},${end.y}`}
  }).filter(Boolean)
  return {nodes,edges,scenario:graph.scenario}
}
