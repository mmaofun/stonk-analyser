<template>
  <section v-if="display.show" class="evidence-resolution" aria-label="Evidence checks">
    <div class="evidence-heading"><span class="evidence-mark" aria-hidden="true">{{ display.active?'◌':'✓' }}</span><div><h3>{{ display.title }}</h3><p>{{ display.summary }}</p></div></div>
    <p v-if="display.active" class="resolution-note" role="status">Research continues automatically. Your saved findings are retained.</p>
    <template v-else-if="completed">
      <details class="additional-checks"><summary>Check details</summary>
        <p>Automatic checks run during analysis. Further checks are available for new material or a response that needs another attempt.</p>
        <p v-if="loading" role="status">Reading evidence details…</p><p v-else-if="!plan?.available" class="resolution-note">{{ plan?.reason||'No structured evidence check is available.' }}</p>
        <template v-if="plan?.available"><p>At most {{ plan.limits?.roles||4 }} missing roles, {{ plan.limits?.searches||3 }} targeted searches and {{ plan.limits?.model_calls||24 }} model calls in a separate linked attempt.</p>
          <p v-if="overLimit" role="status">Choose at most four missing roles and three evidence questions.</p>
          <button :disabled="busy||submitting||loading||!selected.length||overLimit" @click="start">{{ submitting?'Starting check…':'Check for new material' }}</button>
        </template>
        <p v-if="error" role="alert" class="resolution-error">{{ error }}</p>
        <ul v-if="calendarLinks.length"><li v-for="item in calendarLinks" :key="item"><a :href="item" target="_blank" rel="noopener noreferrer">Official session calendar ↗</a></li></ul>
        <p v-if="run.resolution">{{ display.outcomeLabel }} · {{ display.newSources }} new source snapshots. {{ run.resolution.provenance }}</p>
        <p v-if="plan?.dependencies">{{ plan.dependencies }}</p>
      </details>
    </template>
  </section>
</template>
<script setup>
import {computed,ref,watch,onBeforeUnmount} from 'vue'
import {stockRequest} from '../api/stocklab'
import {evidenceResolutionView} from '../utils/evidenceResolutionView.mjs'
const props=defineProps({run:Object,busy:Boolean})
const emit=defineEmits(['started','busy'])
const plan=ref(null),selected=ref([]),loading=ref(false),submitting=ref(false),error=ref(''),requestKey=ref('');let generation=0,disposed=false
const completed=computed(()=>['complete','complete_with_gaps'].includes(props.run?.status))
const display=computed(()=>evidenceResolutionView(props.run,plan.value))
const overLimit=computed(()=>{const gaps=(plan.value?.gaps||[]).filter(g=>selected.value.includes(g.id));return gaps.filter(g=>['role','investor'].includes(g.kind)).length>4||gaps.filter(g=>g.kind==='evidence').length>3})
const calendarLinks=computed(()=>{const value=plan.value?.price_check?.calendar_provenance;return (Array.isArray(value)?value:typeof value==='string'?[value]:value?.urls||value?.sources||(value?.source_url?[value.source_url]:[])).filter(url=>typeof url==='string'&&/^https:\/\//.test(url))})
watch(()=>[props.run?.id,props.run?.status,props.run?.updated_at],async()=>{const token=++generation;plan.value=null;error.value='';if(!completed.value)return;loading.value=true;try{const result=await stockRequest('/analyses/'+props.run.id+'/evidence-gaps');if(disposed||token!==generation)return;if(!result.plan||!Array.isArray(result.plan.gaps))throw new Error('Evidence details are temporarily unavailable.');plan.value=result.plan;selected.value=display.value.defaultSelection;requestKey.value=crypto.randomUUID()}catch(e){if(!disposed&&token===generation)error.value=e.message}finally{if(!disposed&&token===generation)loading.value=false}},{immediate:true})
watch(selected,()=>{if(!submitting.value)requestKey.value=crypto.randomUUID()},{deep:true})
async function start(){if(submitting.value||props.busy||overLimit.value||!plan.value?.available||!selected.value.length)return;submitting.value=true;emit('busy',true);error.value='';try{const result=await stockRequest('/analyses/'+props.run.id+'/resolve-evidence',{method:'POST',headers:{'Idempotency-Key':requestKey.value},body:JSON.stringify({version:plan.value.version,gap_ids:selected.value})});if(disposed)return;if(result.no_op)error.value='No material gaps were selected; no calls were spent.';else emit('started',result.id)}catch(e){if(!disposed)error.value=e.message}finally{if(!disposed){submitting.value=false;emit('busy',false)}}}
onBeforeUnmount(()=>{disposed=true;generation++;if(submitting.value){submitting.value=false;emit('busy',false)}})
</script>
<style scoped>
.evidence-resolution{font-size:12px;color:#687b90;border:1px solid #e4eaf0;border-radius:7px;padding:12px 15px;margin:14px 0;background:#fff}.evidence-heading{display:flex;align-items:center;gap:10px}.evidence-mark{flex:none;width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#f1f7f3;color:#5e9278}.evidence-heading h3{font-size:13px;font-weight:550;margin:0 0 3px;color:#42586d}.evidence-heading p{margin:0;font-size:11px;line-height:1.6}.remaining-evidence,.additional-checks{margin:9px 0 0 35px}.evidence-resolution summary{cursor:pointer;font-size:11px}.evidence-resolution details p,.evidence-resolution details li{font-size:11px;line-height:1.7}.remaining-evidence ul{list-style:none;padding:0;margin:8px 0}.remaining-evidence li{padding:8px 0;border-top:1px solid #edf1f5}.remaining-evidence b,.remaining-evidence span{display:block}.remaining-evidence b{font-weight:550;color:#536c81}.evidence-resolution a{color:#a45e36}.additional-checks label{display:flex;align-items:start;gap:8px;padding:9px 0;border-top:1px solid #edf1f5}.additional-checks input{margin-top:3px;accent-color:#ee692c}.additional-checks b,.additional-checks small{display:block}.additional-checks b{font-size:12px;font-weight:550}.additional-checks small{font-size:11px;line-height:1.65;margin-top:3px}.checked-label{color:#8a9aae}.additional-checks button{border:1px solid #e2cbb9;border-radius:5px;background:#fff9f4;color:#a35c31;padding:8px 12px;font:inherit;cursor:pointer}.additional-checks button:disabled{opacity:.5;cursor:default}.resolution-error{color:#a44d36}.resolution-note{font-size:11px;line-height:1.7;margin:8px 0 0 35px}@media(max-width:620px){.remaining-evidence,.additional-checks{margin-left:0}.additional-checks button{width:100%}}
</style>
