<template>
  <ResearchShell :section="view==='saved'?'saved':'chart'" :dark="darkMode" :busy="submitting" @new-analysis="newAnalysis">
    <div class="chart-lab">
      <div v-if="!run" class="page-toolbar"><p><RouterLink to="/chart-lab">Chart Lab</RouterLink><template v-if="run"> <span>/</span> {{ run.asset||'Chart analysis' }}</template></p><button v-if="publicMode&&isPendingAnalysis(run?.status)" class="outline-button" :disabled="cancelling" @click="cancelRun">{{ cancelling?'Stopping…':'Stop analysis' }}</button><button v-if="run?.verdict" class="outline-button" @click="downloadReport"><ResearchIcon name="download"/>Download report</button></div>
      <main>
        <ChartWorkflowNav v-if="view!=='saved'&&!route.params.runId" phase="upload" @step="newAnalysis"/>
        <template v-if="view==='saved'">
          <header class="page-heading"><h1>Your research, in one place.</h1><p>Return to a saved chart, its conditions and the discussion behind them.</p></header>
          <SavedAnalyses :items="saved" :loading="historyLoading" :error="historyError" @refresh="loadHistory" />
        </template>
        <template v-else-if="!route.params.runId">
          <header class="page-heading"><button class="chart-theme-toggle" :aria-pressed="darkMode" @click="darkMode=!darkMode">{{ darkMode?'Light mode':'Dark mode' }}</button><h1>Understand your next move.</h1><p>Upload a chart. Compare the evidence. Know what to wait for.</p></header>
          <div v-if="error" class="error" role="alert">{{ error }}</div>
          <div v-if="runningAnalysis" class="active-analysis" role="status"><div><strong>An analysis is already running</strong><p>{{ runningAnalysis.asset||'Your chart' }} · Completed messages are being saved. Follow it before starting another.</p></div><RouterLink :to="`/chart-lab/${runningAnalysis.id}`">Follow the analysis<ResearchIcon name="arrow"/></RouterLink></div>
          <p v-if="!providerReady" class="notice" role="status">Analyses are not available yet. Your saved research remains accessible. <RouterLink to="/account">View account</RouterLink></p>
          <div class="upload-layout">
            <section class="upload-column" aria-label="Upload charts">
              <div class="drop-zone" :class="{dragging,pending:submitting}" @dragover.prevent="dragging=!uploadDisabled" @dragleave.prevent="dragging=false" @drop.prevent="dropFiles">
                <input ref="fileInput" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" multiple @change="chooseFiles" :disabled="uploadDisabled" aria-label="Choose chart images">
                <ResearchIcon name="upload" class="upload-icon"/>
                <h2>{{ submitting?'Uploading your charts…':'Drop your charts here' }}</h2><p>or choose up to 4 images</p>
                <button class="primary" @click="fileInput?.click()" :disabled="uploadDisabled">{{ submitting?'Uploading charts…':runningAnalysis?'Analysis already running':'Choose images' }}</button>
                <small>PNG, JPG or WebP · 10 MB per image</small>
              </div>
              <div v-if="files.length" class="file-previews"><div v-for="(file,index) in files" :key="index"><img :src="previews[index]" :alt="file.name"><span>{{ file.name }}</span><button :aria-label="`Remove ${file.name}`" @click="removeFile(index)" :disabled="submitting">Remove</button></div></div>
              <details class="upload-options"><summary>Optional notes and market context</summary><div>
                <label for="context">What should the analysts consider?</label><textarea id="context" v-model="context" maxlength="2000" rows="3" placeholder="For example: Is this breakout holding, or should I wait for a retest?" :disabled="submitting"></textarea>
                <label v-if="!publicMode" class="market-option"><input type="checkbox" v-model="includeMarket" :disabled="submitting">Include current BTC market and macro context</label><p v-if="!publicMode">Use this for a current BTC screenshot. Historical or mismatched market data remains separate.</p>
              </div></details>
              <p class="field-help">Selecting images starts the analysis. Next, you’ll see the stages and real agent messages as they are saved.</p>
              <button v-if="files.length&&!submitting" class="outline-button retry-upload" @click="analyse" :disabled="Boolean(runningAnalysis)">Retry analysis</button>
            </section>
            <aside class="upload-guide"><h2>What you’ll get</h2><ol><li><span>01</span><div><h3>A grounded chart read</h3><p>Structure and levels from your screenshot.</p></div></li><li><span>02</span><div><h3>Both sides of the trade</h3><p>Long and short conditions, with invalidation.</p></div></li><li><span>03</span><div><h3>A discussion you can inspect</h3><p>Specialists and 30 individual trader perspectives.</p></div></li></ol><button @click="useSample" :disabled="uploadDisabled">{{ sampleLoading?'Loading sample…':'Try a synthetic sample' }}<ResearchIcon name="arrow"/></button><p v-if="sampleSelected" class="field-help">Synthetic chart selected for a workflow demonstration.</p></aside>
          </div>
          <SavedAnalyses :items="saved" compact :loading="historyLoading" :error="historyError" @refresh="loadHistory" />
        </template>
        <template v-else-if="!run">
          <div v-if="loadingRun" class="loading-report" role="status"><span class="spinner"></span><h1>Opening your analysis…</h1><p>Loading the saved chart and discussion.</p></div>
          <div v-else class="failed" role="alert"><h1>Couldn’t open this analysis</h1><p>{{ error }}</p><button class="primary" @click="retryLoad">Try again</button><RouterLink to="/saved">View saved analyses</RouterLink></div>
        </template>
        <template v-else>
          <ChartWorkflowNav :run="run" :phase="workflowPhase" @step="changeWorkflowStep"/><header class="report-heading"><h1>{{ run.asset||'Chart analysis' }}</h1><span v-if="run.verdict" class="chart-result-chip" :class="{waiting:isNoTrade(run)}">{{ isNoTrade(run)?'No trade':'Conditional scenarios' }}</span><div class="report-quick-actions"><button class="chart-theme-toggle" :aria-pressed="darkMode" @click="darkMode=!darkMode">{{ darkMode?'Light mode':'Dark mode' }}</button><button v-if="publicMode&&isPendingAnalysis(run.status)" class="outline-button" :disabled="cancelling" @click="cancelRun">{{ cancelling?'Stopping…':'Stop analysis' }}</button><button v-if="run.verdict" class="outline-button" @click="downloadReport" aria-label="Download report"><ResearchIcon name="download"/></button><button class="outline-button" @click="newAnalysis">Upload chart</button><button v-if="run.verdict" class="primary" @click="reanalyse" :disabled="reanalysing||!providerReady">{{ reanalysing?'Starting…':'Reanalyse' }}</button></div><p>{{ run.observation?.chart_timeframes?.join(' + ')||'Reading chart' }}<span> · {{ dateLabel(run.created_at) }}</span></p></header>
          <nav v-if="!simpleChart" class="report-tabs" aria-label="Report sections"><RouterLink v-for="item in reportTabs" :key="item.id" :to="reportLocation(run.id,item.id)" :class="{selected:view===item.id}" :aria-current="view===item.id?'page':undefined">{{ item.label }}</RouterLink></nav>
          <div v-if="view!=='overview'&&view!=='discussion'" class="analysis-return" role="status"><span>{{ isPendingAnalysis(run.status)?runFlow.title:run.verdict?'Your assessment is ready':'Saved progress needs attention' }}</span><button @click="changeView('overview')">{{ isPendingAnalysis(run.status)?'Back to live analysis':run.verdict?'Review the result':'View saved progress' }}<ResearchIcon name="arrow"/></button></div>
          <div v-if="error" class="error" role="alert">{{ error }}</div>
          <p v-if="recoveredRun" class="notice" role="status">{{ ['complete','complete_with_gaps'].includes(recoveredRun.status)?'A recovery report is available.':'Recovery is in progress.' }} <RouterLink :to="`/chart-lab/${recoveredRun.id}`">{{ ['complete','complete_with_gaps'].includes(recoveredRun.status)?'Open recovered report':'View recovery progress' }}</RouterLink></p>
          <template v-if="view==='overview'">
            
            <div v-if="['failed','interrupted','cancelled','complete_with_gaps'].includes(run.status)" class="failed"><h2>{{ run.final_assessment?.status==='unavailable'?'Research saved; final assessment needs review':'Continue from the saved work' }}</h2><p>{{ run.failure?.message||run.error }}</p><ul v-if="run.round_errors?.length"><li v-for="item in run.round_errors" :key="item.role">{{ item.name }} · {{ item.round }} still needs completion.</li></ul><button v-if="recoveredRun" class="primary" @click="openRun(recoveredRun.id)">{{ ['complete','complete_with_gaps'].includes(recoveredRun.status)?'Open recovered report':'View recovery progress' }}</button><button v-else class="primary" @click="recoverAnalysis" :disabled="reanalysing||!providerReady">{{ reanalysing?'Resuming saved work…':recoveryLabel(recoveryAction(run)) }}</button><button class="text-button" @click="newAnalysis">Upload a different chart</button></div>
            <section v-if="run.status==='complete_with_gaps'&&!run.verdict" class="assessment-gap" role="status"><strong>WAIT</strong><div><h2>{{ run.observation?'No validated trading conclusion yet':'No validated chart reading yet' }}</h2><p>{{ run.observation?'Your chart and agent discussion are saved. Entry, SL and TP remain unavailable until the final assessment passes its checks.':'Your uploaded image is saved. The chart reader needs a usable response before analysis can continue.' }}</p></div></section>
            <ChartAnalysisPage v-if="simpleChart&&workflowPhase==='analysis'" :run="run" @results="changeView('overview')" @discussion="openDetailedDiscussion"><template #chart><ChartSource analysis-only hide-scenario-selector :run="run" :api="api"/></template></ChartAnalysisPage><template v-else-if="simpleChart&&run.verdict||run.status==='complete'&&isFutureReferenceReport(run)">
              <ChartPlanResults ref="planResults" :run="run" v-model:plan-key="selectedPlanKey" @exits="reviewExit" @discussion="changeView('discussion')"><template #chart><ChartSource hide-scenario-selector :run="run" :api="api" v-model:plan-key="selectedPlanKey" @details="detailsOpen=true;planResults?.openEvidence()"/></template><template #evidence><div class="details-content">
              <details v-if="run.status==='complete'" class="workspace-process"><summary>How this assessment was made</summary><AnalysisOverview :run="run" @discussion="openDiscussion"/></details><TradeAssessment v-if="run.verdict" :run="run" :now="clock" :show-paths="false"/>
              <section v-if="run.observation" class="observation"><h2>What the chart shows</h2><p>{{ run.observation.summary }}</p><div v-if="run.observation.levels.length" class="level-table-wrap"><table><thead><tr><th>Level</th><th>Type / scenario use</th><th>Price</th></tr></thead><tbody><tr v-for="level in run.observation.levels" :key="level.id"><td><abbr :title="level.evidence">{{ levelLabel(level) }}</abbr></td><td>{{ level.kind.replaceAll('_',' ') }}<small v-if="levelUses(level)">{{ levelUses(level) }}</small></td><td>{{ level.basis==='axis_estimate'?'≈ ':'' }}{{ money(level.price) }}</td></tr></tbody></table></div><details><summary>Visible evidence & limitations</summary><ul><li v-for="fact in run.observation.visible_facts" :key="fact">{{ fact }}</li></ul><h3>What the image cannot establish</h3><ul><li v-for="item in run.observation.limitations" :key="item">{{ item }}</li></ul></details></section>
              <p v-if="run.resume_note" class="notice">{{ run.resume_note }}</p><p v-if="run.market_context?.alignment" class="notice">{{ run.market_context.alignment }} <RouterLink v-if="!publicMode&&run.market_context.separate_market_run_id" :to="`/market-lab?run=${run.market_context.separate_market_run_id}`">View the separate market run</RouterLink></p>
            </div></template><template #calculator>            <details v-if="run.verdict" ref="exitReview" class="report-details exit-review"><summary>TP/SL calculator · after confirmation</summary><TradeExitPlanner ref="exitPlanner" :run="run" v-model:plan-key="selectedPlanKey" @conditions="reviewConditions"/></details></template></ChartPlanResults>
            </template>
            <template v-else>
              <AnalysisOverview :run="run" @discussion="openDiscussion" ><template #chart><ChartSource :run="run" :api="api" v-model:plan-key="selectedPlanKey" @details="detailsOpen=true;planResults?.openEvidence()"/><AssessmentSummary v-if="run.verdict" :run="run" @discussion="changeView('discussion')"/></template></AnalysisOverview>
            </template>
            <ConditionalActionPaths v-if="run.verdict&&!isFutureReferenceReport(run)&&!simpleChart" :run="run" @plan="detailsOpen=true" @exit-plan="reviewExit"/>
            <details v-if="run.verdict&&!isFutureReferenceReport(run)&&!simpleChart" ref="exitReview" class="report-details exit-review"><summary>TP/SL calculator · after confirmation</summary><TradeExitPlanner ref="exitPlanner" :run="run" v-model:plan-key="selectedPlanKey" @conditions="reviewConditions"/></details>
            <details v-if="(run.verdict||run.observation)&&!simpleChart&&!(run.status==='complete'&&isFutureReferenceReport(run))" class="report-details" :open="detailsOpen" @toggle="detailsOpen=$event.target.open"><summary>Details & evidence</summary><div class="details-content">
              <details v-if="run.status==='complete'" class="workspace-process"><summary>How this assessment was made</summary><AnalysisOverview :run="run" @discussion="openDiscussion"/></details><TradeAssessment v-if="run.verdict" :run="run" :now="clock" :show-paths="false"/>
              <section v-if="run.observation" class="observation"><h2>What the chart shows</h2><p>{{ run.observation.summary }}</p><div v-if="run.observation.levels.length" class="level-table-wrap"><table><thead><tr><th>Level</th><th>Type / scenario use</th><th>Price</th></tr></thead><tbody><tr v-for="level in run.observation.levels" :key="level.id"><td><abbr :title="level.evidence">{{ levelLabel(level) }}</abbr></td><td>{{ level.kind.replaceAll('_',' ') }}<small v-if="levelUses(level)">{{ levelUses(level) }}</small></td><td>{{ level.basis==='axis_estimate'?'≈ ':'' }}{{ money(level.price) }}</td></tr></tbody></table></div><details><summary>Visible evidence & limitations</summary><ul><li v-for="fact in run.observation.visible_facts" :key="fact">{{ fact }}</li></ul><h3>What the image cannot establish</h3><ul><li v-for="item in run.observation.limitations" :key="item">{{ item }}</li></ul></details></section>
              <p v-if="run.resume_note" class="notice">{{ run.resume_note }}</p><p v-if="run.market_context?.alignment" class="notice">{{ run.market_context.alignment }} <RouterLink v-if="!publicMode&&run.market_context.separate_market_run_id" :to="`/market-lab?run=${run.market_context.separate_market_run_id}`">View the separate market run</RouterLink></p>
            </div></details>
            <div v-if="run.verdict" class="report-actions"><button v-if="run.trader_review?.status==='complete'" class="outline-button" @click="reassess" :disabled="reanalysing||!providerReady">{{ reanalysing?'Starting assessment…':'Update conditions / assessment' }}</button><button class="text-button" @click="reanalyse" :disabled="reanalysing||!providerReady">Reanalyse these charts</button><p>Updates use the saved images. Upload a new chart to assess later price action.</p></div>
          </template>
          <template v-else-if="view==='discussion'">
            <ChartAnalysisPage v-if="simpleChart" :run="run" @results="changeView('overview')" @discussion="openDetailedDiscussion"><template #chart><ChartSource analysis-only hide-scenario-selector :run="run" :api="api"/></template></ChartAnalysisPage><DiscussionWorkspace v-else :resuming="reanalysing" @resume-traders="resumeTraders" :run="run" :api="api" :initial-room="route.query.network==='traders'?'traders':'specialists'" v-model:plan-key="selectedPlanKey" @room="setDiscussionRoom"/>
          </template>
          <template v-else-if="view==='market'">
            <div class="section-intro"><h2>Inspect the virtual market.</h2><p>Compare simulated paths and participant interactions under different liquidity assumptions.</p></div>
            <MarketPopulation v-if="run.population" :result="run.population" :run-id="run.id" :takeaway="run.verdict?.simulation_takeaway" v-model:case-id="simulationCaseId"/>
            <p v-else class="notice">A virtual-market result is not available for this analysis yet.</p>
            <AgentInteractionGraph :key="run.id+'-market'" :run="run" :resuming="reanalysing" @resume-traders="resumeTraders" initial-view="market" v-model:case-id="simulationCaseId"/>
          </template>
        </template>
        <details v-if="run" class="chart-extra-tools"><summary>More research tools</summary><div><button v-if="!publicMode" @click="changeView('market')">Virtual market</button><button @click="openDetailedDiscussion('specialists')">Full discussion rooms</button><RouterLink :to="{...reportLocation(run.id,'overview'),query:{details:'1'}}">Full report & evidence</RouterLink></div></details>
        <footer class="lab-footer">Screenshot research. Conditions are not monitored live. Forecasts and trading scenarios have not been validated against future outcomes.</footer>
      </main>
    </div>
  </ResearchShell>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChartWorkflowNav from '../components/ChartWorkflowNav.vue'
import ChartAnalysisPage from '../components/ChartAnalysisPage.vue'
import {chartWorkflowPhase,chartScenarioOptions,selectChartScenario} from '../utils/chartWorkspace.mjs'
import DiscussionWorkspace from '../components/DiscussionWorkspace.vue'
import TraderCouncil from '../components/TraderCouncil.vue'
import AnalysisOverview from '../components/AnalysisOverview.vue'
import ChartPlanResults from '../components/ChartPlanResults.vue'
import TradeExitPlanner from '../components/TradeExitPlanner.vue'
import TradeAssessment from '../components/TradeAssessment.vue'
import ResearchShell from '../components/ResearchShell.vue'
import ResearchIcon from '../components/ResearchIcon.vue'
import SavedAnalyses from '../components/SavedAnalyses.vue'
import ChartSource from '../components/ChartSource.vue'
import AssessmentSummary from '../components/AssessmentSummary.vue'
import ConditionalActionPaths from '../components/ConditionalActionPaths.vue'
import AnalysisJourney from '../components/AnalysisJourney.vue'
import AnalysisProgress from '../components/AnalysisProgress.vue'
import AgentConversationRoom from '../components/AgentConversationRoom.vue'
import {analysisFlow} from '../utils/analysisFlow.mjs'
import {progressDelay} from '../utils/plans.mjs'
import {account,apiBase,apiFetch,jobFetch,publicMode} from '../api/platform'
import {isPendingAnalysis} from '../utils/platform.mjs'
import {chartSection,reportLocation,opensReportDetails} from '../utils/researchNavigation.mjs'
import MarketPopulation from '../components/MarketPopulation.vue'
import AgentInteractionGraph from '../components/AgentInteractionGraph.vue'
import {visibleTradePlans,isNoTrade,isFutureReferenceReport,rankedReferencePlans} from '../utils/tradeDecision.mjs'
import {exitPlanKey} from '../utils/tradeExitPlan.mjs'
import {recoveryAction,recoveryLabel,latestRecovery} from '../utils/analysisRecovery.mjs'
import {readApiObject,requireJobReceipt,requireAnalysisResponse,requireHistoryResponse} from '../utils/analysisResponses.mjs'

const route = useRoute(), router = useRouter()
const api = apiBase
const darkMode=ref(true)
const simpleChart=computed(()=>['overview','discussion'].includes(view.value)&&route.query.details!=='1')
const workflowPhase=computed(()=>chartWorkflowPhase(run.value,view.value))
const changeWorkflowStep=step=>step==='upload'?newAnalysis():changeView(step==='analysis'?'discussion':'overview')
const openDetailedDiscussion=lens=>router.push({...reportLocation(run.value.id,'discussion'),query:{details:'1',network:lens==='traders'?'traders':'discussion'}})
const view=computed(()=>publicMode&&chartSection(route)==='market'?'overview':chartSection(route))
const reportTabs=computed(()=>[{id:'overview',label:isPendingAnalysis(run.value?.status)?'Live analysis':run.value?.verdict?'Results':run.value?.status==='complete_with_gaps'?'Saved research':'Progress'},{id:'discussion',label:'Agent discussion'},...(!publicMode?[{id:'market',label:'Virtual market'}]:[])])
const exitPlanner=ref(null),exitReview=ref(null),planResults=ref(null),selectedPlanKey=ref('')
async function reviewExit(key){selectedPlanKey.value=key;planResults.value?.openEvidence();if(exitReview.value)exitReview.value.open=true;await nextTick();exitPlanner.value?.selectPlan(key);await nextTick();const section=document.getElementById('trade-exit-planner');section?.scrollIntoView({block:'start'});section?.focus({preventScroll:true})}
async function reviewConditions(key){selectedPlanKey.value=key;await nextTick();if(planResults.value)await planResults.value.showConditions(key);else document.getElementById('conditional-actions')?.scrollIntoView({block:'start'})}
const detailsOpen=ref(false),loadingRun=ref(false),historyLoading=ref(false),historyError=ref(''),showLiveConversation=ref(false)
const openDiscussion=lens=>router.push({...reportLocation(run.value.id,'discussion'),query:{network:lens==='traders'?'traders':'discussion'}})
const setDiscussionRoom=room=>router.replace({...reportLocation(run.value.id,'discussion'),query:{...route.query,network:room==='traders'?'traders':'discussion'}})
const changeView=section=>router.push(reportLocation(run.value.id,section))
const retryLoad=()=>{loadingRun.value=true;loadRun(route.params.runId,activeLoad)}
const files = ref([]), previews = ref([]), context = ref(''), run = ref(null), saved = ref([])
const runningAnalysis=computed(()=>saved.value.find(item=>isPendingAnalysis(item.status)))
const runFlow=computed(()=>analysisFlow(run.value))
const lastSyncedAt=ref(0),pollingIssue=ref(false)
const recoveredRun = computed(()=>latestRecovery(run.value,saved.value))
const fileInput = ref(null), dragging = ref(false), submitting = ref(false), error = ref(''), clock = ref(Date.now()), sampleSelected = ref(false)
const simulationCaseId=ref('1')
const chartPlans=computed(()=>visibleTradePlans(run.value))
watch(()=>chartScenarioOptions(run.value).map(o=>o.key).join('|'),()=>{selectedPlanKey.value=selectChartScenario(chartScenarioOptions(run.value),selectedPlanKey.value)},{immediate:true,flush:'sync'})
const cancelling=ref(false)
const includeMarket=ref(false), reanalysing=ref(false), sampleLoading=ref(false)
const providerReady=computed(()=>!publicMode||(account.config?.provider?.ready===true&&(account.config?.analyses_enabled===true||account.info?.entitlement?.developer===true)))
const uploadDisabled=computed(()=>!providerReady.value||submitting.value||sampleLoading.value||Boolean(runningAnalysis.value))
let pollTimer, clockTimer, historyTimer, activeLoad = 0
const money = value => Number(value).toLocaleString('en-US', { maximumFractionDigits: 8 })
const dateLabel = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const levelLabel = level => `L${(run.value?.observation?.levels.findIndex(item => item.id === level.id) ?? -1) + 1}`
const levelUses = level => chartPlans.value.flatMap((plan, i) => [
  plan.entry_level_id === level.id ? `Scenario ${i + 1} entry` : '',
  plan.stop_level_id === level.id ? `Scenario ${i + 1} SL` : '',
  ...plan.target_level_ids.map((id, j) => id === level.id ? `Scenario ${i + 1} TP${j + 1}` : '')
]).filter(Boolean).join(' · ')
async function request(path, options = {}) {
  const response = await (options.method==='POST'?jobFetch:apiFetch)(`${api}/api/chart${path}`, options)
  const body = await readApiObject(response,'Request failed. Please try again or check the research service.')
  return options.method==='POST'?requireJobReceipt(body):body
}
function replaceFiles(next) {
  previews.value.forEach(url => URL.revokeObjectURL(url))
  files.value = next; previews.value = next.map(file => URL.createObjectURL(file))
}
function addFiles(next) {
  if (uploadDisabled.value || !next.length) return false
  error.value = ''; sampleSelected.value = false
  if (next.some(file => !/\.(png|jpe?g|webp)$/i.test(file.name))) { error.value = 'Use PNG, JPG, JPEG or WebP images.'; return false }
  if (next.some(file => file.size > 10 * 1024 * 1024)) { error.value = 'Each image must be 10 MB or smaller.'; return false }
  if (files.value.length + next.length > 4) { error.value = 'You can upload up to four images.'; return false }
  replaceFiles([...files.value, ...next]); return true
}
async function chooseFiles(event) { const next = Array.from(event.target.files); event.target.value = ''; if (addFiles(next)) await analyse() }
async function dropFiles(event) { dragging.value = false; if (addFiles(Array.from(event.dataTransfer.files))) await analyse() }
function removeFile(index) { replaceFiles(files.value.filter((_, i) => i !== index)); sampleSelected.value = false }
async function useSample() {
  if (uploadDisabled.value) return
  error.value = ''; sampleLoading.value = true
  try { const response = await apiFetch(`${api}/api/chart/sample.png`); if (!response.ok) throw new Error('Could not load the sample chart.'); replaceFiles([new File([await response.blob()], 'synthetic-btc-15m.png', { type: 'image/png' })]); sampleSelected.value = true; await analyse() }
  catch (e) { error.value = e.message }
  finally { sampleLoading.value = false }
}
async function analyse() {
  if (!providerReady.value || !files.value.length || submitting.value || runningAnalysis.value) return
  submitting.value = true; error.value = ''
  try { const form = new FormData(); files.value.forEach(file => form.append('images', file)); form.append('context', context.value); form.append('include_market', String(includeMarket.value)); const response = await request('/analyses', { method: 'POST', body: form }); await router.push(`/chart-lab/${response.id}`) }
  catch (e) { error.value = e.message }
  finally { submitting.value = false }
}
let progressRevision=-1,progressRunId=''
async function loadRun(id, generation) {
  try {
    if(progressRunId!==id){progressRunId=id;progressRevision=-1}
    let result
    if(publicMode&&run.value?.id===id&&isPendingAnalysis(run.value.status)&&simpleChart.value){
      const update=await request(`/analyses/${id}/progress?after_revision=${progressRevision}`)
      if(generation!==activeLoad)return
      if(update.unchanged){pollTimer=setTimeout(()=>loadRun(id,generation),progressDelay(run.value.status,document.hidden));return}
      progressRevision=update.revision;result=update.complete?await request(`/analyses/${id}`):update
    }else result=await request(`/analyses/${id}`)
    if (generation !== activeLoad) return
    run.value = requireAnalysisResponse(result,id); if(isPendingAnalysis(run.value.status))showLiveConversation.value=true; loadingRun.value=false; error.value = ''; lastSyncedAt.value=Date.now();pollingIssue.value=false
    if (isPendingAnalysis(run.value.status)) pollTimer = setTimeout(() => loadRun(id, generation),publicMode?progressDelay(run.value.status,document.hidden):simpleChart.value?900:2000)
    else loadHistory()
  } catch (e) { if (generation !== activeLoad) return; loadingRun.value=false; pollingIssue.value=true;error.value = e.message; if(e.status===404)run.value=null; if (![401,403,404].includes(e.status)) pollTimer = setTimeout(() => loadRun(id, generation), 5000) }
}
async function cancelRun(){if(cancelling.value)return;cancelling.value=true;try{await apiFetch(`${api}/api/chart/analyses/${run.value.id}/cancel`,{method:'POST'}).then(async response=>{if(!response.ok){const body=await response.json();throw new Error(body.error||'Could not stop this analysis')}});clearTimeout(pollTimer);await loadRun(run.value.id,activeLoad)}catch(e){error.value=e.message}finally{cancelling.value=false}}
async function openRun(id) { await router.push(`/chart-lab/${id}`) }
async function loadHistory() { if(historyLoading.value)return;historyLoading.value=true; try { saved.value=requireHistoryResponse(await request('/analyses'));historyError.value='' } catch(e){historyError.value=e.message} finally{historyLoading.value=false} }
function newAnalysis() { if (submitting.value) return; router.push('/chart-lab'); replaceFiles([]); sampleSelected.value = false; context.value = ''; error.value = '' }
async function reanalyse() {
  if (!run.value || reanalysing.value) return
  reanalysing.value = true; error.value = ''
  try { const response = await request('/analyses/' + run.value.id + '/reanalyse', { method: 'POST' }); await router.push('/chart-lab/' + response.id) }
  catch (e) { error.value = e.message }
  finally { reanalysing.value = false }
}
async function resumeTraders() {
  if(!run.value||reanalysing.value)return
  if(recoveredRun.value)return openRun(recoveredRun.value.id)
  reanalysing.value=true;error.value=''
  try{const response=await request('/analyses/'+run.value.id+'/resume-traders',{method:'POST'});await router.push('/chart-lab/'+response.id+'?network=traders#agent-interactions')}
  catch(e){error.value=e.message}
  finally{reanalysing.value=false}
}
async function reassess() {
  if(!run.value||reanalysing.value)return
  reanalysing.value=true;error.value=''
  try{const response=await request('/analyses/'+run.value.id+'/reassess',{method:'POST'});await router.push('/chart-lab/'+response.id+'#trade-assessment')}
  catch(e){error.value=e.message}
  finally{reanalysing.value=false}
}
function recoverAnalysis() {
  const action=recoveryAction(run.value)
  if(action==='reassess')return reassess()
  if(action==='reanalyse')return reanalyse()
  return resumeTraders()
}
function downloadReport() {
  const blob = new Blob([JSON.stringify(run.value, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = `mmaofun-6.7-chart-${run.value.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function reviewResult(){showLiveConversation.value=false;const hash=(run.value?.verdict?.action_paths || run.value?.verdict?.strategy_scenarios)?'#conditional-actions':'#trade-assessment';if(hash==='#trade-assessment')detailsOpen.value=true;await router.push({...reportLocation(run.value.id,'overview'),hash});await nextTick();document.getElementById(hash.slice(1))?.scrollIntoView({block:'start'})}
watch(() => route.params.runId, id => { activeLoad++; clearTimeout(pollTimer); run.value = null; loadingRun.value=Boolean(id); detailsOpen.value=false;showLiveConversation.value=false; error.value = '';lastSyncedAt.value=0;pollingIssue.value=false; if (id) loadRun(id, activeLoad);else loadHistory() }, { immediate: true })
watch(()=>route.fullPath,async()=>{
  if(opensReportDetails(route.hash))detailsOpen.value=true
  await nextTick()
  if(route.hash)document.getElementById(route.hash.slice(1))?.scrollIntoView({block:'start'})
  else window.scrollTo({top:0})
})
watch(()=>run.value?.id,async()=>{
  if(opensReportDetails(route.hash))detailsOpen.value=true
  if(route.hash){await nextTick();document.getElementById(route.hash.slice(1))?.scrollIntoView({block:'start'})}
})
onMounted(() => { loadHistory(); clockTimer = setInterval(() => { clock.value = Date.now() }, 1000);historyTimer=setInterval(()=>{if(!route.params.runId||view.value==='saved')loadHistory()},10000) })
onBeforeUnmount(() => { activeLoad++; clearTimeout(pollTimer); clearInterval(clockTimer);clearInterval(historyTimer); previews.value.forEach(url => URL.revokeObjectURL(url)) })
</script>
<style scoped>
.report-quick-actions{display:flex;gap:10px;margin-left:auto}.report-heading{flex-wrap:wrap}.report-quick-actions button{font-size:12px;min-height:36px;padding:8px 12px}

.active-analysis,.analysis-return{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:17px 20px;margin:18px 0;border:1px solid #e5ddd5;border-left:3px solid #ff4f00;background:#fffaf7;font-size:13px}.active-analysis strong{font-weight:500;font-size:14px}.active-analysis p{font-size:12px;color:#737d8c;line-height:1.7;margin-top:4px}.active-analysis a,.analysis-return button{display:flex;align-items:center;gap:10px;color:#a73508;text-decoration:none;white-space:nowrap;font-size:12px}.active-analysis svg,.analysis-return svg{width:17px;height:17px}.analysis-return{background:#f7f7f8;border-color:#e3e6eb;border-left-color:#ff4f00;padding:12px 16px}.analysis-return button{border:0;background:none;cursor:pointer}.analysis-return span{color:#566175}.active-analysis a:hover,.analysis-return button:hover{text-decoration:underline}@media(max-width:600px){.active-analysis,.analysis-return{align-items:flex-start;flex-direction:column;gap:12px}.active-analysis a,.analysis-return button{white-space:normal}}
.chart-lab{max-width:1560px;margin:auto;padding-bottom:10px}.page-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:38px}.page-toolbar p{font-size:12px;color:#647085}.page-toolbar p a{color:#647085;text-decoration:none}.page-toolbar p span{margin:0 10px;color:#a1a8b2}.page-heading{margin:34px 0 34px}.page-heading h1{font-size:42px;font-weight:600;line-height:1.16;letter-spacing:-1.8px;color:#111}.page-heading>p{color:#596477;font-size:19px;line-height:1.6;margin-top:9px}.upload-layout{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(280px,1fr);gap:38px;align-items:start}.upload-column{min-width:0}.drop-zone{position:relative;min-height:315px;border:1px dashed #b9c1cd;border-radius:8px;background:#f7f7f8;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:28px;transition:border-color .15s,background .15s}.drop-zone.dragging{border-color:#ff4f00;background:#fff5f0}.drop-zone.pending{opacity:.7}.file-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}.upload-icon{color:#ff4f00;width:40px;height:40px;margin-bottom:17px}.drop-zone h2{font-size:23px;font-weight:600;letter-spacing:-.5px;margin:0 0 4px}.drop-zone p{font-size:15px;color:#697589}.drop-zone .primary{min-width:220px;margin:19px 0 16px}.drop-zone small{font-size:12px;color:#697589}.primary,.outline-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:41px;padding:10px 16px;border:1px solid #ff4f00;border-radius:6px;background:#ff4f00;color:#111;font-size:13px;cursor:pointer;font-weight:500}.primary:hover{background:#f14900}.outline-button{border-color:var(--research-line);background:white;color:#283342}.outline-button:hover{background:#f7f7f8}.outline-button svg{width:17px;height:17px}.text-button{border:0;background:transparent;color:#a73508;padding:9px 0;cursor:pointer;font-size:13px}.text-button:hover{text-decoration:underline}.upload-options{margin-top:19px;border:1px solid var(--research-line);border-radius:6px;background:#f7f7f8;font-size:13px}.upload-options summary{padding:13px 18px;cursor:pointer;font-weight:500}.upload-options>div{padding:0 18px 17px}.upload-options textarea{margin:8px 0 12px;display:block;width:100%;padding:12px;border:1px solid #ced3da;resize:vertical;border-radius:5px;font-size:13px;line-height:1.6}.market-option{display:flex;align-items:center;gap:8px;font-size:12px}.market-option input{accent-color:#ff4f00}.upload-options p{color:#677080;font-size:11px;line-height:1.7;margin-top:8px}.field-help{color:#687386;font-size:12px;line-height:1.7;margin-top:15px}.upload-guide{padding-top:2px}.upload-guide h2{font-size:23px;font-weight:600;letter-spacing:-.5px;margin:0 0 24px}.upload-guide ol{list-style:none;margin:0;padding:0}.upload-guide li{display:flex;gap:13px;margin-bottom:28px}.upload-guide li>span{width:34px;height:34px;border-radius:50%;background:#f1f2f4;flex:0 0 34px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#313946}.upload-guide h3{font-size:16px;line-height:1.5;letter-spacing:-.25px;font-weight:600;margin-bottom:3px}.upload-guide p{font-size:13px;line-height:1.7;color:#687386}.upload-guide>button{display:flex;justify-content:space-between;align-items:center;width:100%;padding:22px 0 10px;margin-top:12px;border:0;border-top:1px solid var(--research-line);background:white;color:#a73508;font-size:14px;text-align:left;cursor:pointer}.file-previews{display:flex;flex-direction:column;gap:8px;margin-top:12px}.file-previews>div{display:flex;gap:10px;align-items:center;font-size:12px;border:1px solid var(--research-line);padding:7px}.file-previews img{width:50px;height:40px;object-fit:cover}.file-previews span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.file-previews button{border:0;background:white;color:#a73508;cursor:pointer}.retry-upload{margin-top:12px}.report-heading{display:flex;align-items:baseline;gap:18px;margin:28px 0 16px}.report-heading h1{font-size:34px;line-height:1.3;letter-spacing:-1.1px;font-weight:600;overflow-wrap:anywhere}.report-heading p{font-size:13px;color:#657185}.report-tabs{display:flex;border-bottom:1px solid var(--research-line);gap:14px;margin-bottom:20px}.report-tabs a{padding:12px 13px;text-decoration:none;color:#566174;border-bottom:3px solid transparent;font-size:14px;white-space:nowrap}.report-tabs a.selected{border-bottom-color:#ff4f00;color:#ad3605;font-weight:500}.report-tabs a:hover{background:#f7f7f8}.overview-layout{display:grid;grid-template-columns:minmax(0,2.3fr) minmax(270px,1fr);gap:17px;align-items:stretch}.overview-layout.chart-only{grid-template-columns:1fr}.report-details{border:1px solid var(--research-line);border-radius:7px;margin:24px 0;background:#fff}.report-details>summary{padding:14px 19px;font-size:14px;font-weight:500;cursor:pointer}.details-content{padding:6px 24px 24px;font-size:14px}.details-content>ul{padding-left:20px}.details-content h3{margin-top:18px}.observation{border-top:1px solid var(--research-line);margin-top:25px;padding-top:20px;color:#596477;font-size:13px}.observation h2{font-size:20px;color:#222;margin-bottom:12px}.observation h3{font-size:15px;margin:16px 0 10px}.observation>p{line-height:1.75}.observation ul{padding-left:20px}.observation summary{padding:13px 0;cursor:pointer}.level-table-wrap{overflow-x:auto;margin:20px 0}.level-table-wrap table{border-collapse:collapse;width:100%;font-size:12px}.level-table-wrap th,.level-table-wrap td{text-align:left;padding:10px 13px;border-bottom:1px solid var(--research-line);font-weight:400}.level-table-wrap th{background:#f7f7f8}.level-table-wrap small{display:block}.report-actions{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin:24px 0}.report-actions p{flex-basis:100%;color:#747e8b;font-size:11px;margin-top:-9px}.notice,.error{padding:13px 16px;border-left:3px solid #ff4f00;background:#f7f7f8;color:#505a68;font-size:13px;margin:16px 0}.error{border-color:#ad493b;background:#fff4f1;color:#95392d}.notice a{color:#a73508}.progress{display:flex;gap:17px;align-items:center;padding:20px;border:1px solid var(--research-line);margin:20px 0}.progress h2{font-size:18px;font-weight:500}.progress p{font-size:12px;color:#647085;margin-top:5px}.spinner{width:25px;height:25px;border:2px solid #e6e8ed;border-top-color:#ff4f00;border-radius:50%;animation:spin 1s linear infinite;flex:0 0 25px}.loading-report{min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px}.loading-report h1{font-size:26px;font-weight:500}.loading-report p{color:#647085}.failed{padding:25px;border:1px solid #e6d5ce;background:#fffaf7;margin:20px 0}.failed h1,.failed h2{font-size:23px;margin:0 0 10px;font-weight:500}.failed p{font-size:14px;line-height:1.7;margin-bottom:15px}.failed>button,.failed>a{margin-right:15px}.failed ul{padding-left:18px;margin-bottom:16px}.section-intro{margin:26px 0}.section-intro h2{font-size:27px;font-weight:500;letter-spacing:-.6px}.section-intro p{color:#637084;font-size:14px;line-height:1.7;margin-top:6px}.lab-footer{border-top:1px solid var(--research-line);padding:22px 0;margin-top:34px;font-size:11px;color:#778190;line-height:1.7}.chart-lab :deep(#conditional-actions){scroll-margin-top:25px}.chart-lab :deep(.agent-interactions){margin-top:0}@keyframes spin{to{transform:rotate(360deg)}}
@media(min-width:1600px){.overview-layout{grid-template-columns:minmax(0,2.7fr) minmax(280px,1fr)}}
@media(max-width:1150px){.upload-layout{grid-template-columns:minmax(0,1.5fr) minmax(220px,1fr);gap:26px}.page-heading h1{font-size:36px}.page-heading>p{font-size:17px}.overview-layout{grid-template-columns:minmax(0,1.7fr) minmax(230px,1fr)}}
@media(max-width:800px){.page-heading{margin:24px 0}.page-heading h1{font-size:36px}.upload-layout{grid-template-columns:1fr}.upload-guide{margin-top:8px}.upload-guide ol{display:flex;gap:20px}.upload-guide li{flex:1;flex-direction:column;gap:10px;margin-bottom:15px}.overview-layout{grid-template-columns:1fr}.report-heading h1{font-size:30px}.report-heading{gap:12px}.report-tabs{gap:6px}.chart-lab :deep(#conditional-actions){scroll-margin-top:135px}}
@media(max-width:600px){.page-toolbar{min-height:28px}.page-toolbar .outline-button{font-size:11px;padding:7px 9px;min-height:35px;gap:5px}.page-toolbar p{font-size:11px}.page-toolbar p span{margin:0 4px}.page-heading h1{font-size:33px;letter-spacing:-1.2px}.page-heading>p{font-size:16px}.drop-zone{min-height:295px;padding:24px 16px}.drop-zone h2{font-size:21px}.drop-zone .primary{min-width:210px}.upload-guide ol{flex-direction:column;gap:0}.upload-guide li{flex-direction:row;gap:12px;margin-bottom:22px}.upload-guide h2{font-size:21px}.report-heading{flex-direction:column;gap:4px;margin:22px 0 10px}.report-heading h1{font-size:29px}.report-tabs{gap:0;overflow-x:auto}.report-tabs a{font-size:12px;padding:11px 10px}.overview-layout{grid-template-columns:1fr}.details-content{padding:0 15px 18px}.report-details>summary{padding:13px 14px;font-size:13px}.report-actions{gap:12px}.section-intro h2{font-size:24px}.section-intro p{font-size:13px}}

.chart-workspace{display:grid;grid-template-columns:minmax(280px,.36fr) minmax(460px,.64fr);gap:30px;align-items:start;margin:20px 0 27px}.workspace-context{display:flex;flex-direction:column;gap:24px;min-width:0}.workspace-agents{min-width:0}.workspace-next{padding:0}.workspace-next h2{font-size:16px;font-weight:500;margin:0 0 10px}.workspace-next p,.workspace-note{font-size:12px;line-height:1.8;color:#697589;margin:0}.chart-workspace :deep(.analysis-journey){margin-top:0}.discussion-workspace{margin-top:20px}.chart-workspace :deep(.chart-source header){padding:12px 14px}.chart-workspace :deep(.chart-source h2){font-size:14px}.chart-workspace :deep(.chart-source header a){font-size:10px}.chart-workspace :deep(.assessment-summary h2){font-size:24px}.chart-workspace :deep(.assessment-summary .summary-body>p){font-size:13px}.chart-workspace :deep(.assessment-summary .review-coverage>span){padding-top:15px}.chart-workspace :deep(.assessment-summary .review-coverage button){font-size:12px}@media(max-width:1200px){.chart-workspace{grid-template-columns:minmax(255px,.37fr) minmax(380px,.63fr);gap:23px}}@media(max-width:1000px){.chart-workspace{grid-template-columns:minmax(0,1fr)}.workspace-agents,.discussion-workspace>.conversation-room{order:1}.workspace-context{order:2}.workspace-context :deep(.chart-source){max-width:700px}}@media(max-width:600px){.chart-workspace{gap:24px;margin-top:15px}}

.chart-result-chip{font-size:11px;background:#f2f5f7;color:#596d7f;border-radius:5px;padding:4px 8px;white-space:nowrap}.chart-result-chip.waiting{color:#8d6a2d;background:#fff5e4}.report-heading{flex-wrap:wrap}.report-heading>p{margin-left:auto}@media(max-width:600px){.report-heading{display:block}.report-heading>p{margin-top:8px}.chart-result-chip{display:inline-block;margin-top:10px}}
.workspace-process{margin:0 0 16px;font-size:11px;color:#697589}.workspace-process>summary{cursor:pointer;padding:0 0 4px}.workspace-process :deep(.analysis-progress){margin-top:16px}

/* Compact report panels; source-chart dimensions and styling remain unchanged. */
.report-heading{margin:20px 0 12px;gap:12px}.report-heading h1{font-size:28px}.report-heading p{font-size:12px}
.report-tabs{position:sticky;top:0;z-index:15;background:#fff;margin-bottom:14px;gap:8px}.report-tabs a{padding:9px 12px;font-size:13px;min-height:38px}
.report-details{margin:14px 0}.report-details>summary{padding:11px 16px;font-size:13px}
.report-actions{gap:12px;margin:16px 0}.section-intro{margin:18px 0}.section-intro h2{font-size:23px}.section-intro p{font-size:13px;margin-top:4px}
.chart-lab :deep(.interaction-section){padding-top:16px;padding-bottom:16px}.chart-lab :deep(.graph-heading h2){font-size:20px}.chart-lab :deep(.graph-intro){font-size:12px;margin:10px 0;line-height:1.6}
.chart-lab :deep(#interaction-body){max-height:540px;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
.chart-lab :deep(.network-scroll){max-height:300px}.chart-lab :deep(.graph-inspector){max-height:280px;padding:14px}.chart-lab :deep(.graph-inspector h3){font-size:16px}
.chart-lab :deep(.conversation-room.compact .spoken-exchange){max-height:260px;padding:14px 16px}.chart-lab :deep(.conversation-room.compact .room-heading){padding:13px 16px 0;margin-bottom:10px}.chart-lab :deep(.conversation-room.compact .room-heading h2){font-size:17px}
.chart-lab :deep(.conversation-room.compact .room-toolbar),.chart-lab :deep(.conversation-room.compact .agent-finder){padding-left:16px;padding-right:16px}.chart-lab :deep(.conversation-room.compact .speech-bubble){margin-bottom:12px}.chart-lab :deep(.conversation-room.compact .speech-bubble p){line-height:1.6}
.chart-lab :deep(.analysis-journey){margin-bottom:12px}.chart-lab :deep(.analysis-progress.compact .progress-heading h2){font-size:18px}
@media(max-width:800px){.report-tabs{top:115px}.report-heading h1{font-size:27px}}
@media(max-width:600px){.report-heading{margin:16px 0 10px}.report-tabs a{padding:8px 9px;font-size:12px}.section-intro h2{font-size:21px}.chart-lab :deep(#interaction-body){max-height:480px}.chart-lab :deep(.network-scroll){max-height:240px}.chart-lab :deep(.graph-inspector){max-height:240px}.chart-lab :deep(.conversation-room.compact .spoken-exchange){max-height:220px}}

/* The uploaded image belongs to the visible result, independently of agent details. */
.result-workspace>.workspace-context{order:0}
@media(min-width:620px) and (max-width:1000px){.chart-workspace{grid-template-columns:minmax(210px,36%) minmax(0,1fr);gap:20px}.workspace-context{order:0}.workspace-agents,.discussion-workspace>.conversation-room{order:1}}

.report-heading{position:relative;align-items:center;margin:4px 0 9px;gap:12px;min-height:43px;padding-right:320px}.report-heading>p{margin-left:0;font-size:11px}.report-quick-actions{position:absolute;right:0;top:2px;margin:0}.report-tabs{margin-bottom:8px}.report-tabs a{padding:9px 12px}.chart-lab :deep(.chart-plan-results){margin-top:0}.chart-lab :deep(.decision-heading){padding:16px 0}.chart-lab :deep(.decision-word){font-size:46px}.chart-lab :deep(.freshness-inline){margin:8px 0 12px}@media(max-width:800px){.report-heading{padding-right:0;padding-bottom:43px}.report-quick-actions{top:auto;bottom:0}.report-heading>p{margin-left:0}}@media(max-width:600px){.report-heading{padding-bottom:43px}.report-quick-actions{left:0;right:auto}}

@media(max-width:620px){.report-heading{display:flex;align-items:center;gap:6px 10px;margin:0 0 6px;padding:0;min-height:0}.report-heading h1{font-size:25px;line-height:1.15}.report-heading .chart-result-chip{margin-top:0;font-size:10px}.report-heading>p{flex-basis:100%;margin:0;font-size:10px;line-height:1.5}.report-quick-actions{position:static;order:3;display:flex;gap:6px;justify-content:flex-end;width:100%;margin:1px 0 0}.report-quick-actions button{font-size:11px;min-height:30px;padding:5px 9px}.report-tabs{margin-bottom:3px}.report-tabs a{padding:7px 8px;font-size:11px}.chart-lab :deep(.decision-heading){padding:10px 0}.chart-lab :deep(.decision-word){font-size:36px}.chart-lab :deep(.freshness-inline){margin:7px 0 10px}}
</style>
<style scoped>
.chart-theme-toggle{border:0;background:none;color:var(--research-muted);font:inherit;font-size:11px;cursor:pointer;padding:8px}.page-heading .chart-theme-toggle{float:right}.stock-dark .chart-lab{color:var(--research-ink)}.stock-dark .page-heading>p,.stock-dark .report-heading>p,.stock-dark .lab-footer{color:var(--research-muted)}.stock-dark .outline-button{background:#111923;color:var(--research-ink);border-color:var(--research-line)}.stock-dark .upload-guide>button,.stock-dark .file-previews button{background:none;color:#ffac75}.stock-dark .drop-zone,.stock-dark .upload-options,.stock-dark .notice{background:#111923;border-color:var(--research-line);color:var(--research-muted)}.stock-dark .upload-options textarea{background:#101923;border-color:var(--research-line);color:var(--research-ink)}.stock-dark :deep(.chart-source){background:#111923;color:var(--research-ink)}.stock-dark :deep(.chart-source header){background:#111923}.stock-dark :deep(.chart-source header a){color:#ffb37f}.stock-dark :deep(.chart-controls){color:var(--research-muted)}.stock-dark :deep(.image-tabs button){background:#142231;color:var(--research-ink)}.stock-dark :deep(.chart-notice){background:#f4773510;color:#dfb391}.stock-dark .failed,.stock-dark .assessment-gap{background:#111923;border-color:var(--research-line);color:var(--research-ink)}.chart-lab .report-heading{padding-right:380px;margin-bottom:23px}.chart-lab .report-heading h1{font-size:29px}.chart-lab .report-heading>p{font-size:11px}@media(max-width:1000px){.chart-lab .report-heading{padding-right:0;padding-bottom:45px}.chart-lab .report-quick-actions{top:auto;bottom:0}}@media(max-width:600px){.chart-lab .report-heading{gap:5px}.chart-lab .report-quick-actions{left:0;right:auto;gap:6px}.chart-lab .report-quick-actions .primary,.chart-lab .report-quick-actions .outline-button{font-size:11px;padding:7px 10px;min-height:34px}}
</style>

<style scoped>
.assessment-gap{display:flex;align-items:center;gap:20px;border:1px solid #e6d5ce;border-radius:8px;background:#fffaf7;padding:20px;margin:18px 0}.assessment-gap>strong{font-size:40px;letter-spacing:-1px;color:#a54820}.assessment-gap h2{font-size:18px;margin:0 0 5px;font-weight:550}.assessment-gap p{font-size:13px;line-height:1.65;color:#69758a;margin:0}@media(max-width:620px){.assessment-gap{align-items:start;gap:12px}.assessment-gap>strong{font-size:30px}}
</style>

<style scoped>
.chart-extra-tools{border-top:1px solid var(--research-line);margin:24px 0 0;padding:12px 0;font-size:12px;color:var(--research-muted)}.chart-extra-tools summary{cursor:pointer;padding:7px 0}.chart-extra-tools>div{display:flex;gap:12px;flex-wrap:wrap;padding:12px 0}.chart-extra-tools button,.chart-extra-tools a{font:inherit;font-size:12px;border:1px solid var(--research-line);padding:7px 10px;border-radius:5px;background:none;color:var(--research-muted);text-decoration:none;cursor:pointer}
</style>
