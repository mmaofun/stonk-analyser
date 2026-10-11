<template><ResearchShell :section="kind==='stock'?'stock':'chart'" dark><main class="preview-lab">
 <p class="launch-notice">UI preview · All company information, chart levels and agent messages on this page are illustrative examples. No model requests or uploads are made.</p>
 <nav class="preview-steps" aria-label="Example analysis workflow"><button v-for="(label,index) in steps" :key="label" :class="{selected:phase===index}" @click="phase=index"><span>{{ index+1 }}</span>{{ label }}</button></nav>
 <header class="preview-heading"><div><p class="launch-eyebrow">{{ kind==='stock'?'Stock Lab':'Chart Lab' }} / {{ plan.name }} example</p><h1>{{ phase===0?kind==='stock'?'Start with a stock.':'Start with a chart.':phase===1?'Explore the agent discussion.':kind==='stock'?'Example Company':'Chart scenarios.' }}</h1><p>{{ plan.total_agents }} total agents · {{ plan.researchers }} researchers · {{ plan.opinion_agents }} {{ kind==='stock'?'investors':'traders' }}</p></div><RouterLink to="/pricing" class="research-secondary">Compare plans</RouterLink></header>
 <section v-if="phase===0" class="preview-start"><template v-if="kind==='stock'"><label>Example stock<input value="DEMO — Example Company" readonly></label><p>See how the team researches a company, compares views and presents low, central and high projections.</p></template><template v-else><PreviewChart/><p>This sample chart demonstrates conditional scenarios, entry references, stop-loss and targets.</p></template><button class="research-primary" @click="phase=1">Explore the example discussion →</button></section>
 <template v-else-if="phase===1"><StockSwarmDiscussion v-if="kind==='stock'" :run="stock"/><ChartSwarmDiscussion v-else :run="chart"><template #chart><PreviewChart/></template></ChartSwarmDiscussion><button class="research-primary preview-next" @click="phase=2">See example results →</button></template>
 <StockResults v-else-if="kind==='stock'" :run="stock" @analysis="phase=1" @research="phase=1" @annual="showDetail=true" @investors="phase=1" @sources="showDetail=true" @download="download(stock)"/>
 <ChartPlanResults v-else :run="chart" v-model:plan-key="planKey" @discussion="phase=1" @exits="showDetail=true"><template #chart><PreviewChart :plan="selectedPlan"/></template></ChartPlanResults>
 <p v-if="showDetail" class="launch-notice" role="status">This example uses fictional data to demonstrate the interface. In a live analysis, the source evidence, assumptions and calculations belong to the selected report. <button class="detail-close" @click="showDetail=false">Close</button></p>
 </main></ResearchShell></template>
<script setup>
import {computed,ref,watch} from 'vue'
import {useRoute} from 'vue-router'
import ResearchShell from '../components/ResearchShell.vue'
import StockResults from '../components/StockResults.vue'
import ChartPlanResults from '../components/ChartPlanResults.vue'
import StockSwarmDiscussion from '../components/StockSwarmDiscussion.vue'
import ChartSwarmDiscussion from '../components/ChartSwarmDiscussion.vue'
import PreviewChart from '../components/PreviewChart.vue'
import {localPlanPreview} from '../api/platform'
import {plans} from '../utils/plans.mjs'
import {stockExample,chartExample} from '../utils/previewReports.mjs'
import {chartScenarioOptions} from '../utils/chartWorkspace.mjs'
import '../styles/launch.css'
const route=useRoute(),phase=ref(0),planKey=ref(''),showDetail=ref(false)
const kind=computed(()=>route.path.startsWith('/stock-lab')?'stock':'chart'),plan=computed(()=>plans.find(p=>p.id===localPlanPreview.value)||plans[0])
const stock=computed(()=>stockExample(plan.value.id)),chart=computed(()=>chartExample(plan.value.id)),steps=computed(()=>[kind.value==='stock'?'Stock ticker':'Upload chart','Agents analysing','Results'])
const selectedPlan=computed(()=>chartScenarioOptions(chart.value).find(p=>p.key===planKey.value)?.kind==='reference'?chartScenarioOptions(chart.value).find(p=>p.key===planKey.value)?.plan:null)
watch(kind,()=>{phase.value=0;showDetail.value=false;planKey.value=''})
function download(run){const url=URL.createObjectURL(new Blob([JSON.stringify(run,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='illustrative-example.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
</script>
<style scoped>.preview-lab{max-width:1500px;margin:0 auto 60px}.preview-steps{display:flex;gap:20px;padding:18px 0;border-bottom:1px solid var(--research-line)}.preview-steps button{display:flex;gap:10px;align-items:center;flex:1;text-align:left;background:none;border:0;color:var(--research-muted);font-size:12px;cursor:pointer}.preview-steps button span{width:29px;height:29px;display:grid;place-items:center;border:1px solid var(--research-line);border-radius:50%;flex:none}.preview-steps .selected{color:var(--research-ink)}.preview-steps .selected span{background:#f47735;color:#111;border-color:#f47735}.preview-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:28px 0}.preview-heading h1{font-size:29px;letter-spacing:-.7px;margin:4px 0 9px}.preview-heading p{font-size:12px;color:var(--research-muted);margin:0}.preview-heading .research-secondary{border:1px solid var(--research-line);border-radius:5px;padding:9px 13px;text-decoration:none;font-size:12px;white-space:nowrap}.preview-start{max-width:800px;padding:20px 0}.preview-start label{display:grid;gap:10px;font-size:14px}.preview-start input{background:var(--research-soft);border:1px solid var(--research-line);color:var(--research-ink);padding:17px;font-size:19px;border-radius:7px;max-width:520px;width:100%}.preview-start p{font-size:14px;line-height:1.8;color:var(--research-muted);max-width:580px}.preview-lab .research-primary{border:1px solid #f47735;border-radius:6px;background:#f47735;color:#111;padding:12px 19px;font-size:13px;cursor:pointer;margin-top:16px}.preview-next{float:right}.detail-close{color:#ffad78;background:none;border:0;cursor:pointer;text-decoration:underline;margin-left:10px}@media(max-width:600px){.preview-steps{gap:9px}.preview-steps button{font-size:10px;gap:6px}.preview-heading{align-items:flex-start;flex-direction:column}.preview-heading h1{font-size:25px}}
</style>
