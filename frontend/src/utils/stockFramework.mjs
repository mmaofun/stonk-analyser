export const decisionQuestions={
  company_quality:'Is the company actually good?',
  valuation:'Is the stock reasonably valued?',
  catalysts:'What could make the price move?',
  market_expectations:'What does the market currently think?',
  thesis_failure:'What could prove your thesis wrong?',
}
export const frameworkFor=run=>run?.decision_framework||null
export const opportunityName=(run,id)=>frameworkFor(run)?.opportunities?.find(opportunity=>opportunity.id===id)?.name||'Business driver unavailable'
export const isLegacyFramework=run=>!frameworkFor(run)&&(run?.report_version||1)<2
