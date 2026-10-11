const test=require('node:test'),assert=require('node:assert/strict')
test('Pages preview has no API origin even if an operator accidentally supplied one',async()=>{
 const {deploymentConfig}=await import('../src/utils/platform.mjs')
 assert.deepEqual(deploymentConfig({VITE_DEPLOYMENT_MODE:'preview',VITE_API_BASE_URL:'https://private.example'}),{publicMode:false,previewMode:true,apiBase:''})
})
test('all six examples reflect whole-team tiers and only fictional source data',async()=>{
 const {plans}=await import('../src/utils/plans.mjs'),{stockExample,chartExample}=await import('../src/utils/previewReports.mjs')
 for(const plan of plans){const stock=stockExample(plan.id),chart=chartExample(plan.id);assert.equal(stock.roles.length,plan.total_agents);assert.equal(new Set(stock.roles.map(p=>p.id)).size,plan.total_agents);assert.equal(stock.investors.length,plan.opinion_agents);assert.equal(chart.roster.length+chart.trader_dialogue.participants.length,plan.total_agents);assert.equal(chart.trader_dialogue.participants.length,plan.opinion_agents);assert.equal(stock.is_sample,true);assert.equal(chart.is_sample,true);assert(stock.dossier.sources.every(s=>s.url===''));assert(stock.dossier.bars.every(p=>Number.isFinite(p.timestamp)))}
})
test('preview scenario selection changes the actual plan and missing stops remain unpriced',async()=>{
 const {chartExample}=await import('../src/utils/previewReports.mjs'),{chartScenarioOptions,selectChartScenario}=await import('../src/utils/chartWorkspace.mjs')
 const run=chartExample('max'),options=chartScenarioOptions(run);assert.equal(options.length,4)
 assert.deepEqual(options.filter(x=>x.kind==='reference').map(x=>[x.plan.entry,x.plan.stop,x.plan.targets[0]]),[[100,96,110],[110,114,102]])
 const watch=options.find(x=>x.kind==='watch');assert.equal(selectChartScenario(options,watch.key),watch.key);assert.equal(watch.plan,null)
})
test('public polling backs off for queues and background tabs',async()=>{
 const {progressDelay}=await import('../src/utils/plans.mjs');assert(progressDelay('queued')>progressDelay('running'));assert(progressDelay('running',true)>progressDelay('queued'))
})
