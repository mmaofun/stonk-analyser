<template>
  <section class="plan-access" aria-label="Analysis plan">
    <template v-if="previewMode||!publicMode">
      <label :for="id">{{ previewMode?'Example team':'Developer preview · next analysis' }}</label>
      <select :id="id" :value="localPlanPreview" @change="selectLocalPlan($event.target.value)">
        <option v-if="!previewMode" value="">Full local team</option>
        <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }} · {{ plan.total_agents }} agents</option>
      </select>
      <small>{{ previewMode?'Illustrative data · no live analysis':'Saved reports keep their original team.' }}</small>
    </template>
    <template v-else-if="account.session">
      <strong>{{ selected?.name||'Your plan' }}<span v-if="entitlement?.preview"> · Developer preview</span></strong>
      <p v-if="entitlement">{{ entitlement.preview&&!entitlement.simulate_limits?'Test allowance unrestricted':`${entitlement.remaining} of ${entitlement.daily_limit} analyses left today` }}</p>
      <small v-if="entitlement?.reset_at">Resets {{ resetTime(entitlement.reset_at) }}</small>
      <RouterLink to="/account">{{ entitlement?.developer?'Developer controls':'Manage plan' }} →</RouterLink>
    </template>
    <RouterLink v-else to="/pricing">Explore the plans →</RouterLink>
  </section>
</template>
<script setup>
import {computed,useId} from 'vue'
import {account,publicMode,previewMode,localPlanPreview,selectLocalPlan} from '../api/platform'
import {plans,resetTime} from '../utils/plans.mjs'
const id=useId(),entitlement=computed(()=>account.info?.entitlement),selected=computed(()=>plans.find(p=>p.id===entitlement.value?.tier))
</script>
<style scoped>
.plan-access{margin:auto 18px 16px;padding:15px 0;border-top:1px solid var(--research-line);display:grid;gap:7px;font-size:12px;color:var(--research-muted)}.plan-access label,.plan-access strong{font-size:12px;color:var(--research-ink)}.plan-access select{min-width:0;width:100%;padding:9px;border:1px solid var(--research-line);background:var(--research-soft);color:var(--research-ink);border-radius:5px;font-size:12px}.plan-access p{margin:0;font-size:12px}.plan-access small{font-size:10px;line-height:1.6}.plan-access a{font-size:12px;text-decoration:none}.plan-access strong span{display:block;font-weight:400;font-size:10px;color:var(--research-muted)}@media(max-width:800px){.plan-access{grid-column:1/-1;margin:0 16px 8px;padding:8px 0 0;grid-template-columns:1fr auto;align-items:center;gap:5px 12px}.plan-access select{max-width:190px}.plan-access small{grid-column:1/-1}.plan-access p{grid-column:1}.plan-access a{grid-column:2;grid-row:1}}
</style>
