<template>
  <section id="conditional-actions" class="conditional-actions" aria-label="Long and short conditions">
    <header><h3>What needs to happen next</h3><p>Conditions are not monitored live.</p></header>
    <details v-if="run.verdict?.strategy_assessments" class="strategy-review" open><summary>Approaches reviewed · {{ paths.length }} distinct scenarios</summary><ul><li v-for="assessment in run.verdict.strategy_assessments" :key="assessment.strategy"><strong>{{ strategyName(assessment.strategy) }} · {{ assessment.outcome.replaceAll('_',' ') }}</strong><p>{{ assessment.reason }}</p></li></ul><p v-for="coverage in run.verdict.side_coverage" :key="coverage.side"><strong>{{ coverage.side }} coverage:</strong> {{ coverage.reason }}</p></details>
    <div v-if="paths.length" class="path-grid">
      <article v-for="path in paths" :key="path.id || path.side" class="action-path" :class="path.side">
        <div class="path-heading"><h4>{{ path.strategy ? strategyName(path.strategy) + ' · ' + path.side : path.side === 'long' ? 'Long if…' : 'Short if…' }}</h4><span>{{ statusLabel(path.status) }}</span></div>
        <p v-if="path.no_trade_reason" class="cancel"><strong>No trade for this setup:</strong> {{ path.no_trade_reason }}</p>
        <p v-if="path.timeframe" class="path-timeframe">On the supplied {{ path.timeframe }} chart</p>
        <ol v-if="path.steps.length" class="path-steps"><li v-for="(step,index) in path.steps" :key="index"><span class="step-number" aria-hidden="true">{{ index+1 }}</span><p>{{ step.condition }}</p></li></ol>
        <p v-if="path.invalidation" class="cancel"><strong>Cancel this idea if:</strong> {{ path.invalidation.condition }}</p>
        <div class="path-outcome">
          <template v-if="['conditional_entry','conditional_reference'].includes(path.action)"><strong>Then: {{ path.action==='conditional_reference'?'reassess this future reference':'consider the conditional' }} {{ path.side }}</strong><p>Only after every condition holds, review entry, stop, targets and payoff.</p><a :href="`#trade-plan-${path.plan_index}`" @click="$emit('plan')">View {{ path.side }} entry, stop and targets ↓</a><a href="#trade-exit-planner" class="exit-plan-link" @click.prevent="$emit('exit-plan',exitPlanKey(run,visibleTradePlans(run)[path.plan_index]))">Review TP/SL after confirmation</a></template>
          <template v-else-if="['conditional','developing'].includes(path.status)"><strong>Then: reassess the {{ path.side }} setup</strong><p>These changes would make this side worth reviewing. A supported entry, stop and target must be established before entry.</p></template>
          <template v-else><strong>Wait for more evidence</strong><p>{{ path.status==='historical' ? 'This sequence is historical; its earlier entry is no longer available.' : path.status==='invalidated' ? 'The visible structure invalidated this idea.' : 'The supplied chart does not establish an actionable sequence for this idea.' }}</p></template>
        </div>
        <p v-if="!['conditional','developing'].includes(path.status)" class="path-summary">{{ path.summary }}</p>
        <details v-if="path.steps.length || path.evidence_ids?.length"><summary>Context and chart levels</summary><p>{{ path.summary }}</p><ul><li v-for="level in pathLevels(path)" :key="level.id"><strong>{{ level.kind.replaceAll('_',' ') }} · {{ price(level) }}</strong><span>{{ level.evidence }}</span></li></ul></details>
      </article>
    </div>
    <p v-else-if="Array.isArray(run.verdict?.strategy_scenarios)" class="legacy-paths">No supported scenario was established from this snapshot. Review the approach assessments above and supply clearer or later chart evidence before reassessing an entry.</p>
    <p v-else-if="run.observation?.is_chart===false" class="legacy-paths">Neither path can be established from this image. Upload a market chart with readable price action and a price scale.</p>
    <p v-else class="legacy-paths">This saved report does not include the two-path checklist. Use “Update conditions / assessment” below to build one from its saved discussion, or reanalyse the charts for a new agent debate.</p>
    <p v-if="run.reassessed_from_run_id && paths.length" class="path-note">These paths were synthesized from the saved discussion. Reanalyse the charts to have the agents debate the conditions again.</p>
    <p class="path-note">If none of these scenarios develops, keep waiting. Triggers are not monitored live; a new chart is needed to assess later price action.</p>
  </section>
</template>

<script setup>
import {computed} from 'vue'
import {visibleActionPaths,strategyLabel,visibleTradePlans} from '../utils/tradeDecision.mjs'
import {exitPlanKey} from '../utils/tradeExitPlan.mjs'
const props=defineProps({run:{type:Object,required:true}})
defineEmits(['plan','exit-plan'])
const paths=computed(()=>visibleActionPaths(props.run))
const pathLevels=path=>{
  const ids=new Set([...(path.evidence_ids||[]), ...[...path.steps,...(path.invalidation?[path.invalidation]:[])].flatMap(step=>step.level_ids)])
  return (props.run.observation?.levels||[]).filter(level=>ids.has(level.id))
}
const strategyName=strategyLabel
const statusLabel=status=>({developing:'Developing · conditions pending',historical:'Historical · no entry',invalidated:'Invalidated · no entry',insufficient_evidence:'Insufficient evidence',unavailable:'Not established',conditional:'Waiting for conditions'}[status]||status)
const price=level=>(level.basis==='axis_estimate'?'≈ ':'')+Number(level.price).toLocaleString('en-US',{maximumFractionDigits:8})
</script>

<style scoped>
.strategy-review{background:#fff8f2;border-left:2px solid #ff4f00;padding:14px 16px;margin-bottom:18px;font-size:12px}.strategy-review summary{cursor:pointer;font-weight:500}.strategy-review ul{padding-left:18px}.strategy-review li{margin:12px 0}.strategy-review p{color:#68717e;line-height:1.65;margin:5px 0}.exit-plan-link{display:block!important;margin-top:11px!important}.conditional-actions{scroll-margin-top:24px;margin:29px 0;color:#1b2028;overflow-wrap:anywhere}.conditional-actions>header{display:flex;align-items:baseline;gap:18px;margin:0 0 15px}.conditional-actions h3{font-size:21px;font-weight:600;letter-spacing:-.5px;line-height:1.3;margin:0}.conditional-actions header>p{font-size:11px;color:#6e7888;margin:0}.path-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px}.action-path{border:1px solid #e0e5ed;border-radius:7px;padding:20px;min-width:0;background:#fff;display:flex;flex-direction:column}.path-heading{display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap}.path-heading h4{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:600;letter-spacing:-.5px;line-height:1.3;margin:0;color:#111}.path-heading h4:before{content:'';width:10px;height:10px;border-radius:50%;background:#579876;flex:0 0 10px}.short .path-heading h4:before{background:#bb665b}.path-heading>span{font-size:10px;color:#707b8b}.path-summary{font-size:13px;line-height:1.7;margin:13px 0}.path-timeframe{font-size:10px;color:#7b8390;margin:8px 0 0;padding-left:20px}.path-steps{list-style:none;padding:0;margin:6px 0 12px;flex:1}.path-steps li{display:flex;align-items:flex-start;gap:11px;margin:14px 0}.step-number{border-radius:50%;background:#f1f2f4;width:25px;height:25px;flex:0 0 25px;text-align:center;font-size:11px;line-height:25px;color:#454d58}.path-steps p{font-size:13px;line-height:1.65;margin:0}.cancel{font-size:12px;border-top:1px solid #e5e8ed;padding-top:13px;line-height:1.65;color:#596273}.cancel strong{color:#242a34;font-weight:500}.path-outcome{padding-top:13px;margin-top:5px;font-size:12px;line-height:1.6}.path-outcome strong{font-weight:500;color:#242a34}.path-outcome p{font-size:11px;color:#77808d;margin:5px 0}.path-outcome a{color:#a73508;text-underline-offset:3px;font-size:12px;display:inline-block;margin-top:4px}.path-note,.legacy-paths{font-size:11px;color:#77808d;line-height:1.65}.path-note{margin-top:10px}.legacy-paths{padding:15px;background:#f7f7f8;border-left:2px solid #ccc}.action-path details{font-size:11px;margin-top:13px;color:#747e8b}.action-path summary{cursor:pointer;text-decoration:underline;text-underline-offset:3px;width:fit-content}.action-path a:focus-visible,.action-path summary:focus-visible{outline:2px solid #b83900;outline-offset:4px}.action-path details>p{font-size:12px;line-height:1.7;margin-top:10px}.action-path details ul{padding-left:16px}.action-path details li{margin:9px 0}.action-path details strong,.action-path details span{display:block;font-size:11px;line-height:1.6}.action-path details strong{font-weight:500;color:#555f6d}@media(max-width:1000px) and (min-width:801px){.path-grid{grid-template-columns:1fr}}@media(max-width:600px){.path-grid{grid-template-columns:1fr}.action-path{padding:17px}.conditional-actions>header{flex-direction:column;gap:6px}.conditional-actions h3{font-size:21px}}
</style>
