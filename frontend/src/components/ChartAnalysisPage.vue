<template><section class="chart-analysis-page" aria-label="Chart agent analysis"><header><div><h2>{{ pending?'Agents are analysing your chart.':'Explore the agents’ discussion.' }}</h2><p>{{ run.asset||'Uploaded chart' }} · {{ participants.analysts.length }} chart analysts · {{ participants.traders.length }} simulated traders</p></div><button v-if="run.verdict" @click="$emit('results')">See results<ResearchIcon name="arrow"/></button></header><p v-if="pending" class="current-stage"><i/>{{ run.stage||'Reading the uploaded chart' }}</p><ChartSwarmDiscussion :run="run" @discussion="$emit('discussion',$event)"><template #chart><slot name="chart"/></template></ChartSwarmDiscussion><p class="analysis-note">{{ pending?'Messages update when agent work is saved.':'Replay the saved discussion, or select a dot to follow an agent.' }}</p></section></template>
<script setup>
import {computed} from 'vue'
import ChartSwarmDiscussion from './ChartSwarmDiscussion.vue'
import ResearchIcon from './ResearchIcon.vue'
import {overviewParticipants} from '../utils/analysisOverview.mjs'
const props=defineProps({run:{type:Object,required:true}});defineEmits(['results','discussion'])
const participants=computed(()=>overviewParticipants(props.run)),pending=computed(()=>['queued','running','preparing','stopping'].includes(props.run.status))
</script>
<style scoped>
header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:20px 0}h2{font-size:25px;font-weight:550;letter-spacing:-.7px;margin:0 0 7px;color:var(--research-ink)}header p,.analysis-note{font-size:12px;color:var(--research-muted);margin:0;line-height:1.8}header button{display:flex;align-items:center;gap:12px;flex:none;background:#ef762410;border:1px solid #b87e5266;color:#b9612e;padding:9px 13px;border-radius:5px;font-size:12px;cursor:pointer}button svg{width:17px;height:17px}.current-stage{display:flex;align-items:center;gap:8px;font-size:12px;color:#ca7438;margin:0 0 20px}.current-stage i{width:6px;height:6px;border-radius:50%;background:#ef7624;animation:chart-stage-pulse 1.4s ease-in-out infinite}.analysis-note{margin-top:16px}.stock-dark header button{color:#ffb17c}@keyframes chart-stage-pulse{50%{opacity:.35}}@media(max-width:600px){h2{font-size:21px}header{align-items:start}header p{font-size:11px}header button{font-size:11px;padding:8px}}
</style>
