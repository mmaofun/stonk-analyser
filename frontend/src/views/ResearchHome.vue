<template>
  <ResearchShell section="home">
    <div class="research-home">
      <p class="research-breadcrumb">MiroFish / New analysis</p>
      <header class="research-page-heading"><h1>What would you like to explore?</h1><p>Choose a starting point. Each analysis saves its evidence and discussion.</p></header>
      <div class="analysis-choices">
        <section><ResearchIcon name="chart"/><h2>Analyse a chart</h2><p>Upload a screenshot, follow the agents and inspect both conditional paths.</p><RouterLink class="research-primary" to="/chart-lab">Upload charts <ResearchIcon name="arrow"/></RouterLink></section>
        <section><ResearchIcon name="search"/><h2>Research a company</h2><p>Compare the business, valuation and competing investment cases.</p><RouterLink class="research-secondary" to="/stock-lab">Open Stock Lab <ResearchIcon name="arrow"/></RouterLink></section>
        <section v-if="!publicMode"><ResearchIcon name="network"/><h2>Simulate a scenario</h2><p>Build a knowledge graph and follow how individual agents respond.</p><RouterLink class="research-secondary" to="/simulations">Start a simulation <ResearchIcon name="arrow"/></RouterLink></section>
      </div>
      <section class="research-recent"><div class="research-section-heading"><h2>Continue your research</h2><RouterLink to="/saved">View all saved analyses →</RouterLink></div>
        <p v-if="publicMode&&!account.session" class="research-empty"><RouterLink to="/account">Sign in</RouterLink> to keep your company and chart research in your private workspace.</p>
        <p v-else-if="loading" class="research-empty" role="status">Loading saved research…</p>
        <p v-else-if="!records.length" class="research-empty">Start an analysis to save your first research.</p>
        <div v-for="item in records.slice(0,5)" :key="item.id" class="recent-research-row"><div><RouterLink :to="item.path">{{ item.name }}</RouterLink><small>{{ item.detail }}</small></div><span>{{ item.type }}</span><span class="research-status" :class="item.status">{{ item.verdict || item.statusLabel }}</span><RouterLink :to="item.path">{{ item.status==='running'?'Follow':'Open' }} →</RouterLink></div>
        <p v-if="errors.length" class="research-load-error" role="status">Some saved research could not be loaded. <button @click="load">Retry</button></p>
      </section>
    </div>
  </ResearchShell>
</template>
<script setup>
import {onBeforeUnmount,onMounted,ref} from 'vue'
import ResearchShell from '../components/ResearchShell.vue'
import ResearchIcon from '../components/ResearchIcon.vue'
import {loadResearchLibrary} from '../api/research'
import {account,publicMode} from '../api/platform'
const records=ref([]),loading=ref(true),errors=ref([])
let controller,generation=0
async function load(){if(publicMode&&!account.session){loading.value=false;return}controller?.abort();controller=new AbortController();const token=++generation;loading.value=true;try{const data=await loadResearchLibrary({signal:controller.signal});if(token!==generation)return;records.value=data.records;errors.value=data.errors}catch(e){if(token===generation&&e.name!=='AbortError')errors.value=[e.message]}finally{if(token===generation)loading.value=false}}
onMounted(load)
onBeforeUnmount(()=>{generation++;controller?.abort()})
</script>
<style scoped>
.research-home{max-width:1450px;margin:auto}.analysis-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:32px;margin:36px 0 45px}.analysis-choices section{display:flex;flex-direction:column;align-items:flex-start;gap:17px;padding:24px 0;border-top:1px solid var(--research-line)}.analysis-choices>section>svg{width:29px;height:29px;color:#b9673e}.analysis-choices h2{font-size:23px;font-weight:500;letter-spacing:-.6px}.analysis-choices p{font-size:14px;color:var(--research-muted);max-width:350px}.analysis-choices a{margin-top:8px}.recent-research-row{display:grid;grid-template-columns:minmax(0,1.5fr) 1fr 1fr auto;gap:20px;align-items:center;border-bottom:1px solid var(--research-line);padding:17px 0;font-size:12px}.recent-research-row div>a{color:var(--research-ink);font-size:14px;font-weight:500}.recent-research-row small{display:block;color:var(--research-muted);margin-top:4px;font-size:11px}.recent-research-row>span{color:var(--research-muted)}@media(max-width:900px){.analysis-choices{grid-template-columns:1fr;gap:10px;margin-top:22px}.analysis-choices section{padding:24px 0}.analysis-choices p{max-width:650px}.recent-research-row{grid-template-columns:minmax(0,1fr) auto;gap:12px}.recent-research-row>span{display:none}}
</style>
