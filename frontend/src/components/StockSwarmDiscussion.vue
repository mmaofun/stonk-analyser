<template>
<div class="stock-swarm-discussion"><div class="stock-playback"><span>{{ replaying?'Saved discussion replay · no AI requests':pending?'Live discussion updates':'Saved discussion' }}</span><button v-if="unread" @click="follow">{{ unread }} new messages · Follow live</button><div v-if="events.length" class="stock-replay-speed" role="group" aria-label="Replay speed"><span>Replay</span><button v-for="speed in [1,2,4,8]" :key="speed" :aria-pressed="replaySpeed===speed" :class="{selected:replaySpeed===speed}" @click="setReplaySpeed(speed)">{{ speed }}×</button></div><button v-if="events.length" @click="replaying?stop():replay()">{{ replaying?'Stop replay':'Replay discussion' }}</button></div><div class="stock-swarm-layout"><aside><StockPriceContext :run="run" terminal/></aside><div class="stock-swarm-right"><StockSwarmCanvas :participants="overview.participants" :roles="run.roles||[]" :events="events" :focus="focus" :active="active" :activity="activity" :motion-duration=".55" @select="select"/><StockSwarmMessages :people="people" :sources="run.dossier?.sources||[]" :events="replaying?replayShown:paused?held:delivered" :focus="focus" :paused="paused" :replaying="replaying" :running="pending" :selected-event-id="selected?.id||''" @select="select" @message="selectMessage" @hold="hold" @toggle-follow="paused?follow():hold()" @discussion="$emit('discussion',$event)"/></div></div></div>
</template>
<script setup>
import {computed,onBeforeUnmount,ref,watch} from 'vue'
import StockSwarmCanvas from './StockSwarmCanvas.vue'
import StockPriceContext from './StockPriceContext.vue'
import StockSwarmMessages from './StockSwarmMessages.vue'
import {richSwarmEvents,swarmPanels,replayGap} from '../utils/stockSwarm.mjs'
import {stockOverview} from '../utils/stockAnalysisOverview.mjs'
import {newRecordedEvents} from '../utils/agentInteraction.mjs'
import {playbackEvents} from '../utils/playground.mjs'
const props=defineProps({run:{type:Object,required:true}})
defineEmits(['discussion'])
const overview=computed(()=>stockOverview(props.run)),events=computed(()=>richSwarmEvents(props.run,overview.value.events))
const people=computed(()=>swarmPanels(overview.value.participants,props.run.roles||[]).flatMap(panel=>panel.people.map(p=>({...p,lens:panel.kind==='research'?'specialists':'traders'}))))
const pending=computed(()=>['queued','running','preparing','stopping'].includes(props.run.status))
const replaySpeed=ref(4)
const focus=ref(''),selected=ref(null),active=ref(null),paused=ref(false),held=ref([]),unread=ref(0),replaying=ref(false),replayShown=ref([])
const delivered=ref(events.value),activity=ref([])
let pulseTimer,replayTimer,deliveryTimer,animationKey=0,queue=[],arrivalQueue=[]
const activityTimers=new Set()
function pulse(event){clearTimeout(pulseTimer);active.value=event;const item={key:++animationKey,event};activity.value=[...activity.value,item].slice(-10);const timer=setTimeout(()=>{activity.value=activity.value.filter(a=>a.key!==item.key);activityTimers.delete(timer)},1000);activityTimers.add(timer);pulseTimer=setTimeout(()=>active.value=null,700)}
function hold(){if(paused.value)return;paused.value=true;held.value=[...delivered.value];clearTimeout(replayTimer);active.value=null}
function follow(){paused.value=false;focus.value='';selected.value=null;unread.value=0;if(replaying.value)nextReplay();else deliverNext()}
function select(id){hold();focus.value=focus.value===id?'':id;selected.value=[...events.value].reverse().find(e=>e.author===focus.value||e.recipients.includes(focus.value))||null;active.value=selected.value}
function selectMessage(event){hold();focus.value=event.author;selected.value=event;pulse(event)}
function stop(resumeDelivery=true){clearTimeout(replayTimer);clearTimeout(pulseTimer);queue=[];replaying.value=false;replayShown.value=[];active.value=null;paused.value=false;unread.value=0;activity.value=[];activityTimers.forEach(clearTimeout);activityTimers.clear();if(resumeDelivery)deliverNext()}
function nextReplay(){clearTimeout(replayTimer);if(!replaying.value||paused.value)return;if(!queue.length){stop();return}const event=queue.shift();replayShown.value=[...replayShown.value,event];pulse(event);replayTimer=setTimeout(nextReplay,replayGap(replaySpeed.value))}
function setReplaySpeed(speed){replaySpeed.value=speed;if(replaying.value&&!paused.value){clearTimeout(replayTimer);replayTimer=setTimeout(nextReplay,replayGap(speed))}}
function replay(){stop(false);clearTimeout(deliveryTimer);focus.value='';selected.value=null;queue=playbackEvents(events.value);replaying.value=true;nextReplay()}
function deliverNext(){clearTimeout(deliveryTimer);if(paused.value||replaying.value||!arrivalQueue.length)return;const event=arrivalQueue.shift();if(!delivered.value.some(e=>e.id===event.id))delivered.value=[...delivered.value,event];if(!event.reused)pulse(event);deliveryTimer=setTimeout(deliverNext,110)}
watch(events,(next,prev)=>{const byId=new Map(next.map(e=>[e.id,e]));delivered.value=delivered.value.filter(e=>byId.has(e.id)).map(e=>byId.get(e.id));const incoming=newRecordedEvents(prev||[],next);if(!incoming.length)return;const queued=new Set(arrivalQueue.map(e=>e.id));arrivalQueue.push(...incoming.filter(e=>!queued.has(e.id)));if(paused.value||replaying.value){unread.value+=incoming.length;return}deliverNext()})
watch(()=>props.run.id,()=>{stop(false);clearTimeout(deliveryTimer);arrivalQueue=[];delivered.value=events.value;focus.value='';selected.value=null;unread.value=0})
onBeforeUnmount(()=>{stop(false);clearTimeout(deliveryTimer)})
</script>
<style scoped>
.stock-playback{display:flex;gap:12px;align-items:center;justify-content:flex-end;font-size:11px;color:var(--research-muted);margin:0 0 13px;min-height:32px}.stock-playback>span{margin-right:auto}.stock-playback button{border:1px solid #ecd7c6;background:#fff8f3;color:#b76128;font-size:11px;padding:7px 10px;border-radius:5px;cursor:pointer}.stock-swarm-layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);gap:18px;align-items:stretch}.stock-swarm-layout>aside{min-width:0;border:1px solid var(--research-line);border-radius:8px;padding:16px;background:#fff}.stock-swarm-right{display:grid;gap:13px;min-width:0;align-content:start}.stock-swarm-layout :deep(.price-quote){text-align:right;display:grid;gap:3px}.stock-swarm-layout :deep(.price-quote strong){font-size:24px;line-height:1.2}.stock-swarm-layout :deep(.price-quote small){font-size:10px;color:var(--research-muted)}.stock-swarm-layout :deep(.dm-scroll){max-height:285px;min-height:180px}.stock-swarm-layout :deep(.dm-filter){padding:8px 12px}.stock-swarm-layout :deep(.dm-view>header){padding:12px}.stock-swarm-layout :deep(.dm-filter>span){display:none}.stock-swarm-layout :deep(.dm-filter select){max-width:100%}.stock-swarm-layout :deep(.chat-bubble){font-size:12px;border-radius:0 6px 6px 6px}.stock-dark .stock-swarm-layout>aside{background:#111923}.stock-dark .stock-playback button{background:#f4773512;color:#ffac74;border-color:#795039}@media(max-width:750px){.stock-swarm-layout{grid-template-columns:1fr;gap:14px}.stock-swarm-layout>aside{padding:13px}.stock-swarm-layout :deep(.stock-price-context svg){max-height:330px}.stock-swarm-layout :deep(.dm-scroll){max-height:310px}.stock-playback{font-size:11px;line-height:1.6;flex-wrap:wrap}.stock-playback>span{flex:1}}
</style>

<style scoped>
.stock-replay-speed{display:flex;align-items:center;gap:3px}.stock-replay-speed>span{font-size:10px;color:var(--research-muted);margin-right:4px}.stock-replay-speed button{padding:5px 8px;min-height:29px}.stock-replay-speed button.selected{border-color:#da9b71;background:#f4773512;color:#c3672e}.stock-dark .stock-replay-speed button.selected{border-color:#ad7048;color:#ffb078}
</style>
