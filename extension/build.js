/**
 * DamKoi Extension — esbuild bundler
 *
 * Usage:
 *   node build.js              — dev build (Chrome, localhost API)
 *   node build.js --watch      — watch mode (dev)
 *   node build.js --prod       — production build (Chrome, live API)
 *   node build.js --firefox    — Firefox MV2 build (outputs to dist/firefox/)
 *   NODE_ENV=production node build.js  — same as --prod
 */

const esbuild = require('esbuild');
const path    = require('path');
const fs      = require('fs');

const watch      = process.argv.includes('--watch');
const isProd     = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const isFirefox  = process.argv.includes('--firefox');

// ── Environment-specific API URLs ─────────────────────────────

const PROD_API_BASE  = process.env.PROD_API_BASE || 'https://api.damkoi.com';
const API_BASE       = isProd ? PROD_API_BASE                  : 'http://127.0.0.1:8000';
const DASHBOARD_BASE = isProd ? 'https://damkoi.xynly.com'     : 'http://127.0.0.1:3000';

if (isProd) {
  console.log('[PROD] Production build — API:', API_BASE);
} else {
  console.log('[DEV] Development build — API:', API_BASE);
}

// ── Shared esbuild config ─────────────────────────────────────

const outDir = isFirefox ? 'dist/firefox' : '.';

const sharedConfig = {
  bundle:   true,
  platform: 'browser',
  target:   isFirefox ? 'firefox109' : 'chrome110',
  format:   'iife',
  logLevel: 'info',
  minify:   isProd,
  define: {
    '__API_BASE__':         JSON.stringify(API_BASE),
    '__DASHBOARD_BASE__':   JSON.stringify(DASHBOARD_BASE),
    'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
  },
};

// ── Build entries ─────────────────────────────────────────────

const entries = [
  { entryPoints: ['popup.js'],         outfile: `${outDir}/popup.bundle.js`         },
  { entryPoints: ['content.js'],       outfile: `${outDir}/content.bundle.js`       },
  { entryPoints: ['background.js'],    outfile: `${outDir}/background.bundle.js`    },
  { entryPoints: ['cart_detector.js'], outfile: `${outDir}/cart_detector.bundle.js` },
];

// ── Run ───────────────────────────────────────────────────────

async function build() {
  if (isFirefox) {
    fs.mkdirSync('dist/firefox', { recursive: true });
    // Copy static assets Firefox needs
    const assets = ['content.css', 'popup.html', 'popup.css', 'manifest.firefox.json'];
    for (const f of assets) {
      if (fs.existsSync(f)) {
        const dest = f === 'manifest.firefox.json' ? 'dist/firefox/manifest.json' : `dist/firefox/${f}`;
        fs.copyFileSync(f, dest);
      }
    }
    // Copy icons directory
    if (fs.existsSync('icons')) {
      fs.mkdirSync('dist/firefox/icons', { recursive: true });
      for (const icon of fs.readdirSync('icons')) {
        fs.copyFileSync(`icons/${icon}`, `dist/firefox/icons/${icon}`);
      }
    }
    console.log('[FIREFOX] Building MV2 extension for Firefox → dist/firefox/');
  }

  const ctxs = await Promise.all(
    entries.map(entry => esbuild.context({ ...sharedConfig, ...entry }))
  );

  if (watch) {
    await Promise.all(ctxs.map(ctx => ctx.watch()));
    console.log('\n👀 Watching for changes… (Ctrl+C to stop)\n');
  } else {
    await Promise.all(ctxs.map(ctx => ctx.rebuild()));
    await Promise.all(ctxs.map(ctx => ctx.dispose()));
    if (isFirefox) {
      console.log('\n[SUCCESS] Firefox build complete → dist/firefox/');
      console.log('   Load in Firefox: about:debugging → Load Temporary Add-on → dist/firefox/manifest.json\n');
    } else {
      console.log('\n[SUCCESS] Build complete!');
      console.log('   popup.bundle.js, content.bundle.js, background.bundle.js written.');
      console.log(`   Mode: ${isProd ? '[PROD] PRODUCTION' : '[DEV] DEVELOPMENT'}`);
      console.log('   Go to edge://extensions → click Refresh on DamKoi.\n');
    }
  }
}

build().catch(e => {
  console.error('Build failed:', e);
  process.exit(1);
});
