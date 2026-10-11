export function recoveryAction(run) {
  if (run?.failure?.action) return run.failure.action
  if (run?.trader_review?.status === 'complete') return 'reassess'
  if (run?.version >= 6 && run?.observation?.is_chart) return 'resume_saved'
  return 'reanalyse'
}

export const recoveryLabel = action => ({resume_saved:'Resume saved analysis',reassess:'Retry final assessment',reanalyse:'Retry saved images'}[action] || 'Resume saved analysis')

export function latestRecovery(run, history = []) {
  if (!['failed','interrupted','cancelled','complete_with_gaps'].includes(run?.status)) return null
  const byId = new Map(history.map(item => [item.id,item]))
  const descendants = history.filter(item => {
    if (!['complete','complete_with_gaps','queued','running'].includes(item.status) || item.id === run.id) return false
    const seen = new Set([item.id])
    let parent = item.previous_run_id
    while (parent && !seen.has(parent)) {
      if (parent === run.id) return true
      seen.add(parent)
      parent = byId.get(parent)?.previous_run_id
    }
    return false
  })
  descendants.sort((a,b) => Number(b.status==='complete')-Number(a.status==='complete') ||
    String(b.created_at).localeCompare(String(a.created_at)))
  return descendants[0] || null
}
