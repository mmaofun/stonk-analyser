const list=value=>Array.isArray(value)?value:[]
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{}
export function evidenceResolutionView(run,plan){
 run=object(run);plan=object(plan)
 const automatic=object(run.auto_evidence||plan.auto_summary),attempt=object(run.resolution)
 const gaps=list(plan.gaps||automatic.remaining_gaps||attempt.remaining_gaps)
 const completed=['complete','complete_with_gaps'].includes(run.status)
 const checked=new Set(list(plan.checked_gap_ids))
 if(attempt.status==='complete')list(attempt.selected_gap_ids).forEach(id=>checked.add(id))
 const hasCheck=Object.keys(automatic).length>0||attempt.status==='complete'||checked.size>0
 const active=run.status==='running'&&['running','checking'].includes(automatic.status)
 const newSources=new Set([...list(automatic.new_source_ids),...list(attempt.new_source_ids)]).size
 const reviewed=!automatic.review_pending&&automatic.review_validated!==false&&run.evidence_review_status!=='processing_unavailable'
 const outcome=automatic.outcome||attempt.outcome
 const finishedCheck=['complete','skipped','stopped'].includes(automatic.status)||attempt.status==='complete'
 const actionable=list(plan.actionable_gap_ids||plan.default_gap_ids).filter(id=>!checked.has(id))
 return {completed,active,gaps,checked:[...checked],actionable,newSources,
  title:active?'Checking evidence automatically':hasCheck?'Evidence checked':'Evidence review',
  summary:active?'One bounded catch-up pass is running before the final report.':
   !gaps.length&&finishedCheck?'No structured evidence gaps remain.':
   newSources?(reviewed?'Additional source evidence was found and reviewed.':'Additional source evidence was found.'):
   hasCheck?'Available evidence and results are shown below.':
   gaps.length?'Results from the captured evidence are shown below.':'Evidence details are available in this report.',
  outcomeLabel:outcome==='resolved'?'Evidence gaps resolved':newSources?'Additional evidence checked':
   outcome==='partially_resolved'?'Some gaps resolved':outcome==='stopped_externally'?'Evidence check stopped; saved work retained':
   hasCheck?'Evidence checks completed':'Evidence review',
  show:active||completed&&(gaps.length>0||hasCheck),
  defaultSelection:list(plan.default_gap_ids||actionable).filter(id=>actionable.includes(id)),
 }
}
