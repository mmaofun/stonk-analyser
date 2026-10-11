<template>
  <section class="chart-source" aria-label="Source charts">
    <header><h2>{{ run.images.length>1?'Source charts':'Source chart' }}</h2><a v-if="run.images.length===1&&imageUrl(0)" :href="imageUrl(0)" target="_blank" rel="noopener noreferrer">View full size <ResearchIcon name="external"/></a></header>
    <p v-if="imagesFailed" class="chart-notice" role="status">The private chart preview could not be loaded. Reload the analysis to try again.</p>
    <div v-if="run.is_sample" class="chart-notice">Synthetic sample · workflow demonstration</div>
    <div v-if="run.images.length>1" class="image-tabs"><button v-for="(item,index) in run.images" :key="index" :class="{selected:activeImage===index}" @click="activeImage=index">Chart {{ index+1 }}</button></div>
    <figure v-for="(item,index) in run.images" v-show="activeImage===index" :key="index">
      <div class="image-wrap"><img v-if="imageUrl(index)" :src="imageUrl(index)" :alt="`Uploaded chart: ${item.name}`">
        <svg v-if="showLevels||watchScenario" class="level-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Observed chart levels"><g v-for="level in levelsFor(index)" :key="level.id"><title>{{ price(level) }} · {{ level.evidence }}</title><line x1="12" x2="975" :y1="level.y_percent*10" :y2="level.y_percent*10"/><rect x="10" :y="level.y_percent*10-15" width="70" height="30"/><text x="18" :y="level.y_percent*10+7">{{ levelLabel(level) }}</text></g></svg>
        <TradeLevelsOverlay v-if="showTradeLevels&&selectedPlan" :observation="run.observation" :plan="selectedPlan" :image-index="index"/>
      </div>
      <figcaption v-if="run.images.length>1&&imageUrl(index)"><a :href="imageUrl(index)" target="_blank" rel="noopener noreferrer">View chart {{ index+1 }} full size</a></figcaption>
    </figure>
    <div v-if="run.observation?.levels?.length" class="chart-controls"><label><input type="checkbox" v-model="showLevels">Observed levels</label><label v-if="plans.length&&!analysisOnly"><input type="checkbox" v-model="showTradeLevels">Entry, SL & TP</label><select v-if="plans.length>1&&!hideScenarioSelector&&!analysisOnly" v-model.number="planIndex" aria-label="Chart trade scenario"><option v-if="planIndex<0" :value="-1" disabled>Watch-only scenario · no price overlay</option><option v-for="(plan,index) in plans" :key="index" :value="index">{{ strategyLabel(plan.strategy)||'Setup' }} · {{ plan.side==='long'?'Long':'Short' }} {{ index+1 }}</option></select><span v-if="run.observation.levels.some(level=>level.basis==='axis_estimate')">≈ Image estimates</span></div>
    <p v-if="selectedPlan&&!referencePayoff(selectedPlan).eligible" class="chart-notice" role="status">Reference levels only · this scenario fails the TP1 ≥1.25R rule. Do not enter this setup.</p>
  </section>
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import ResearchIcon from './ResearchIcon.vue'
import TradeLevelsOverlay from './TradeLevelsOverlay.vue'
import {referenceTradePlans,strategyLabel,visiblePlanAssessment} from '../utils/tradeDecision.mjs'
import {referencePayoff} from '../utils/payoffPolicy.mjs'
import {planImageIndex} from '../utils/scenarioPresentation.mjs'
import {exitPlanKey} from '../utils/tradeExitPlan.mjs'
import {usePrivateImages} from '../utils/privateImages'
const props=defineProps({run:{type:Object,required:true},api:{type:String,required:true},hideScenarioSelector:Boolean,analysisOnly:Boolean})
defineEmits(['details'])
const activeImage=ref(0),showLevels=ref(false),showTradeLevels=ref(!props.analysisOnly)
const planKey=defineModel('planKey',{default:''})
const plans=computed(()=>referenceTradePlans(props.run))
const planIndex=computed({get:()=>{const index=plans.value.findIndex(plan=>exitPlanKey(props.run,plan)===planKey.value);return index<0?(planKey.value||props.hideScenarioSelector?-1:0):index},set:index=>{if(plans.value[index])planKey.value=exitPlanKey(props.run,plans.value[index])}})
const selectedPlan=computed(()=>planIndex.value<0?null:plans.value[planIndex.value]||plans.value[0])
const watchScenario=computed(()=>props.run.verdict?.strategy_scenarios?.find(s=>planKey.value===`watch:${props.run.id}:${s.id}`)||null)
const watchIds=computed(()=>new Set([...(watchScenario.value?.evidence_ids||[]),...(watchScenario.value?.steps||[]).flatMap(s=>s.level_ids||[]),...(watchScenario.value?.invalidation?.level_ids||[])]))
const selectedAssessment=computed(()=>visiblePlanAssessment(props.run,selectedPlan.value))
const {urls:imageUrls,failed:imagesFailed}=usePrivateImages(()=>props.run.images.map((_,index)=>`${props.api}/api/chart/analyses/${props.run.id}/images/${index}`))
const imageUrl=index=>imageUrls.value[index]
const levelsFor=index=>(props.run.observation?.levels||[]).filter(level=>level.image_index===index&&level.y_percent!=null&&level.kind!=='indicator_value'&&(showLevels.value||watchIds.value.has(level.id)))
const levelLabel=level=>`L${props.run.observation.levels.findIndex(item=>item.id===level.id)+1}`
const price=level=>(level.basis==='axis_estimate'?'≈ ':'')+Number(level.price).toLocaleString('en-US',{maximumFractionDigits:8})
watch(()=>[props.run.id,planKey.value],([id],previous)=>{const image=planImageIndex(props.run,selectedPlan.value),watchImage=props.run.observation?.levels?.find(l=>watchIds.value.has(l.id)&&Number.isInteger(l.image_index))?.image_index;if(image!==null)activeImage.value=image;else if(watchImage>=0&&watchImage<props.run.images.length)activeImage.value=watchImage;else if(!previous||previous[0]!==id)activeImage.value=0},{immediate:true})
</script>
<style scoped>
.chart-source{border:1px solid var(--research-line);border-radius:7px;overflow:hidden;min-width:0;align-self:start;background:#fff}.chart-source header{display:flex;align-items:center;justify-content:space-between;padding:12px 17px;background:#f7f7f8;gap:14px}.chart-source h2{margin:0;font-size:15px;font-weight:600}.chart-source header a{display:flex;align-items:center;gap:7px;font-size:12px;text-decoration:none;color:#a73508}.chart-source header svg{width:15px;height:15px}.image-wrap{position:relative;background:#12171d}.image-wrap>img{width:100%;height:auto;display:block}.level-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.level-overlay line{stroke:#ff7a45;stroke-width:1.5;stroke-dasharray:6 5}.level-overlay rect{fill:#111;opacity:.85}.level-overlay text{fill:#fff;font-size:20px}.chart-controls{display:flex;flex-wrap:wrap;align-items:center;gap:13px;padding:12px 16px;border-top:1px solid var(--research-line);font-size:11px;color:#637084}.chart-controls label{display:flex;align-items:center;gap:6px;cursor:pointer}.chart-controls input{accent-color:#ff4f00}.chart-controls>span{margin-left:auto}.chart-controls select{max-width:180px;border:1px solid #d4d9e1;border-radius:4px;background:white;font-size:11px;padding:5px}.chart-notice{padding:11px 16px;font-size:12px;color:#74543d;background:#fff7f0}.image-tabs{display:flex;gap:8px;padding:8px 14px}.image-tabs button{background:white;border:1px solid var(--research-line);padding:6px 12px;border-radius:4px;font-size:12px;cursor:pointer}.image-tabs button.selected{border-color:#ff4f00}figcaption{font-size:11px;padding:8px 15px}@media(max-width:600px){.chart-source header{padding:12px}.chart-controls{gap:10px;padding:11px 12px}.chart-controls>span{margin-left:0}}
</style>
