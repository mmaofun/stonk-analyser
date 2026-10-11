<template><section class="stock-investor-conversation" aria-label="Recorded investor discussion playground"><AnalysisOverview compact :selected-id="selectedId" :run="contextRun" :overview="overview" @select="$emit('select',$event)" @discussion="$emit('discussion',$event)"/></section></template>
<script setup>
import {computed} from 'vue'
import AnalysisOverview from './AnalysisOverview.vue'
import {stockOverview} from '../utils/stockAnalysisOverview.mjs'
const props=defineProps({runId:String,status:String,people:Array,rounds:Object,selectedId:{type:String,default:undefined}})
defineEmits(['select','discussion'])
const contextRun=computed(()=>({id:props.runId,status:props.status,roles:[],research:[],investors:props.people,investor_rounds:props.rounds,events:[]}))
const overview=computed(()=>stockOverview(contextRun.value))
</script>
