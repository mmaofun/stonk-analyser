<template>
  <section class="research-tools">
    <h3>Record market observations</h3>
    <p>Collect public aggregate trades and sampled order-book snapshots for a bounded period. Consecutive observations can support measured liquidity changes.</p>
    <div class="tool-form"><label>Duration (seconds)<input type="number" v-model.number="duration" min="5" max="3600"></label><button :disabled="busy" @click="$emit('start','record',{duration_seconds:duration})">Start recording</button><button v-if="job?.kind==='record' && job.status==='running'" @click="stopRecording">Stop recording</button></div>
    <p v-if="job?.kind==='record' && job.status==='complete'" class="notice">Recorded {{ job.result.trade_rows.toLocaleString() }} trades and {{ job.result.book_snapshots }} book snapshots. {{ job.result.scope }}</p>

    <h3>Strategy discovery</h3>
    <p>A hypothesis generator proposes numerical rules, then six research reviewers challenge them. Development tests can advance a candidate to shadow observation; they cannot establish a trading edge.</p>
    <div class="tool-form"><label>Candidates this cycle<input type="number" v-model.number="candidates" min="1" :max="discovery?.settings.max_candidates || 2"></label><button :disabled="busy" @click="$emit('start','discovery',{candidates})">Run research cycle</button></div>
    <p class="hint">One generator request and six reviewer requests per cycle. Each candidate uses a bounded rule language; generated code is never executed.</p>
    <div class="tool-form"><label>Automatic research<select v-model="autoResearch"><option :value="false">Disabled</option><option :value="true">Enable when enough outcomes exist</option></select></label><label>Cycle interval (hours)<input type="number" v-model.number="researchHours" min="1" max="720"></label><button :disabled="savingSettings" @click="saveResearch">Save research settings</button></div>
    <p class="hint">{{ label(discovery?.state || 'loading') }} · {{ discovery?.prospective_windows || 0 }} unique market windows of {{ discovery?.settings.minimum_prospective_windows || 500 }} required. Automatic cycles use BTC/USDT, 15-minute candles and a 15-minute horizon. Generated strategies have zero ensemble influence pending independent validation.</p>
    <details v-for="cycle in discovery?.cycles || []" :key="cycle.id"><summary>{{ new Date(cycle.created_at).toLocaleString() }} · {{ cycle.candidates.length }} candidates · {{ cycle.promotions }} promotions</summary><article v-for="candidate in cycle.candidates" :key="candidate.id"><strong>{{ candidate.name }} · {{ label(candidate.status) }}</strong><p>{{ candidate.hypothesis }}</p><p>{{ candidate.reason }}</p><p class="hint" v-if="candidate.metrics">Development Brier {{ candidate.metrics.brier_score.toFixed(4) }}; same-window prior {{ candidate.prior_metrics.brier_score.toFixed(4) }}.</p><p v-for="objection in candidate.review_objections" :key="objection">{{ objection }}</p></article><p v-if="cycle.review_errors.length" class="error">Some reviewer calls failed; candidates were not advanced.</p></details>
    <h3>Additional model adapters</h3>
    <p>Train an experimental model on a chronological split. It remains outside the main ensemble until further validation.</p>
    <div class="tool-form"><label>Model<select v-model="model"><option v-for="name in adapters" :key="name" :value="name">{{ label(name) }}</option></select></label><label>History (candles)<input type="number" v-model.number="historySize" min="2000" max="50000"></label><label>Neural epochs<input type="number" v-model.number="epochs" min="1" max="30"></label><button :disabled="busy || !model" @click="$emit('start','train_model',{model_type:model,history_size:historySize,epochs})">Train experimental model</button></div>
    <p class="hint">Uses the market, candle interval and forecast horizon selected above. Longer horizons require larger histories or coarser intervals.</p>
    <div class="scroll"><table v-if="trained.length"><thead><tr><th>Model</th><th>Market / horizon</th><th>Test samples</th><th>Brier</th><th>Same-window prior</th><th>Status</th></tr></thead><tbody><tr v-for="item in trained" :key="item.id"><td>{{ label(item.model_type) }}</td><td>{{ item.symbol }} · {{ item.horizon }}</td><td>{{ item.test_samples }}</td><td>{{ item.metrics.brier_score.toFixed(4) }}</td><td>{{ item.prior_metrics.brier_score.toFixed(4) }}</td><td>Experimental; not promoted</td></tr></tbody></table></div>
    <p class="hint">Scores from different test windows are not directly comparable. The 10,000-forecast benchmark remains a separate evaluation.</p>

    <h3>Additional source data</h3>
    <p>Import timestamped macro, options, on-chain, cross-market or liquidation observations. Missing sources are never filled with guesses.</p>
    <div class="tool-form"><label>Data type<select v-model="kind"><option v-for="(_,key) in schemas" :key="key" :value="key">{{ label(key) }}</option></select></label><label>Original source or URL<input v-model="source" maxlength="300" placeholder="Name the data provider"></label></div>
    <p class="hint">Required columns: timestamp, available_at. Use ISO timestamps with a timezone, or Unix milliseconds. Supported numeric columns: {{ schemas[kind]?.join(', ') }}.</p>
    <div class="tool-form"><input type="file" accept=".csv,text/csv" aria-label="Source data CSV" @change="selectFile"><button @click="downloadTemplate">Download CSV header</button><button @click="upload" :disabled="!file || !source || importing">{{ importing ? 'Importing…' : 'Import source data' }}</button></div>
    <p v-if="importResult" class="notice">{{ importResult.imported }} observations imported. {{ importResult.verification }}. Refresh the market analysis to use eligible data.</p>

    <h3>Prospective outcomes</h3>
    <p>Score only forecasts issued before their target time. Evaluation appends an outcome and preserves the original prediction.</p>
    <button @click="evaluate" :disabled="evaluating">{{ evaluating ? 'Fetching matured outcomes…' : 'Evaluate matured forecasts' }}</button>
    <p v-if="outcomeResult" class="notice">{{ outcomeResult.evaluated }} new outcomes recorded. {{ outcomeResult.skipped.length }} older records could not be scored with their frozen metadata.</p>
    <p class="hint">{{ performance?.prospective_outcomes || 0 }} prospective outcomes available. At least {{ performance?.minimum_review_sample || 100 }} observations are needed before reliability review; this alone is not a promotion criterion.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup>
import { onMounted,ref,watch } from 'vue'
const props=defineProps({busy:Boolean,symbol:{type:String,default:'BTCUSDT'},job:Object})
defineEmits(['start'])
const api=(import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:5001').replace(/\/$/,'')
const adapters=ref([]),trained=ref([]),model=ref('hidden_markov_regime'),historySize=ref(6000),epochs=ref(6),schemas=ref({}),kind=ref('macro'),source=ref(''),file=ref(null),importing=ref(false),evaluating=ref(false),error=ref(''),importResult=ref(null),outcomeResult=ref(null),performance=ref(null)
const label=x=>x.replaceAll('_',' ')
const duration=ref(60),candidates=ref(2),discovery=ref(null),autoResearch=ref(false),researchHours=ref(24),savingSettings=ref(false)
async function request(path,options){const response=await fetch(`${api}/api/market${path}`,options);const data=await response.json();if(!response.ok||data.success===false)throw new Error(data.error||'Research request failed');return data}
async function refresh(){try{const [models,schema,stats,research]=await Promise.all([request('/models'),request('/imports/schema'),request(`/performance?symbol=${props.symbol}`),request('/research')]);adapters.value=models.adapters;trained.value=models.trained_adapters;schemas.value=schema.kinds;performance.value=stats;discovery.value=research;autoResearch.value=research.settings.enabled;researchHours.value=research.settings.interval_hours}catch(e){error.value=e.message}}
async function saveResearch(){savingSettings.value=true;error.value='';try{await request('/research/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:autoResearch.value,interval_hours:researchHours.value})});await refresh()}catch(e){error.value=e.message}finally{savingSettings.value=false}}
async function stopRecording(){error.value='';try{await request(`/jobs/${props.job.id}/cancel`,{method:'POST'})}catch(e){error.value=e.message}}
function selectFile(event){file.value=event.target.files[0]||null;error.value='';if(file.value?.size>5000000){error.value='Use a CSV of 5 MB or smaller.';file.value=null}}
function downloadTemplate(){const csv=['timestamp','available_at',...(schemas.value[kind.value]||[])].join(',')+'\n';const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`${kind.value}-template.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function upload(){error.value='';importing.value=true;try{const form=new FormData();form.append('file',file.value);form.append('kind',kind.value);form.append('source',source.value);form.append('symbol',props.symbol);importResult.value=(await request('/imports',{method:'POST',body:form})).result}catch(e){error.value=e.message}finally{importing.value=false}}
async function evaluate(){error.value='';evaluating.value=true;try{outcomeResult.value=(await request('/outcomes/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol:props.symbol})})).result;await refresh()}catch(e){error.value=e.message}finally{evaluating.value=false}}
watch(()=>props.job?.status,status=>{if(status==='complete')refresh()});watch(()=>props.symbol,refresh);onMounted(refresh)
</script>

<style scoped>
.research-tools{margin-top:34px;border-top:1px solid #ddd;padding-top:24px;font:13px/1.7 'Helvetica Neue',Helvetica,Arial,sans-serif}.research-tools h3{margin:26px 0 12px;font-size:17px;font-weight:500}.research-tools p{color:#777;margin:10px 0;max-width:850px}.tool-form{display:flex;align-items:end;gap:14px;flex-wrap:wrap;margin:18px 0}.tool-form label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#666}.tool-form input,.tool-form select{font:13px inherit;font-family:inherit;min-height:43px;padding:10px 12px;border:1px solid #bbb;background:white;max-width:100%}.tool-form input[type=number]{width:130px}.research-tools button{font-family:inherit;min-height:43px;padding:10px 14px;border:1px solid #bbb;background:white;cursor:pointer}.research-tools button:disabled{opacity:.5;cursor:not-allowed}.research-tools button:focus-visible,.research-tools input:focus-visible,.research-tools select:focus-visible{outline:3px solid #ff4f00;outline-offset:3px}.research-tools .hint{font-size:11px;color:#999}.notice{border-left:3px solid #ff4f00;background:#f7f7f8;padding:12px 14px}.error{color:#a13b16!important;background:#fff3ed;padding:12px}.scroll{overflow:auto}.research-tools table{border-collapse:collapse;width:100%;font-size:12px}.research-tools th,.research-tools td{padding:10px 12px 10px 0;border-bottom:1px solid #eee;text-align:left;white-space:nowrap}.research-tools th{font-weight:500;color:#888}@media(max-width:550px){.tool-form{display:grid;grid-template-columns:1fr}.tool-form input,.tool-form select,.tool-form input[type=number]{width:100%;min-width:0}.research-tools button{width:100%}}
</style>
