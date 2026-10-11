const list=value=>Array.isArray(value)?value:[]
const positive=value=>Number.isFinite(value)&&value>0?value:null
const timestamp=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0
const count=(rows,fallback)=>Array.isArray(rows)?rows.length:Math.max(0,Number(fallback)||0)

export const discussionPhases=[
  {key:'openings',label:'Opening views',verb:'forming their first views',unit:'views',why:'Each trader reads the chart evidence before hearing from peers.'},
  {key:'questions',label:'Peer questions',verb:'questioning one another',unit:'questions',why:'Traders challenge a real peer’s argument and its long or short conditions.'},
  {key:'replies',label:'Paired replies',verb:'answering the challenges',unit:'replies',why:'Each trader answers the question addressed to them and can revise their view.'},
  {key:'cross_group_replies',label:'Across trading styles',verb:'comparing other trading styles',unit:'responses',why:'Each trader reads three saved peer views from other styles before its final response.'},
]

export function analysisFlow(run) {
  const data=run||{},dialogue=data.trader_dialogue||{},review=data.trader_review||{}
  const active=positive(list(data.roster).filter(role=>role.active).length)
  const traders=positive(dialogue.participant_count),expectedReviews=positive(review.expected_count)||traders
  const views=count(data.opinions),questions=count(data.challenges),replies=count(data.replies)
  const phases=discussionPhases.map(phase=>({...phase,count:count(dialogue[phase.key],dialogue.counts?.[phase.key]),total:traders}))
  const phase=phases.find(item=>!traders||item.count<traders)||phases.at(-1)
  const reviewed=count(review.entries,review.reviewed_count)
  const complete=data.status==='complete'&&Boolean(data.verdict)
  const partial=data.status==='complete_with_gaps'&&!data.verdict
  const imageGap=partial&&!data.observation
  const stopped=['failed','interrupted','cancelled','complete_with_gaps'].includes(data.status)
  const enough=(value,total)=>total!==null&&value>=total
  const discussionDone=dialogue.status==='complete'&&phases.every(item=>enough(item.count,traders))
  const reviewDone=review.status==='complete'&&enough(reviewed,expectedReviews)
  const debateDone=enough(questions,active)&&enough(replies,active)
  const raw=String(data.stage||'')
  const steps=[
    {id:'chart',label:'Read charts',done:Boolean(data.observation),title:'Reading your charts',detail:'Identifying the asset, visible timeframe, price structure and readable levels.',progress:null},
    {id:'specialists',label:'Specialist views',done:enough(views,active),title:'Specialists are examining the chart',detail:active?`${views} of ${active} opening views saved. Each specialist considers the evidence from their own perspective.`:'Preparing the specialist roles supported by your chart.',progress:active?{value:views,total:active,unit:'opening views'}:null},
    {id:'discussion',label:'Trader discussion',done:discussionDone,title:`Traders are ${phase.verb}`,detail:phase.why,progress:traders?{value:phase.count,total:traders,unit:phase.unit}:null},
    {id:'debate',label:'Test & challenge',done:debateDone,title:data.population?'Specialists are challenging the results':'Checking the virtual-market scenarios',detail:data.population?.status==='unavailable'?'The numerical market is unavailable. Specialists continue with the chart evidence and their saved discussion.':'Checking supported virtual-market scenarios, then asking specialists to challenge and revise their arguments.',progress:active&&data.population?{value:questions+replies,total:active*2,unit:'questions and replies'}:null},
    {id:'review',label:'Review every view',done:reviewDone,title:'Reviewing each trader’s final view',detail:'Checking each argument against the chart evidence, including opposing and waiting views.',progress:expectedReviews?{value:reviewed,total:expectedReviews,unit:'perspectives reviewed'}:null},
    {id:'report',label:'Your assessment',done:complete,title:'Writing your final assessment',detail:'Combining the saved discussion and reviews into the chart bias, trade readiness and conditional long and short paths.',progress:null},
  ]
  let current=steps.findIndex(step=>!step.done)
  const failure=data.failure?.phase||''
  if(failure.startsWith('specialist_opinions'))current=1
  else if(failure.startsWith('specialist_'))current=3
  else if(failure==='trader_review')current=4
  else if(failure.startsWith('trader_'))current=2
  else if(failure==='moderator')current=5
  else if(failure==='image_reading')current=0
  else if(/Moderator|final assessment/i.test(raw)&&reviewDone)current=5
  else if(/Reviewing every trader/i.test(raw))current=4
  else if(/Cross-examination|Replies & revisions/i.test(raw))current=3
  else if(dialogue.status==='running'||dialogue.status==='incomplete')current=2
  if(complete)current=5
  if(current<0)current=5
  if(raw==='Queued'&&current===0)steps[0]={...steps[0],title:'Your charts are uploaded',detail:'Preparing to read the uploaded images and identify their visible structure.'}
  if(/Loading requested current BTC/i.test(raw)){current=0;steps[0]={...steps[0],title:'Checking the requested BTC context',detail:'Checking whether the requested market context matches the uploaded chart.'}}
  const queued=data.status==='queued'
  const currentStep=queued?{...steps[current],title:'Your analysis is queued',detail:'Your charts are saved. A worker will start the analysis when capacity is available.',progress:null}:steps[current]
  return {complete,stopped,currentIndex:current,current:currentStep,phases,
    steps:steps.map((step,index)=>({...step,state:queued?(step.done?'done':'pending'):complete?(step.done?'done':'not-recorded'):stopped&&index===current?'stopped':index===current?'active':step.done?'done':'pending'})),
    next:steps.slice(current+1).find(step=>!step.done)||null,
    title:imageGap?'Image saved; chart reading needs review':partial?'Research saved; final assessment needs review':complete?'Your assessment is ready':data.status==='cancelled'?'Analysis cancelled':stopped?(!data.observation?'Chart reading needs attention':'Analysis stopped — completed work is saved'):currentStep.title,
    detail:complete?(data.verdict?.trade_readiness?.decision==='no_trade'?'The result is no trade for this screenshot. Read what must change before either side can be reconsidered.':'Review the conditions and invalidation before considering any supported setup.'):stopped?(data.failure?.message||data.error||'The analysis needs attention before it can continue.'):currentStep.detail,
    reuse:Boolean(data.reassessed_from_run_id||data.resumed_from_run_id)}
}

export function analysisActivity(run,limit=5) {
  const data=run||{},started=timestamp(data.created_at),items=[]
  const add=(rows,phase,stage,body,title,timeKey='recorded_at')=>list(rows).forEach((row,index)=>{
    const text=body(row)
    if(!text)return
    const at=timestamp(row[timeKey])
    items.push({id:`${phase}:${row.message_id||row.actor_id||row.id||index}`,stage,title:title(row),text,
      secondary:row.response&&row.thesis?row.thesis:null,at,reused:at>0&&started>0&&at<started,
      stance:row.stance||null})
  })
  add(data.opinions,'specialist-view','specialists',row=>row.thesis,row=>`${row.name||'Specialist'} shared a view`)
  add(data.challenges,'specialist-question','debate',row=>row.question,row=>`${row.name||'Specialist'} questioned ${row.target_name||'a peer'}`)
  add(data.replies,'specialist-reply','debate',row=>row.response||row.revised_thesis,row=>`${row.name||'Specialist'} replied`)
  const dialogue=data.trader_dialogue||{}
  for(const phase of discussionPhases){
    add(dialogue[phase.key],`trader-${phase.key}`,'discussion',row=>row.question||row.response||row.thesis,
      row=>`${row.name||'Trader'} ${phase.key==='questions'?`questioned ${row.target_name||'a peer'}`:phase.key==='openings'?'shared a view':phase.key==='cross_group_replies'?'responded across trading styles':'answered a peer'}`)
  }
  const names=Object.fromEntries(list(dialogue.participants).map(person=>[person.id,person.name]))
  add(data.trader_review?.entries,'perspective-review','review',row=>row.assessment,
    row=>`${names[row.actor_id]||'Trader'}’s view was reviewed`,'reviewed_at')
  return items.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id)).slice(0,limit)
}

export function durationLabel(run,now=Date.now()) {
  const start=timestamp(run?.created_at)
  if(!start)return 'Starting'
  const end=['queued','running'].includes(run?.status)?now:timestamp(run?.completed_at||run?.stopped_at||run?.updated_at)
  if(!end)return 'Time not recorded'
  const seconds=Math.max(0,Math.floor((end-start)/1000))
  return seconds<60?`${seconds}s`:`${Math.floor(seconds/60)}m ${seconds%60}s`
}

export function connectionState(run,{lastSyncedAt=0,pollingIssue=false,now=Date.now()}={}) {
  if(run?.status==='queued')return {label:pollingIssue?'Reconnecting to queue updates':'Waiting in the analysis queue',state:pollingIssue?'reconnecting':'waiting'}
  if(run?.status!=='running')return {label:'Saved analysis',state:'saved'}
  if(pollingIssue)return {label:'Reconnecting to progress updates',state:'reconnecting'}
  if(lastSyncedAt&&now-lastSyncedAt>10000)return {label:'Waiting for progress updates',state:'waiting'}
  return {label:lastSyncedAt?'Receiving progress updates':'Connecting to progress updates',state:lastSyncedAt?'connected':'connecting'}
}
