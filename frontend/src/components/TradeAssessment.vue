<template>
  <section id="trade-assessment" class="trade-assessment">
    <div class="bias-heading">
      <div><p class="eyebrow">{{ modern ? 'Chart bias' : 'Saved assessment' }}</p><h2 :class="verdict.bias">{{ biasLabel }}</h2></div>
      <span class="action-state">{{ actionLabel }}</span>
    </div>
    <p class="bias-context">{{ verdict.bias_timeframe || run.observation?.chart_timeframes?.join(' + ') || 'Uploaded chart' }}<span v-if="modern"> · {{ verdict.bias_reason }}</span></p>
    <ConditionalActionPaths v-if="showPaths" :run="run" />
    <PriceActionReadiness v-if="verdict.trade_readiness" :assessment="verdict.trade_readiness" :levels="run.observation?.levels || []" />
    <p v-if="verdict.trader_view_coverage" class="trader-coverage"><strong>{{ verdict.trader_view_coverage.reviewed }} / {{ verdict.trader_view_coverage.expected }} trader perspectives reviewed</strong><span>Every final thesis and its individual evidence review was supplied to this assessment, including opposing and waiting views.</span><a href="?network=traders#agent-interactions">Inspect each trader’s review</a></p>
    <details v-if="verdict.trader_view_coverage && verdict.simulation_takeaway" class="bias-details"><summary>What the trader discussion added</summary><p>{{ verdict.simulation_takeaway }}</p></details>
    <p v-if="!modern" class="legacy-note">This earlier report combines direction and setup readiness. Reanalyse these charts below to get the separate bias and action view.</p>
    <h3 class="assessment-headline">{{ verdict.headline }}</h3>
    <div v-if="verdict.next_move" class="next-move"><h3>Likely next move</h3><p>{{ verdict.next_move }}</p></div>
    <details v-if="!chartMode && verdict.horizon_note" class="legacy-context"><summary>Original report context</summary><p>{{ verdict.horizon_note }}</p><p>Reanalyse these charts for the current chart-only workflow.</p></details>

    <section id="trade-action" class="action-section">
      <div class="action-heading"><h3>{{ isFutureReferenceReport(run)?'Future reference plans · current readiness separate':noTrade ? 'No entry proposed' : firstNeedsReview ? quality(0).action_label : 'Suggested action' }}</h3><span>Confirmation is not checked live</span></div>
      <template v-if="plans.length">
        <article v-for="(plan,index) in plans" :id="`trade-plan-${index}`" :key="index" class="trade-plan">
          <div class="plan-heading"><h4>{{ plan.side === 'long' ? 'Conditional long' : 'Conditional short' }} <span>near {{ price(plan.entry,plan.level_bases?.entry) }}</span></h4><span>{{ quality(index).status==='explanation_review_required' ? 'Explanation needs review' : quality(index).status==='payoff_review_required' ? 'Reference scenario · payoff review needed' : index ? 'Alternative scenario' : 'Conditional scenario' }}</span></div>
          <div v-if="quality(index).status==='payoff_review_required'" class="payoff-verdict"><strong>The price levels exist, but the payoff needs review.</strong><p>Risk to the stop: {{ price(quality(index).risk_per_unit) }} per unit. Reward to TP1: {{ price(quality(index).reward_per_unit[0]) }} per unit. That is {{ quality(index).reward_risk[0] }}R to the first target, before costs.</p><p>Waiting for the trigger does not fix this ratio. The overall result also depends on how much is exited at each target and what happens afterwards.</p></div>
          <div v-if="quality(index).explanation_issue" class="payoff-verdict"><strong>Price math and explanation disagree.</strong><p>{{ quality(index).explanation_issue }}</p><p>Calculated reward: {{ price(quality(index).reward_per_unit[0]) }}. Risk: {{ price(quality(index).risk_per_unit) }}. Reward/risk: {{ quality(index).reward_risk[0] }}:1 before costs.</p></div>
          <p v-if="plan.strategy" class="scope">{{ strategyLabel(plan.strategy) }}</p><p class="trigger"><strong>Only if:</strong> {{ plan.trigger }}</p>
          <p v-if="plan.scope==='chart_setup'" class="scope">{{ plan.timeframe || verdict.bias_timeframe || 'Visible chart' }} setup · Follow the price confirmation and invalidation below.</p>
          <dl class="trade-prices">
            <div><dt>Entry</dt><dd>{{ price(plan.entry,plan.level_bases?.entry) }}</dd></div>
            <div class="stop"><dt>SL · Stop-loss</dt><dd>{{ price(plan.stop,plan.level_bases?.stop) }}</dd></div>
            <div><dt>TP1 · Take-profit 1</dt><dd>{{ price(plan.targets[0],plan.level_bases?.targets?.[0]) }}</dd><small>{{ (quality(index).reward_risk || plan.reward_risk)[0] }}:1 reward/risk</small></div>
            <div><dt>TP2 · Take-profit 2</dt><dd v-if="plan.targets.length>1">{{ price(plan.targets[1],plan.level_bases?.targets?.[1]) }}</dd><small v-if="plan.targets.length>1">{{ (quality(index).reward_risk || plan.reward_risk)[1] }}:1 reward/risk</small><p v-else class="missing-target">No second target supported by this chart</p></div>
          </dl>
          <p v-if="plan.reward_risk[0]<1 && !quality(index).status" class="reward-note"><strong>TP1 is closer than the stop.</strong> The first target offers {{ plan.reward_risk[0] }}:1 reward/risk before costs. The payoff needs review before considering entry.</p>
          <section v-if="quality(index).snapshot_comparison" class="entry-comparison">
            <h5>Why wait instead of entering earlier?</h5>
            <p>An entry at the price shown in the image would anticipate the move. The proposed entry requires the confirmation above. Different prices change the payoff; they do not establish which strategy is more likely to work.</p>
            <div class="comparison-scroll"><table><thead><tr><th>Entry reference</th><th>Price</th><th>Risk / unit</th><th>TP1 R</th><th v-if="plan.targets.length>1">TP2 R</th></tr></thead><tbody>
              <tr><td>Planned trigger</td><td>{{ price(plan.entry) }}</td><td>{{ price(quality(index).risk_per_unit) }}</td><td>{{ quality(index).reward_risk[0] }}</td><td v-if="plan.targets.length>1">{{ quality(index).reward_risk[1] }}</td></tr>
              <tr><td>Image price · hypothetical</td><td>{{ price(quality(index).snapshot_comparison.entry) }}</td><td>{{ price(quality(index).snapshot_comparison.risk_per_unit) }}</td><td>{{ quality(index).snapshot_comparison.reward_risk[0] }}</td><td v-if="plan.targets.length>1">{{ quality(index).snapshot_comparison.reward_risk[1] }}</td></tr>
            </tbody></table></div>
            <p class="comparison-note">Same stop and targets, before costs. The image price is not a live quote or an instruction to enter now.</p>
          </section>
          <p v-if="plan.rationale" class="rationale"><strong>Why this setup:</strong> {{ plan.rationale }}</p>
          <div v-if="plan.level_reasons" class="level-reasons"><h5>Why these prices</h5><p><strong>Entry:</strong> {{ plan.level_reasons.entry }}</p><p><strong>SL:</strong> {{ plan.level_reasons.stop }}</p><p v-for="(reason,i) in plan.level_reasons.targets" :key="i"><strong>TP{{ i+1 }}:</strong> {{ reason }}</p></div>
          <p class="invalidation"><strong>Cancel the idea if:</strong> {{ plan.invalidation }}</p>
          <p class="precision-note">{{ plan.approximate ? '≈ marks a visual estimate from the chart axis. Confirm the exact prices before using the plan.' : plan.price_precision }} Reward/risk excludes fees, spread and slippage.</p>
        </article>
      </template>
      <div v-else class="no-plan"><h4>{{ noTrade ? 'Stand aside under the current chart conditions' : verdict.bias==='bullish' ? 'Bullish lean; wait for a defined entry' : verdict.bias==='bearish' ? 'Bearish lean; wait for a defined entry' : 'Wait for clearer structure' }}</h4><p>{{ verdict.no_plan_reason || verdict.trade_readiness?.summary || 'This report did not identify a grounded entry, stop and target. A directional lean alone does not supply those prices.' }}</p><dl class="unavailable-prices"><div v-for="label in ['Entry','SL','TP1','TP2']" :key="label"><dt>{{ label }}</dt><dd>{{ noTrade ? 'Not proposed' : 'Not established' }}</dd></div></dl></div>
    </section>
    <details class="bias-details"><summary>Full reasoning behind this bias</summary><p class="explanation">{{ verdict.explanation }}</p></details>
    <div v-if="verdict.wait_for?.length" class="next-steps"><h3>{{ plans.length ? 'Confirmation checklist' : 'What would make a setup clearer' }}</h3><ul><li v-for="item in verdict.wait_for" :key="item">{{ item }}</li></ul></div>
    <p v-for="note in verdict.validation_notes || []" :key="note" class="validation-note">{{ note }}</p>
    <p class="research-note">Screenshot assessment · triggers are not monitored live · no validated win probability</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import PriceActionReadiness from './PriceActionReadiness.vue'
import ConditionalActionPaths from './ConditionalActionPaths.vue'
import {isNoTrade,visibleTradePlans,tradeActionLabel,visiblePlanAssessment,strategyLabel,isFutureReferenceReport} from '../utils/tradeDecision.mjs'
const props=defineProps({run:{type:Object,required:true},now:{type:Number,default:()=>Date.now()},showPaths:{type:Boolean,default:true}})
const verdict=computed(()=>props.run.verdict),plans=computed(()=>visibleTradePlans(props.run)),modern=computed(()=>props.run.version>=3)
const noTrade=computed(()=>isNoTrade(props.run)),actionLabel=computed(()=>tradeActionLabel(props.run))
const chartMode=computed(()=>props.run.analysis_mode==='chart_next_move')
const quality=index=>visiblePlanAssessment(props.run,plans.value[index])
const firstNeedsReview=computed(()=>['payoff_review_required','explanation_review_required'].includes(quality(0).status))
const biasLabel=computed(()=>({bullish:'Bullish lean',bearish:'Bearish lean',mixed:'Mixed / sideways',no_setup:'Direction unclear'}[verdict.value.bias]||'Direction unclear'))
const price=(value,basis)=>value==null?'Not established':(basis==='axis_estimate'?'≈ ':'')+Number(value).toLocaleString('en-US',{maximumFractionDigits:8})
</script>

<style scoped>
.trader-coverage{padding:12px 14px;border-left:2px solid #54766a;background:#f3f7f5;font-size:11px;margin:18px 0;color:#5d7068}.trader-coverage strong,.trader-coverage span{display:block}.trader-coverage strong{font-weight:500;color:#365d50}.trader-coverage a{color:#365d50;text-underline-offset:3px;display:inline-block;margin-top:5px}
.next-move{background:#f7f7f8;border-left:3px solid #ff4f00;padding:14px 16px;margin:18px 0}.next-move h3{font-size:15px;font-weight:500;margin:0 0 8px}.next-move p{font-size:13px;color:#666;margin:0}.legacy-context{font-size:11px;color:#888;margin:16px 0}.legacy-context summary{cursor:pointer}.legacy-context p{margin:8px 0}
.payoff-verdict{border-left:3px solid #ab7041;background:#fff7ed;padding:13px 15px;color:#78532f;font-size:12px;margin:18px 0}.payoff-verdict>strong{font-weight:600}.payoff-verdict p{margin:8px 0 0}.entry-comparison{border-top:1px solid #ddd;margin:22px 0;padding-top:18px}.entry-comparison h5{font-size:14px;font-weight:500;color:#333;margin:0 0 10px}.entry-comparison p{font-size:12px;color:#777}.comparison-scroll{overflow-x:auto;margin:12px 0}.entry-comparison table{border-collapse:collapse;width:100%;font-size:11px}.entry-comparison th,.entry-comparison td{padding:9px 12px 9px 0;border-bottom:1px solid #ddd;text-align:left;white-space:nowrap;font-variant-numeric:tabular-nums}.entry-comparison th{font-weight:500;color:#888}.entry-comparison .comparison-note{font-size:11px}
.reward-note{border-left:3px solid #b68a52;background:#fff9ef;padding:12px 14px;font-size:12px;color:#80623c}.trade-assessment,.action-section{scroll-margin-top:20px}.bias-details{font-size:12px;color:#777;margin:20px 0}.bias-details summary{cursor:pointer;color:#444}.bias-details .explanation{margin-top:12px}
.trade-assessment{color:#25252a;font:14px/1.7 'Helvetica Neue',Helvetica,Arial,sans-serif}.bias-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:6px 0}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#85858b;margin:0 0 5px}.bias-heading h2{font-size:36px;line-height:1.15;letter-spacing:-.03em;font-weight:500;margin:0}.bias-heading h2.bearish{color:#aa3c32}.bias-heading h2.bullish{color:#2c7655}.action-state{border:1px solid #d7c4b6;background:#fff8f2;padding:7px 10px;font-size:11px;color:#815c42;white-space:nowrap}.bias-context{font-size:12px;color:#78787e;margin:12px 0 23px}.assessment-headline{font-size:19px;line-height:1.4;font-weight:500;margin:0 0 12px;letter-spacing:-.02em}.explanation{color:#696971;font-size:13px}.horizon-note,.legacy-note{font-size:12px;color:#777;background:#f7f7f8;padding:13px 15px;border-left:2px solid #ccc;margin:18px 0}.horizon-note strong,.horizon-note span{display:block}.horizon-note span{margin-top:4px}.action-section{margin-top:26px}.action-heading,.plan-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.action-heading h3{font-size:19px;font-weight:500;margin:0}.action-heading>span,.plan-heading>span{font-size:10px;color:#85858b}.trade-plan{border:1px solid #d5d5d9;padding:22px;margin-top:14px}.plan-heading h4{font-size:23px;font-weight:500;letter-spacing:-.02em;line-height:1.3;margin:0}.plan-heading h4 span{display:block;font-size:17px;margin-top:4px}.trigger{border-left:3px solid #ff4f00;padding:10px 12px;background:#fff7f1;color:#69492f;font-size:13px;margin:18px 0 8px}.scope{font-size:11px;color:#888;margin:10px 0}.trade-prices{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ddd;border-left:1px solid #ddd;margin:20px 0}.trade-prices>div{padding:16px 12px;border-right:1px solid #ddd;border-bottom:1px solid #ddd;min-width:0}.trade-prices dt{color:#777;font-size:11px}.trade-prices dd{font-size:24px;line-height:1.4;font-weight:500;font-variant-numeric:tabular-nums;margin:5px 0 0;overflow-wrap:anywhere}.trade-prices .stop dd{color:#aa3c32}.trade-prices small{font-size:10px;color:#999}.rationale,.invalidation{color:#606069;font-size:13px;margin:16px 0}.level-reasons{margin:19px 0;font-size:12px;color:#777}.level-reasons h5{font-size:12px;color:#303039;font-weight:600;margin:0 0 9px}.level-reasons p{margin:8px 0}.precision-note,.research-note{font-size:11px;color:#929299;margin:16px 0 0}.next-steps{margin:24px 0}.next-steps h3{font-size:16px;font-weight:500}.next-steps ul{padding-left:18px;color:#72727a;font-size:12px}.next-steps li{margin:10px 0}.no-plan{padding:20px;background:#f7f7f8;margin-top:14px}.no-plan h4{font-size:16px;font-weight:500;margin:0 0 8px}.no-plan p,.missing-target{font-size:12px;color:#888}.unavailable-prices{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:17px 0 0}.unavailable-prices dt{font-size:11px;color:#777}.unavailable-prices dd{font-size:11px;color:#999;margin:4px 0 0}.validation-note{font-size:12px;color:#976044}.trade-assessment p{overflow-wrap:anywhere}@media(max-width:600px){.bias-heading{align-items:flex-start;flex-direction:column;gap:12px}.bias-heading h2{font-size:31px}.action-heading{align-items:flex-start;flex-direction:column;gap:3px}.trade-plan{padding:16px}.plan-heading{align-items:flex-start}.plan-heading>span{text-align:right;max-width:75px}.trade-prices dd{font-size:21px}.trade-prices>div{padding:12px 10px}.unavailable-prices{grid-template-columns:1fr 1fr}}
</style>
