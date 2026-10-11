const rows = value => Array.isArray(value) ? value : []
const segment = value => encodeURIComponent(String(value))
const created = row => row.updated_at || row.created_at || row.snapshot_as_of || null
export const researchTimestamp = value => typeof value==='number'&&Number.isFinite(value)?value:Date.parse(value)||0
export const researchStatus = value => ({complete:'Complete',completed:'Complete',queued:'Queued',running:'Running',preparing:'Preparing',ready:'Ready',failed:'Needs attention',interrupted:'Needs attention',complete_with_gaps:'Needs attention',cancelled:'Stopped',stopped:'Stopped',pending:'Queued',created:'Created',graph_completed:'Graph ready',ontology_generated:'Graph pending'}[value] || String(value || 'Saved').replaceAll('_',' '))
export const verdictName = value => ({watch:'Watch',avoid:'Avoid',attractive:'Attractive at the reported price',insufficient_evidence:'Insufficient evidence'}[value] || '')

export function researchRecords({charts=[],stocks=[],markets=[],simulations=[],projects=[]}={}) {
  const records = [
    ...rows(charts).filter(x=>x.id).map(x=>({id:`chart:${x.id}`,recordId:x.id,type:'Charts',name:x.asset||'Chart analysis',detail:rows(x.chart_timeframes).join(' + ')||'Screenshot research',status:x.status,statusLabel:researchStatus(x.status),verdict:'',at:created(x),path:`/chart-lab/${segment(x.id)}`,image:true,isSample:Boolean(x.is_sample)})),
    ...rows(stocks).filter(x=>x.id).map(x=>({id:`stock:${x.id}`,recordId:x.id,type:'Companies',name:x.company||x.ticker||'Company research',detail:`${x.ticker||''} · ${x.horizon==='years'?'One year':x.horizon||'Company research'}`,status:x.status,statusLabel:researchStatus(x.status),verdict:verdictName(x.verdict),at:created(x),path:`/stock-lab/${segment(x.id)}`,image:false})),
    ...rows(markets).filter(x=>x.id).map(x=>({id:`market:${x.id}`,recordId:x.id,type:'Markets',name:x.symbol||'Market research',detail:[x.interval,x.horizon&&`${x.horizon} horizon`].filter(Boolean).join(' · '),status:'complete',statusLabel:'Saved',verdict:'',at:created(x),path:`/market-lab?run=${segment(x.id)}`,image:false})),
    ...rows(simulations).filter(x=>x.simulation_id).map(x=>({id:`simulation:${x.simulation_id}`,recordId:x.simulation_id,type:'Simulations',name:x.project_name||x.name||'Simulation project',detail:x.total_rounds?`${x.current_round||0} / ${x.total_rounds} rounds`:x.simulation_requirement?.slice(0,110)||'Agent simulation',status:x.runner_status==='running'?'running':x.status,statusLabel:researchStatus(x.runner_status==='running'?'running':x.status),verdict:x.report_id?'Report available':'',at:created(x),path:x.runner_status==='running'?`/simulation/${segment(x.simulation_id)}/start`:x.report_id?`/report/${segment(x.report_id)}`:`/simulation/${segment(x.simulation_id)}`,image:false})),
  ]
  const linkedProjects=new Set(rows(simulations).map(x=>x.project_id))
  records.push(...rows(projects).filter(x=>x.project_id&&!linkedProjects.has(x.project_id)).map(x=>({id:`project:${x.project_id}`,recordId:x.project_id,type:'Simulations',name:x.name||'Simulation project',detail:'Knowledge graph project',status:x.status,statusLabel:researchStatus(x.status),verdict:'',at:created(x),path:`/process/${segment(x.project_id)}`,image:false})))
  return records.sort((a,b)=>researchTimestamp(b.at)-researchTimestamp(a.at)||a.id.localeCompare(b.id))
}

export function filterResearch(records,{search='',type='',status=''}={}) {
  const query=search.trim().toLocaleLowerCase()
  return rows(records).filter(row=>(!type||row.type===type)&&(!status||row.statusLabel===status)&&(!query||`${row.name} ${row.detail} ${row.verdict}`.toLocaleLowerCase().includes(query)))
}
