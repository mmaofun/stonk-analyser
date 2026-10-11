<template>
  <section class="stock-price-context" aria-label="Observed stock price history"><header><div><h2>Price context</h2><span>{{ run.ticker }} · {{ currency }}</span></div><div v-if="terminal&&run.dossier?.price" class="price-quote"><strong>{{ money(run.dossier.price.value,currency) }}</strong><small>Reported quote</small></div></header>
    <svg v-if="points.length>1" :viewBox="`0 0 620 ${chartHeight}`" role="img" :aria-label="`${run.ticker} captured daily prices`"><rect width="620" :height="chartHeight" fill="#11171d"/><g v-for="tick in ticks" :key="tick.value"><line x1="18" x2="540" :y1="tick.y" :y2="tick.y"/><text x="550" :y="tick.y+4">{{ number(tick.value) }}</text></g><path :d="path"/><g class="volume-bars"><rect v-for="(bar,i) in points" :key="bar.timestamp" :x="18+i*522/(points.length-1)" :y="chartHeight-35-(bar.volume||0)/maxVolume*43" :width="Math.max(1,420/points.length)" :height="(bar.volume||0)/maxVolume*43"/></g><text x="18" y="22">{{ run.ticker }} · Captured daily series</text><text x="18" :y="chartHeight-14">{{ day(points[0].timestamp) }}</text><text x="444" :y="chartHeight-14">{{ day(points.at(-1).timestamp) }}</text></svg>
    <p v-else class="price-unavailable">A usable price series was not captured for this analysis.</p><div class="price-context-note"><p v-if="run.dossier?.price">Reported quote {{ money(run.dossier.price.value,currency) }}<br><span>As of {{ date(run.dossier.price.as_of) }}</span></p><p>The latest daily observation may be partial. Price history is separate from the one-year valuation and virtual-market scenarios.</p></div>
  </section>
</template>
<script setup>
import {computed} from 'vue'
import {money,number,date} from '../api/stocklab'
const props=defineProps({run:{type:Object,required:true},terminal:Boolean})
const chartHeight=computed(()=>props.terminal?430:360)
const currency=computed(()=>props.run.dossier?.price?.currency||'USD')
const points=computed(()=>(props.run.dossier?.bars||[]).filter(x=>Number.isFinite(x.close)&&Number.isFinite(x.timestamp)))
const extent=computed(()=>{const prices=points.value.map(x=>x.close),lo=Math.min(...prices),hi=Math.max(...prices),pad=Math.max((hi-lo)*.08,hi*.001);return {lo:lo-pad,hi:hi+pad}})
const y=value=>chartHeight.value-95-(value-extent.value.lo)/(extent.value.hi-extent.value.lo)*(chartHeight.value-135)
const path=computed(()=>points.value.map((p,i)=>`${i?'L':'M'}${18+i*522/Math.max(1,points.value.length-1)},${y(p.close)}`).join(' '))
const ticks=computed(()=>Array.from({length:5},(_,i)=>{const value=extent.value.hi-(extent.value.hi-extent.value.lo)*i/4;return {value,y:y(value)}}))
const maxVolume=computed(()=>Math.max(1,...points.value.map(p=>p.volume||0)))
const day=value=>new Date(value*1000).toLocaleDateString(undefined,{month:'short',day:'numeric'})
</script>
<style scoped>
.stock-price-context{min-width:0}.stock-price-context header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:13px}.stock-price-context h2{font-size:14px;font-weight:500;margin:0;color:#39475b}.stock-price-context header span{font-size:10px;color:#697589}.stock-price-context svg{display:block;width:100%;border-radius:9px}.stock-price-context line{stroke:#29323c;stroke-width:.7}.stock-price-context path{stroke:#d6e0e7;stroke-width:1.8;fill:none}.stock-price-context text{font:11px 'Helvetica Neue',Helvetica,Arial,sans-serif;fill:#b1bdc9}.volume-bars rect{fill:#658a81;opacity:.6}.price-context-note p{font-size:11px;color:#697589;margin:12px 0;line-height:1.7}.price-context-note p:first-child{font-size:13px;color:#46596d}.price-context-note span{font-size:11px;color:#697589}.price-unavailable{font-size:13px;background:#fafbfc;padding:28px 18px;color:#697589;border-radius:9px}
</style>
