<template><ResearchShell section="account" dark><main class="launch-page launch-prose"><p class="launch-eyebrow">Project preview</p><h1>{{ route.path==='/saved'?'Saved research.':'Your research workspace.' }}</h1><p>This preview uses sample reports. Accounts, private uploads, saved research and billing open in the hosted app.</p><p>Use the example-team selector to explore Free, Pro and Max without signing in.</p><div class="launch-actions"><RouterLink class="research-primary" to="/stock-lab">Explore Stock Lab →</RouterLink><RouterLink class="research-secondary" to="/chart-lab">Explore Chart Lab →</RouterLink></div></main></ResearchShell></template>
<script setup>
import {useRoute} from 'vue-router'
import ResearchShell from '../components/ResearchShell.vue'
import '../styles/launch.css'
const route=useRoute()
</script>
