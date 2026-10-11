<template>
 <ResearchHome v-if="!previewMode&&(!publicMode||account.session)"/>
 <ResearchShell v-else dark><main class="launch-page">
  <p class="launch-eyebrow">{{ previewMode?'Interactive project preview':'Stock Lab + Chart Lab' }}</p>
  <h1>Give your next idea<br>a team to think it through.</h1>
  <p class="intro">Explore a company or examine a chart. Follow the agent discussion, compare the scenarios and see the reasoning behind each result.</p>
  <div v-if="previewMode" class="launch-notice">This is an interface preview with illustrative examples. It does not collect uploads, create accounts or run live analyses.</div>
  <div class="launch-actions"><RouterLink class="research-primary" to="/stock-lab">{{ previewMode?'Explore Stock Lab':'Analyse a stock' }} →</RouterLink><RouterLink class="research-secondary" to="/chart-lab">{{ previewMode?'Explore Chart Lab':'Analyse a chart' }} →</RouterLink></div>
  <section class="launch-steps"><article><span>01 / START</span><h2>A stock or a chart.</h2><p>Enter a ticker for company research, or upload a chart to explore conditional setups.</p></article><article><span>02 / DISCUSSION</span><h2>Follow the team.</h2><p>See researchers and investors exchange views, challenge assumptions and explain uncertainty.</p></article><article><span>03 / RESULTS</span><h2>Understand the possibilities.</h2><p>Compare stock projections, or switch between chart scenarios with their entry conditions, stop-loss and targets.</p></article></section>
  <section class="launch-common"><h2>Five, twenty or fifty agents.</h2><p>Every plan includes both labs, source checks and saved research. <RouterLink to="/pricing">Explore the plans →</RouterLink></p></section>
  <footer class="launch-footer"><RouterLink to="/privacy">Privacy</RouterLink><RouterLink to="/terms">Terms</RouterLink><RouterLink to="/support">Support</RouterLink><a v-if="sourceUrl" :href="sourceUrl" target="_blank" rel="noopener noreferrer">Project source</a></footer>
 </main></ResearchShell>
</template>
<script setup>
import ResearchShell from '../components/ResearchShell.vue'
import ResearchHome from './ResearchHome.vue'
import {account,publicMode,previewMode} from '../api/platform'
import '../styles/launch.css'
const candidate=import.meta.env.VITE_SOURCE_REPOSITORY_URL||''
const sourceUrl=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(candidate)?candidate:''
</script>
