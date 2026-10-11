import {conversationEvents,conversationContext} from './conversationScene.mjs'
import {overviewParticipants} from './analysisOverview.mjs'
export const discussionRoom=value=>value==='traders'?'traders':'specialists'
export function discussionData(run,room='specialists'){
 room=discussionRoom(room);const p=overviewParticipants(run),people=room==='traders'?p.traders:p.analysts
 const started=Date.parse(run.created_at),events=conversationEvents(run,room).map(e=>({...e,lens:room,reused:Boolean(e.at&&Number.isFinite(started)?e.at<started:run.agent_lifecycle?.[e.author]?.reused_output||room==='specialists'&&run.reassessed_from_run_id)})),used=new Set(),exchanges=[]
 for(const question of events.filter(e=>e.kind==='question')){
 const reply=events.find(e=>e.kind==='reply'&&question.recipients.includes(e.author)&&e.recipients.includes(question.author)&&e.message.responding_to_id===question.author&&(room!=='traders'||e.message.in_reply_to===question.message.message_id))
 if(reply)used.add(reply.id)
 exchanges.push({id:question.id,kind:'paired',question,reply:reply||null,events:[question,...reply?[reply]:[]],personIds:[question.author,...question.recipients],context:reply?conversationContext(run,room,reply):[]})
 }
 for(const event of events.filter(e=>e.kind==='opening'||e.kind==='cross_reply'||e.kind==='reply'&&!used.has(e.id))){exchanges.push({id:event.id,kind:event.kind==='opening'?'opening':event.kind==='cross_reply'?'cross_group':'reply',question:null,reply:event.kind==='opening'?null:event,opening:event.kind==='opening'?event:null,events:[event],personIds:[event.author,...event.recipients],context:conversationContext(run,room,event)})}
 return {room,people,events,exchanges}
}
export function resolveDiscussionSelection(data,selection={}){
 const personId=data.people.some(p=>p.id===selection.personId)?selection.personId:''
 let exchange=data.exchanges.find(e=>e.id===selection.exchangeId&&(!personId||e.personIds.includes(personId)))
 if(!exchange){const available=personId?data.exchanges.filter(e=>e.personIds.includes(personId)):data.exchanges;exchange=(personId?available.find(e=>e.question?.author===personId):null)||available.find(e=>e.kind==='paired')||(personId?available.find(e=>e.reply?.author===personId||e.opening?.author===personId):null)||available[0]}
 return {room:data.room,personId:personId||exchange?.question?.author||exchange?.reply?.author||exchange?.opening?.author||'',exchangeId:exchange?.id||''}
}
export function exchangeForEdge(data,edge){return data.exchanges.find(e=>e.events.some(event=>event.author===edge.source&&event.recipients.includes(edge.target)&&event.kind===edge.kind&&(!edge.eventId||event.id===edge.eventId)))||null}
export function recordedExchangeOutcome(exchange){const event=exchange?.reply||exchange?.opening;if(!event)return null;const m=event.message;return m.revised_thesis?{label:'View after exchange',text:m.revised_thesis}:['reply','cross_reply'].includes(event.kind)&&m.thesis?{label:'View after exchange',text:m.thesis}:null}
export function replayExchange(exchange){return (exchange?.events||[]).map(event=>({...event,recipients:[...event.recipients],replay:true}))}

export function recordedExchangeChange(exchange){const m=exchange?.reply?.message||{};return {changed:m.changed_stance===true?'Yes':m.changed_stance===false?'No':'Not recorded',initial:m.initial_stance||'Not recorded',stance:m.stance||'Not recorded',setup:m.setup_status||'Not recorded'}}
export function traderCompletionAction(run,resuming=false){
 const d=run?.trader_dialogue,pending=['queued','running'].includes(run?.status)
 if(d?.status==='incomplete')return {label:resuming?'Resuming saved messages…':pending?'Wait for this analysis to finish':'Resume missing trader messages',disabled:pending||resuming,reason:'Completed conversations are preserved. Some trader messages still need validation.'}
 if(d?.status==='complete'&&(d.peer_count||1)<3)return {label:resuming?'Starting wider discussion…':'Add cross-group discussion',disabled:pending||resuming,reason:'The initial paired discussion is saved. Add the existing cross-group discussion stage from saved views.'}
 if(d?.status==='complete'&&d.peer_count>=3&&!pending&&(!run.verdict?.trader_view_coverage||run.trader_review?.status!=='complete'))return {label:resuming?'Continuing saved analysis…':run.trader_review?.status==='complete'?'Complete final assessment':run.trader_review?.reviewed_count?'Continue perspective review':'Review every trader perspective',disabled:resuming,reason:`${run.trader_review?.reviewed_count||0} / ${d.participant_count||0} final perspectives reviewed. Continue the unfinished assessment stages.`}
 if(!d&&!pending&&run?.version>=6&&run.observation?.is_chart&&run.opinions?.length)return {label:resuming?'Resuming saved work…':'Resume saved analysis',disabled:resuming,reason:`${run.opinions.length} specialist opening views are saved. Continue the missing research and trader discussion.`}
 return null
}
