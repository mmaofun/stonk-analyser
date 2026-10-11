<template>
  <section v-if="actor" class="trader-memory">
    <p class="memory-status">{{ actor.decision_changed ? 'Decision revised after discussion' : reply ? 'Decision retained after discussion' : 'Discussion in progress' }}</p>
    <div v-if="peers.length" class="peer-list"><h4>Peers across {{ peers.length }} trading styles</h4><button v-for="peer in peers" :key="peer.id" :aria-label="'Inspect '+peer.name" @click="emit('inspect',peer.id)"><strong>{{ peer.name }}</strong><small>{{ peer.style }}</small></button></div>
    <template v-if="opening"><h4>Opening view · {{ stance(opening.stance) }}</h4><p>{{ opening.thesis }}</p></template>
    <template v-if="reply"><h4>{{ crossReply ? 'After cross-group exchange' : 'After the challenge' }} · {{ stance(reply.stance) }}</h4><p>{{ reply.thesis }}</p><p>{{ reply.change_reason }}</p></template>
    <section v-if="review" class="perspective-review"><h4>How this perspective was reviewed</h4><template v-if="perspectiveReview"><strong>{{ treatment(perspectiveReview.treatment) }}</strong><p>{{ perspectiveReview.key_argument }}</p><p>{{ perspectiveReview.assessment }}</p><small>Evidence: {{ perspectiveReview.evidence_ids.map(evidenceLabel).join(' · ') }}</small></template><p v-else>Waiting for this trader’s individual review. The final assessment requires every trader to be reviewed.</p></section>
    <table v-if="opening"><thead><tr><th>Policy control</th><th>Opening</th><th>After reply</th></tr></thead><tbody><tr><td>Risk budget</td><td>{{ percent(opening.risk_budget) }}</td><td>{{ reply ? percent(reply.risk_budget) : 'Pending' }}</td></tr><tr><td>Participation</td><td>{{ percent(opening.participation) }}</td><td>{{ reply ? percent(reply.participation) : 'Pending' }}</td></tr></tbody></table>
    <p class="memory-note">Fractions of this trader’s configured limits, not confidence. If a virtual market can run, its view influences its trading policy within these limits; stops and margin checks still apply.</p>
    <h4>Saved memory · {{ (actor.memory||[]).length }} {{ (actor.memory||[]).length===1 ? 'record' : 'records' }}</h4>
    <details v-for="entry in memory" :key="entry.message_id"><summary>{{ entry.title }}<small>{{ relation(entry.relation) }}</small></summary><p>{{ entry.text }}</p></details>
    <p class="memory-note">Memory belongs to this chart run. A reply received after the decision is stored for inspection; it was not used retroactively to produce that decision.</p>
  </section>
</template>
<script setup>
import {computed} from 'vue'
const props=defineProps({dialogue:{type:Object,required:true},actorId:{type:String,required:true},review:{type:Object,default:null},levels:{type:Array,default:()=>[]}})
const emit=defineEmits(['inspect'])
const actor=computed(()=>props.dialogue.agents.find(item=>item.id===props.actorId))
const opening=computed(()=>props.dialogue.openings.find(item=>item.id===props.actorId))
const crossReply=computed(()=>props.dialogue.cross_group_replies?.find(item=>item.id===props.actorId))
const reply=computed(()=>crossReply.value||props.dialogue.replies.find(item=>item.id===props.actorId))
const perspectiveReview=computed(()=>props.review?.entries?.find(item=>item.actor_id===props.actorId))
const peers=computed(()=>(actor.value?.peer_ids||[]).map(id=>{const person=props.dialogue.participants.find(item=>item.id===id);return {...person,style:props.dialogue.cohorts.find(group=>group.id===person?.behavior)?.name}}))
const memory=computed(()=>{const all=[...props.dialogue.openings,...props.dialogue.questions,...props.dialogue.replies,...(props.dialogue.shared_views||[]),...(props.dialogue.cross_group_replies||[])];return (actor.value?.memory||[]).map(entry=>{const message=all.find(item=>item.message_id===entry.message_id);return {...entry,text:message?.response||message?.question||message?.thesis||'Message unavailable',title:message?.peer_names?`${message.name} responds across trading styles`:message?.source_message_id?`${message.name} shared view`:message?.question?`${message.name} → ${message.target_name}`:message?.response?`${message.name} replies to ${message.responding_to_name}`:`${message?.name||'Trader'} opening view`}})})
const stance=value=>({bullish:'Bullish',bearish:'Bearish',mixed:'Mixed'}[value]||value)
const percent=value=>Math.round(value*100)+'%'
const relation=value=>({authored:'Authored',read:'Read before decision',received_after_decision:'Received after decision',received:'Received in this replay'}[value]||value)
const treatment=value=>({directional_evidence:'Considered for direction',risk_or_execution_context:'Considered for risk and execution',insufficient_evidence:'Considered; evidence insufficient'}[value]||value)
const evidenceLabel=id=>{if(id==='OBS:chart')return 'Chart structure and limitations';const level=props.levels.find(item=>item.id===id);return level?`${level.kind.replaceAll('_',' ')} ${level.basis==='axis_estimate'?'≈ ':''}${Number(level.price).toLocaleString('en-US',{maximumFractionDigits:8})}`:id}
</script>
<style scoped>
.perspective-review{border-left:2px solid #54766a;background:#f3f7f5;padding:2px 12px 12px;margin:18px 0}.perspective-review strong{font-size:11px;font-weight:500;color:#365d50}
.peer-list{padding-bottom:8px}.peer-list button{display:block;width:100%;border:0;border-bottom:1px solid #e1e6ea;background:#f5f8fa;text-align:left;padding:8px 10px;font-family:inherit;cursor:pointer;color:#4c687a}.peer-list strong{font-size:11px;font-weight:500;display:block}.peer-list small{font-size:9px;color:#87949e;display:block;margin-top:2px}.peer-list button:focus-visible{outline:2px solid #d0612c;outline-offset:2px}
.trader-memory{border-top:1px solid #dce2e6;margin-top:18px;padding-top:10px}.trader-memory h4{font-size:11px;font-weight:600;color:#4b5967;margin:17px 0 7px}.trader-memory p{font-size:12px;color:#66717d;line-height:1.7;margin:8px 0;overflow-wrap:anywhere}.trader-memory .memory-status{color:#4b7767;font-size:11px}.trader-memory .memory-note{font-size:10px;color:#84909a}.trader-memory table{border-collapse:collapse;width:100%;font-size:10px;margin:15px 0}.trader-memory td,.trader-memory th{padding:7px 4px;border-bottom:1px solid #e5e9ec;text-align:left;font-weight:400}.trader-memory th{color:#89929b}.trader-memory details{border-bottom:1px solid #e5e9ec;padding:11px 0}.trader-memory summary{cursor:pointer;font-size:11px;color:#486578;line-height:1.6}.trader-memory small{display:block;font-size:9px;color:#8b959e;margin-top:3px}.trader-memory summary:focus-visible{outline:2px solid #d0612c;outline-offset:3px}
</style>
