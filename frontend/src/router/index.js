import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { stockScroll } from '../utils/stockFlow.mjs'
import LaunchHome from '../views/LaunchHome.vue'
import { watch } from 'vue'
import { account, initializeAccount, publicMode, previewMode } from '../api/platform'
import { safeReturnPath } from '../utils/platform.mjs'

const routes = [
  {path:'/pricing',name:'Pricing',component:()=>import('../views/Pricing.vue')},
  ...['privacy','terms','support'].map(path=>({path:'/'+path,name:path,component:()=>import('../views/Legal.vue')})),
  {path:'/account',name:'Account',component:previewMode?()=>import('../views/PreviewAccount.vue'):()=>import('../views/Account.vue')},
  {path:'/saved',name:'SavedResearch',component:previewMode?()=>import('../views/PreviewAccount.vue'):()=>import('../views/SavedResearch.vue')},
  {path:'/simulations',name:'SimulationProjects',component:()=>import('../views/Home.vue')},
  {
    path: '/stock-lab/:runId?',
    name: 'StockLab',
    component: previewMode?()=>import('../views/PreviewLab.vue'):()=>import('../views/StockLab.vue')
  },
  {
    path: '/market-lab',
    name: 'MarketLab',
    component: () => import('../views/MarketLab.vue')
  },
  {
    path: '/chart-lab/:runId?',
    name: 'ChartLab',
    component: previewMode?()=>import('../views/PreviewLab.vue'):()=>import('../views/ChartLab.vue'),
    beforeEnter:to=>to.query.view==='saved'?{path:'/saved'}:true
  },
  {
    path: '/',
    name: 'Home',
    component: LaunchHome
  },
  {
    path: '/process/:projectId',
    name: 'Process',
    component: () => import('../views/MainView.vue'),
    props: true
  },
  {
    path: '/simulation/:simulationId',
    name: 'Simulation',
    component: () => import('../views/SimulationView.vue'),
    props: true
  },
  {
    path: '/simulation/:simulationId/start',
    name: 'SimulationRun',
    component: () => import('../views/SimulationRunView.vue'),
    props: true
  },
  {
    path: '/report/:reportId',
    name: 'Report',
    component: () => import('../views/ReportView.vue'),
    props: true
  },
  {
    path: '/interaction/:reportId',
    name: 'Interaction',
    component: () => import('../views/InteractionView.vue'),
    props: true
  }
]

const router = createRouter({
  history: previewMode?createWebHashHistory(import.meta.env.BASE_URL):createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to,from,saved){if(saved)return saved;if(to.hash&&to.name==='ChartLab')return {el:to.hash};if(['Home','SavedResearch','ChartLab','MarketLab','StockLab','SimulationProjects'].includes(to.name))return {left:0,top:0};return stockScroll(to,from,saved)}
})


const publicRoutes = new Set(['Home', 'Account', 'SavedResearch', 'ChartLab', 'StockLab','Pricing','privacy','terms','support'])
router.beforeEach(async to => {
  if(previewMode)return publicRoutes.has(to.name)?true:'/'
  if (!publicMode) return to.name === 'Account' ? '/' : true
  if (!publicRoutes.has(to.name)) return '/'
  if(['Home','Pricing','privacy','terms','support'].includes(to.name)){initializeAccount().catch(()=>{});return true}
  try { await initializeAccount() } catch { return to.name === 'Account' ? true : { path: '/account', query: { next: safeReturnPath(to.fullPath) } } }
  if (['SavedResearch', 'ChartLab', 'StockLab'].includes(to.name) && !account.session) return { path: '/account', query: { next: safeReturnPath(to.fullPath) } }
  return true
})
watch(() => account.session?.user?.id, (user, previous) => {
  if (publicMode && previous && !user && router.currentRoute.value.name !== 'Account') router.replace('/account')
})

router.afterEach(to=>{
  if(previewMode){document.title='mmaofun · Project preview';document.documentElement.lang='en';return}
  if(publicMode){document.title='mmaofun · '+({StockLab:'Stock Lab',ChartLab:'Chart Lab',Pricing:'Plans',Account:'Account',SavedResearch:'Saved analyses'}[to.name]||'Research');document.documentElement.lang='en';return}
  if(to.name==='Home'||to.name==='SavedResearch'){
    document.title=`mmaofun 6.7 · ${to.name==='Home'?'New analysis':'Saved analyses'}`
    document.documentElement.lang='en'
  }else if(to.name==='StockLab'){
    document.title='MiroFish · Stock Lab'
    document.documentElement.lang='en'
  }else if(to.name==='ChartLab'||to.name==='MarketLab'){
    document.title=`mmaofun 6.7 · ${to.name==='MarketLab'?'Market research':to.query.view==='saved'?'Saved analyses':'Chart Lab'}`
    document.documentElement.lang='en'
  }else{
    document.title='MiroFish'
    document.documentElement.lang=localStorage.getItem('locale')||'en'
  }
})

export default router
