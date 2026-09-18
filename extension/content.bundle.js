(()=>{async function $(i,e={}){return new Promise((t,o)=>{chrome.runtime.sendMessage({type:i,...e},s=>{chrome.runtime.lastError?o(new Error(chrome.runtime.lastError.message)):s&&s.success?t(s.data):o(new Error(s?.error||"Unknown error"))})})}var Te={EMAIL:"email",SMS:"sms",PUSH:"push"},Le=Te.EMAIL,Be=60*60*1e3;function U(i,e){return`damkoi:v2:${i}:${e}`}function q(i){try{let e=localStorage.getItem(i);if(!e)return null;let{data:t,timestamp:o}=JSON.parse(e);return Date.now()-o>Be?(localStorage.removeItem(i),null):t}catch(e){return console.warn("[DamKoi Cache] Failed to read cache:",e),null}}function O(i,e){try{localStorage.setItem(i,JSON.stringify({data:e,timestamp:Date.now()}))}catch(t){console.warn("[DamKoi Cache] Failed to save cache:",t)}}function oe(i){return i>=8?"#10b981":i>=6?"#f59e0b":i>=4?"#ef4444":"#dc2626"}function se(i){return i>=8?"score-green":i>=6?"score-amber":"score-red"}function y(i){return i?`\u09F3${(i/100).toLocaleString("en-BD")}`:"\u2014"}function ae(i,e,t,o=[Le]){return{product_id:i,target_price:parseInt(e)*100,email:t.trim(),notify_via:o}}function M(i,e,t){if(!i)return;let o=e==="success",s=e==="info";i.textContent=t,i.classList.remove("dk-status-success","dk-status-error","dk-status-info"),o?i.classList.add("dk-status-success"):s?i.classList.add("dk-status-info"):i.classList.add("dk-status-error")}function I(i){return i&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.trim())}function ne(i){let e=parseInt(i);return!isNaN(e)&&e>0}var z="damkoi:recent-views",R="damkoi:recent-views-enabled",He=20;async function W(){return new Promise(i=>{chrome.storage.local.get(R,e=>{i(e[R]!==!1)})})}async function re(i){return new Promise(e=>{chrome.storage.local.set({[R]:i},e)})}async function K(){return new Promise(i=>{chrome.storage.local.get(z,e=>{i(e[z]||[])})})}async function de(i,e){if(!await W())return;let o=await K(),s={id:i.id,title:i.title,url:i.url,image_url:i.image_url||null,platform:i.platform,price:i.current_price,deal_score:e?.deal_score??null,label:e?.label??null,viewed_at:Date.now()},a=o.filter(d=>d.id!==s.id),n=[s,...a].slice(0,He);return new Promise(d=>{chrome.storage.local.set({[z]:n},d)})}async function le(){return new Promise(i=>{chrome.storage.local.remove(z,i)})}var P="damkoi:coupon-votes";async function G(){return new Promise(i=>{chrome.storage.local.get(P,e=>{i(e[P]||{})})})}async function ce(i,e){let t=await G();return t[i]=e,new Promise(o=>{chrome.storage.local.set({[P]:t},o)})}var j="damkoi:saved-email";async function Y(){return new Promise(i=>{chrome.storage.local.get(j,e=>{i(e[j]||"")})})}async function X(i){return new Promise(e=>{chrome.storage.local.set({[j]:i},e)})}var V="damkoi:auto-apply-coupons";async function pe(){return new Promise(i=>{chrome.storage.local.get(V,e=>{i(e[V]!==!1)})})}async function ue(i){return new Promise(e=>{chrome.storage.local.set({[V]:i},e)})}function ve(i,e,t){let o=e.deal_score,s=t.current_price,a=e.avg_30d,n=e.all_time_low;if(i==="days")return o>=8?{action:"buy",text:"Price is at a good point right now. Unlikely to drop further in 2\u20133 days."}:o>=6?{action:"neutral",text:"Fair price but not exceptional. Small chance of a short-term dip."}:{action:"wait",text:"Price is above average. Wait for a deal notification."};if(i==="week"){let d=a?Math.round((a-s)/a*100):0;return d>=10?{action:"buy",text:`${d}% below 30-day average. This week is a good window.`}:{action:"wait",text:"Prices on this item can fluctuate. Set an alert for your target price."}}if(n&&s<=n*1.03)return{action:"buy",text:"At or near all-time low. This level rarely lasts a month."};if(n&&a){let d=Math.round((s-n)/s*100);if(d>15)return{action:"wait",text:`All-time low is \u09F3${(n/100).toLocaleString("en-BD")} \u2014 ${d}% below current. Worth waiting.`}}return{action:"neutral",text:"No strong signal for the next month. Set an alert at your target price."}}var ze={renderDealGauge(i,e){let t=document.getElementById(e);if(!t)return;let s=Math.min(Math.max(i,0),10)/10,a=oe(i),d=Math.PI*40,r=d*(1-s);t.innerHTML=`
      <div class="damkoi-gauge-container">
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
            stroke-linecap="round" />
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="${a}"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="${d}"
            stroke-dashoffset="${r}"
            class="damkoi-gauge-fill" />
        </svg>
        <div class="damkoi-gauge-value ${se(i)}">${i}</div>
        <div class="damkoi-gauge-label">Deal Score</div>
      </div>
    `},renderPriceChart(i,e){let t=document.getElementById(e);if(!t||!i||i.length<2){t.innerHTML='<div class="damkoi-no-data">Not enough data for chart</div>';return}let o=[...i].sort((k,_)=>new Date(k.scraped_at)-new Date(_.scraped_at)),s=o.map(k=>k.price),a=Math.min(...s)*.95,d=Math.max(...s)*1.05-a,r=280,p=120,u=10,v=r-u*2,l=p-u*2,h=o.map((k,_)=>{let T=u+_*(v/(o.length-1)),F=u+(l-(k.price-a)/d*l);return{x:T,y:F}}),f=h.map((k,_)=>`${_===0?"M":"L"} ${k.x} ${k.y}`).join(" "),w=`${f} L ${h[h.length-1].x} ${p-u} L ${h[0].x} ${p-u} Z`;t.innerHTML=`
      <div class="damkoi-chart-container">
        <svg viewBox="0 0 ${r} ${p}" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:auto;max-width:100%;" role="img" aria-label="Price history chart">
          <defs>
            <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgba(167, 139, 250, 0.4)" stop-opacity="1" />
              <stop offset="100%" stop-color="rgba(167, 139, 250, 0)" stop-opacity="1" />
            </linearGradient>
          </defs>
          <path d="${w}" fill="url(#chart-grad)" />
          <path d="${f}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Tooltip dots for each point (hidden by default) -->
          ${h.map((k,_)=>`
            <circle cx="${k.x}" cy="${k.y}" r="3" fill="#fff" class="damkoi-chart-dot" opacity="${_===h.length-1?1:0}">
              <title>${new Date(o[_].scraped_at).toLocaleDateString()}: ${y(o[_].price)}</title>
            </circle>
          `).join("")}
        </svg>
      </div>
    `}},J=ze;var g={summary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',alternatives:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 21v-8"/><path d="m7 16 5 5 5-5"/></svg>',alerts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',lookalike:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',coupons:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',recentViews:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',thumbsUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>',thumbsDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>',copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'};var he="damkoi-inline-root",Ie=['[class*="pdp-product-price"]','[class*="product-price"]','[class*="pdp-info-block"]',".pdp-product-main--price",'[class*="pdp-block"]',"#module_add_to_cart",'[class*="add-to-cart"]','form[action*="cart"]','[class*="pdp-product-detail"]'],c={bg:"#FAFAF9",raised:"rgba(255, 255, 255, 0.45)",inset:"rgba(0, 0, 0, 0.04)",border:"rgba(255, 255, 255, 0.5)",accent:"#7c3aed",primary:"#7c3aed",success:"#059669",danger:"#DC2626",warn:"#D97706",text:"#0C0A09",muted:"#44403C",dim:"#A8A29E"},b={trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>',clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',xmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',buy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',wait:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'},D={BEST_PRICE:{icon:b.trophy,label:"Best Price",color:c.success,bg:"rgba(16,185,129,0.12)",rec:"buy"},GOOD_DEAL:{icon:b.check,label:"Good Deal",color:"#34d399",bg:"rgba(52,211,153,0.1)",rec:"buy"},FAIR_PRICE:{icon:b.clock,label:"Fair Price",color:c.warn,bg:"rgba(245,158,11,0.1)",rec:"wait"},FAKE_DISCOUNT:{icon:b.xmark,label:"Fake Discount",color:c.danger,bg:"rgba(239,68,68,0.1)",rec:"wait"},INSUFFICIENT_DATA:{icon:b.chart,label:"Not Enough Data",color:c.muted,bg:"rgba(123,123,158,0.1)",rec:null}};function De(i){return i>=9?c.success:i>=7?"#34d399":i>=5?c.warn:c.danger}function Z(i,e=480,t=130){if(!i||i.length<2)return{svg:`<div style="text-align:center;color:${c.dim};font-size:12px;padding:28px 0;">
              Not enough price data yet \u2014 check back in a few hours as we build your history.
            </div>`,initInteractivity:()=>{}};let o=[...i].sort((m,x)=>new Date(m.scraped_at)-new Date(x.scraped_at)),s=o.map(m=>m.price),a=Math.min(...s),n=Math.max(...s),d=n-a||1,r={top:12,right:56,bottom:26,left:10},p=e-r.left-r.right,u=t-r.top-r.bottom,v=m=>r.left+m/(o.length-1)*p,l=m=>r.top+u-(m-a)/d*u,h=o.map((m,x)=>`${x===0?"M":"L"}${v(x).toFixed(1)},${l(m.price).toFixed(1)}`).join(" "),f=`${h} L${v(o.length-1).toFixed(1)},${(r.top+u).toFixed(1)} L${r.left},${(r.top+u).toFixed(1)} Z`,k=[0,Math.floor(o.length/2),o.length-1].map(m=>{let S=new Date(o[m].scraped_at).toLocaleDateString("en-BD",{month:"short",day:"numeric"});return`<text x="${v(m).toFixed(1)}" y="${t-5}" text-anchor="middle"
              fill="${c.dim}" font-size="11" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans Bengali,Arial,sans-serif">${S}</text>`}).join(""),_=l(a),T=l(n),F=s.lastIndexOf(a),ee=`dkg_${Math.random().toString(36).slice(2,7)}`,be=o.map((m,x)=>{let S=m.price===a&&x===F,C=x===o.length-1;if(!S&&!C)return"";let A=S?c.success:c.accent,B=C?5:4;return`<circle cx="${v(x).toFixed(1)}" cy="${l(m.price).toFixed(1)}" r="${B}"
      fill="${A}" stroke="${c.bg}" stroke-width="1.5"
      style="filter:drop-shadow(0 0 4px ${A});"/>`}).join(""),E=`dksvg_${Math.random().toString(36).slice(2,7)}`,xe=`
    <svg id="${E}" width="${e}" height="${t}" viewBox="0 0 ${e} ${t}"
         style="display:block;overflow:visible;cursor:crosshair;">
      <defs>
        <linearGradient id="${ee}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${c.accent}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${r.left}" y1="${T.toFixed(1)}" x2="${e-r.right}" y2="${T.toFixed(1)}"
            stroke="rgba(0,0,0,0.06)" stroke-dasharray="3 3" stroke-width="1"/>
      <line x1="${r.left}" y1="${_.toFixed(1)}" x2="${e-r.right}" y2="${_.toFixed(1)}"
            stroke="rgba(16,185,129,0.12)" stroke-dasharray="3 3" stroke-width="1"/>

      <!-- Area + line -->
      <path d="${f}" fill="url(#${ee})"/>
      <path d="${h}" fill="none" stroke="${c.accent}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Price labels right side -->
      <text x="${e-r.right+4}" y="${(T+4).toFixed(1)}"
            fill="${c.muted}" font-size="11" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans Bengali,Arial,sans-serif">${y(n)}</text>
      <text x="${e-r.right+4}" y="${(_+4).toFixed(1)}"
            fill="${c.success}" font-size="11" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans Bengali,Arial,sans-serif">${y(a)}</text>

      <!-- Key dots -->
      ${be}

      <!-- Hover crosshair (hidden by default) -->
      <line id="${E}_hline" x1="0" y1="0" x2="0" y2="${t-r.bottom}"
            stroke="${c.accent}" stroke-width="1" stroke-dasharray="3 2" opacity="0"
            style="pointer-events:none;"/>
      <circle id="${E}_hdot" cx="0" cy="0" r="5"
              fill="${c.accent}" stroke="${c.bg}" stroke-width="2"
              opacity="0" style="pointer-events:none;"/>

      <!-- X labels -->
      ${k}
    </svg>

    <!-- Hover tooltip -->
    <div id="${E}_tip" style="
      display:none;position:absolute;
      background:${c.raised};border:1px solid ${c.border};
      border-radius:8px;padding:6px 10px;font-size:12px;
      color:${c.text};font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans Bengali,Arial,sans-serif;
      box-shadow:-2px -2px 6px rgba(255,255,255,0.8),2px 2px 8px rgba(0,0,0,0.1);
      pointer-events:none;white-space:nowrap;z-index:10;
    "></div>`;function we(m){let x=m.getElementById(E),S=m.getElementById(`${E}_hline`),C=m.getElementById(`${E}_hdot`),A=m.getElementById(`${E}_tip`);if(!x||!S||!C||!A)return;let B=x.parentElement;B&&(B.style.position="relative"),x.addEventListener("mousemove",$e=>{let H=x.getBoundingClientRect(),_e=($e.clientX-H.left)/H.width*e,Se=Math.max(r.left,Math.min(e-r.right,_e)),Ae=Math.round((Se-r.left)/p*(o.length-1)),te=Math.max(0,Math.min(o.length-1,Ae)),N=o[te],L=v(te),ie=l(N.price);S.setAttribute("x1",L.toFixed(1)),S.setAttribute("x2",L.toFixed(1)),S.setAttribute("opacity","0.7"),C.setAttribute("cx",L.toFixed(1)),C.setAttribute("cy",ie.toFixed(1)),C.setAttribute("opacity","1");let Ee=new Date(N.scraped_at).toLocaleDateString("en-BD",{month:"short",day:"numeric",year:"numeric"});A.innerHTML=`<span style="color:${c.dim}">${Ee}</span>&nbsp;&nbsp;<strong style="color:${c.accent}">${y(N.price)}</strong>`,A.style.display="block";let Ce=L/e*H.width+(L>e*.65?-(180+8):12),Me=ie/t*H.height-16;A.style.left=`${Ce}px`,A.style.top=`${Me}px`}),x.addEventListener("mouseleave",()=>{S.setAttribute("opacity","0"),C.setAttribute("opacity","0"),A.style.display="none"})}return{svg:xe,initInteractivity:we}}var Fe=`

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :host { 
    display: block; 
    margin: 20px 0 24px; 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif; 
    --dk-glass: blur(14px) saturate(190%);
  }

  #dkw {
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: var(--dk-glass);
    -webkit-backdrop-filter: var(--dk-glass);
    border: 1px solid ${c.border};
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(28, 25, 23, 0.12);
    overflow: hidden;
    line-height: 1.4;
    font-size: 13px;
    color: ${c.text};
    position: relative;
  }

  .dk-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px;
    border-bottom: 1px solid ${c.border};
  }

  .dk-brand { display: flex; align-items: center; gap: 10px; }

  .dk-brand-name {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    font-weight: 800;
    background: linear-gradient(135deg, ${c.text}, ${c.accent});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }

  .dk-brand-tag { 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    font-size: 12px; 
    color: ${c.dim}; 
    font-weight: 700; 
  }

  .dk-verdict-pill {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  }

  .dk-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: ${c.border};
  }

  .dk-stat {
    background: rgba(255, 255, 255, 0.2);
    padding: 12px 10px;
    text-align: center;
  }

  .dk-stat-label {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    color: ${c.dim};
    font-weight: 700;
    margin-bottom: 4px;
  }

  .dk-stat-value {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: ${c.text};
  }

  .dk-rec {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
    border-bottom: 1px solid ${c.border};
  }

  .dk-rec-title {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .dk-chart-section { padding: 16px 18px; }

  .dk-range-tab {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    transition: all var(--dk-transition);
  }

  .dk-range-tab.active {
    background: ${c.accent};
    color: white;
    box-shadow: 0 4px 12px rgba(161, 98, 7, 0.3);
  }

  .dk-chart-inner {
    background: ${c.inset};
    border: 1px solid ${c.border};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-alt-item {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid ${c.border};
    border-radius: 12px;
    padding: 12px;
    transition: var(--dk-transition);
  }

  .dk-alt-item:hover {
    background: rgba(255, 255, 255, 0.6);
    transform: translateX(4px);
    border-color: ${c.accent};
  }

  .dk-coupon-card {
    background: rgba(255, 255, 255, 0.2);
    border: 1px dashed ${c.accent};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-coupon-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;   /* codes: 0 vs O must be unambiguous */
    font-weight: 800;
    color: ${c.accent};
    font-size: 14px;
    background: rgba(161, 98, 7, 0.08);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .dk-alert-btn, .dk-submit-btn, .dk-coupon-copy {
    background: ${c.primary};
    color: white;
    border: none;
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .dk-skel {
    background: linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.06) 100%);
    background-size: 400px 100%;
    animation: dkwShimmer 1.6s ease-in-out infinite;
    border-radius: 6px;
  }
  @keyframes dkwShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .dk-skel-footer { display:flex; justify-content:space-between; gap:10px; }
  .dk-skel-foot-l { height:22px; flex:1; border-radius:6px; }
  .dk-skel-btn    { height:30px; width:90px; border-radius:8px; }
`;function Ne(i){if(!i||i.length===0)return"";let e=i.map((t,o)=>{let s=t.min_spend?`Min spend: \u09F3${(t.min_spend/100).toFixed(0)}`:"No minimum spend",a=t.expires_at?`\xB7 Expires ${new Date(t.expires_at).toLocaleDateString("en-BD",{month:"short",day:"numeric"})}`:"";return`
      <div class="dk-coupon-card">
        <div class="dk-coupon-left">
          <div class="dk-coupon-code">${t.code}</div>
          <div class="dk-coupon-meta">${s}${a}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="dk-coupon-badge">${t.display_discount}</div>
          <button class="dk-coupon-copy" data-dk-copy="${t.code}" id="dkcp_${o}">Copy</button>
        </div>
      </div>`}).join("");return`
    <div class="dk-divider"></div>
    <div class="dk-coupons">
      <div class="dk-coupon-title" style="display:flex;align-items:center;gap:5px;">${b.tag} Available Coupons</div>
      <div class="dk-coupon-list">${e}</div>
    </div>`}function Re(i){i.querySelectorAll("[data-dk-copy]").forEach(e=>{e.addEventListener("click",async()=>{let t=e.dataset.dkCopy;try{await navigator.clipboard.writeText(t),e.textContent="\u2705 Copied!",e.classList.add("copied"),setTimeout(()=>{e.textContent="Copy",e.classList.remove("copied")},2e3)}catch{e.textContent=t,e.select?.()}})})}function Pe(){return`
    <div id="dkw-skeleton">
      <!-- Brand bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 4px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="dk-skel" style="width:20px;height:20px;border-radius:50%;"></div>
          <div class="dk-skel dk-skel-bar" style="width:80px;height:14px;"></div>
        </div>
        <div class="dk-skel" style="width:90px;height:22px;border-radius:20px;"></div>
      </div>

      <!-- Hero: gauge + badge -->
      <div class="dk-skel-hero">
        <div class="dk-skel dk-skel-disc"></div>
        <div class="dk-skel-lines">
          <div class="dk-skel dk-skel-line" style="width:55%;"></div>
          <div class="dk-skel dk-skel-line" style="width:80%;"></div>
          <div class="dk-skel dk-skel-line" style="width:65%;"></div>
        </div>
      </div>

      <!-- 4 stat tiles -->
      <div class="dk-skel-tiles">
        <div class="dk-skel dk-skel-tile"></div>
        <div class="dk-skel dk-skel-tile"></div>
        <div class="dk-skel dk-skel-tile"></div>
        <div class="dk-skel dk-skel-tile"></div>
      </div>

      <!-- Chart area -->
      <div class="dk-skel dk-skel-chart"></div>

      <!-- Footer -->
      <div class="dk-skel-footer">
        <div class="dk-skel dk-skel-foot-l"></div>
        <div class="dk-skel dk-skel-btn"></div>
      </div>
    </div>`}function je(i){let e=De(i),o=Math.PI*24,s=o*(1-i/10);return`
    <svg width="58" height="36" viewBox="0 0 58 36" style="overflow:visible;">
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="${e}"
            stroke-width="4.5" stroke-linecap="round"
            stroke-dasharray="${o}" stroke-dashoffset="${s}"
            style="filter:drop-shadow(0 0 4px ${e});transition:stroke-dashoffset 0.9s cubic-bezier(.34,1.56,.64,1);"/>
      <text x="29" y="29" text-anchor="middle" fill="${e}"
            font-size="13" font-weight="900" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans Bengali,Arial,sans-serif">${i}</text>
      <text x="29" y="35" text-anchor="middle" fill="${c.dim}"
            font-size="6.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans Bengali,Arial,sans-serif">/10</text>
    </svg>`}function Ve(i,e){let t=D[i.label]||D.INSUFFICIENT_DATA;if(!t.rec)return"";if(t.rec==="buy"){let o=e>0?`You save <strong style="color:${c.success}">${e}%</strong> vs the 30-day average.`:"This is at or below its typical price.";return`
      <div class="dk-rec">
        <div class="dk-rec-icon" style="color:${c.success}">${b.buy}</div>
        <div>
          <div class="dk-rec-title" style="color:${c.success}">Good Time to Buy</div>
          <div class="dk-rec-sub">${o} ${i.explanation}</div>
        </div>
      </div>`}else return`
      <div class="dk-rec">
        <div class="dk-rec-icon" style="color:${c.warn}">${b.wait}</div>
        <div>
          <div class="dk-rec-title" style="color:${c.warn}">Consider Waiting</div>
          <div class="dk-rec-sub">${i.explanation}</div>
        </div>
      </div>`}function Ue(i){if(!i||i.length===0)return"";let e=i.slice(0,3).map(t=>{let o=t.image_url?`<img class="dk-alt-img" src="${t.image_url}" alt="" loading="lazy"/>`:`<img class="dk-alt-img" src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="background:#fff;object-fit:contain;padding:4px;" />`,s=t.savings>0?`<span class="dk-alt-save">Save ${y(t.savings)}</span>`:"";return`
      <div class="dk-alt-item" data-url="${t.url}">
        ${o}
        <div class="dk-alt-info">
          <div class="dk-alt-name">${t.title}</div>
          <div>
            <span class="dk-alt-price">${y(t.current_price)}</span>
            ${s}
          </div>
        </div>
        <div class="dk-alt-arrow">\u203A</div>
      </div>`}).join("");return`
    <div class="dk-divider" style="margin-bottom:12px;"></div>
    <div class="dk-alts">
      <div class="dk-alts-title" style="display:flex;align-items:center;gap:5px;">${b.chart} Look-alike Deals</div>
      <div class="dk-alt-list" id="dk-alt-list">${e}</div>
    </div>`}function qe(i,e,t,o,s=[]){let{product:a,verdict:n}=i,d=D[n.label]||D.INSUFFICIENT_DATA,r=d.color,p=n.avg_30d&&a.current_price&&n.avg_30d>a.current_price?Math.round((n.avg_30d-a.current_price)/n.avg_30d*100):0,u=i.price_history||[];return`
  <div id="dkw">

    <!-- Top bar -->
    <div class="dk-bar">
      <div class="dk-brand">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="height:20px;filter:drop-shadow(0 0 6px rgba(108,99,255,0.3));" />
        <span class="dk-brand-name">DamKoi</span>
        <span class="dk-brand-tag">Price Intel</span>
      </div>
      <div class="dk-bar-right">
        <span class="dk-verdict-pill" style="color:${r};background:${d.bg};">
          ${d.icon} ${d.label}
        </span>
        ${je(n.deal_score)}
      </div>
    </div>

    <!-- Recommendation card -->
    ${Ve(n,p)}

    <!-- Price stats (4 tiles) -->
    <div class="dk-stats">
      ${[["Current",y(a.current_price),c.accent],["30-Day Avg",n.avg_30d?y(n.avg_30d):"\u2014",c.text],["All-Time Low",n.all_time_low?y(n.all_time_low):"\u2014",c.success],["Highest Ever",n.all_time_high?y(n.all_time_high):`${u.length>0?y(Math.max(...u.map(v=>v.price))):"\u2014"}`,c.muted]].map(([v,l,h])=>`
        <div class="dk-stat">
          <div class="dk-stat-label">${v}</div>
          <div class="dk-stat-value" style="color:${h};">${l}</div>
          ${v==="30-Day Avg"&&p>0?`<div style="font-size:12px;color:${c.success};margin-top:2px;font-weight:600;">\u2193${p}% savings</div>`:'<div style="height:12px;"></div>'}
        </div>
      `).join("")}
    </div>

    <!-- Chart -->
    <div class="dk-chart-section">
      <div class="dk-chart-header">
        <span class="dk-chart-title" style="display:flex;align-items:center;gap:5px;">${b.chart} Price History</span>
        <div class="dk-range-tabs">
          ${["1M","3M","6M","ALL"].map(v=>`<button class="dk-range-tab${v===o?" active":""}" data-range="${v}">${v}</button>`).join("")}
        </div>
      </div>
      <div class="dk-chart-inner" id="dk-chart-inner">
        ${t.svg}
      </div>
      <div class="dk-chart-legend">
        <span><span class="dk-legend-dot" style="background:${c.accent};"></span>Price line</span>
        <span><span class="dk-legend-dot" style="background:${c.success};"></span>All-time low</span>
        <span style="color:${c.dim};font-size:12px;">Based on ${n.data_points||u.length} price recordings</span>
      </div>
    </div>

    <!-- Should you buy now? -->
    ${Oe(n,a)}

    <!-- Look-alike alternatives -->
    ${e?Ue(e):'<div class="dk-divider"></div><div class="dk-loading"><span class="dk-spinner"></span>Loading similar products\u2026</div>'}

    <!-- Coupons -->
    ${Ne(s)}

    <!-- Footer: explanation + alert CTA -->
    <div class="dk-footer">
      <p class="dk-explanation">${n.explanation}</p>
      <button class="dk-alert-btn" id="dk-alert-btn" style="display:flex;align-items:center;gap:6px;">${b.bell} Alert me</button>
    </div>

    <!-- Alert form (hidden) -->
    <div class="dk-alert-form" id="dk-alert-form">
      <div class="dk-alert-row">
        <input class="dk-input" type="email" id="dk-email" placeholder="your@email.com" autocomplete="email"/>
        <input class="dk-input dk-input-narrow" type="number" id="dk-target"
               placeholder="Target \u09F3"
               value="${n.avg_30d?Math.floor(n.avg_30d/100*.92):""}"/>
        <button class="dk-submit-btn" id="dk-submit">Set</button>
      </div>
      <div class="dk-status" id="dk-status"></div>
    </div>

  </div>`}function ge(i,e){if(!i||i.length===0||e==="ALL")return i;let t=e==="1M"?30:e==="3M"?90:180,o=Date.now()-t*864e5,s=i.filter(a=>new Date(a.scraped_at).getTime()>=o);return s.length>=2?s:i}function ke(i,e,t){let o=e.deal_score,s=t.current_price,a=e.avg_30d,n=e.all_time_low;if(i==="days")return o>=8?{action:"buy",text:"Price is at a good point right now. Unlikely to drop further in 2-3 days."}:o>=6?{action:"wait",text:"Fair price but not exceptional. Small chance of a short-term dip."}:{action:"wait",text:"Price is above average. Wait for a deal notification."};if(i==="week"){let d=a&&a>s?Math.round((a-s)/a*100):0;return d>=10?{action:"buy",text:`${d}% below 30-day average. This week is a good window.`}:d>=5?{action:"buy",text:"Slightly below average. Reasonable to buy this week."}:{action:"wait",text:"Prices on this item can fluctuate. Set an alert for your target price."}}if(n&&s<=n*1.03)return{action:"buy",text:"At or near its all-time low. This level rarely lasts a month."};if(n&&s>n){let d=Math.round((s-n)/s*100);if(d>15)return{action:"wait",text:`All-time low is ${y(n)} \u2014 ${d}% below current. Worth waiting.`}}return{action:"neutral",text:"No strong signal for the next month. Set an alert at your target price."}}function Oe(i,e){return`
    <div class="dk-horizon-section" id="dk-horizon-section">
      <div class="dk-horizon-header">Should you buy now?</div>
      <div class="dk-horizon-tabs">
        <button class="dk-horizon-tab active" data-hz="days">2-3 Days</button>
        <button class="dk-horizon-tab" data-hz="week">1 Week</button>
        <button class="dk-horizon-tab" data-hz="month">1 Month</button>
      </div>
      <div class="dk-horizon-rec" id="dk-horizon-rec">${me(ke("days",i,e))}</div>
    </div>`}function me(i){let e=i.action==="buy"?b.buy:i.action==="wait"?b.wait:b.clock;return`<div class="dk-hz-rec-inner" style="color:${i.action==="buy"?"#059669":i.action==="wait"?"#D97706":"#A8A29E"}">${e}<span>${i.text}</span></div>`}function We(i,e,t,o,s=[]){Re(i),i.querySelectorAll(".dk-range-tab").forEach(r=>{r.addEventListener("click",()=>{let p=r.dataset.range;if(p===o)return;o=p;let u=ge(e.price_history||[],p),v=Z(u,460,130),l=i.getElementById("dk-chart-inner");l&&(l.innerHTML=v.svg,v.initInteractivity(i)),i.querySelectorAll(".dk-range-tab").forEach(h=>h.classList.toggle("active",h.dataset.range===p))})}),i.querySelectorAll(".dk-horizon-tab").forEach(r=>{r.addEventListener("click",()=>{let p=r.dataset.hz,u=ke(p,e.verdict,e.product),v=i.getElementById("dk-horizon-rec");v&&(v.innerHTML=me(u)),i.querySelectorAll(".dk-horizon-tab").forEach(l=>l.classList.toggle("active",l.dataset.hz===p))})});let a=i.getElementById("dk-alert-btn"),n=i.getElementById("dk-alert-form");a?.addEventListener("click",()=>{let r=n.style.display!=="none";n.style.display=r?"none":"block",a.innerHTML=r?`${b.bell} Alert me`:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel'}),i.getElementById("dk-submit")?.addEventListener("click",async()=>{let r=i.getElementById("dk-email")?.value?.trim(),p=parseFloat(i.getElementById("dk-target")?.value||"0"),u=i.getElementById("dk-status"),v=i.getElementById("dk-submit"),l=(h,f)=>{u.textContent=h,u.style.color=f};if(!r||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))return l("Enter a valid email address.",c.danger);if(!p||p<=0)return l("Enter a valid target price.",c.danger);v.disabled=!0,l("Setting alert\u2026",c.muted);try{await $("CREATE_ALERT",{payload:{product_id:e.product.id,target_price:Math.round(p*100),email:r,channel:"email"}}),l(`Alert set! We'll email you when price drops to \u09F3${p.toLocaleString("en-BD")}.`,c.success),a.innerHTML=`${b.check} Alert set`}catch{l("Failed to set alert \u2014 please try again.",c.danger)}finally{v.disabled=!1}}),i.getElementById("dk-alt-list")?.addEventListener("click",r=>{let p=r.target.closest("[data-url]");p?.dataset?.url&&(window.location.href=p.dataset.url)})}function Ke(){for(let i of Ie){let e=document.querySelector(i);if(e)return e}return null}async function ye(i){document.getElementById(he)?.remove();let e=Ke();if(!e){console.warn("[DamKoi] No injection target found");return}let t=document.createElement("div");t.id=he;let o=t.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=Fe,o.appendChild(s);let a=document.createElement("div");o.appendChild(a),e.insertAdjacentElement("afterend",t),a.innerHTML=Pe();let n="3M",d=ge(i.price_history||[],n),r=Z(d,460,130);await new Promise(w=>requestAnimationFrame(w));let p=i.product.id,[u,v]=await Promise.allSettled([$("FETCH_ALTERNATIVES",{productId:p}),$("FETCH_PRODUCT_COUPONS",{productId:p})]),l=u.status==="fulfilled"?u.value?.alternatives||u.value||[]:[],h=v.status==="fulfilled"?v.value?.coupons||v.value||[]:[];a.style.transition="opacity 0.25s ease",a.style.opacity="0",await new Promise(w=>setTimeout(w,120));let f=Z(d,460,130);a.innerHTML=qe(i,l,f,n,h),f.initInteractivity(o),We(o,i,l,n,h),a.style.opacity="1"}function Ge(i){return i>=8?"#10b981":i>=6?"#f59e0b":i>=4?"#ef4444":"#dc2626"}var Q=class{constructor(){this.data=null,this.sidebar=null,this.currentTab="priceHistory",this.alternativesCache=null,this.alertFormState={},this._sidebarRange="1M",this._sidebarHorizon="days",this._paymentMethod=null}async init(){if(this.platform=this.detectPlatform(),!!this.platform){if(this.platform==="daraz-checkout"||this.platform==="pickaboo-checkout"){this.initCouponMagic();return}this.data=await this.fetchData(window.location.href),this.data&&!this.data.notTracked&&(await this.enrichPriceHistory(),ye(this.data),de(this.data.product,this.data.verdict).catch(()=>{})),this.renderSidebar()}}async enrichPriceHistory(){if(this.data?.product?.id)try{let e=await $("FETCH_HISTORY",{productId:this.data.product.id,days:180});this.data.price_history=e.prices||[]}catch{this.data.price_history=[]}}detectPlatform(){let{hostname:e,href:t}=window.location;return e.includes("daraz.com.bd")?t.includes("cart.daraz.com.bd")||t.includes("checkout.daraz.com.bd")?"daraz-checkout":/daraz\.com\.bd\/.*i\d+-s\d+/i.test(t)||t.includes("daraz.com.bd/products/")?"daraz":null:e.includes("cartup.com.bd")?t.includes("/products/")?"cartup":null:e.includes("rokomari.com")?/\/book\/\d+/.test(t)?"rokomari":null:e.includes("pickaboo.com")?t.includes("pickaboo.com/checkout/")?"pickaboo-checkout":t.includes("/product/")?"pickaboo":null:e.includes("chaldal.com")?t.includes("/p/")||t.split("/").length>3?"chaldal":null:e.includes("othoba.com")&&t.includes("/product/")?"othoba":null}async fetchData(e){try{let t=U("product",e),o=q(t);if(o?.product&&o?.verdict)return o;let s=await $("FETCH_VERDICT",{url:e});return O(t,s),s}catch(t){return{notTracked:!0,connectionError:!t.message?.startsWith("404")}}}renderSidebar(){this.sidebar&&this.sidebar.remove(),this.sidebar=document.createElement("div"),this.sidebar.id="damkoi-sidebar",this.sidebar.innerHTML=`
      <nav class="damkoi-nav">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width:28px;height:28px;margin-bottom:20px;opacity:0.9;" />
        <div class="damkoi-nav-item active" data-tab="priceHistory" title="Price History">${g.history}</div>
        <div class="damkoi-nav-item" data-tab="lookalike" title="LookALike Deals">${g.lookalike}</div>
        <div class="damkoi-nav-item" data-tab="coupons" title="Coupons">${g.coupons}</div>
        <div class="damkoi-nav-item" data-tab="alerts" title="Price Alerts">${g.alerts}</div>
        <div class="damkoi-nav-item" data-tab="recentViews" title="Recent Views">${g.recentViews}</div>
        <div class="damkoi-nav-item" data-tab="settings" title="Settings">${g.settings}</div>
      </nav>
      <main class="damkoi-main">
        <header class="damkoi-header">
          <span class="damkoi-logo">DamKoi</span>
          <div class="damkoi-close" title="Collapse">${g.close}</div>
        </header>
        <div id="damkoi-content">
          <div class="damkoi-section active damkoi-skeleton-wrap">
            <div class="dk-sidebar-skel dk-sidebar-skel-title"></div>
            <div class="dk-sidebar-skel dk-sidebar-skel-badge"></div>
            <div class="dk-sidebar-skel" style="height:12px;width:90%;margin-top:6px;border-radius:6px;"></div>
            <div class="dk-sidebar-skel" style="height:12px;width:70%;margin-top:5px;border-radius:6px;"></div>
            <div class="dk-sidebar-skel-grid">
              <div class="dk-sidebar-skel dk-sidebar-skel-tile"></div>
              <div class="dk-sidebar-skel dk-sidebar-skel-tile"></div>
            </div>
            <div class="dk-sidebar-skel dk-sidebar-skel-chart"></div>
          </div>
        </div>
      </main>
    `,document.body.appendChild(this.sidebar),this.setupEvents(),this.data&&this.switchTab(this.currentTab||"priceHistory",{force:!0})}setupEvents(){this.sidebar.querySelector(".damkoi-close").onclick=()=>{this.sidebar.classList.toggle("collapsed")},this.sidebar.querySelectorAll(".damkoi-nav-item").forEach(e=>{e.onclick=()=>{this.sidebar.classList.contains("collapsed")&&this.sidebar.classList.remove("collapsed"),this.switchTab(e.dataset.tab)}})}switchTab(e,{force:t=!1}={}){if(!t&&this.currentTab===e&&!this.sidebar?.classList.contains("collapsed"))return;this.currentTab=e,this.sidebar.querySelectorAll(".damkoi-nav-item").forEach(a=>{a.classList.toggle("active",a.dataset.tab===e)});let o=this.sidebar.querySelector("#damkoi-content");o.innerHTML="";let s=document.createElement("div");if(s.className="damkoi-section active",o.appendChild(s),e==="recentViews"){this.renderRecentViews(s);return}if(e==="settings"){this.renderSettings(s);return}if(!this.data||this.data.notTracked){if(e==="coupons"){this.renderCoupons(s);return}this.renderNotTracked(s,e);return}switch(e){case"priceHistory":this.renderPriceHistory(s);break;case"lookalike":this.renderLookAlike(s);break;case"coupons":this.renderCoupons(s);break;case"alerts":this.renderAlerts(s);break}}renderNotTracked(e,t){let o="https://damkoi.xynly.com",s=encodeURIComponent(window.location.href);if(!this.data||this.data.connectionError){e.innerHTML=`
        <div class="dk-error-state">
          <div class="dk-es-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="dk-es-title">Servers Unreachable</h3>
          <p class="dk-es-desc">DamKoi API is temporarily offline. Your internet is fine \u2014 this is on our end.</p>
          <div class="dk-es-actions">
            <a href="${o}" target="_blank" rel="noopener" class="dk-web-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open Web App
            </a>
            <button class="dk-retry-btn" onclick="window.location.reload()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Retry
            </button>
          </div>
        </div>
      `;return}if(t==="priceHistory"){e.innerHTML=`
        <div class="dk-not-tracked">
          <div class="dk-nt-anim-wrap">
            <div class="dk-nt-ring"></div>
            <div class="dk-nt-ring dk-nt-ring2"></div>
            <svg class="dk-nt-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div class="dk-nt-badge"><span class="dk-nt-dot"></span>TRACKING STARTED</div>
          <h3 class="dk-nt-title">We're on it.</h3>
          <p class="dk-nt-desc">First price data arrives within <strong>15\u201330 minutes</strong>. Check back or get notified below.</p>
          <div class="dk-nt-steps">
            <div class="dk-nt-step dk-step-done">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Product detected</span>
            </div>
            <div class="dk-nt-step dk-step-active">
              <div class="dk-step-spin"></div>
              <span>Price scan queued</span>
            </div>
            <div class="dk-nt-step">
              <div class="dk-step-empty"></div>
              <span>History building</span>
            </div>
          </div>
          <a href="${o}?url=${s}" target="_blank" rel="noopener" class="dk-web-cta dk-nt-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            Set Alert on Web App
          </a>
        </div>
      `;return}let a={lookalike:{icon:g.lookalike,title:"LookALike Deals",desc:"We'll surface similar products once our system indexes this item."},coupons:{icon:g.coupons,title:"Coupons",desc:"Platform-wide coupons may still be available once tracking starts."},alerts:{icon:g.alerts,title:"Price Alerts",desc:"Set alerts once we collect the first price point. Almost there!"}},n=a[t]||a.lookalike;e.innerHTML=`
      <div class="dk-tab-empty">
        <span class="dk-te-icon">${n.icon}</span>
        <h3>${n.title}</h3>
        <p class="dk-te-desc">${n.desc}</p>
        <a href="${o}?url=${s}" target="_blank" rel="noopener" class="dk-web-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open DamKoi
        </a>
      </div>
    `}renderPriceHistory(e){let{verdict:t,product:o}=this.data,a={FAKE_DISCOUNT:"verdict-fake",BEST_PRICE:"verdict-best",GOOD_DEAL:"verdict-good",FAIR_PRICE:"verdict-fair",INSUFFICIENT_DATA:"verdict-pending"}[t.label]||"verdict-fair",n=t.data_points||this.data.price_history?.length||0;e.innerHTML=`
      ${n>0?`<div class="dk-social-proof">Based on ${n} price recordings for this product</div>`:""}

      <div class="damkoi-card" style="margin-bottom:12px;">
        <div id="damkoi-gauge"></div>
        <span class="verdict-badge ${a}" style="margin-top:12px;">${t.display}</span>
        <p style="font-size:12px;color:var(--dk-dim);line-height:1.6;margin-top:6px;">${t.explanation}</p>
      </div>

      <div class="damkoi-price-grid" style="margin-bottom:16px;">
        <div class="damkoi-price-item">
          <div class="damkoi-label">Current</div>
          <div class="damkoi-value accent">\u09F3${(o.current_price/100).toLocaleString("en-BD")}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">30-Day Avg</div>
          <div class="damkoi-value">\u09F3${t.avg_30d?(t.avg_30d/100).toLocaleString("en-BD"):"\u2014"}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">All-Time Low</div>
          <div class="damkoi-value success">\u09F3${t.all_time_low?(t.all_time_low/100).toLocaleString("en-BD"):"\u2014"}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">Data Points</div>
          <div class="damkoi-value">${n||"\u2014"}</div>
        </div>
      </div>

      <div class="dk-range-tabs">
        ${["1M","3M","6M","ALL"].map(d=>`<button class="dk-range-tab ${d===this._sidebarRange?"active":""}" data-range="${d}">${d}</button>`).join("")}
      </div>
      <div class="damkoi-chart-container" style="padding:8px;margin-bottom:16px;">
        <div id="damkoi-sparkline"></div>
      </div>

      <div class="dk-divider"></div>

      <div class="dk-horizon-section">
        <div class="dk-section-label">Should you buy now?</div>
        <div class="dk-horizon-tabs">
          <button class="dk-horizon-tab ${this._sidebarHorizon==="days"?"active":""}" data-horizon="days">2-3 Days</button>
          <button class="dk-horizon-tab ${this._sidebarHorizon==="week"?"active":""}" data-horizon="week">1 Week</button>
          <button class="dk-horizon-tab ${this._sidebarHorizon==="month"?"active":""}" data-horizon="month">1 Month</button>
        </div>
        <div id="dk-horizon-rec"></div>
      </div>
    `,J.renderDealGauge(t.deal_score,"damkoi-gauge"),this._renderSidebarChart(e),this._wireChartTabs(e),this._wireHorizonTabs(e)}_filterByRange(e){let t=this.data.price_history||[];if(e==="ALL")return t;let o={"1M":30,"3M":90,"6M":180}[e]||30,s=Date.now()-o*864e5,a=t.filter(n=>new Date(n.date||n.recorded_at||n.timestamp||0).getTime()>=s);return a.length>=3?a:t.slice(-Math.min(t.length,30))}_renderSidebarChart(e){let t=this._filterByRange(this._sidebarRange);J.renderPriceChart(t,"damkoi-sparkline")}_wireChartTabs(e){e.querySelectorAll(".dk-range-tab").forEach(t=>{t.onclick=()=>{e.querySelectorAll(".dk-range-tab").forEach(o=>o.classList.remove("active")),t.classList.add("active"),this._sidebarRange=t.dataset.range,this._renderSidebarChart(e)}})}_wireHorizonTabs(e){let t=e.querySelector("#dk-horizon-rec");t&&(t.innerHTML=this._buildHorizonRecHtml(this._sidebarHorizon)),e.querySelectorAll(".dk-horizon-tab").forEach(o=>{o.onclick=()=>{e.querySelectorAll(".dk-horizon-tab").forEach(a=>a.classList.remove("active")),o.classList.add("active"),this._sidebarHorizon=o.dataset.horizon;let s=e.querySelector("#dk-horizon-rec");s&&(s.innerHTML=this._buildHorizonRecHtml(this._sidebarHorizon))}})}_buildHorizonRecHtml(e){let{verdict:t,product:o}=this.data,s=ve(e,t,o),n={buy:"#22c55e",wait:"#f59e0b",neutral:"#a78bfa"}[s.action]||"#a78bfa",d={buy:"BUY NOW",wait:"WAIT",neutral:"NEUTRAL"}[s.action]||s.action.toUpperCase();return`
      <div style="border-left:3px solid ${n};background:${n}18;padding:10px 12px;border-radius:0 8px 8px 0;margin-top:8px;">
        <div style="color:${n};font-size:12px;font-weight:900;margin-bottom:4px;">${d}</div>
        <div style="font-size:12px;color:var(--dk-muted);line-height:1.55;">${s.text}</div>
      </div>
    `}async renderLookAlike(e){e.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${g.lookalike}</span> LookALike Deals</h3>
      <div id="dk-alts-list"><div class="dk-loading">Loading alternatives...</div></div>
      <div id="dk-compare-section" style="display:none;margin-top:16px;">
        <h4>Same Product, Other Platforms</h4>
        <div id="dk-compare-list"><div class="dk-loading">Loading...</div></div>
      </div>
    `;let t=e.querySelector("#dk-alts-list"),o=e.querySelector("#dk-compare-section"),s=e.querySelector("#dk-compare-list");try{let a=U("alternatives",this.data.product.id),n=q(a);n||(n=(await $("FETCH_ALTERNATIVES",{productId:this.data.product.id})).alternatives||[],O(a,n)),this.alternativesCache=n,this._displayAlts(t,n)}catch{t.innerHTML='<div class="dk-empty-state">Could not load alternatives.</div>'}try{let a=await $("FETCH_COMPARE",{productId:this.data.product.id}),d=(a.comparisons||a.platforms||(Array.isArray(a)?a:[])).filter(r=>r.platform!==this.platform);d.length&&(o.style.display="",s.innerHTML=d.map(r=>`
          <div class="damkoi-card" style="margin-bottom:8px;display:flex;align-items:center;gap:10px;">
            <span class="dk-platform-badge">${r.platform}</span>
            <div style="flex:1;font-size:12px;color:var(--dk-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.title||""}</div>
            <span style="font-size:13px;font-weight:800;">${y(r.current_price)}</span>
            <a href="${r.url}" target="_blank" rel="noopener" style="color:var(--dk-accent);font-size:12px;white-space:nowrap;text-decoration:none;">View</a>
          </div>
        `).join(""))}catch{}}_displayAlts(e,t){let o=t.filter(a=>!a.is_original_request);if(!o.length){e.innerHTML='<div class="dk-empty-state">No cheaper alternatives in this category yet.</div>';return}let s=this.data.product.current_price;e.innerHTML=o.map(a=>{let n=s&&a.current_price?s-a.current_price:0;return`
        <div class="damkoi-card" style="margin-bottom:10px;display:flex;gap:12px;cursor:pointer;" data-alt-url="${a.url}">
          ${a.image_url?`<img src="${a.image_url}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;" />`:`<div style="width:46px;height:46px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--dk-dim);">${g.lookalike}</div>`}
          <div style="flex:1;min-width:0;">
            <span class="dk-platform-badge">${a.platform}</span>
            <div style="font-size:12px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--dk-text);margin-bottom:4px;">${a.title}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:800;">${y(a.current_price)}</span>
              ${n>0?`<span class="dk-save-badge">Save ${y(n)}</span>`:""}
            </div>
          </div>
        </div>
      `}).join(""),e.addEventListener("click",a=>{let n=a.target.closest("[data-alt-url]");n&&window.open(n.dataset.altUrl,"_blank")})}async renderCoupons(e){let t=this.platform||"daraz",o=this.data?.product?.id;e.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${g.coupons}</span> Coupons & Deals</h3>
      <p style="font-size:12px;color:var(--dk-dim);margin:0 0 14px;">Copy & paste at checkout for instant savings.</p>
      <div id="dk-coupon-list"><div class="dk-loading">Loading coupons...</div></div>
    `;let s=e.querySelector("#dk-coupon-list");try{let[a,n]=await Promise.allSettled([o?$("FETCH_PRODUCT_COUPONS",{productId:o}):Promise.resolve([]),$("FETCH_COUPONS",{platform:t})]),d=a.status==="fulfilled"?a.value||[]:[],r=n.status==="fulfilled"?n.value||[]:[],p=new Set,u=[...d,...r].filter(l=>p.has(l.code)?!1:(p.add(l.code),!0));if(!u.length){s.innerHTML='<div class="dk-empty-state">No coupons available right now.</div>';return}let v=await G();s.innerHTML=u.map(l=>{let h=l.id||l.code,f=v[h]===!0?"active":"",w=v[h]===!1?"active":"",k=l.discount_label||(l.discount_percent?`-${l.discount_percent}%`:"")||(l.max_discount?`Up to \u09F3${(l.max_discount/100).toLocaleString("en-BD")}`:"");return`
          <div class="dk-coupon-card" data-coupon-id="${h}">
            <div class="dk-coupon-top">
              <span class="dk-coupon-code">${l.code}</span>
              ${k?`<span class="dk-coupon-discount">${k}</span>`:""}
              <button class="dk-coupon-copy" data-code="${l.code}" title="Copy code">${g.copy}</button>
            </div>
            ${l.description?`<p class="dk-coupon-desc">${l.description}</p>`:""}
            <div class="dk-coupon-footer">
              <div class="dk-coupon-votes">
                <button class="dk-vote-btn dk-vote-up ${f}" data-id="${h}" data-val="up">${g.thumbsUp} <span>${l.upvotes||0}</span></button>
                <button class="dk-vote-btn dk-vote-down ${w}" data-id="${h}" data-val="down">${g.thumbsDown} <span>${l.downvotes||0}</span></button>
              </div>
              ${l.category?`<span class="dk-coupon-cat">${l.category}</span>`:""}
            </div>
          </div>
        `}).join(""),s.querySelectorAll(".dk-coupon-copy").forEach(l=>{l.onclick=()=>{navigator.clipboard.writeText(l.dataset.code).then(()=>{l.innerHTML=g.check,l.style.color="#22c55e",setTimeout(()=>{l.innerHTML=g.copy,l.style.color=""},2e3)}).catch(()=>{})}}),s.querySelectorAll(".dk-vote-btn").forEach(l=>{l.onclick=async()=>{let h=l.dataset.id,f=l.dataset.val==="up";await ce(h,f),l.closest(".dk-coupon-card").querySelectorAll(".dk-vote-btn").forEach(k=>k.classList.remove("active")),l.classList.add("active")}})}catch{s.innerHTML='<div class="dk-empty-state" style="color:var(--dk-danger)">Failed to load coupons.</div>'}}async renderAlerts(e){let t=this.alertFormState.email||await Y(),o=this.data?.product?.current_price?Math.floor(this.data.product.current_price/100*.9):"";e.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${g.alerts}</span> Price Alert</h3>
      <div class="damkoi-card" style="margin-bottom:16px;">
        <p style="font-size:12px;color:var(--dk-dim);margin:0 0 12px;">Get notified the instant this product drops below your target.</p>
        <input type="email" id="alert-email" class="damkoi-input" placeholder="Your email address" value="${t}" />
        <div style="position:relative;">
          <span style="position:absolute;left:16px;top:12px;font-weight:700;color:var(--dk-accent);">\u09F3</span>
          <input type="number" id="alert-price" class="damkoi-input" style="padding-left:35px;" placeholder="Target price" value="${this.alertFormState.price||o}" />
        </div>
        <button class="damkoi-btn" id="save-alert">Set Alert</button>
        <div id="alert-status" class="damkoi-status-pill" style="margin-top:8px;font-size:12px;border-radius:8px;padding:0;"></div>
      </div>
      <div style="height:1px;background:var(--dk-border);margin-bottom:16px;"></div>
      <h4>Your Active Alerts</h4>
      <div id="dk-existing-alerts"><div class="dk-loading">Loading...</div></div>
    `,t?this._loadExistingAlerts(e,t):e.querySelector("#dk-existing-alerts").innerHTML='<div class="dk-empty-state">Enter your email above to see your alerts.</div>';let s=e.querySelector("#alert-email"),a=e.querySelector("#alert-price"),n=e.querySelector("#save-alert"),d=e.querySelector("#alert-status");n.onclick=async()=>{let r=s.value.trim(),p=a.value.trim();if(!I(r)){M(d,"error","Enter valid email");return}if(!ne(p)){M(d,"error","Enter valid price");return}this.alertFormState={email:r,price:p},await X(r),M(d,"info","Saving...");try{let u=ae(this.data.product.id,p,r);await $("CREATE_ALERT",{payload:u}),M(d,"success","Alert set!"),this._loadExistingAlerts(e,r)}catch{M(d,"error","Error saving alert")}},s.addEventListener("blur",()=>{let r=s.value.trim();I(r)&&this._loadExistingAlerts(e,r)})}async _loadExistingAlerts(e,t){let o=e.querySelector("#dk-existing-alerts");if(o)try{let s=await $("GET_ALERTS_BY_EMAIL",{email:t});if(!s||s.length===0){o.innerHTML='<div class="dk-empty-state">No active alerts for this email.</div>';return}o.innerHTML=s.map(a=>`
        <div class="damkoi-card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:12px;color:var(--dk-dim);margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.product_title||"Product"}</div>
              <div style="font-size:13px;font-weight:700;">Target: ${y(a.target_price)}</div>
            </div>
            <span class="dk-alert-badge ${a.is_active?"active":"inactive"}">${a.is_active?"Active":"Paused"}</span>
          </div>
        </div>
      `).join("")}catch{o.innerHTML='<div class="dk-empty-state">Could not load alerts.</div>'}}async renderRecentViews(e){let t=await W(),o=t?await K():[];e.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${g.recentViews}</span> Recent Views</h3>
      <div class="dk-privacy-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        History stays on your device. Never shared.
      </div>
      <div class="dk-settings-row" style="margin-bottom:16px;">
        <span style="font-size:12px;color:var(--dk-muted);">Remember recent views</span>
        <label class="dk-toggle">
          <input type="checkbox" id="dk-views-toggle" ${t?"checked":""}>
          <span class="dk-toggle-slider"></span>
        </label>
      </div>
      ${o.length?`
        <div class="dk-rv-grid" id="dk-rv-grid">
          ${o.map(n=>`
            <div class="dk-rv-card" data-url="${n.url}">
              <div class="dk-rv-img-wrap">
                ${n.image_url?`<img src="${n.image_url}" class="dk-rv-img" />`:`<div class="dk-rv-img-placeholder">${g.history}</div>`}
                ${n.deal_score!=null?`<span class="dk-rv-score" style="background:${Ge(n.deal_score)}">${n.deal_score}</span>`:""}
              </div>
              <div class="dk-rv-info">
                <div class="dk-rv-title">${n.title}</div>
                <div class="dk-rv-meta">
                  <span class="dk-platform-badge">${n.platform}</span>
                  <span class="dk-rv-price">${y(n.price)}</span>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
        <button class="dk-ghost-btn" id="dk-clear-views" style="margin-top:12px;width:100%;">Clear History</button>
      `:`<div class="dk-empty-state">${t?"No products viewed yet.":"Enable above to track viewed products."}</div>`}
    `,e.querySelector("#dk-views-toggle").onchange=async n=>{await re(n.target.checked),this.renderRecentViews(e)};let s=e.querySelector("#dk-clear-views");s&&(s.onclick=async()=>{await le(),this.renderRecentViews(e)});let a=e.querySelector("#dk-rv-grid");a&&a.addEventListener("click",n=>{let d=n.target.closest("[data-url]");d&&window.open(d.dataset.url,"_blank")})}async renderSettings(e){let t=await Y(),o=await pe();e.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${g.settings}</span> Settings</h3>

      <div class="dk-settings-section">
        <h4>Notifications</h4>
        <div class="damkoi-card" style="padding:12px;">
          <label style="font-size:12px;color:var(--dk-dim);display:block;margin-bottom:6px;">Alert email</label>
          <input type="email" id="settings-email" class="damkoi-input" style="margin-bottom:8px;" placeholder="your@email.com" value="${t}" />
          <button class="damkoi-btn" id="settings-save-email" style="padding:9px 14px;font-size:12px;">Save Email</button>
          <div id="settings-email-status" style="margin-top:6px;font-size:12px;min-height:16px;"></div>
        </div>
      </div>

      <div class="dk-settings-section">
        <h4>Auto-Apply Coupons</h4>
        <div class="damkoi-card" style="padding:12px;">
          <div class="dk-settings-row">
            <div>
              <div style="font-size:12px;color:var(--dk-muted);">Auto-test coupons at checkout</div>
              <div style="font-size:12px;color:var(--dk-dim);margin-top:2px;">Finds the best code automatically</div>
            </div>
            <label class="dk-toggle">
              <input type="checkbox" id="settings-auto-apply" ${o?"checked":""}>
              <span class="dk-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="dk-settings-section">
        <h4>Data & Cache</h4>
        <div class="damkoi-card" style="padding:12px;">
          <button class="dk-ghost-btn" id="settings-clear-cache" style="width:100%;font-size:12px;">Clear Cached Data</button>
          <div id="settings-cache-status" style="margin-top:6px;font-size:12px;text-align:center;min-height:16px;"></div>
        </div>
      </div>

      <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--dk-dim);">
        DamKoi v2.1.0 \xB7 Made in Bangladesh
      </div>
    `;let s=e.querySelector("#settings-email"),a=e.querySelector("#settings-email-status"),n=e.querySelector("#settings-cache-status");e.querySelector("#settings-save-email").onclick=async()=>{let d=s.value.trim();if(!I(d)){a.textContent="Invalid email",a.style.color="#ef4444";return}await X(d),this.alertFormState.email=d,a.textContent="Saved!",a.style.color="#22c55e",setTimeout(()=>a.textContent="",2e3)},e.querySelector("#settings-auto-apply").onchange=async d=>{await ue(d.target.checked)},e.querySelector("#settings-clear-cache").onclick=()=>{let d=Object.keys(localStorage).filter(r=>r.startsWith("damkoi:"));d.forEach(r=>localStorage.removeItem(r)),n.textContent=`Cleared ${d.length} cached item${d.length!==1?"s":""}`,n.style.color="#22c55e",setTimeout(()=>n.textContent="",3e3)}}detectPaymentMethod(){let e=["bkash","nagad","rocket","upay","tap","card","cod"],t=()=>{let s=[...document.querySelectorAll('[class*="payment"][class*="active"], [class*="payment"][class*="selected"], [class*="cashier"][class*="active"], [aria-checked="true"][class*="payment"]'),...document.querySelectorAll(".cashier-active, .payment-method-active, .pay-method--active")];for(let a of s){let n=(a.textContent||"").toLowerCase(),d=[...a.querySelectorAll("img")].map(p=>(p.alt||"").toLowerCase()).join(" "),r=n+" "+d;for(let p of e)if(r.includes(p))return p}return null};this._paymentMethod=t(),new MutationObserver(()=>{let s=t();s!==this._paymentMethod&&(this._paymentMethod=s,this._updateCouponWidgetLabel())}).observe(document.body,{subtree:!0,attributes:!0,attributeFilter:["class","aria-checked"]}),document.addEventListener("click",s=>{s.target.closest('[class*="payment"], [class*="cashier"], [class*="pay-method"]')&&setTimeout(()=>{let n=t();n!==this._paymentMethod&&(this._paymentMethod=n,this._updateCouponWidgetLabel())},300)},!0)}_updateCouponWidgetLabel(){let e=document.getElementById("dk-payment-label");if(!e)return;let t=this._paymentMethod;if(t){let o={bkash:"bKash",nagad:"Nagad",rocket:"Rocket",upay:"Upay",card:"Card",cod:"Cash on Delivery"};e.textContent=`Showing ${o[t]||t} codes`,e.style.color=t==="bkash"?"#e91e8c":t==="nagad"?"#f97316":"#a78bfa"}else e.textContent="Showing all codes",e.style.color="rgba(255,255,255,0.64)"}async initCouponMagic(){this._paymentMethod=null,this.detectPaymentMethod();let e=document.createElement("div");e.id="damkoi-coupon-widget",e.innerHTML=`
      <div style="background: rgba(10,10,12,0.95); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 16px; width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); backdrop-filter: blur(12px); color: white; font-family: system-ui, sans-serif; z-index: 999999; position: fixed; bottom: 20px; right: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width: 20px; height: 20px;" />
            <span style="font-weight: 800; font-size: 14px;">DamKoi Magic</span>
          </div>
          <span id="dk-payment-label" style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.64);">Showing all codes</span>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 8px 0 16px 0; line-height: 1.4;">
          Found active coupons. Auto-test all to find best discount.
        </p>
        <button id="dk-apply-btn" style="width: 100%; background: #6366f1; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s;">
          Auto-Apply Coupons
        </button>
      </div>
    `,document.body.appendChild(e),this._updateCouponWidgetLabel(),document.getElementById("dk-apply-btn").onclick=async()=>{let t=document.getElementById("dk-apply-btn");t.innerText="Testing Coupons...",t.style.background="#4f46e5",t.style.opacity="0.7",t.disabled=!0;try{let o=window.location.hostname.includes("daraz"),s=await $("FETCH_COUPONS",{platform:o?"daraz":"pickaboo",paymentMethod:this._paymentMethod||void 0});if(!s||s.length===0){t.innerText="No valid coupons found",t.disabled=!1;return}let a=o?'input[placeholder*="oupon" i], input[name*="coupon" i], .next-input.next-medium input':'input[placeholder*="oupon" i], input[name*="coupon" i], .coupon-input input, #coupon-code',n=o?'button[data-spm*="coupon"], .next-btn.next-btn-primary.next-btn-medium, button[class*="couponApply"]':'button[class*="coupon"], .apply-coupon-btn, button[id*="couponApply"]',d=o?'.checkout-order-total-discount, [class*="discount"][class*="total"], [class*="coupon"][class*="discount"]':'.order-summary .discount-amount, [class*="discount-amount"]',r=0,p=null;for(let u=0;u<s.length;u++){let v=s[u];t.innerText=`Testing ${v.code} (${u+1}/${s.length})`;let l=document.querySelector(a),h=document.querySelector(n);if(l&&h){l.value=v.code,l.dispatchEvent(new Event("input",{bubbles:!0})),l.dispatchEvent(new Event("change",{bubbles:!0})),h.click(),await new Promise(w=>setTimeout(w,2e3));let f=document.querySelector(d);if(f){let w=f.innerText.match(/[\d,]+/);if(w){let k=parseInt(w[0].replace(/,/g,""));k>r&&(r=k,p=v.code)}}}}if(p){t.innerText=`Applying best: ${p}`;let u=document.querySelector(a),v=document.querySelector(n);u&&v&&(u.value=p,u.dispatchEvent(new Event("input",{bubbles:!0})),v.click(),await new Promise(l=>setTimeout(l,1e3))),t.innerText=`Saved \u09F3${r.toLocaleString("en-BD")}!`,t.style.background="#10b981",t.disabled=!1}else t.innerText="No coupons worked",t.style.background="#3f3f46",t.disabled=!1}catch(o){console.error("[DamKoi]",o),t.innerText="Error trying coupons",t.disabled=!1}}}},fe=new Q;document.readyState==="complete"?fe.init():window.addEventListener("load",()=>fe.init());})();
