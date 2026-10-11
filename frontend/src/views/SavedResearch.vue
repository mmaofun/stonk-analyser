<template>
  <ResearchShell section="saved">
    <div class="saved-research">
      <p class="research-breadcrumb">MiroFish / Saved analyses</p>
      <header class="research-page-heading"><div><h1>Your research, in one place.</h1><p>{{ publicMode?'Return to your saved charts and company research.':'Return to a saved chart, company or simulation.' }}</p></div><button class="research-secondary" @click="load" :disabled="loading">{{ loading?'Refreshing…':'Refresh' }}</button></header>
      <div class="library-controls"><input v-model="search" type="search" aria-label="Search saved research" placeholder="Search by company, asset or project"><div class="library-types" role="group" aria-label="Research type"><button v-for="kind in publicMode?['','Charts','Companies']:['', 'Charts','Companies','Markets','Simulations']" :key="kind" :aria-pressed="type===kind" @click="type=kind">{{ kind||'All' }}</button></div><select v-model="status" aria-label="Filter research by status"><option value="">All statuses</option><option v-for="label in statuses" :key="label">{{ label }}</option></select></div>
      <p v-for="error in errors" :key="error" class="research-load-error" role="status">{{ error }}</p>
      <p v-if="loading&&!records.length" class="research-empty" role="status">Loading saved research…</p>
      <div v-else class="library-layout"><div class="research-table-wrap"><table class="research-table"><thead><tr><th>Name</th><th>Type</th><th>Saved</th><th>Status</th><th>Next action</th></tr></thead><tbody><tr v-for="item in shown" :key="item.id" :class="{selected:selected?.id===item.id}"><td><button @click="selectedId=item.id" class="library-name">{{ item.name }}</button><small>{{ item.detail }}<template v-if="item.isSample"> · Synthetic sample</template></small></td><td>{{ item.type }}</td><td>{{ date(item.at) }}</td><td><span class="research-status" :class="item.status">{{ item.statusLabel }}</span><small v-if="item.verdict">{{ item.verdict }}</small></td><td><RouterLink :to="item.path">{{ item.status==='running'?'Follow':item.statusLabel==='Needs attention'?'Resume':'Open' }} →</RouterLink></td></tr><tr v-if="!filtered.length"><td colspan="5" class="research-empty">{{ search||type||status?'No research matches these filters.':'Your saved research will appear here after you start an analysis.' }}</td></tr></tbody></table><button v-if="filtered.length>limit" class="research-secondary library-more" @click="limit+=25">Show more</button></div>
        <aside v-if="selected" class="library-preview" aria-label="Selected research preview"><h2>{{ selected.name }}</h2><p>{{ selected.detail }}</p><img v-if="selected.image&&!imageFailed&&previewUrls[0]" :key="selected.id" :src="previewUrls[0]" :alt="`${selected.name} saved chart`" @error="imageFailed=true"><p v-if="selected.image&&(imageFailed||previewFailed)" class="research-muted">A chart preview is unavailable. The saved report remains accessible.</p><dl><div><dt>Type</dt><dd>{{ selected.type }}</dd></div><div><dt>Status</dt><dd>{{ selected.verdict || selected.statusLabel }}</dd></div><div><dt>Saved</dt><dd>{{ date(selected.at) }}</dd></div></dl><RouterLink :to="selected.path" class="research-primary">Open analysis <ResearchIcon name="arrow"/></RouterLink><details v-if="publicMode" class="library-delete"><summary>Delete this report</summary><p>This removes its private files and research. Type DELETE to confirm.</p><input v-model="deleteConfirmation" aria-label="Type DELETE to delete report"><button class="research-secondary" :disabled="deleting||deleteConfirmation!=='DELETE'" @click="removeSelected">{{ deleting?'Deleting…':'Delete report' }}</button></details></aside>
      </div>
    </div>
  </ResearchShell>
</template>
<script setup>
import {computed,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import ResearchShell from '../components/ResearchShell.vue'
import ResearchIcon from '../components/ResearchIcon.vue'
import {loadResearchLibrary,researchApi} from '../api/research'
import {filterResearch,researchTimestamp} from '../utils/researchRecords.mjs'
import {publicMode,platformAction} from '../api/platform'
import {usePrivateImages} from '../utils/privateImages'
const records=ref([]),loading=ref(true),errors=ref([]),search=ref(''),type=ref(''),status=ref(''),selectedId=ref(''),imageFailed=ref(false),limit=ref(25)
const statuses=computed(()=>[...new Set(records.value.map(x=>x.statusLabel))].sort())
const filtered=computed(()=>filterResearch(records.value,{search:search.value,type:type.value,status:status.value}))
const shown=computed(()=>filtered.value.slice(0,limit.value))
const selected=computed(()=>filtered.value.find(x=>x.id===selectedId.value)||filtered.value[0])
const {urls:previewUrls,failed:previewFailed}=usePrivateImages(()=>selected.value?.image?[`${researchApi}/api/chart/analyses/${encodeURIComponent(selected.value.recordId)}/images/0`]:[])
const date=value=>researchTimestamp(value)?new Date(researchTimestamp(value)).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Unknown'
const deleteConfirmation=ref(''),deleting=ref(false)
let controller,generation=0
async function removeSelected(){if(!selected.value||deleting.value)return;deleting.value=true;try{const item=selected.value,kind=item.path.startsWith('/stock-lab')?'stocklab':'chart';await platformAction(`${kind}/analyses/${item.recordId}/delete`,{confirmation:deleteConfirmation.value});deleteConfirmation.value='';await load()}catch(e){errors.value=[e.message]}finally{deleting.value=false}}
async function load(){controller?.abort();controller=new AbortController();const token=++generation;loading.value=true;try{const data=await loadResearchLibrary({signal:controller.signal});if(token!==generation)return;records.value=data.records;errors.value=data.errors}catch(e){if(token===generation&&e.name!=='AbortError')errors.value=[e.message]}finally{if(token===generation)loading.value=false}}
watch(()=>selected.value?.id,()=>imageFailed.value=false)
watch([search,type,status],()=>limit.value=25)
onMounted(load)
onBeforeUnmount(()=>{generation++;controller?.abort()})
</script>
<style scoped>
.saved-research{max-width:1500px;margin:auto}.library-controls{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin:25px 0}.library-controls>input{min-width:220px;flex:1}.library-types{display:flex;gap:3px}.library-types button{border:0;background:transparent;padding:8px 11px;border-radius:6px;color:#697589;font-size:12px;cursor:pointer}.library-types button[aria-pressed=true]{background:#fff2e9;color:#ad4214}.library-controls select,.library-controls input{border:1px solid var(--research-line);border-radius:7px;padding:11px 12px;background:#fff;font-size:13px;color:var(--research-ink)}.library-layout{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:28px;align-items:start}.library-name{background:none;border:0;font-weight:500;color:#283648;cursor:pointer;text-align:left;font-size:14px;padding:0}.selected{background:#fffaf6}.library-preview{padding-left:22px;border-left:1px solid var(--research-line);min-width:0}.library-preview h2{font-size:23px;font-weight:500;letter-spacing:-.6px;margin-bottom:8px;overflow-wrap:anywhere}.library-preview p{font-size:13px;color:var(--research-muted)}.library-preview img{width:100%;display:block;border-radius:7px;margin:20px 0}.library-preview dl{font-size:12px;margin:20px 0}.library-preview dl>div{padding:9px 0;display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid var(--research-line)}.library-preview dt{color:var(--research-muted)}.library-preview dd{margin:0;text-align:right}.library-more{display:block;margin:20px auto}@media(max-width:1150px){.library-layout{grid-template-columns:1fr}.library-preview{padding:22px 0;border:0;border-top:1px solid var(--research-line)}.library-preview img{max-width:400px}.library-preview dl{max-width:500px}}@media(max-width:600px){.library-controls{gap:12px}.library-controls>input{min-width:0;width:100%;flex-basis:100%}.library-types{width:100%;overflow:auto}.library-types button{padding:7px 9px;font-size:11px}.library-controls select{width:100%}}
</style>

<style scoped>.library-delete{margin-top:24px;font-size:12px}.library-delete summary{cursor:pointer}.library-delete input{display:block;margin:12px 0;padding:9px;max-width:100%;border:1px solid var(--research-line);border-radius:5px}</style>
