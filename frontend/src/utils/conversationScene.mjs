import {discussionGraph,traderConversationGraph,layoutGraph,routeGraphEdges} from './agentGraph.mjs'

const rows=value=>Array.isArray(value)?value:[]
const time=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0

// Reuse the network's recipient/provenance validation instead of inventing chat edges.
export function conversationEvents(run,lens='specialists') {
  const trader=lens==='traders',data=trader?run.trader_dialogue||{}:run
  const known=new Set(trader?rows(data.participants).map(p=>p.id):rows(run.roster).filter(p=>p.active).map(p=>p.id))
  const paired=trader?traderConversationGraph(data,{round:'paired'}):discussionGraph(run)
  const cross=trader?traderConversationGraph(data,{round:'cross_group'}):{edges:[]}
  const phases=trader?['openings','questions','replies','cross_group_replies']:['opinions','challenges','replies']
  const result=[]
  for(const [phaseIndex,phase] of phases.entries()) {
    for(const message of rows(data[phase])) {
      if(!known.has(message.id))continue
      const kind=phase==='opinions'||phase==='openings'?'opening':phase==='questions'||phase==='challenges'?'question':phase==='cross_group_replies'?'cross_reply':'reply'
      const edges=(kind==='cross_reply'?cross:paired).edges.filter(edge=>edge.source===message.id&&(edge.message===message||message.message_id&&edge.message.message_id===message.message_id)&&
        (kind==='question'?edge.kind==='question':kind==='reply'?edge.kind==='reply':kind==='cross_reply'?edge.kind==='reply'&&edge.message.message_id===message.message_id:false))
      if(kind!=='opening'&&!edges.length)continue
      const text=kind==='opening'?message.thesis:kind==='question'?message.question:message.response
      if(!text?.trim())continue
      result.push({id:`${lens}:${phase}:${message.message_id||message.id}`,phase,phaseIndex,kind,author:message.id,
        recipients:[...new Set(edges.map(edge=>edge.target))],edgeIds:edges.map(edge=>edge.id),
        text,message,at:time(message.recorded_at)})
    }
  }
  return result.sort((a,b)=>a.phaseIndex-b.phaseIndex||a.at-b.at||a.id.localeCompare(b.id))
}

export function projectConversation(run,lens,events,count) {
  const shown=events.slice(0,Math.max(0,count)),seen=new Set(shown.flatMap(event=>[event.author,...event.recipients]))
  if(lens==='specialists') {
    return {...run,roster:rows(run.roster).filter(role=>role.active&&seen.has(role.id)),
      opinions:shown.filter(e=>e.phase==='opinions').map(e=>e.message),
      challenges:shown.filter(e=>e.phase==='challenges').map(e=>e.message),
      replies:shown.filter(e=>e.phase==='replies').map(e=>e.message),
      verdict:count>=events.length?run.verdict:null,population:null}
  }
  const source=run.trader_dialogue||{},pick=phase=>shown.filter(e=>e.phase===phase).map(e=>e.message)
  const openings=pick('openings'),questions=pick('questions'),replies=pick('replies'),cross_group_replies=pick('cross_group_replies')
  const participants=rows(source.participants).filter(person=>seen.has(person.id))
  const agents=participants.map(person=>{
    const cross=cross_group_replies.find(row=>row.id===person.id),reply=replies.find(row=>row.id===person.id),opening=openings.find(row=>row.id===person.id)
    return {id:person.id,latest_view:cross||reply||opening,peer_ids:cross?.peer_ids||[],
      memory:shown.filter(event=>event.author===person.id||event.recipients.includes(person.id)).map(event=>({message_id:event.message.message_id,relation:event.author===person.id?'authored':'received'})),
      status:cross?'cross_replied':reply?'replied':questions.some(row=>row.id===person.id)?'question_sent':opening?'view_saved':'waiting'}
  })
  const cohorts=rows(source.cohorts).map(group=>({...group,count:participants.filter(person=>person.behavior===group.id).length})).filter(group=>group.count)
  return {...run,trader_dialogue:{...source,participants,participant_count:participants.length,agents,cohorts,openings,questions,replies,cross_group_replies,
    shared_views:cross_group_replies.length?rows(source.shared_views).filter(shared=>replies.some(reply=>reply.id===shared.id&&reply.message_id===shared.source_message_id)):[]}}
}

export function conversationGraph(run,lens='specialists',positionSource=run,round=null,positionsOverride={}) {
  const view=lens==='traders'?'traders':'discussion'
  const make=value=>lens==='traders'?traderConversationGraph(value.trader_dialogue,{round:round||(value.trader_dialogue?.cross_group_replies?.length?'cross_group':'paired')}):discussionGraph(value)
  const graph=make(run),full=layoutGraph(make(positionSource),view,{individual:true,positions:positionsOverride})
  const anchors=new Map(full.nodes.map(node=>[node.id,node]))
  const nodes=graph.nodes.filter(node=>anchors.has(node.id)).map(node=>({...node,x:anchors.get(node.id).x,y:anchors.get(node.id).y,number:anchors.get(node.id).number,drawRadius:anchors.get(node.id).drawRadius}))
  return routeGraphEdges({nodes,edges:graph.edges})
}

export function conversationContext(run,lens,event) {
  if(!event)return []
  const data=lens==='traders'?run.trader_dialogue||{}:run
  if(event.kind==='reply') {
    const question=rows(lens==='traders'?data.questions:data.challenges).find(row=>row.id===event.message.responding_to_id&&row.target_id===event.author&&
      (lens!=='traders'||row.message_id===event.message.in_reply_to))
    return question?[{author:question.id,kind:'Question',text:question.question}]:[]
  }
  if(event.kind==='cross_reply')return rows(data.shared_views).filter(row=>event.recipients.includes(row.id)&&event.message.read_message_ids?.includes(row.message_id)&&
    rows(data.replies).some(reply=>reply.id===row.id&&reply.message_id===row.source_message_id&&reply.thesis===row.thesis))
    .map(row=>({author:row.id,kind:'Shared view',text:row.thesis}))
  return []
}

export function automaticConversationLens(run) {
  if(!run.trader_dialogue)return 'specialists'
  if(run.trader_dialogue.status!=='complete'||run.trader_review)return 'traders'
  return 'specialists'
}
