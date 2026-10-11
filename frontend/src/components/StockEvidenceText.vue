<template><span><template v-for="(part,i) in parts" :key="i"><a v-if="part.source?.url.startsWith('http')" class="inline-evidence" :href="part.source.url" :title="part.source.title" target="_blank" rel="noopener noreferrer">[{{ label(part.source.kind) }}]</a><span v-else-if="part.source" class="inline-evidence">[{{ part.source.title }}]</span><template v-else>{{ part.text }}</template></template></span></template>
<script setup>
import { computed } from 'vue'
import {evidenceDisplayText} from '../utils/availableEvidence.mjs'
const props=defineProps({text:{type:String,default:''},sources:{type:Array,default:()=>[]}})
const label=kind=>({reported_financials:'Reported metrics · aggregator',sec_financials:'Financial facts',market_data:'Price data',sec_filing_history:'Filing history',sec_filing:'Company filing',web_article:'Web source'})[kind] || 'Source'
const parts=computed(()=>{
  const text=evidenceDisplayText(props.text)
  const result=[];let offset=0
  for(const match of text.matchAll(/\[(s_[a-f0-9]{12})\]|(s_[a-f0-9]{12})/g)){
    if(match.index>offset)result.push({text:text.slice(offset,match.index)})
    const source=props.sources.find(s=>s.id===(match[1]||match[2]))
    result.push(source?{source}:{text:'[Unverified reference]'});offset=match.index+match[0].length
  }
  if(offset<text.length)result.push({text:text.slice(offset)})
  return result
})
</script>
<style scoped>.inline-evidence{color:#596c82!important;font-size:.88em;text-underline-offset:3px;white-space:nowrap}</style>
