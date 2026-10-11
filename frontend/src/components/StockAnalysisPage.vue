<template>
<section class="stock-analysis-page" :class="{'saved-complete':Boolean(run.verdict)}" aria-label="Stock agent swarm and discussion">
  <header><div><h2>{{ pending?'Agents are analysing your stock.':'Explore the agents’ discussion.' }}</h2><p><strong>{{ run.ticker }}</strong> · {{ overview.participants.analysts.length }} researchers · {{ overview.participants.traders.length }} simulated investors</p></div><button v-if="run.verdict&&!pending" @click="$emit('results')">See results<ResearchIcon name="arrow"/></button></header>
  <p v-if="pending" class="stock-active-stage" role="status"><span></span>{{ overview.flow.title }}</p>
  <StockSwarmDiscussion :run="run" @discussion="$emit('discussion',$event)"/>
  <p class="analysis-footnote">{{ pending?'The discussion updates as research is saved.':'Replay shows the original saved discussion.' }} Select a dot to follow an agent.</p>
</section>
</template>
<script setup>
import {computed} from 'vue'
import StockSwarmDiscussion from './StockSwarmDiscussion.vue'
import ResearchIcon from './ResearchIcon.vue'
import {stockOverview} from '../utils/stockAnalysisOverview.mjs'
const props=defineProps({run:{type:Object,required:true}})
defineEmits(['results','discussion'])
const overview=computed(()=>stockOverview(props.run))
const pending=computed(()=>['queued','running','preparing','stopping'].includes(props.run.status))
</script>
<style scoped>
.stock-analysis-page{font:14px/1.6 'Helvetica Neue',Arial,sans-serif;color:var(--research-ink)}.stock-analysis-page>header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:5px 0 20px}.stock-analysis-page h2{font-size:24px;letter-spacing:-.6px;margin:0 0 5px;font-weight:550}.stock-analysis-page header p{font-size:12px;color:var(--research-muted);margin:0}.stock-analysis-page header p strong{font-weight:500;color:var(--research-ink)}.stock-analysis-page>header button{display:flex;align-items:center;gap:9px;min-height:40px;padding:9px 13px;border:1px solid #ebd7c7;background:#fff8f3;color:#b85722;border-radius:5px;font-size:12px;cursor:pointer}.stock-active-stage{display:flex;gap:9px;align-items:center;font-size:12px;color:#8a653f;margin:10px 0 17px}.stock-active-stage>span{width:6px;height:6px;background:#e9762a;border-radius:50%;box-shadow:0 0 8px #ff7a2420;animation:stock-stage-pulse 2s ease-in-out infinite}.analysis-footnote{font-size:11px;line-height:1.7;color:var(--research-muted);padding:14px 0;margin:0}.stock-dark .stock-analysis-page>header button{background:#f4773512;border-color:#795039;color:#ffaf78}@keyframes stock-stage-pulse{50%{opacity:.3}}@media(max-width:750px){.stock-analysis-page h2{font-size:21px}.stock-analysis-page>header{gap:12px;align-items:start}.stock-analysis-page>header button{font-size:11px;padding:8px 10px;flex:none}}@media(prefers-reduced-motion:reduce){.stock-active-stage>span{animation:none}}
</style>
