<template>
  <section class="stock-research" :aria-label="layer === 'strategy' ? 'Strategy research' : 'Company research'">
    <div class="stock-section-heading">
      <div><h2>{{ layer === 'strategy' ? 'How different strategies would trade it' : 'Understand the business from both sides' }}</h2>
        <p>{{ layer === 'strategy' ? 'Conditional ideas with entry, exit and invalidation. These methods have not been backtested.' : 'Product quality, lasting demand and growth matter alongside the financial statements.' }}</p></div>
      <span class="stock-subtle">{{ completed }} / {{ items.length * 2 }} cases complete</span>
    </div>
    <div class="research-workbench"><nav class="research-topic-nav" :aria-label="layer==='strategy'?'Investment strategy topics':'Company research topics'"><button v-for="area in items" :key="area.id" :class="{selected:selectedArea===area.id}" :aria-current="selectedArea===area.id?'page':undefined" @click="selectedArea=area.id"><strong>{{ area.name }}</strong><small>{{ ['for','against'].filter(side=>finding(area.id,side)).length }} / 2 cases saved</small></button></nav><div class="research-topic-content">
    <details v-for="area in activeItems" :key="area.id" class="research-area" :open="true">
      <summary class="area-title"><div><h3>{{ area.name }}</h3><p>{{ area.focus }}</p></div><span>{{ ['for','against'].filter(side=>finding(area.id,side)).length }} / 2 cases</span></summary>
      <div class="research-pair">
        <section v-for="side in ['for', 'against']" :key="side" :class="['research-case', side]">
          <div class="case-heading"><h4>{{ side === 'for' ? 'The case for' : 'The case against' }}</h4><span>{{ status(area.id, side) }}</span></div>
          <template v-if="finding(area.id, side)">
            <p class="case-conclusion"><StockEvidenceText :text="finding(area.id, side).conclusion" :sources="run.dossier?.sources || []"/></p>
            <ul class="claim-list"><li v-for="(claim, i) in availableEvidenceItems(finding(area.id, side).claims).filter(claim=>hasEvidenceValue(claim.text))" :key="i">{{ evidenceDisplayText(claim.text) }}
              <span class="source-links"><template v-for="id in claim.evidence_ids" :key="id"><a v-if="source(id)?.url?.startsWith('http')" :href="source(id).url" target="_blank" rel="noopener noreferrer">{{ source(id).title }}</a><span v-else>{{ source(id)?.title || id }}</span></template></span>
            </li></ul>
            <div class="other-side"><strong>Strongest opposing explanation</strong><p><StockEvidenceText :text="finding(area.id, side).strongest_other_side" :sources="run.dossier?.sources || []"/></p></div>
            <dl v-if="layer === 'strategy'" class="strategy-conditions"><div><dt>Metrics used</dt><dd>{{ finding(area.id, side).metrics_used?.join(', ') || 'No verified metric available' }}</dd></div><div><dt>Entry condition</dt><dd>{{ evidenceDisplayText(finding(area.id, side).entry_condition) }}</dd></div><div><dt>Exit condition</dt><dd>{{ evidenceDisplayText(finding(area.id, side).exit_condition) }}</dd></div><div><dt>Invalidation</dt><dd>{{ evidenceDisplayText(finding(area.id, side).invalidation) }}</dd></div><div><dt>Holding period</dt><dd>{{ evidenceDisplayText(finding(area.id, side).holding_period) }}</dd></div></dl>
            <details v-if="finding(area.id, side).change_conditions?.length"><summary>What would change this view?</summary><ul><li v-for="item in finding(area.id, side).change_conditions" :key="item">{{ evidenceDisplayText(item) }}</li></ul></details>
          </template>
          <p v-else class="stock-empty-inline">{{ status(area.id, side) === 'Failed' ? 'This agent could not produce a valid response. Its result has not been substituted.' : status(area.id, side) === 'Running' ? 'This specialist is reading the supplied evidence.' : 'This research task is queued.' }}</p>
        </section>
      </div>
    </details>
    </div></div>
    <section v-if="layer === 'company' && followups.length" class="followup-results"><h3>Additional questions raised by the evidence checker</h3><article v-for="row in followups" :key="row.id"><h4>{{ row.name }} · {{ row.side }}</h4><p>{{ evidenceDisplayText(row.result.conclusion) }}</p><p class="stock-subtle">Opposing explanation: {{ evidenceDisplayText(row.result.strongest_other_side) }}</p></article></section>
  </section>
</template>

<script setup>
import { computed,ref,watch } from 'vue'
import StockEvidenceText from './StockEvidenceText.vue'
import {evidenceDisplayText,hasEvidenceValue,availableEvidenceItems} from '../utils/availableEvidence.mjs'
const props = defineProps({ run: { type: Object, required: true }, items: { type: Array, default: () => [] }, layer: { type: String, default: 'company' } })
const selectedArea=ref('')
const activeItems=computed(()=>props.items.filter(area=>area.id===selectedArea.value))
watch(()=>props.items,items=>{if(!items.some(x=>x.id===selectedArea.value))selectedArea.value=items[0]?.id||''},{immediate:true})
const finding = (area, side) => props.run.research.find(row => row.id === `${props.layer}_${area}_${side}`)?.result
const status = (area, side) => { const value = props.run.roles.find(row => row.id === `${props.layer}_${area}_${side}`)?.status || 'pending'; return value[0].toUpperCase() + value.slice(1) }
const source = id => props.run.dossier?.sources.find(row => row.id === id)
const completed = computed(() => props.run.research.filter(row => row.layer === props.layer && row.result).length)
const followups = computed(() => props.run.research.filter(row => row.layer === 'followup' && row.result))
</script>

<style scoped>
.research-area{padding:28px 0;border-top:1px solid var(--research-line)}.area-title{margin-bottom:18px}.area-title h3{font-size:20px;letter-spacing:-.4px;margin:0 0 4px}.area-title p{font-size:14px;color:var(--research-muted);margin:0}.research-pair{display:grid;grid-template-columns:1fr 1fr;gap:28px}.research-case{min-width:0;padding:0 0 0 16px;border-left:3px solid #39856a}.research-case.against{border-color:#b87546}.case-heading{display:flex;justify-content:space-between;gap:12px;align-items:center}.case-heading h4{margin:0;font-size:15px;color:#23664e}.against .case-heading h4{color:#9b572d}.case-heading span{font-size:12px;color:var(--research-muted)}.case-conclusion{font-size:15px;line-height:1.7}.claim-list{padding-left:19px}.claim-list li{margin:14px 0;line-height:1.65}.source-links{display:flex;flex-wrap:wrap;gap:4px 9px;margin-top:6px;font-size:12px}.source-links a{color:#65748a;text-underline-offset:3px;overflow-wrap:anywhere}.other-side{padding:12px 0;border-top:1px solid var(--research-line);font-size:13px}.other-side strong{font-size:12px;color:var(--research-muted);font-weight:500}.other-side p{margin:5px 0}.strategy-conditions{font-size:13px;margin:16px 0}.strategy-conditions>div{display:grid;grid-template-columns:110px 1fr;gap:12px;padding:9px 0;border-top:1px solid #edf0f4}.strategy-conditions dt{color:var(--research-muted)}.strategy-conditions dd{margin:0}.research-case details{font-size:13px;padding:9px 0}.research-case summary{cursor:pointer}.followup-results article{padding:16px 0;border-bottom:1px solid var(--research-line)}.followup-results h4{margin:0}.stock-empty-inline{color:var(--research-muted);font-size:14px;min-height:70px;padding-top:8px}
@media(max-width:900px){.research-pair{grid-template-columns:1fr;gap:24px}.research-area{padding:23px 0}.strategy-conditions>div{grid-template-columns:95px 1fr}}
.research-area>.area-title{cursor:pointer;display:flex;justify-content:space-between;gap:20px;list-style:none;align-items:start}.research-area>.area-title:after{content:"+";font-size:23px;color:#7b899a;font-weight:300}.research-area[open]>.area-title:after{content:"−"}.research-area>.area-title>span{font-size:11px;white-space:nowrap;color:#8592a4}.research-area:not([open]){padding:21px 0}.research-area:not([open]) .area-title{margin:0}.research-area:not([open]) h3{font-size:18px}
.research-workbench{display:grid;grid-template-columns:190px minmax(0,1fr);gap:28px;margin-top:25px}.research-topic-nav{display:flex;flex-direction:column;gap:4px;align-self:start;position:sticky;top:130px}.research-topic-nav button{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:7px;padding:12px 11px;cursor:pointer;color:#697589}.research-topic-nav strong{display:block;font-size:12px;font-weight:500}.research-topic-nav small{font-size:10px;display:block;margin-top:5px}.research-topic-nav button.selected{background:#fff3ec;color:#ab481b}.research-topic-content{min-width:0}.research-topic-content .research-area{border-top:0;padding-top:0}.research-topic-content .area-title{margin-bottom:22px}.research-topic-content .area-title h3{font-size:23px;font-weight:500}.research-topic-content .area-title p{font-size:13px}.research-topic-content .research-pair{gap:30px}@media(max-width:1000px){.research-workbench{grid-template-columns:minmax(0,1fr);gap:20px}.research-topic-nav{position:static;flex-direction:row;overflow:auto;padding-bottom:6px}.research-topic-nav button{flex:none;width:auto;white-space:nowrap}.research-topic-nav small{display:none}}
</style>
