<template>
 <ResearchShell section="pricing" dark><main class="launch-page">
  <p class="launch-eyebrow">Research at your pace</p><h1>Choose your research team.</h1>
  <p class="intro">One account for Stock Lab and Chart Lab. Start with five agents, or bring more perspectives into the discussion.</p>
  <p v-if="previewMode" class="launch-notice">Project preview · the plans below demonstrate the interface. Checkout and live analyses open with the hosted app.</p>
  <p v-if="error" class="launch-status launch-error" role="alert">{{ error }}</p>
  <div class="launch-grid"><article v-for="plan in rows" :key="plan.id" class="launch-plan" :class="{featured:plan.id==='pro'}">
   <p class="plan-tag">{{ plan.id==='free'?'Start exploring':plan.id==='pro'?'More perspectives':'The full team' }}</p><h2>{{ plan.name }}</h2>
   <p>{{ plan.description||plans.find(p=>p.id===plan.id)?.description }}</p><div class="price">US${{ plan.price_usd }} <small>{{ plan.price_usd?'/ month':'/ free' }}</small></div>
   <ul><li>{{ plan.daily_analyses }} {{ plan.daily_analyses===1?'analysis':'analyses' }} per day</li><li>{{ plan.total_agents }} agents in the entire team</li><li>{{ plan.researchers }} researchers + {{ plan.opinion_agents }} investors or traders</li><li>Stock Lab and Chart Lab</li><li>Private saved reports and exports</li></ul>
   <button :class="plan.id==='pro'?'research-primary':'research-secondary'" :disabled="busy||publicMode&&plan.price_usd>0&&!checkoutReady" @click="choose(plan)">{{ previewMode?'Preview '+plan.name:!publicMode?'Use '+plan.name+' preview':plan.id==='free'?'Start free':checkoutReady?'Choose '+plan.name:'Opens at launch' }}</button>
  </article></div>
  <section class="launch-common"><h2>Source checks on every plan.</h2><p>All teams check evidence, discuss opposing cases and explain conditional scenarios. Larger teams add perspectives and research depth. Agent count does not establish greater prediction accuracy.</p><p>Your daily allowance is shared across both labs and resets at midnight UTC. Reading reports, changing chart scenarios and replaying conversations use no allowance. A chart submission can contain up to four images.</p><p>Prices are in USD. Any applicable taxes are shown at checkout. Manage or cancel your subscription from your account.</p></section>
  <footer class="launch-footer"><RouterLink to="/terms">Terms</RouterLink><RouterLink to="/privacy">Privacy</RouterLink><RouterLink to="/support">Support</RouterLink></footer>
 </main></ResearchShell>
</template>
<script setup>
import {onMounted,ref} from 'vue'
import {useRouter} from 'vue-router'
import ResearchShell from '../components/ResearchShell.vue'
import {plans} from '../utils/plans.mjs'
import {account,publicMode,previewMode,apiBase,platformAction,selectLocalPlan} from '../api/platform'
import '../styles/launch.css'
const router=useRouter(),rows=ref(plans),busy=ref(false),error=ref(''),checkoutReady=ref(false)
onMounted(async()=>{if(!publicMode)return;try{const response=await fetch(`${apiBase}/api/platform/plans`,{credentials:'omit',signal:AbortSignal.timeout(12000)});const body=await response.json();if(!response.ok||!Array.isArray(body.plans))throw new Error('Plan availability could not be checked.');rows.value=body.plans;checkoutReady.value=body.checkout_enabled}catch(e){error.value=e.message}})
async function choose(plan){
 if(!publicMode){selectLocalPlan(plan.id);return router.push('/stock-lab')}
 if(!account.session)return router.push({path:'/account',query:{next:'/pricing'}})
 if(plan.id==='free')return router.push('/stock-lab')
 busy.value=true;error.value=''
 try{const result=await platformAction('billing/checkout',{tier:plan.id});window.location.assign(result.url)}catch(e){error.value=e.message}finally{busy.value=false}
}
</script>
