<template>
  <article class="reference-plan" :class="{selected}" @click="$emit('select')">
    <header><h3><button class="select-scenario" :aria-pressed="selected" @click.stop="$emit('select')">{{ strategyLabel(plan.strategy) }}</button></h3><span class="side-label">{{ plan.side==='long'?'↗ Long':'↘ Short' }} {{ selected?'●':'○' }}</span></header>
    <p class="scenario-description">{{ description }}</p>
    <p class="compact-trigger"><strong>Trigger:</strong> {{ compactTrigger }}</p>
    <div class="execution-script">
      <dl class="reference-prices">
        <div><dt>Entry · {{ plan.side }}</dt><dd>{{ entryPrice }}</dd></div>
        <div><dt>Stop loss · SL</dt><dd>{{ price(plan.stop,plan.level_bases?.stop) }}</dd></div>
        <div v-for="(target,index) in plan.targets" :key="index"><dt>{{ index===0&&plan.target_policy?.fallback_applied?'TP1 · 1.25R calculated':'TP'+(index+1) }}</dt><dd>{{ price(target,plan.level_bases?.targets?.[index]) }}</dd></div>

      </dl>
    </div>
    <div class="card-status"><span :title="'Conservative TP1 R: '+referencePayoff(plan).r+' · eligibility uses unrounded exact-price arithmetic'">{{ statusLabel }} · {{ payoffRLabel(referencePayoff(plan)) }} · TP1 worst fill</span><button class="conditions-toggle" @click.stop="toggleConditions">Conditions ›</button></div>
    <details ref="evidence" class="reference-evidence">
      <summary>Ordered conditions & price basis</summary><p>{{ scenario?.summary }}</p><p><strong>IF</strong> {{ plan.trigger }} <strong>THEN {{ plan.side.toUpperCase() }}</strong> at the entry above.</p><p v-if="quality.explanation_issue" class="reference-warning">{{ quality.explanation_issue }}</p><p v-if="plan.approximate">≈ Screenshot estimates. Current prices and confirmation remain unverified.</p>
      <p><strong>SKIP IF</strong> {{ plan.invalidation }}</p><ol v-if="scenario?.steps?.length"><li v-for="(step,index) in scenario.steps" :key="index">{{ step.condition }}</li></ol>
      <dl class="reference-basis"><div><dt>Entry {{ plan.entry_zone?'zone':'reference' }}</dt><dd>{{ plan.entry_zone?.evidence||plan.level_reasons?.entry||'One observed reference; no entry band is recorded.' }}</dd></div><div><dt>Stop-loss basis</dt><dd>{{ plan.level_reasons?.stop }}</dd></div><div v-for="(reason,index) in plan.level_reasons?.targets||[]" :key="index"><dt>{{ index===0&&plan.target_policy?.fallback_applied?'TP1 · 1.25R calculated':'TP'+(index+1) }} basis</dt><dd>{{ reason }}</dd></div></dl>
      <p v-if="plan.worst_reward_risk?.length">Worst zone fill {{ price(plan.worst_entry) }}: {{ plan.worst_reward_risk.map((value,index)=>`TP${index+1} ${value}R`).join(' · ') }}.</p>
      <p v-if="scenario?.no_trade_reason"><strong>Not ready now:</strong> {{ scenario.no_trade_reason }}</p>
      <p v-if="plan.targets.length===1">Only one supported target is recorded.</p>
    <button v-if="referencePayoff(plan).eligible" @click.stop="$emit('exits',exitPlanKey(run,plan))">Review TP/SL after confirmation</button><p v-else class="reference-warning">Reference only. This setup fails the TP1 ≥1.25R rule and is not eligible for entry.</p></details>
  </article>
</template>
<script setup>
import {computed,ref} from 'vue'
import {referencePayoff,payoffRLabel} from '../utils/payoffPolicy.mjs'
import {strategyLabel,visiblePlanAssessment} from '../utils/tradeDecision.mjs'
import {scenarioDescription,scenarioTrigger} from '../utils/scenarioPresentation.mjs'
import {exitPlanKey} from '../utils/tradeExitPlan.mjs'
const props=defineProps({run:Object,plan:Object,preferred:Boolean,selected:Boolean})
const emit=defineEmits(['exits','select'])
const evidence=ref(null)
const scenario=computed(()=>props.run.verdict?.strategy_scenarios?.find(item=>item.id===props.plan.scenario_id&&item.plan_id===props.plan.plan_id))
const quality=computed(()=>visiblePlanAssessment(props.run,props.plan))
const price=(value,basis)=>(basis==='axis_estimate'?'≈ ':'')+Number(value).toLocaleString('en-US',{maximumFractionDigits:8})
const statusLabel=computed(()=>quality.value.explanation_issue||['unavailable','explanation_review_required','source_review_required'].includes(quality.value.status)?'Source / explanation review':quality.value.status==='payoff_review_required'||(props.plan.worst_reward_risk||props.plan.reward_risk)[0]<1?'Payoff review':'Waiting for confirmation')
const entryPrice=computed(()=>props.plan.entry_zone?`${price(props.plan.entry_zone.lower,props.plan.entry_zone.precision)} – ${price(props.plan.entry_zone.upper,props.plan.entry_zone.precision)}`:price(props.plan.entry,props.plan.level_bases?.entry))
const description=computed(()=>scenarioDescription(props.plan))
const compactTrigger=computed(()=>scenarioTrigger(scenario.value,props.plan))
function toggleConditions(){emit('select');if(evidence.value)evidence.value.open=!evidence.value.open}
function showConditions(){if(evidence.value)evidence.value.open=true}
defineExpose({showConditions})
</script>
<style scoped>
.compact-trigger{font-size:11px!important;line-height:1.5!important;margin:6px 0 9px!important;color:#61738d!important}.card-status{display:flex;justify-content:space-between;align-items:center;gap:9px;font-size:11px;color:#9b5934}.conditions-toggle{border:0!important;background:transparent!important;font-size:11px!important;min-height:0!important;padding:0!important;cursor:pointer;color:#a73508!important}.reference-evidence:not([open]){display:none}.reference-evidence[open]>summary{display:none}.reference-plan .reference-prices>div:last-child{grid-column:auto!important;border-left:1px solid #dce3ec!important;padding-left:10px!important;display:block!important}.reference-plan .reference-prices{margin-bottom:9px!important}.reference-plan .reference-prices dt{font-size:10px}.reference-plan .reference-prices dd{margin-top:2px;font-size:19px!important}.reference-plan .scenario-description{font-size:11px!important;line-height:1.5!important}.reference-plan .reference-evidence[open] p{font-size:12px}

.reference-plan.selected{border-color:#ff4f00;background:#fffaf6}.reference-plan{cursor:pointer}.select-scenario{border:0!important;background:none!important;padding:0!important;min-height:0!important;text-align:left;color:#263547!important;font-size:15px!important;font-weight:600}.scenario-description{font-size:12px!important;margin:0 0 8px!important}.reference-plan .reference-prices{grid-template-columns:repeat(3,minmax(0,1fr));background:transparent;padding:0;gap:10px}.reference-plan .reference-prices dd{font-size:20px}.reference-plan .reference-prices>div{border-left:1px solid #dce3ec;padding-left:10px}.reference-plan .reference-prices>div:first-child{border:0;padding:0}.reference-plan .reference-prices>div:last-child{grid-column:1/-1;border:0;padding:0;display:flex;gap:9px;align-items:center}.reference-plan .reference-prices .reference-r{font-size:13px;margin:0}.reference-plan .reference-trigger{font-size:12px;padding:0;background:transparent;border:0}.reference-plan .reference-note{font-size:10px}.reference-plan .reference-warning{font-size:11px;padding:5px 7px}.reference-plan .side-label{color:#a73508;font-size:12px}.reference-plan{padding:12px!important;margin:0 0 10px!important}.reference-plan header{margin-bottom:5px}.reference-plan .reference-evidence{margin:6px 0}.reference-plan>button{font-size:11px;padding:4px 8px;min-height:28px}

.reference-plan{border:1px solid #dde5ec;background:white;border-radius:7px;padding:16px;margin:12px 0;overflow-wrap:anywhere;scroll-margin-top:70px}
.reference-plan header{display:flex;justify-content:space-between;align-items:baseline;gap:8px 16px;flex-wrap:wrap;margin-bottom:12px}.reference-plan h3{font-size:17px;font-weight:550;line-height:1.4;letter-spacing:-.3px;margin:0}.reference-plan header span,.reference-note{font-size:12px;color:#657387;line-height:1.5}
.reference-prices{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 12px;padding:12px;background:#f7f9fb;border-radius:5px}.reference-prices dt{font-size:12px;color:#607084;line-height:1.4}.reference-prices dd{font-size:24px;font-weight:550;line-height:1.35;margin:4px 0 0;color:#263547;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.reference-prices .reference-r{font-size:21px}
.reference-plan p,.reference-plan li{font-size:13px;line-height:1.6;color:#526174}.reference-trigger,.reference-cancel{margin:8px 0}.reference-trigger{border-left:2px solid #ff4f00;padding:8px 10px;background:#fff8f3}.execution-script strong{color:#303e50}.reference-note{margin:8px 0}.reference-evidence{margin:10px 0}.reference-evidence summary{font-size:13px;color:#914018;cursor:pointer;padding:5px 0}.reference-evidence ol{padding-left:20px;margin:8px 0}
.reference-basis{margin:12px 0;font-size:13px;line-height:1.6}.reference-basis>div{margin:8px 0}.reference-basis dt{font-weight:550;color:#3d4d61}.reference-basis dd{margin:2px 0;color:#647287}.reference-warning{border-left:2px solid #c28961;padding:8px 10px;background:#fff9f2;margin:8px 0}
.reference-plan button{min-height:36px;border:1px solid #e4b897;background:#fff6ef;color:#914018;border-radius:5px;padding:7px 12px;font-size:13px;cursor:pointer}.reference-plan button:focus-visible,.reference-evidence summary:focus-visible{outline:2px solid #a1451b;outline-offset:3px}
@media(max-width:700px){.reference-plan{padding:14px;scroll-margin-top:165px}.reference-prices{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px;gap:12px 10px}.reference-prices dd{font-size:23px}.reference-plan header{align-items:flex-start}.reference-plan h3{font-size:16px}.reference-plan header span{font-size:11px}}

.reference-plan{padding:10px!important}.reference-plan header{margin-bottom:5px;gap:6px}.reference-plan h3{font-size:14px;line-height:1.3}.reference-plan .select-scenario{font-size:14px!important}.reference-plan .scenario-description{margin-bottom:5px!important}.reference-plan .compact-trigger{margin:5px 0 7px!important;line-height:1.4!important}.reference-plan .reference-prices{margin-bottom:7px!important}.reference-plan .reference-prices dd{font-size:18px!important;line-height:1.25!important}.reference-plan .reference-prices dt{font-size:10px;line-height:1.3}.card-status{font-size:10px}.reference-plan .conditions-toggle{font-size:10px!important}.reference-plan .reference-evidence:not([open]){margin:0}
</style>
