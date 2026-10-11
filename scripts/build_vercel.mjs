import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const frontend=path.join(root,'frontend')
const mode=process.env.VITE_DEPLOYMENT_MODE||'preview'
if(!['preview','public'].includes(mode))throw new Error('Choose preview or public deployment mode.')
if(mode==='public'){
 const api=new URL(process.env.VITE_API_BASE_URL||'')
 if(api.protocol!=='https:'||!api.hostname||api.username||api.password)throw new Error('Public mode needs the verified HTTPS analysis API URL.')
}
const run=args=>{
 const result=spawnSync(process.execPath,args,{cwd:frontend,stdio:'inherit',env:{...process.env,VITE_DEPLOYMENT_MODE:mode}})
 if(result.error)throw result.error
 if(result.status!==0)process.exit(result.status||1)
}
run([path.join(frontend,'node_modules/vite/bin/vite.js'),'build','--mode',mode==='preview'?'pages':'public','--base','/'])
if(mode==='preview')run([path.join(root,'scripts/check_preview.mjs'),path.join(frontend,'dist')])
