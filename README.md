# stonk-analyser · mmaofun preview

Static Stock Lab and Chart Lab interface preview with labelled fictional examples.
Free, Pro and Max example teams contain exactly 5, 20 and 50 agents respectively.
Accounts, uploads, live analysis and payments are disabled. No private reports or
server credentials are included. This is a project demonstration, not a live service.

## Run locally

Use Node.js 22 or later. From the repository root:

```sh
npm ci --prefix frontend
npm run build:pages --prefix frontend -- --base /stonk-analyser/
node scripts/check_preview.mjs frontend/dist
npm run preview --prefix frontend -- --host 127.0.0.1
```

## Publish the preview to GitHub Pages

1. The preview source is in this repository; pushes to main build it automatically.
2. In Settings → Pages, choose GitHub Actions.
3. Under Actions, run **GitHub Pages project preview**.
4. Open the URL shown by the successful deployment. The workflow handles the
   repository path automatically; hash-based lab routes work on refresh.

This snapshot contains the frontend source required to build the demonstration.
The later account service and worker are separate and remain gated until live
security, billing, capacity, recovery, cost and licensing checks pass.

## Attribution and license

Derived from [666ghj/MiroFish](https://github.com/666ghj/MiroFish), with modified
Stock Lab / Chart Lab interfaces and a static tier preview. The upstream AGPL-3.0
license is preserved in LICENSE. Retain this attribution and the corresponding
modified source when distributing or hosting the preview.
