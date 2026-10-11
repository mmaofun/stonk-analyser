export function chartSection(route) {
  if (route.query?.view==='saved') return 'saved'
  if (!route.params?.runId) return 'overview'
  if (route.query?.view==='market' || route.query?.network==='market' || route.hash==='#market-population') return 'market'
  if (route.query?.view==='discussion' || ['traders','discussion'].includes(route.query?.network) || ['#agent-interactions','#trader-discussion'].includes(route.hash)) return 'discussion'
  return 'overview'
}

export function reportLocation(runId,section) {
  return {path:`/chart-lab/${runId}`,query:section==='overview'?{}:{view:section},hash:''}
}

export const opensReportDetails=hash=>['#trade-action','#trade-assessment','#price-action-decision'].includes(hash)||/^#trade-plan-\d+$/.test(hash||'')
