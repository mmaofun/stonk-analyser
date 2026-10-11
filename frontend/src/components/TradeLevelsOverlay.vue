<template>
  <div ref="overlay" class="trade-level-overlay" :aria-label="labels.length ? 'Trade levels on the uploaded chart' : undefined">
    <svg v-if="labels.length" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g v-for="level in labels" :key="level.role" :class="level.type">
        <line :x1="bounds.left_percent" :x2="bounds.right_percent" :y1="level.y_percent" :y2="level.y_percent" />
        <line v-if="Math.abs(level.label_percent-level.y_percent)>1" class="connector" :x1="bounds.left_percent+1" :x2="bounds.left_percent+1" :y1="level.y_percent" :y2="level.label_percent" />
      </g>
    </svg>
    <div v-for="level in labels" :key="level.role" class="price-label" :class="level.type"
      :style="{top:level.label_percent+'%',left:(bounds.left_percent+1)+'%'}">
      <strong>{{ level.role }}{{ level.basis==='calculated_risk_multiple'?' · 1.25R calc.':'' }}</strong><span>{{ level.basis==='axis_estimate' ? '≈ ' : '' }}{{ money(level.price) }}</span>
    </div>
  </div>
</template>

<script setup>
import {computed,onBeforeUnmount,onMounted,ref} from 'vue'
const props=defineProps({observation:Object,plan:Object,imageIndex:Number})
const overlay=ref(null),height=ref(400)
let observer
const bounds=computed(()=>props.observation?.chart_panels?.find(panel=>panel.image_index===props.imageIndex)||{left_percent:1.2,right_percent:97.5,top_percent:0,bottom_percent:100})
const labels=computed(()=>{
  if(!props.plan)return []
  const refs=[{id:props.plan.entry_level_id,role:'ENTRY',type:'entry'},{id:props.plan.stop_level_id,role:'SL',type:'stop'},
    ...props.plan.target_level_ids.map((id,i)=>({id,role:'TP'+(i+1),type:'target'}))]
  const sourceLevels=props.plan.plot_levels || props.observation?.levels
  const items=refs.map(ref=>({...sourceLevels?.find(level=>level.id===ref.id),...ref}))
    .filter(level=>level.image_index===props.imageIndex && level.y_percent!=null).sort((a,b)=>a.y_percent-b.y_percent)
  const h=Math.max(height.value,1),gap=23
  for(let i=0;i<items.length;i++)items[i].label_y=Math.max(12,items[i].y_percent/100*h,i?items[i-1].label_y+gap:0)
  if(items.length && items.at(-1).label_y>h-12){
    items.at(-1).label_y=h-12
    for(let i=items.length-2;i>=0;i--)items[i].label_y=Math.min(items[i].label_y,items[i+1].label_y-gap)
  }
  return items.map(level=>({...level,label_percent:Math.max(1,Math.min(99,level.label_y/h*100))}))
})
const money=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:8})
onMounted(()=>{observer=new ResizeObserver(entries=>{height.value=entries[0]?.contentRect.height||400});observer.observe(overlay.value)})
onBeforeUnmount(()=>observer?.disconnect())
</script>

<style scoped>
.trade-level-overlay{position:absolute;inset:0;pointer-events:none;overflow:hidden}.trade-level-overlay svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.trade-level-overlay line{vector-effect:non-scaling-stroke;stroke-width:1.5;stroke-dasharray:6 3}.entry line{stroke:#3185d9}.stop line{stroke:#dd4c45}.target line{stroke:#2aa975}.trade-level-overlay .connector{stroke-dasharray:none;stroke-width:1;opacity:.8}.price-label{position:absolute;display:flex;align-items:center;gap:7px;transform:translateY(-50%);padding:3px 6px;border:1px solid;white-space:nowrap;font:10px/1.3 'Helvetica Neue',Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums;box-shadow:0 1px 3px #0002}.price-label strong{font-size:9px;letter-spacing:.03em}.price-label.entry{background:#eaf4ff;color:#12497f;border-color:#3185d9}.price-label.stop{background:#fff0ee;color:#8e2520;border-color:#dd4c45}.price-label.target{background:#e9fbf2;color:#155c40;border-color:#2aa975}@media(max-width:500px){.price-label{font-size:9px;padding:2px 4px;gap:4px}.price-label strong{font-size:8px}}
</style>
