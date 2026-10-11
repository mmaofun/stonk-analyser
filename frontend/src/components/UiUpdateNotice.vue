<template><aside v-if="available" class="ui-update-notice" role="status"><span>{{ chunkUnavailable?'This screen could not load. Reload the interface or check your connection.':'A new interface version is ready. Reload when you’re ready.' }}</span><button :disabled="busy" @click="reload">Reload interface</button></aside></template>
<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue'
defineProps({busy:Boolean})
const available=ref(false),chunkUnavailable=ref(false)
let timer,controller,checking=false,lastChecked=0,disposed=false
const moduleUrl=doc=>doc.querySelector('script[type="module"][src]')?.getAttribute('src')
let loadedModule
async function check(){
 if(disposed||checking||document.hidden||Date.now()-lastChecked<60000)return
 checking=true;lastChecked=Date.now();controller=new AbortController()
 const timeout=setTimeout(()=>controller?.abort(),5000)
 try{
  const response=await fetch(new URL(import.meta.env.BASE_URL,location.origin),{cache:'no-store',signal:controller.signal})
  if(!response.ok)return
  const nextModule=moduleUrl(new DOMParser().parseFromString(await response.text(),'text/html'))
  if(!disposed&&loadedModule&&nextModule){
   const current=new URL(loadedModule,location.href),next=new URL(nextModule,location.href)
   if(current.origin===location.origin&&next.origin===location.origin&&current.pathname!==next.pathname)available.value=true
  }
 }catch{/* An unavailable version check must not interrupt research. */}
 finally{clearTimeout(timeout);checking=false}
}
function failedChunk(event){event.preventDefault();chunkUnavailable.value=true;available.value=true}
function reload(){location.reload()}
onMounted(()=>{loadedModule=moduleUrl(document);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);window.addEventListener('vite:preloadError',failedChunk);timer=setInterval(check,60000);check()})
onBeforeUnmount(()=>{disposed=true;clearInterval(timer);controller?.abort();window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);window.removeEventListener('vite:preloadError',failedChunk)})
</script>
<style scoped>
.ui-update-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 13px;margin:0 0 15px;border:1px solid #ecd7c8;border-radius:6px;background:#fff9f5;color:#795641;font-size:12px}.ui-update-notice button{flex:0 0 auto;background:white;border:1px solid #dcbca5;border-radius:5px;padding:6px 9px;color:#a64e1c;font:inherit;cursor:pointer}@media(max-width:620px){.ui-update-notice{align-items:start;font-size:11px}}
</style>
