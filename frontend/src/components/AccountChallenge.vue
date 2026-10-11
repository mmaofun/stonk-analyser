<template><div v-if="siteKey" class="account-challenge"><div ref="container"/><p v-if="error" role="alert">Verification could not load. <button type="button" @click="mount">Retry</button></p></div></template>
<script setup>
import {onMounted,onBeforeUnmount,ref} from 'vue'
const props=defineProps({siteKey:String}),token=defineModel({default:''}),container=ref(null),error=ref(false)
let widget=null,disposed=false,loading=false
async function mount(){
 if(!props.siteKey||disposed||loading)return;error.value=false;loading=true
 try{
  if(!window.turnstile)await new Promise((resolve,reject)=>{
   let script=document.querySelector('script[data-account-challenge]')
   if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.dataset.accountChallenge='true';document.head.appendChild(script)}
   const finish=failed=>{clearTimeout(timer);script.removeEventListener('load',loaded);script.removeEventListener('error',failedLoad);if(failed){script.remove();reject(new Error('Verification unavailable'))}else resolve()}
   const loaded=()=>finish(!window.turnstile),failedLoad=()=>finish(true),timer=setTimeout(failedLoad,15000)
   script.addEventListener('load',loaded,{once:true});script.addEventListener('error',failedLoad,{once:true})
  })
  if(disposed||!container.value)return
  if(widget!==null)window.turnstile.remove(widget)
  widget=window.turnstile.render(container.value,{sitekey:props.siteKey,theme:'auto',callback:value=>{token.value=value},'expired-callback':()=>{token.value=''},'error-callback':()=>{token.value='';error.value=true}})
 }catch{if(!disposed)error.value=true}finally{loading=false}
}
defineExpose({reset:()=>{token.value='';if(widget!==null)window.turnstile?.reset(widget)}})
onMounted(mount)
onBeforeUnmount(()=>{disposed=true;if(widget!==null)window.turnstile?.remove(widget)})
</script>
<style scoped>.account-challenge{min-height:65px;max-width:100%}.account-challenge p{font-size:12px}.account-challenge button{border:0;background:none;color:var(--research-accent);cursor:pointer;text-decoration:underline}</style>
