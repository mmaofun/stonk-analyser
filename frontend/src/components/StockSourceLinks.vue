<template><div v-if="ids?.length" class="stock-source-links"><template v-for="id in ids" :key="id"><a v-if="/^https?:\/\//.test(source(id)?.url||'')" :href="source(id).url" :title="source(id).kind" target="_blank" rel="noopener noreferrer">{{ source(id).title }}</a><span v-else>{{ source(id)?.title||'Source unavailable' }}</span></template></div></template>
<script setup>
const props=defineProps({ids:{type:Array,default:()=>[]},sources:{type:Array,default:()=>[]}})
const source=id=>props.sources.find(item=>item.id===id)
</script>
<style scoped>.stock-source-links{display:flex;flex-wrap:wrap;gap:5px 12px;font-size:10px;line-height:1.7;margin-top:6px;overflow-wrap:anywhere}.stock-source-links a{color:#a14a20;text-underline-offset:3px;max-width:100%}.stock-source-links span{color:#8791a0}.stock-source-links a:focus-visible{outline:2px solid #ad420f;outline-offset:4px}</style>
