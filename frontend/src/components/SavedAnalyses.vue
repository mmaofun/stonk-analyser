<template>
  <section id="saved" class="saved-analyses" aria-label="Saved analyses">
    <div class="saved-heading"><h2>{{ compact?'Recent analyses':'Saved analyses' }}</h2><RouterLink v-if="compact" to="/saved">View all</RouterLink><button v-else class="outline-button" @click="$emit('refresh')" :disabled="loading">{{ loading?'Refreshing…':'Refresh' }}</button></div>
    <div v-if="!compact" class="history-controls"><label class="history-search"><ResearchIcon name="search"/><input v-model="search" type="search" placeholder="Search by chart or date" aria-label="Search saved analyses"></label><select v-model="status" aria-label="Filter saved analyses by status"><option value="">All statuses</option><option value="complete">Complete</option><option value="running">Running</option><option value="failed">Failed</option><option value="interrupted">Interrupted</option></select></div>
    <p v-if="error" class="history-message" role="alert">{{ error }}</p>
    <p v-if="loading && !items.length" class="history-message" role="status">Loading saved analyses…</p>
    <p v-else-if="!filtered.length" class="history-message">{{ search||status?'No analyses match these filters.':'Your saved analyses will appear here after you upload a chart.' }}</p>
    <div v-else class="history-table"><table><thead><tr><th>Chart</th><th>Interval</th><th>Saved</th><th>Status</th></tr></thead><tbody><tr v-for="item in shown" :key="item.id"><td><RouterLink :to="`/chart-lab/${item.id}`">{{ item.asset || 'Chart analysis' }}<small v-if="item.is_sample">Synthetic sample</small></RouterLink></td><td>{{ item.chart_timeframes?.join(', ')||'—' }}</td><td>{{ date(item.created_at) }}</td><td><span class="history-status" :class="item.status"><i aria-hidden="true"></i>{{ labels[item.status]||item.status }}</span></td></tr></tbody></table></div>
    <button v-if="!compact && filtered.length>limit" class="outline-button show-more" @click="limit+=15">Show more analyses</button>
  </section>
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import ResearchIcon from './ResearchIcon.vue'
const props=defineProps({items:{type:Array,default:()=>[]},compact:Boolean,loading:Boolean,error:{type:String,default:''}})
defineEmits(['refresh'])
const search=ref(''),status=ref(''),limit=ref(15)
const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
const labels={complete:'Complete',queued:'Queued',running:'Running',failed:'Failed',interrupted:'Interrupted'}
const filtered=computed(()=>props.items.filter(item=>(!status.value||item.status===status.value)&&(!search.value||`${item.asset||''} ${date(item.created_at)}`.toLowerCase().includes(search.value.toLowerCase()))))
const shown=computed(()=>filtered.value.slice(0,props.compact?3:limit.value))
watch([search,status],()=>limit.value=15)
</script>
<style scoped>
.saved-analyses{margin-top:36px}.saved-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:15px}.saved-heading h2{font-size:21px;letter-spacing:-.4px;font-weight:600;margin:0}.saved-heading a{font-size:13px;text-decoration:none}.history-controls{display:flex;gap:12px;margin:20px 0}.history-search{display:flex;align-items:center;gap:10px;border:1px solid var(--research-line);border-radius:6px;padding:9px 12px;max-width:440px;flex:1;color:var(--research-muted)}.history-search input{border:0;width:100%;min-width:0;font-size:14px;background:none;padding:3px}.history-controls select{padding:10px;border:1px solid var(--research-line);background:#fff;border-radius:6px;color:var(--research-ink);font-size:13px}.history-table{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px;text-align:left}th{font-weight:400;color:var(--research-muted);background:#f7f7f8;padding:11px 16px;border-top:1px solid var(--research-line)}td{padding:14px 16px;border-bottom:1px solid var(--research-line);color:#596477}td:first-child{width:35%;max-width:350px}td a{color:#171b24;text-decoration:none;font-weight:500;display:block;overflow-wrap:anywhere}td a:hover{color:var(--research-accent);text-decoration:underline}td small{display:block;font-size:10px;font-weight:400;color:#68768a}.history-status{display:inline-flex;align-items:center;gap:7px;font-size:12px}.history-status i{width:6px;height:6px;background:#8c97a7;border-radius:50%}.history-status.complete i{background:#4e846b}.history-status.failed i{background:#b96556}.history-status.running i{background:var(--research-accent)}.history-message{padding:24px 16px;color:#667386;font-size:14px;border-top:1px solid var(--research-line)}.outline-button{border:1px solid var(--research-line);background:white;border-radius:6px;padding:8px 13px;color:#39465a;cursor:pointer;font-size:13px;min-height:38px}.outline-button:hover{background:#f7f7f8}.show-more{display:block;margin:20px auto}@media(max-width:600px){.history-controls{flex-direction:column}.history-search{max-width:none}.history-table{font-size:12px}th,td{padding:12px 8px;font-size:12px}th:nth-child(2),td:nth-child(2){display:none}td:first-child{min-width:110px}td:nth-child(3){min-width:112px}.saved-heading h2{font-size:20px}}
</style>
