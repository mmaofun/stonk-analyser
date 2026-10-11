<template>
  <section class="assessment-summary" aria-label="Assessment summary">
    <header>Assessment</header>
    <div class="summary-body"><span class="decision" :class="{'no-trade':noTrade}">{{ noTrade?'No trade':plans.length?'Conditional setup':'No entry confirmed' }}</span><h2>{{ biasLabel }}</h2><p>{{ run.verdict.bias_reason||run.verdict.trade_readiness?.summary||run.verdict.headline }}</p>
      <div v-if="coverage" class="review-coverage"><span>{{ coverage.reviewed }} / {{ coverage.expected }} perspectives reviewed</span><progress :value="coverage.reviewed" :max="coverage.expected" aria-label="Trader perspective review coverage"></progress><button @click="$emit('discussion')">Read the discussion <ResearchIcon name="arrow"/></button></div>
      <button v-else class="discussion-link" @click="$emit('discussion')">Read the discussion <ResearchIcon name="arrow"/></button>
    </div>
  </section>
</template>
<script setup>
import {computed} from 'vue'
import ResearchIcon from './ResearchIcon.vue'
import {isNoTrade,visibleTradePlans} from '../utils/tradeDecision.mjs'
const props=defineProps({run:{type:Object,required:true}})
defineEmits(['discussion'])
const noTrade=computed(()=>isNoTrade(props.run)),plans=computed(()=>visibleTradePlans(props.run)),coverage=computed(()=>props.run.verdict.trader_view_coverage)
const biasLabel=computed(()=>({bullish:'Bullish lean',bearish:'Bearish lean',mixed:'Mixed / sideways',no_setup:'Direction unclear'}[props.run.verdict.bias]||'Direction unclear'))
</script>
<style scoped>
.assessment-summary{border:1px solid var(--research-line);border-radius:7px;overflow:hidden;display:flex;flex-direction:column;min-width:0}.assessment-summary header{padding:12px 17px;background:#f7f7f8;font-size:15px;font-weight:600}.summary-body{padding:23px 21px;flex:1;display:flex;flex-direction:column;align-items:flex-start}.decision{display:inline-block;font-size:12px;font-weight:500;border-radius:4px;padding:4px 9px;background:#f1f3f5;color:#374250}.decision.no-trade{background:#fff0d7;color:#966000}.assessment-summary h2{font-size:32px;letter-spacing:-1.1px;line-height:1.15;font-weight:600;margin:20px 0 14px}.summary-body>p{font-size:14px;line-height:1.65;color:#424c5a}.review-coverage{width:100%;padding-top:21px;margin-top:auto}.review-coverage>span{display:block;font-size:11px;color:#697589;border-top:1px solid var(--research-line);padding-top:20px}.review-coverage progress{display:block;width:100%;height:7px;appearance:none;border:0;background:#eee;border-radius:8px;margin-top:9px}.review-coverage progress::-webkit-progress-bar{background:#eee;border-radius:8px}.review-coverage progress::-webkit-progress-value{background:#ff4f00;border-radius:8px}.review-coverage progress::-moz-progress-bar{background:#ff4f00;border-radius:8px}.review-coverage button,.discussion-link{display:flex;align-items:center;justify-content:space-between;gap:15px;width:100%;border:0;background:none;color:#a73508;font-size:13px;padding:20px 0 0;cursor:pointer;text-align:left}.review-coverage button svg,.discussion-link svg{width:18px}.review-coverage button:hover,.discussion-link:hover{text-decoration:underline}@media(max-width:1150px) and (min-width:801px){.assessment-summary h2{font-size:26px}.summary-body{padding:20px 16px}.summary-body>p{font-size:13px}}@media(max-width:600px){.summary-body{padding:20px}.assessment-summary h2{font-size:29px}}
</style>
