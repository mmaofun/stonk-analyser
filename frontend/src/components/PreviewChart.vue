<template><figure class="preview-chart"><figcaption>DEMO · Illustrative chart <span>1h</span></figcaption><svg viewBox="0 0 760 440" role="img" aria-label="Illustrative price chart with example support, resistance and selected scenario levels"><g v-for="price in [94,100,106,110,114]" :key="price"><path :d="`M 25 ${y(price)} H 680`" stroke="currentColor" opacity=".13"/><text x="695" :y="y(price)+4">{{ price }}</text></g><path :d="line" fill="none" stroke="#ff984f" stroke-width="2.1"/><template v-for="(level,index) in scenarioLevels" :key="level.label"><path :d="`M 25 ${y(level.price)} H 680`" :stroke="index===1?'#b9907a':'#f47735'" stroke-dasharray="5 5" opacity=".8"/><text x="35" :y="y(level.price)-8" fill="#ffb078">{{ level.label }} · {{ level.price }}</text></template><text x="25" y="423">Illustrative data</text><text x="570" y="423">Conditional reference</text></svg></figure></template>
<script setup>
import {computed} from 'vue'
const props=defineProps({plan:Object})
const y=price=>385-(price-92)*14
const line=Array.from({length:100},(_,i)=>`${i?'L':'M'} ${25+i*6.6} ${y(98+Math.sin(i*.14)*4+i*.035+Math.sin(i*.8)*.6)}`).join(' ')
const scenarioLevels=computed(()=>props.plan?[{label:'Entry after confirmation',price:props.plan.entry},{label:'SL',price:props.plan.stop},{label:'TP1',price:props.plan.targets[0]}]:[])
</script>
<style scoped>.preview-chart{margin:0;min-width:0;border:1px solid var(--research-line);border-radius:7px;padding:14px;background:var(--research-soft);color:var(--research-muted)}.preview-chart figcaption{display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px}.preview-chart svg{width:100%;display:block}.preview-chart text{font:11px 'Helvetica Neue',Arial,sans-serif;fill:currentColor}</style>
