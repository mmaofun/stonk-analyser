const placeholders=/^(unknown|unavailable|not (known|established|reported|recorded|provided)|n\/?a|none|[—-])\.?$/i

export function hasEvidenceValue(value){
 if(typeof value==='number')return Number.isFinite(value)
 return typeof value==='string'&&Boolean(value.trim())&&!placeholders.test(value.trim())
}

export function availableEvidenceItems(value){
 return (Array.isArray(value)?value:[]).filter(item=>item&&item.status!=='unknown')
}

export function availableMetrics(value){
 return Object.fromEntries(Object.entries(value||{}).filter(([,metric])=>Number.isFinite(metric?.val)))
}

export function evidenceDisplayText(value){
 if(typeof value!=='string'||!hasEvidenceValue(value))return ''
 return value.replace(/\bremains unknown\b/gi,'has not been established').replace(/\bremain unknown\b/gi,'have not been established').replace(/\bis unknown\b/gi,'has not been established').replace(/\bare unknown\b/gi,'have not been established').replace(/\bunknowns\b/gi,'open questions').replace(/\bunknown\b/gi,'not established')
}
