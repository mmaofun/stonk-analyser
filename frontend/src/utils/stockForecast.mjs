export function stockAssessmentProvisional(run){return run?.verdict?.verdict==='insufficient_evidence'||run?.status==='complete_with_gaps'||Object.keys(run?.stage_gaps||{}).length>0}
export function stockForecast(run){
 const o=run?.one_year,currency=o?.currency||run?.dossier?.price?.currency||null
 if(!o)return {available:false,reason:'A saved one-year assessment is not available.'}
 if(o.status!=='complete')return {available:false,reason:'A completed one-year assessment is not available.'}
 const asOf=o.as_of||run?.dossier?.price?.as_of,target=o.target_date,start=Date.parse(asOf),end=Date.parse(target),days=(end-start)/86400000
 if(!Number.isFinite(start)||!Number.isFinite(end)||days<300||days>430)return {available:false,reason:'The source date and 12-month target horizon were not established.'}
 if(o.source_review_status==='review_required'||o.status==='unavailable')return {available:false,reason:o.source_review_summary||o.unavailable_reasons?.join(' ')||'More reliable evidence is needed before showing a price range.'}
 if(!currency||o.currency&&run?.dossier?.price?.currency&&o.currency!==run.dossier.price.currency)return {available:false,reason:'The valuation and reference-price currencies do not match.'}
 const cases=[['low','Bear / low'],['central','Base / central'],['high','Bull / high']].map(([key,label])=>({key,label,price:o[key]?.target_price,return:o[key]?.return,reason:o[key]?.reason}))
 if(!Number.isFinite(o.reference_price)||o.reference_price<=0||cases.some(c=>!Number.isFinite(c.price)||c.price<=0||!Number.isFinite(c.return)||Math.abs((c.price/o.reference_price-1)-c.return)>1e-6)||cases[0].price>cases[1].price||cases[1].price>cases[2].price)return {available:false,reason:o.unavailable_reasons?.join(' ')||'A complete, consistent stock-price range was not established.'}
 return {available:true,provisional:stockAssessmentProvisional(run),projectionLens:o.projection_lens==='growth_focused'&&[1,2].includes(o.projection_policy_version)?'growth_focused':'standard',currency,cases,reference:o.reference_price,asOf,target,evidence:o.evidence_strength||o.synthesis?.evidence_strength||'Not recorded',support:o.arguments?.for?.thesis,oppose:o.arguments?.against?.thesis}
}
