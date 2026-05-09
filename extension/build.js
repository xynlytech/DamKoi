/**
 * DamKoi Extension — esbuild bundler
 *
 * Bundles ES module source files into Chrome/Edge-compatible single files.
 * Output: *.bundle.js in the same extension folder — no subfolder needed.
 * Just reload the extension in chrome://extensions or edge://extensions.
 *
 * Usage:
 *   node build.js              — dev build (localhost API)
 *   node build.js --watch      — watch mode (dev)
 *   node build.js --prod       — production build (live API)
 *   NODE_ENV=production node build.js  — same as --prod
 */

const esbuild = require('esbuild');
const path    = require('path');

const watch = process.argv.includes('--watch');
const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

// ── Environment-specific API URLs ─────────────────────────────

const API_BASE       = isProd ? 'https://damkoi-api.onrender.com' : 'http://127.0.0.1:8000';
const DASHBOARD_BASE = isProd ? 'https://damkoi.xynly.com'    : 'http://127.0.0.1:3000';

if (isProd) {
  console.log('[PROD] Production build — API:', API_BASE);
} else {
  console.log('[DEV] Development build — API:', API_BASE);
}

// ── Shared esbuild config ─────────────────────────────────────

const sharedConfig = {
  bundle:   true,
  platform: 'browser',
  target:   'chrome110',
  format:   'iife',
  logLevel: 'info',
  minify:   isProd,
  define: {
    // Injected at build time — replaces typeof checks in utils.js
    '__API_BASE__':       JSON.stringify(API_BASE),
    '__DASHBOARD_BASE__': JSON.stringify(DASHBOARD_BASE),
    'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
  },
};

// ── Build entries (output to same folder, referenced by manifest) ─

const entries = [
  { entryPoints: ['popup.js'],          outfile: 'popup.bundle.js'          },
  { entryPoints: ['content.js'],        outfile: 'content.bundle.js'        },
  { entryPoints: ['background.js'],     outfile: 'background.bundle.js'     },
  { entryPoints: ['cart_detector.js'],  outfile: 'cart_detector.bundle.js'  },
];

// ── Run ───────────────────────────────────────────────────────

async function build() {
  const ctxs = await Promise.all(
    entries.map(entry =>
      esbuild.context({ ...sharedConfig, ...entry })
    )
  );

  if (watch) {
    await Promise.all(ctxs.map(ctx => ctx.watch()));
    console.log('\n👀 Watching for changes… (Ctrl+C to stop)');
    console.log('   After any change: click Refresh on edge://extensions or chrome://extensions\n');
  } else {
    await Promise.all(ctxs.map(ctx => ctx.rebuild()));
    await Promise.all(ctxs.map(ctx => ctx.dispose()));
    console.log('\n[SUCCESS] Build complete!');
    console.log('   popup.bundle.js, content.bundle.js, background.bundle.js written.');
    console.log(`   Mode: ${isProd ? '[PROD] PRODUCTION' : '[DEV] DEVELOPMENT'}`);
    console.log('   Go to edge://extensions → click Refresh on DamKoi.\n');
  }
}

build().catch(e => {
  console.error('Build failed:', e);
  process.exit(1);
});
