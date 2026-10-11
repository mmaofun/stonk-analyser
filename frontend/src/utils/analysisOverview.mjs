import {conversationEvents} from './conversationScene.mjs'
import {discussionGraph} from './agentGraph.mjs'
import {analysisFlow} from './analysisFlow.mjs'
export function overviewParticipants(run){
 const analysts=discussionGraph(run).nodes.filter(n=>n.type==='analyst')
 const data=run.trader_dialogue||{}, events=conversationEvents(run,'traders')
 const traders=(data.participants||[]).map((p,index)=>({...p,label:p.name,number:index+1,status:events.some(e=>e.author===p.id)?'Saved messages':'Awaiting saved view',state:events.some(e=>e.author===p.id)?'output_saved':'pending'}))
 const groups=[...(data.cohorts||[])].map(g=>({...g,people:traders.filter(p=>p.behavior===g.id)})).filter(g=>g.people.length)
 const ungrouped=traders.filter(p=>!groups.some(g=>g.people.some(q=>q.id===p.id)))
 if(ungrouped.length)groups.push({id:'ungrouped',name:'Other recorded traders',people:ungrouped})
 return {analysts,traders,groups}
}
export function overviewEvents(run){return ['specialists','traders'].flatMap(lens=>conversationEvents(run,lens).map(e=>({...e,lens,reused:Boolean(run.reassessed_from_run_id||e.at&&e.at<Date.parse(run.created_at))}))).sort((a,b)=>a.at-b.at||a.phaseIndex-b.phaseIndex||a.id.localeCompare(b.id))}
export function overviewStages(run){const f=analysisFlow(run);const current=f.currentIndex===0?0:f.currentIndex===1?1:f.currentIndex===2?2:3;return ['Chart read','Analysts','Trader discussion','Final review'].map((label,index)=>({label,state:f.complete?'done':index<current?'done':index===current?f.stopped?'stopped':'active':'pending'}))}
