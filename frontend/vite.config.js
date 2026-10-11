import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({mode})=>({
  plugins: [vue(),...(mode==='pages'?[{name:'project-preview-safety',transformIndexHtml(html){return {html:html.replace(/<script>document\.documentElement\.lang[\s\S]*?<\/script>/,'').replace(/<link[^>]+href="https:\/\/fonts\.[^>]+>/g,'').replace('<html lang="zh">','<html lang="en">'),tags:[{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:"default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'"},injectTo:'head-prepend'}]}}}]:[])],
  // Open local tabs can still reference the previous build's lazy chunks.
  // Keep those assets reachable until users reload into the new interface.
  build: { emptyOutDir: ['pages','public'].includes(mode)||process.env.VITE_DEPLOYMENT_MODE === 'public' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@locales': path.resolve(__dirname, '../locales')
    }
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
}))
