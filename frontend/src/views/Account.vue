<template>
  <ResearchShell section="account" dark>
    <div class="account-page">
      <p class="research-breadcrumb">Account</p>
      <header class="research-page-heading"><h1>{{ account.session&&!resetting?'Your research workspace.':resetting?'Choose a new password.':mode==='signup'?'Start your research workspace.':mode==='reset'?'Reset your password.':'Welcome back.' }}</h1><p>Save your research privately and follow your agents from any device.</p></header>
      <p v-if="loading" role="status" class="account-message">Connecting to your workspace…</p>
      <div v-if="account.error" role="alert" class="account-message error"><p>{{ account.error }}</p><button class="research-secondary" :disabled="loading" @click="connect(true)">Try connecting again</button></div>
      <p v-if="error" role="alert" class="account-message error">{{ error }}</p>
      <p v-if="message" role="status" class="account-message">{{ message }}</p>

      <section v-if="account.session&&!resetting" class="account-details">
        <h2>Signed in as {{ account.session.user.email }}</h2>
        <p>Your saved charts and company reports belong to this account.</p>
        <RouterLink class="research-primary" :to="destination">Continue to research →</RouterLink>
        <div class="account-provider"><h3>{{ planName }} plan</h3><p v-if="entitlement">{{ entitlement.preview&&!entitlement.simulate_limits?'Developer test allowance unrestricted':entitlement.remaining+' of '+entitlement.daily_limit+' analyses left today' }}</p><small v-if="entitlement?.reset_at">Daily allowance resets {{ resetTime(entitlement.reset_at) }}.</small><div class="account-actions"><RouterLink class="research-secondary" to="/pricing">Compare plans</RouterLink><button v-if="entitlement?.billing_status&&entitlement.billing_status!=='free'" class="research-secondary" :disabled="busy" @click="manageBilling">Manage billing</button><button class="research-secondary" :disabled="busy" @click="reloadPlan">Refresh plan</button></div></div>
        <section v-if="entitlement?.developer" class="account-developer"><h3>Developer access</h3><p>Choose the real team for your next analysis. Your subscription stays the same.</p><label>Preview plan<select v-model="previewTier"><option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }} · {{ plan.total_agents }} total agents</option></select></label><label class="account-checkbox"><input v-model="simulateLimits" type="checkbox"> Simulate customer daily limits</label><div class="account-actions"><button class="research-primary" :disabled="busy" @click="applyPreview(false)">Apply preview</button><button class="research-secondary" :disabled="busy" @click="applyPreview(true)">Reset test allowance</button></div><small>Test resets keep actual model usage and spending limits intact.</small></section>
        <div class="account-actions"><button v-if="account.config?.auth_providers?.email!==false" class="research-secondary" @click="requestReset" :disabled="busy">Reset password</button><button class="research-secondary" @click="leave" :disabled="busy">{{ busy?'Please wait…':'Sign out' }}</button></div>
        <details class="account-delete"><summary>Delete your account</summary><p>This cancels your subscription, stops active analyses and removes your research and account. Necessary accounting records are retained. Type DELETE to confirm.</p><input v-model="deleteConfirmation" aria-label="Type DELETE to confirm account deletion" autocomplete="off"><button class="research-secondary" :disabled="busy||deleteConfirmation!=='DELETE'" @click="deleteAccount">Delete account and research</button></details>
      </section>

      <form v-else-if="!loading&&!account.error" class="account-form" @submit.prevent="submit">
        <button v-if="account.config?.auth_providers?.google&&!resetting&&mode!=='reset'" class="research-secondary google-signin" type="button" :disabled="busy" @click="googleSignIn">Continue with Google</button><p v-if="account.config?.auth_providers?.google&&!resetting" class="account-help">By continuing, you agree to the <RouterLink to="/terms">terms</RouterLink> and <RouterLink to="/privacy">privacy policy</RouterLink>.</p>
        <p v-if="account.config?.auth_providers?.google&&account.config?.auth_providers?.email!==false&&!resetting&&mode!=='reset'" class="account-help">Or use your email</p>
        <label v-if="!resetting&&account.config?.auth_providers?.email!==false">Email address<input v-model.trim="email" type="email" autocomplete="email" required :disabled="busy"></label>
        <label v-if="account.config?.auth_providers?.email!==false&&(mode!=='reset'||resetting)">{{ resetting?'New password':'Password' }}<input v-model="password" type="password" :autocomplete="mode==='signup'||resetting?'new-password':'current-password'" :minlength="mode==='signup'||resetting?12:1" required :disabled="busy"></label>
        <p v-if="mode==='signup'||resetting" class="account-help">Use at least 12 characters. A unique passphrase works well.</p>
        <label v-if="mode==='signup'" class="account-checkbox"><input v-model="termsAccepted" type="checkbox" required> I agree to the <RouterLink to="/terms">terms</RouterLink> and <RouterLink to="/privacy">privacy policy</RouterLink>.</label>
        <p v-if="(mode==='signup'||mode==='reset')&&!account.config?.email_delivery_ready" class="account-help">Confirmation and recovery emails are temporarily unavailable. Existing password sign-in remains available.</p>
        <AccountChallenge ref="challenge" v-model="captchaToken" :site-key="account.config?.turnstile_site_key"/>
        <button v-if="account.config?.auth_providers?.email!==false" class="research-primary" type="submit" :disabled="busy||Boolean(account.config?.turnstile_site_key&&!captchaToken)||((mode==='signup'||mode==='reset')&&!account.config?.email_delivery_ready)">{{ busy?'Please wait…':resetting?'Save new password':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in' }}</button>
        <p v-if="!resetting" class="account-links"><button v-if="mode!=='signin'" type="button" @click="setMode('signin')" :disabled="busy">Back to sign in</button><template v-else><button type="button" @click="setMode('signup')" :disabled="busy">Create an account</button><button type="button" @click="setMode('reset')" :disabled="busy">Forgot password?</button></template></p>
      </form>
    </div>
  </ResearchShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ResearchShell from '../components/ResearchShell.vue'
import AccountChallenge from '../components/AccountChallenge.vue'
import { plans,resetTime } from '../utils/plans.mjs'
import { account, initializeAccount, signOut,refreshAccount,platformAction } from '../api/platform'
import { safeReturnPath } from '../utils/platform.mjs'

const route=useRoute(), router=useRouter()
const email=ref(''), password=ref(''), mode=ref('signin'), loading=ref(true), busy=ref(false), error=ref(''), message=ref('')
const captchaToken=ref(''),challenge=ref(null),termsAccepted=ref(false),previewTier=ref('free'),simulateLimits=ref(false),deleteConfirmation=ref('')
const entitlement=computed(()=>account.info?.entitlement),planName=computed(()=>plans.find(p=>p.id===entitlement.value?.tier)?.name||'Free')
const destination=computed(()=>safeReturnPath(route.query.next))
const resetting=computed(()=>Boolean(account.session&&(account.recovery||route.query.flow==='recovery')))
const callback=flow=>`${window.location.origin}/account${flow==='recovery'?'?flow=recovery':''}`
function setMode(value){mode.value=value;error.value='';message.value='';password.value=''}
async function connect(retry=false){loading.value=true;try{await initializeAccount({retry});if(account.session)await reloadPlan()}catch{}finally{loading.value=false}}
async function requestReset(){email.value=account.session?.user.email||email.value;await sendReset()}
async function sendReset(){
  busy.value=true;error.value='';message.value=''
  try{const client=await initializeAccount();const result=await client.auth.resetPasswordForEmail(email.value,{redirectTo:callback('recovery'),captchaToken:captchaToken.value||undefined});if(result.error)throw result.error;message.value='If this address has an account, a reset link will arrive by email. Open it in this browser to choose a new password.'}catch(e){error.value=e.message}finally{busy.value=false;captchaToken.value='';challenge.value?.reset()}
}
async function submit(){
  if(busy.value)return
  if(mode.value==='signup'&&!termsAccepted.value){error.value='Agree to the terms and privacy policy to create an account.';return}
  if(mode.value==='reset'&&!resetting.value)return sendReset()
  busy.value=true;error.value='';message.value=''
  try{
    const client=await initializeAccount()
    if(resetting.value){
      const result=await client.auth.updateUser({password:password.value});if(result.error)throw result.error
      password.value='';account.recovery=false;message.value='Your password has been updated.';await router.replace('/account')
    }else if(mode.value==='signup'){
      const result=await client.auth.signUp({email:email.value,password:password.value,options:{emailRedirectTo:callback(),captchaToken:captchaToken.value||undefined}});if(result.error)throw result.error
      password.value=''
      if(result.data.session)await router.replace(destination.value)
      else message.value='Check your email to confirm your account. Open the link in this browser, then sign in. If you already have an account, use Sign in or Forgot password.'
    }else{
      const result=await client.auth.signInWithPassword({email:email.value,password:password.value,options:{captchaToken:captchaToken.value||undefined}});if(result.error)throw result.error
      password.value='';await router.replace(destination.value)
    }
  }catch(e){error.value=e.message}finally{busy.value=false;captchaToken.value='';challenge.value?.reset()}
}
async function leave(){busy.value=true;error.value='';try{await signOut();password.value='';message.value='You have signed out.';await router.replace('/account')}catch(e){error.value=e.message}finally{busy.value=false;captchaToken.value='';challenge.value?.reset()}}
async function reloadPlan(){const value=await refreshAccount();if(value?.entitlement){previewTier.value=value.entitlement.tier;simulateLimits.value=value.entitlement.preview&&value.entitlement.simulate_limits}return value}
async function googleSignIn(){busy.value=true;error.value='';try{const client=await initializeAccount();const {error:issue}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback()}});if(issue)throw issue}catch(e){error.value=e.message;busy.value=false}}
async function manageBilling(){busy.value=true;error.value='';try{const result=await platformAction('billing/portal');window.location.assign(result.url)}catch(e){error.value=e.message}finally{busy.value=false}}
async function applyPreview(reset){busy.value=true;error.value='';try{await platformAction('platform/developer/preview',{tier:previewTier.value,simulate_limits:simulateLimits.value,reset});await reloadPlan();message.value=(reset?'Test allowance reset. ':'')+planName.value+' preview applies to your next analysis.'}catch(e){error.value=e.message}finally{busy.value=false}}
async function deleteAccount(){busy.value=true;error.value='';try{await platformAction('platform/account/delete',{confirmation:deleteConfirmation.value});message.value='Account deletion has been requested. Research and subscription cleanup will finish in the background.';try{await signOut()}catch{};account.session=null;account.info=null;password.value='';deleteConfirmation.value=''}catch(e){error.value=e.message}finally{busy.value=false}}
onMounted(()=>connect())
</script>

<style scoped>
.account-page{max-width:850px;margin:10px auto 60px}.account-page .research-page-heading{display:block!important;margin:38px 0}.account-page .research-page-heading>p{margin-top:12px}.account-page h1{font-size:36px!important}.account-form{max-width:410px;display:grid;gap:19px;margin:30px 0}.account-form label{display:grid;gap:8px;font-size:14px;color:#415065}.account-form input{width:100%;border:1px solid #d7dee8;border-radius:7px;padding:12px;font:inherit;min-height:46px}.account-form .research-primary{justify-content:center;margin-top:4px;min-height:46px}.account-help{font-size:12px;color:#647084;margin-top:-8px}.account-links{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}.account-links button{border:0;background:none;padding:4px 0;font-size:13px;color:#a33d10;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.account-message{font-size:14px;padding:16px 0;border-top:1px solid #dce2e8;line-height:1.7;overflow-wrap:anywhere}.account-message.error{color:#963d2c}.account-message button{margin-top:12px}.account-details h2{font-size:21px;font-weight:500;overflow-wrap:anywhere}.account-details>p{color:#647084;margin:12px 0 22px}.account-provider{margin:35px 0;padding:23px 0;border-top:1px solid #e3e7ed;border-bottom:1px solid #e3e7ed}.account-provider h3{font-size:15px;font-weight:500}.account-provider p,.account-provider small{font-size:13px;color:#647084;margin-top:8px;display:block}.provider-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#bd9453;margin-right:8px}.provider-dot.ready{background:#367b5c}.account-actions{display:flex;gap:12px;flex-wrap:wrap}@media(max-width:600px){.account-page .research-page-heading{margin:24px 0}.account-page h1{font-size:29px!important}.account-form{max-width:none}}
</style>

<style scoped>
.account-page{color:var(--research-ink)}.account-form label,.account-details>p,.account-provider p,.account-provider small,.account-help{color:var(--research-muted)}.account-form input,.account-developer select,.account-delete input{background:var(--research-soft);border:1px solid var(--research-line);color:var(--research-ink);padding:12px;border-radius:6px;font-size:14px}.account-message,.account-provider{border-color:var(--research-line)}.account-message.error{color:#ffac88}.account-checkbox{display:flex!important;align-items:center;flex-wrap:wrap;font-size:12px!important;gap:6px!important}.account-checkbox input{width:16px;min-height:16px;accent-color:#f47735}.account-checkbox a{font-size:12px}.account-developer{border:1px solid var(--research-line);padding:22px;border-radius:7px;margin:22px 0}.account-developer h3{margin-top:0}.account-developer p,.account-developer small{font-size:12px;line-height:1.8;color:var(--research-muted)}.account-developer>label{display:grid;gap:8px;margin:17px 0}.account-developer .account-actions{margin:17px 0}.account-developer select{max-width:360px}.account-delete{border-top:1px solid var(--research-line);margin-top:35px;padding:18px 0;font-size:12px;color:var(--research-muted)}.account-delete summary{cursor:pointer}.account-delete p{line-height:1.8}.account-delete input{display:block;margin:15px 0}.google-signin{justify-content:center;min-height:46px}.account-links button{color:#ffa878}.account-form .research-primary{background:#f47735;color:#111}
</style>
