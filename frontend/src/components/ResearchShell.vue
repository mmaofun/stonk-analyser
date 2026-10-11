<template>
  <div class="research-shell modern-research" :class="{'stock-dark':dark,'hosted-navigation':publicMode||previewMode}">
    <a class="skip-link" href="#research-content">Skip to content</a>
    <aside class="research-sidebar" aria-label="Research navigation">
      <RouterLink to="/" class="research-brand" :aria-label="publicMode||previewMode?'mmaofun — Research home':'mmaofun 6.7 — Research home'"><img :src="assetBase+'brand/mmaofun-mark.png'" alt="" width="56" height="42"><span>mmaofun <em v-if="!publicMode&&!previewMode">6.7</em></span></RouterLink>
      <button v-if="busy" class="research-new" disabled><ResearchIcon name="plus" />New analysis</button>
      <RouterLink v-else to="/" class="research-new"><ResearchIcon name="plus" />New analysis</RouterLink>
      <nav>
        <RouterLink to="/chart-lab" :class="{active:section==='chart'}" :aria-current="section==='chart'?'page':undefined"><ResearchIcon name="chart" />Chart Lab</RouterLink>
        <RouterLink to="/saved" :class="{active:section==='saved'}" :aria-current="section==='saved'?'page':undefined"><ResearchIcon name="document" />Saved analyses</RouterLink>
        <RouterLink v-if="!publicMode&&!previewMode" to="/market-lab" :class="{active:section==='market'}" :aria-current="section==='market'?'page':undefined"><ResearchIcon name="search" />Market research</RouterLink>
        <RouterLink to="/stock-lab" :class="{active:section==='stock'}" :aria-current="section==='stock'?'page':undefined"><ResearchIcon name="chart" />Stock Lab</RouterLink>
        <RouterLink v-if="!publicMode&&!previewMode" to="/simulations" class="simulation-nav" :class="{active:section==='simulation'}" :aria-current="section==='simulation'?'page':undefined"><ResearchIcon name="network" />Simulations</RouterLink>
        <RouterLink to="/pricing" :class="{active:section==='pricing'}"><ResearchIcon name="document"/>Plans</RouterLink>
        <RouterLink v-if="publicMode||previewMode" to="/account" :class="{active:section==='account'}"><ResearchIcon name="document" />{{ account.session?'Your account':'Sign in' }}</RouterLink>
      </nav>
      <PlanAccess/>
      <p v-if="!publicMode&&!previewMode" class="sidebar-note"><ResearchIcon name="document" />{{ section==='stock'?'Company research':section==='simulation'?'Scenario research':'Saved evidence and discussion' }}</p>
    </aside>
    <div id="research-content" class="research-content"><UiUpdateNotice v-if="!previewMode" :busy="busy"/><slot /></div>
  </div>
</template>

<script setup>
import ResearchIcon from './ResearchIcon.vue'
import UiUpdateNotice from './UiUpdateNotice.vue'
import PlanAccess from './PlanAccess.vue'
import { account, publicMode, previewMode } from '../api/platform'
import '../styles/research.css'
import '../styles/stock-dark.css'
const assetBase=import.meta.env.BASE_URL
defineProps({section:{type:String,default:'chart'},busy:Boolean,dark:Boolean})
defineEmits(['new-analysis'])
</script>

<style>
.research-shell{--research-accent:#ff4f00;--research-ink:#151921;--research-muted:#637084;--research-line:#e0e5ed;--research-soft:#f7f7f8;--research-radius:8px;min-height:100vh;background:#fff;color:var(--research-ink);font:15px/1.6 'Helvetica Neue',Helvetica,Arial,sans-serif}.research-shell button,.research-shell input,.research-shell select,.research-shell textarea{font-family:inherit}.research-shell button,.research-shell a{touch-action:manipulation}.research-shell button:disabled{cursor:wait;opacity:.55}.research-shell :is(button,a,input,select,textarea,summary):focus-visible{outline:3px solid #b83900;outline-offset:4px}.research-shell a{color:var(--research-accent)}.research-sidebar{position:fixed;inset:0 auto 0 0;width:230px;background:#fff;border-right:1px solid var(--research-line);display:flex;flex-direction:column;z-index:30}.research-brand{display:flex;align-items:center;gap:6px;padding:22px 20px;text-decoration:none!important;color:var(--research-ink)!important;font-size:22px;font-weight:700;letter-spacing:-1px;min-height:86px}.research-brand img{width:44px;height:42px;object-fit:cover}.research-new{margin:4px 18px 23px;padding:11px 14px;min-height:44px;border:1px solid var(--research-accent);background:var(--research-accent);color:#111;border-radius:7px;display:flex;justify-content:center;align-items:center;gap:9px;font-size:14px;cursor:pointer;transition:background .15s,transform .15s}.research-new:hover{background:#ed4900}.research-new:active{transform:translateY(1px)}.research-sidebar nav{display:flex;flex-direction:column;gap:4px}.research-sidebar nav a{display:flex;align-items:center;gap:13px;text-decoration:none;padding:14px 25px;min-height:48px;color:#4d596b;border-left:3px solid transparent;font-size:14px}.research-sidebar nav a:hover{background:#f7f7f8}.research-sidebar nav a.active{color:var(--research-accent);border-left-color:var(--research-accent);background:#f7f7f8;font-weight:500}.sidebar-note{margin:auto 25px 24px;display:flex;align-items:center;gap:10px;color:#637084;font-size:12px}.research-content{margin-left:230px;min-width:0;padding:24px 30px 0;max-width:1900px}.skip-link{position:fixed;top:-80px;left:250px;background:white;padding:12px;z-index:99;border:1px solid #ff4f00}.skip-link:focus{top:10px}.research-shell ::selection{background:#ffe2d5}.research-shell button{transition:background .15s,border-color .15s}.research-shell button:active:not(:disabled){filter:brightness(.95)}
@media(max-width:800px){.research-sidebar{position:sticky;top:0;width:100%;height:auto;border-right:0;border-bottom:1px solid var(--research-line);display:grid;grid-template-columns:1fr auto;align-items:center}.research-brand{padding:10px 16px;min-height:65px;font-size:23px}.research-brand img{width:43px;height:35px}.research-new{margin:10px 16px;padding:8px 13px;font-size:12px;min-height:40px}.research-sidebar nav{grid-column:1/-1;flex-direction:row;gap:0;border-top:1px solid #f0f1f4}.research-sidebar nav a{justify-content:center;padding:10px 8px;border-left:0;border-bottom:2px solid transparent;flex:1;font-size:12px;min-height:44px;gap:6px}.research-sidebar nav a.active{border-bottom-color:var(--research-accent)}.research-sidebar nav svg{width:16px;height:16px}.sidebar-note{display:none}.research-content{margin-left:0;padding:20px 18px 0}.skip-link{left:12px}.research-shell [id]{scroll-margin-top:130px}}
@media(prefers-reduced-motion:reduce){.research-shell *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>

<style>@media(max-width:600px){.hosted-navigation .research-sidebar nav a{min-width:0;padding:10px 5px;font-size:11px;text-align:center;line-height:1.3}.hosted-navigation .research-sidebar nav svg{display:none}}</style>
