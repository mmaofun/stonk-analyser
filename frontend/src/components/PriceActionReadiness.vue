<template>
  <section id="price-action-decision" class="price-action-readiness" :class="assessment.decision" aria-label="Price-action trade decision">
    <p class="readiness-kicker">Price-action decision</p>
    <h3>{{ assessment.decision==='no_trade' ? 'No trade — stand aside' : 'Conditional setup — wait for the trigger' }}</h3>
    <p class="readiness-summary">{{ assessment.summary }}</p>
    <article v-for="(condition,index) in assessment.conditions" :key="index" class="no-trade-condition">
      <header><h4>{{ categoryLabel(condition.category) }}</h4><span>{{ sideLabel(condition.applies_to) }}</span></header>
      <p>{{ condition.explanation }}</p>
      <h5>What would need to change</h5>
      <ul><li v-for="step in condition.reassess_when" :key="step">{{ step }}</li></ul>
      <details><summary>Chart evidence</summary><p>{{ condition.evidence_ids.map(evidenceLabel).join(' · ') }}</p></details>
    </article>
    <p class="readiness-note">These conditions apply to the uploaded snapshot. A change would prompt reassessment; it does not automatically confirm an entry.</p>
  </section>
</template>

<script setup>
const props=defineProps({assessment:{type:Object,required:true},levels:{type:Array,default:()=>[]}})
const categoryLabel=value=>({unclear_structure:'Unclear price structure',choppy_range:'Choppy / overlapping price action',range_middle:'Price in the middle of a range',overextended_up:'Upward move is extended',overextended_down:'Downward move is extended',failed_breakout:'Failed break / reclaim unresolved',unconfirmed_trigger:'Price confirmation is missing',conflicting_timeframes:'Conflicting chart timeframes',poor_location:'Unfavourable entry location',poor_payoff:'Payoff needs review',unclear_invalidation:'No clear structural invalidation',insufficient_chart_evidence:'Insufficient chart evidence'}[value]||value)
const sideLabel=value=>({long:'Avoid a long entry',short:'Avoid a short entry',both:'Avoid both sides'}[value]||value)
const evidenceLabel=id=>{if(id==='OBS:chart')return 'Visible chart structure and limitations';const level=props.levels.find(item=>item.id===id);return level?`${level.kind.replaceAll('_',' ')} ${level.basis==='axis_estimate'?'≈ ':''}${Number(level.price).toLocaleString('en-US',{maximumFractionDigits:8})}`:id}
</script>

<style scoped>
#price-action-decision{scroll-margin-top:20px}
.price-action-readiness{border:1px solid #ddd5c9;border-left:3px solid #9b763e;background:#fbf8f2;padding:19px 20px;margin:20px 0;color:#524a3f;overflow-wrap:anywhere}.price-action-readiness.conditional_setup{border-color:#d4dcdf;border-left-color:#587685;background:#f6f8f9;color:#48545c}.readiness-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.09em;margin:0 0 6px;color:#837565}.price-action-readiness h3{font-size:23px;font-weight:500;letter-spacing:-.02em;line-height:1.3;margin:0 0 10px;color:#57442d}.conditional_setup h3{color:#405b67}.readiness-summary{font-size:13px;line-height:1.7;margin:0}.no-trade-condition{border-top:1px solid #e3dbd0;margin-top:18px;padding-top:16px}.no-trade-condition header{display:flex;gap:10px;align-items:baseline;justify-content:space-between}.no-trade-condition h4{font-size:14px;font-weight:500;margin:0}.no-trade-condition header span{font-size:10px;white-space:nowrap;color:#8b6c42}.no-trade-condition p,.no-trade-condition li{font-size:12px;line-height:1.7}.no-trade-condition h5{font-size:11px;font-weight:600;margin:13px 0 5px}.no-trade-condition ul{padding-left:17px;margin:4px 0 10px}.no-trade-condition li{margin:5px 0}.no-trade-condition details{font-size:10px;color:#847c70}.no-trade-condition summary{cursor:pointer;width:fit-content;text-decoration:underline;text-underline-offset:3px}.no-trade-condition summary:focus-visible{outline:2px solid #d0612c;outline-offset:3px}.no-trade-condition details p{font-size:10px}.readiness-note{font-size:10px;line-height:1.7;color:#8a8175;margin:17px 0 0}@media(max-width:600px){.price-action-readiness{padding:16px}.no-trade-condition header{align-items:flex-start;flex-direction:column;gap:4px}.price-action-readiness h3{font-size:21px}}
</style>
