<template>
  <ol class="analysis-journey" aria-label="Your analysis journey">
    <li v-for="(step,index) in steps" :key="step" :class="{current:index===current,done:index<current}" :aria-current="index===current?'step':undefined"><span class="journey-number"><svg v-if="index<current" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg><template v-else>{{ index+1 }}</template></span><div><strong>{{ step }}</strong><small>{{ index<current?'Complete':index===current?stopped?'Needs attention':'You are here':'Up next' }}</small></div></li>
  </ol>
</template>
<script setup>
import {computed} from 'vue'
const props=defineProps({run:{type:Object,default:null},loading:Boolean})
const steps=['Add charts','Follow the analysis','Review the conditions']
const stopped=computed(()=>['failed','interrupted','cancelled'].includes(props.run?.status))
const current=computed(()=>props.run?.status==='complete'&&props.run?.verdict?2:props.run||props.loading?1:0)
</script>
<style scoped>
.analysis-journey{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));list-style:none;padding:0;margin:19px 0 27px;border-top:1px solid var(--research-line);border-bottom:1px solid var(--research-line)}.analysis-journey li{display:flex;align-items:center;gap:11px;padding:15px 18px 15px 0;color:#87909b;position:relative}.analysis-journey li:not(:first-child){padding-left:18px;border-left:1px solid var(--research-line)}.journey-number{width:29px;height:29px;flex:0 0 29px;border:1px solid #d8dde4;border-radius:50%;display:grid;place-items:center;font-size:12px}.journey-number svg{width:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.analysis-journey strong{font-size:12px;font-weight:500;display:block;line-height:1.4}.analysis-journey small{font-size:10px;display:block;margin-top:2px}.current{color:#171b22!important}.current:after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#ff4f00}.current .journey-number{background:#ff4f00;border-color:#ff4f00;color:#111}.done .journey-number{background:#f1f5f2;color:#47715a;border-color:#d9e4dc}.done strong{color:#56675e}@media(max-width:600px){.analysis-journey{margin:17px 0 22px}.analysis-journey li,.analysis-journey li:not(:first-child){padding:12px 7px;gap:7px;align-items:flex-start}.analysis-journey strong{font-size:10px}.analysis-journey small{font-size:9px}.journey-number{width:22px;height:22px;flex-basis:22px;font-size:10px}}
</style>
