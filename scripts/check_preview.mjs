/** Reject an unsafe or accidentally live Pages artifact before uploading it. */
import fs from 'node:fs/promises'
import path from 'node:path'
const root=path.resolve(process.argv[2]||'frontend/dist')
const html=await fs.readFile(path.join(root,'index.html'),'utf8')
if(!html.includes('connect-src &#39;none&#39;')&&!html.includes("connect-src 'none'"))throw new Error('Pages builds must block API connections with their preview CSP.')
async function scan(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const name=path.join(directory,entry.name);if(entry.isDirectory()){await scan(name);continue}if(/(?:^\.env|\.pem$|\.key$|state\.json$)/i.test(entry.name))throw new Error('Private file in preview output: '+entry.name);if(/\.(?:js|html|json)$/.test(entry.name)){const text=await fs.readFile(name,'utf8');if(/(?:sb_secret_[A-Za-z0-9_-]{16,}|sk_(?:live|test)_[A-Za-z0-9]{24,}|sk-proj-[A-Za-z0-9_-]{32,})/.test(text))throw new Error('Potential credential in preview output: '+entry.name)}}}
await scan(root)
console.log('PASS preview artifact: API connections blocked; no private files or credential patterns found.')
