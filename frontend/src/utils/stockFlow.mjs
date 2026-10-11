export const stockSections = [
  {id:'overview',name:'Summary'}, {id:'research',name:'Research & debate'}, {id:'simulation',name:'Investors & market'},
]
export const researchViews = [{id:'annual',name:'One-year debate'},{id:'company',name:'Company'},{id:'strategy',name:'Strategies'},{id:'sources',name:'Sources'}]
export const simulationViews = [{id:'investors',name:'Investors'},{id:'market',name:'Market'}]
export function stockSection(view) {
  if(researchViews.some(item=>item.id===view))return 'research'
  if(simulationViews.some(item=>item.id===view))return 'simulation'
  return 'overview'
}
export function stockDestination(section,current) {
  if(stockSection(current)===section)return current
  return section==='research'?'annual':section==='simulation'?'investors':'overview'
}
export function stockFlow(run) {
  const research=run?.research||[],rounds=run?.investor_rounds||{}
  const count=layer=>research.filter(row=>row.layer===layer&&row.result).length
  const privateCount=Object.keys(rounds['0']||{}).length,socialCount=Object.keys(rounds['1']||{}).length
  const annualDone=['complete','unavailable'].includes(run?.one_year_status||run?.one_year?.status)
  const finished=['complete','complete_with_gaps'].includes(run?.status)
  const autoChecking=run?.status==='running'&&['running','checking'].includes(run?.auto_evidence?.status)
  const steps=[
    {id:'sources',name:run?.report_version>=2?'Plan & gather business evidence':'Gather evidence',done:run?.report_version>=2?run?.business_collection?.status==='complete':Boolean(run?.dossier),detail:run?.business_collection?.status==='complete'?`${run.dossier?.sources?.length||0} sources captured across planned business topics`:run?.dossier?`${run.dossier.sources.length} identity/financial sources captured; business collection pending`:'Reading listing identity, filings and reported prices'},
    {id:'research',name:'Research both sides',done:count('company')>=16&&count('strategy')>=16,detail:`${count('company')+count('strategy')} / 32 cases saved`},
    {id:'annual',name:'Debate one year',done:annualDone,detail:annualDone?'Return scenarios and score saved':'Supporting and opposing valuation arguments'},
    {id:'investors',name:'Investors respond',done:privateCount===50&&socialCount===50,detail:`${privateCount} private views · ${socialCount} discussion responses`},
    {id:'report',name:'Market & verdict',done:finished&&Boolean(run?.verdict)&&(run?.report_version<2||!run?.report_version||Boolean(run?.decision_framework)),detail:finished&&run?.decision_framework?'Five questions and assessment saved':finished?'Assessment ready':'Match virtual orders, then weigh the evidence'},
  ]
  let current=steps.findIndex(step=>!step.done)
  if(run?.one_year_status==='running')current=2
  else if(/50 investors/.test(run?.stage||''))current=3
  else if(/Clearing|Final reviewer/.test(run?.stage||''))current=4
  if(current<0)current=4
  if(autoChecking)current=1
  if(run?.resolution){
    const phases=['discovery','roles','review','downstream','complete'],index=Math.max(0,phases.indexOf(run.resolution.phase))
    const names=['Selected evidence','Missing responses','Evidence review','Changed assessments','Saved outcome']
    return {steps:names.map((name,i)=>({id:phases[i],name,state:finished||i<index?'done':run.status==='running'&&i===index?'active':'pending'})),current:index,finished,
      title:finished?'Assessment ready · evidence limits disclosed':run.stage||'Checking selected evidence',active:(run.roles||[]).filter(role=>role.status==='running').map(role=>role.name),latest:(run.events||[]).slice(-3).reverse(),completeCases:count('company')+count('strategy')}
  }
  const active=(run?.roles||[]).filter(role=>role.status==='running').map(role=>role.name)
  const last=(run?.events||[]).slice(-3).reverse()
  return {steps:steps.map((step,index)=>({...step,state:autoChecking&&index===1?'active':step.done?'done':run?.status==='running'&&index===current?'active':'pending'})),
    current,finished,title:run?.status==='queued'?'Your analysis is queued':run?.status==='cancelled'?'Analysis cancelled':autoChecking?'Checking evidence automatically':run?.status==='running'?steps[current].name:run?.status==='complete_with_gaps'?'Assessment ready · evidence limits disclosed':finished?'Your assessment is ready':'Saved work needs attention',
    active,latest:last,completeCases:count('company')+count('strategy')}
}
export function stockScroll(to,from,saved) {
  if(to.name==='StockLab')return {left:0,top:0}
  return saved||undefined
}
