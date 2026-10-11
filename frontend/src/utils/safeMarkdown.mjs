const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
function inline(text){
  return escape(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}
// Report text is generated from source documents. It never becomes executable HTML.
export function safeMarkdown(text=''){
  const blocks=String(text).replace(/\r\n/g,'\n').split(/\n\s*\n/)
  return blocks.map(block=>{
    if(/^```/.test(block))return `<pre><code>${escape(block.replace(/^```[^\n]*\n?/,'').replace(/\n?```$/,''))}</code></pre>`
    const lines=block.split('\n')
    if(lines.every(line=>/^[-*] /.test(line)))return `<ul>${lines.map(line=>`<li>${inline(line.slice(2))}</li>`).join('')}</ul>`
    if(lines.every(line=>/^\d+\. /.test(line)))return `<ol>${lines.map(line=>`<li>${inline(line.replace(/^\d+\. /,''))}</li>`).join('')}</ol>`
    if(lines.every(line=>/^>\s?/.test(line)))return `<blockquote>${inline(lines.map(line=>line.replace(/^>\s?/, '')).join(' '))}</blockquote>`
    if(lines.length===1&&/^#{1,6}\s/.test(block)){const level=Math.max(2,Math.min(4,block.match(/^#+/)[0].length));return `<h${level}>${inline(block.replace(/^#+\s/,''))}</h${level}>`}
    return `<p>${inline(block).replace(/\n/g,'<br>')}</p>`
  }).join('')
}
