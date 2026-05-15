(()=>{var N="https://damkoi.xynly.com";async function S(i,e={}){return new Promise((t,s)=>{chrome.runtime.sendMessage({type:i,...e},a=>{chrome.runtime.lastError?s(new Error(chrome.runtime.lastError.message)):a&&a.success?t(a.data):s(new Error(a?.error||"Unknown error"))})})}var ue={EMAIL:"email",SMS:"sms",PUSH:"push"},he=ue.EMAIL,ve=60*60*1e3;function j(i,e){return`damkoi:${i}:${e}`}function P(i){try{let e=localStorage.getItem(i);if(!e)return null;let{data:t,timestamp:s}=JSON.parse(e);return Date.now()-s>ve?(localStorage.removeItem(i),null):t}catch(e){return console.warn("[DamKoi Cache] Failed to read cache:",e),null}}function R(i,e){try{localStorage.setItem(i,JSON.stringify({data:e,timestamp:Date.now()}))}catch(t){console.warn("[DamKoi Cache] Failed to save cache:",t)}}function W(i){return i>=8?"#10b981":i>=6?"#f59e0b":i>=4?"#ef4444":"#dc2626"}function G(i){return i>=8?"score-green":i>=6?"score-amber":"score-red"}function f(i){return i?`\u09F3${(i/100).toLocaleString("en-BD")}`:"\u2014"}function Y(i,e,t,s=[he]){return{product_id:i,target_price:parseInt(e)*100,email:t.trim(),notify_via:s}}function T(i,e,t){if(!i)return;let s=e==="success",a=e==="info";i.textContent=t,i.classList.remove("dk-status-success","dk-status-error","dk-status-info"),s?i.classList.add("dk-status-success"):a?i.classList.add("dk-status-info"):i.classList.add("dk-status-error")}function J(i){return i&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.trim())}function X(i){let e=parseInt(i);return!isNaN(e)&&e>0}var ke={renderDealGauge(i,e){let t=document.getElementById(e);if(!t)return;let a=Math.min(Math.max(i,0),10)/10,n=W(i),h=Math.PI*40,d=h*(1-a);t.innerHTML=`
      <div class="damkoi-gauge-container">
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
            stroke-linecap="round" />
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="${n}"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="${h}"
            stroke-dashoffset="${d}"
            class="damkoi-gauge-fill" />
        </svg>
        <div class="damkoi-gauge-value ${G(i)}">${i}</div>
        <div class="damkoi-gauge-label">Deal Score</div>
      </div>
    `},renderPriceChart(i,e){let t=document.getElementById(e);if(!t||!i||i.length<2){t.innerHTML='<div class="damkoi-no-data">Not enough data for chart</div>';return}let s=[...i].sort((m,b)=>new Date(m.scraped_at)-new Date(b.scraped_at)),a=s.map(m=>m.price),n=Math.min(...a)*.95,h=Math.max(...a)*1.05-n,d=280,c=120,p=10,l=d-p*2,u=c-p*2,v=s.map((m,b)=>{let L=p+b*(l/(s.length-1)),H=p+(u-(m.price-n)/h*u);return{x:L,y:H}}),g=v.map((m,b)=>`${b===0?"M":"L"} ${m.x} ${m.y}`).join(" "),A=`${g} L ${v[v.length-1].x} ${c-p} L ${v[0].x} ${c-p} Z`;t.innerHTML=`
      <div class="damkoi-chart-container">
        <svg width="${d}" height="${c}" viewBox="0 0 ${d} ${c}">
          <defs>
            <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgba(167, 139, 250, 0.4)" stop-opacity="1" />
              <stop offset="100%" stop-color="rgba(167, 139, 250, 0)" stop-opacity="1" />
            </linearGradient>
          </defs>
          <path d="${A}" fill="url(#chart-grad)" />
          <path d="${g}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Tooltip dots for each point (hidden by default) -->
          ${v.map((m,b)=>`
            <circle cx="${m.x}" cy="${m.y}" r="3" fill="#fff" class="damkoi-chart-dot" opacity="${b===v.length-1?1:0}">
              <title>${new Date(s[b].scraped_at).toLocaleDateString()}: ${f(s[b].price)}</title>
            </circle>
          `).join("")}
        </svg>
      </div>
    `}},K=ke;var w={summary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',alternatives:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 21v-8"/><path d="m7 16 5 5 5-5"/></svg>',alerts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'};var Z="damkoi-inline-root";var ge=['[class*="pdp-product-price"]','[class*="product-price"]','[class*="pdp-info-block"]',".pdp-product-main--price",'[class*="pdp-block"]',"#module_add_to_cart",'[class*="add-to-cart"]','form[action*="cart"]','[class*="pdp-product-detail"]'],o={bg:"#FAFAF9",raised:"rgba(255, 255, 255, 0.45)",inset:"rgba(0, 0, 0, 0.04)",border:"rgba(255, 255, 255, 0.5)",accent:"#7c3aed",primary:"#7c3aed",success:"#059669",danger:"#DC2626",warn:"#D97706",text:"#0C0A09",muted:"#44403C",dim:"#A8A29E"},x={trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>',clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',xmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',buy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',wait:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'},F={BEST_PRICE:{icon:x.trophy,label:"Best Price",color:o.success,bg:"rgba(16,185,129,0.12)",rec:"buy"},GOOD_DEAL:{icon:x.check,label:"Good Deal",color:"#34d399",bg:"rgba(52,211,153,0.1)",rec:"buy"},FAIR_PRICE:{icon:x.clock,label:"Fair Price",color:o.warn,bg:"rgba(245,158,11,0.1)",rec:"wait"},FAKE_DISCOUNT:{icon:x.xmark,label:"Fake Discount",color:o.danger,bg:"rgba(239,68,68,0.1)",rec:"wait"},INSUFFICIENT_DATA:{icon:x.chart,label:"Not Enough Data",color:o.muted,bg:"rgba(123,123,158,0.1)",rec:null}};function me(i){return i>=9?o.success:i>=7?"#34d399":i>=5?o.warn:o.danger}function B(i,e=480,t=130){if(!i||i.length<2)return{svg:`<div style="text-align:center;color:${o.dim};font-size:12px;padding:28px 0;">
              Not enough price data yet \u2014 check back in a few hours as we build your history.
            </div>`,initInteractivity:()=>{}};let s=[...i].sort((k,y)=>new Date(k.scraped_at)-new Date(y.scraped_at)),a=s.map(k=>k.price),n=Math.min(...a),r=Math.max(...a),h=r-n||1,d={top:12,right:56,bottom:26,left:10},c=e-d.left-d.right,p=t-d.top-d.bottom,l=k=>d.left+k/(s.length-1)*c,u=k=>d.top+p-(k-n)/h*p,v=s.map((k,y)=>`${y===0?"M":"L"}${l(y).toFixed(1)},${u(k.price).toFixed(1)}`).join(" "),g=`${v} L${l(s.length-1).toFixed(1)},${(d.top+p).toFixed(1)} L${d.left},${(d.top+p).toFixed(1)} Z`,m=[0,Math.floor(s.length/2),s.length-1].map(k=>{let $=new Date(s[k].scraped_at).toLocaleDateString("en-BD",{month:"short",day:"numeric"});return`<text x="${l(k).toFixed(1)}" y="${t-5}" text-anchor="middle"
              fill="${o.dim}" font-size="9" font-family="Inter,sans-serif">${$}</text>`}).join(""),b=u(n),L=u(r),H=a.lastIndexOf(n),q=`dkg_${Math.random().toString(36).slice(2,7)}`,ie=s.map((k,y)=>{let $=k.price===n&&y===H,E=y===s.length-1;if(!$&&!E)return"";let _=$?o.success:o.accent,I=E?5:4;return`<circle cx="${l(y).toFixed(1)}" cy="${u(k.price).toFixed(1)}" r="${I}"
      fill="${_}" stroke="${o.bg}" stroke-width="1.5"
      style="filter:drop-shadow(0 0 4px ${_});"/>`}).join(""),C=`dksvg_${Math.random().toString(36).slice(2,7)}`,se=`
    <svg id="${C}" width="${e}" height="${t}" viewBox="0 0 ${e} ${t}"
         style="display:block;overflow:visible;cursor:crosshair;">
      <defs>
        <linearGradient id="${q}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${o.accent}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${o.accent}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${d.left}" y1="${L.toFixed(1)}" x2="${e-d.right}" y2="${L.toFixed(1)}"
            stroke="rgba(0,0,0,0.06)" stroke-dasharray="3 3" stroke-width="1"/>
      <line x1="${d.left}" y1="${b.toFixed(1)}" x2="${e-d.right}" y2="${b.toFixed(1)}"
            stroke="rgba(16,185,129,0.12)" stroke-dasharray="3 3" stroke-width="1"/>

      <!-- Area + line -->
      <path d="${g}" fill="url(#${q})"/>
      <path d="${v}" fill="none" stroke="${o.accent}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Price labels right side -->
      <text x="${e-d.right+4}" y="${(L+4).toFixed(1)}"
            fill="${o.muted}" font-size="9" font-family="Inter,sans-serif">${f(r)}</text>
      <text x="${e-d.right+4}" y="${(b+4).toFixed(1)}"
            fill="${o.success}" font-size="9" font-family="Inter,sans-serif">${f(n)}</text>

      <!-- Key dots -->
      ${ie}

      <!-- Hover crosshair (hidden by default) -->
      <line id="${C}_hline" x1="0" y1="0" x2="0" y2="${t-d.bottom}"
            stroke="${o.accent}" stroke-width="1" stroke-dasharray="3 2" opacity="0"
            style="pointer-events:none;"/>
      <circle id="${C}_hdot" cx="0" cy="0" r="5"
              fill="${o.accent}" stroke="${o.bg}" stroke-width="2"
              opacity="0" style="pointer-events:none;"/>

      <!-- X labels -->
      ${m}
    </svg>

    <!-- Hover tooltip -->
    <div id="${C}_tip" style="
      display:none;position:absolute;
      background:${o.raised};border:1px solid ${o.border};
      border-radius:8px;padding:6px 10px;font-size:11px;
      color:${o.text};font-family:Inter,sans-serif;
      box-shadow:-2px -2px 6px rgba(255,255,255,0.8),2px 2px 8px rgba(0,0,0,0.1);
      pointer-events:none;white-space:nowrap;z-index:10;
    "></div>`;function ae(k){let y=k.getElementById(C),$=k.getElementById(`${C}_hline`),E=k.getElementById(`${C}_hdot`),_=k.getElementById(`${C}_tip`);if(!y||!$||!E||!_)return;let I=y.parentElement;I&&(I.style.position="relative"),y.addEventListener("mousemove",oe=>{let D=y.getBoundingClientRect(),re=(oe.clientX-D.left)/D.width*e,ne=Math.max(d.left,Math.min(e-d.right,re)),de=Math.round((ne-d.left)/c*(s.length-1)),U=Math.max(0,Math.min(s.length-1,de)),z=s[U],M=l(U),V=u(z.price);$.setAttribute("x1",M.toFixed(1)),$.setAttribute("x2",M.toFixed(1)),$.setAttribute("opacity","0.7"),E.setAttribute("cx",M.toFixed(1)),E.setAttribute("cy",V.toFixed(1)),E.setAttribute("opacity","1");let ce=new Date(z.scraped_at).toLocaleDateString("en-BD",{month:"short",day:"numeric",year:"numeric"});_.innerHTML=`<span style="color:${o.dim}">${ce}</span>&nbsp;&nbsp;<strong style="color:${o.accent}">${f(z.price)}</strong>`,_.style.display="block";let le=M/e*D.width+(M>e*.65?-(180+8):12),pe=V/t*D.height-16;_.style.left=`${le}px`,_.style.top=`${pe}px`}),y.addEventListener("mouseleave",()=>{$.setAttribute("opacity","0"),E.setAttribute("opacity","0"),_.style.display="none"})}return{svg:se,initInteractivity:ae}}var fe=`
  @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&family=Rubik:wght@500;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :host { 
    display: block; 
    margin: 20px 0 24px; 
    font-family: 'Nunito Sans', sans-serif; 
    --dk-glass: blur(14px) saturate(190%);
  }

  #dkw {
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: var(--dk-glass);
    -webkit-backdrop-filter: var(--dk-glass);
    border: 1px solid ${o.border};
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(28, 25, 23, 0.12);
    overflow: hidden;
    line-height: 1.4;
    font-size: 13px;
    color: ${o.text};
    position: relative;
  }

  .dk-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px;
    border-bottom: 1px solid ${o.border};
  }

  .dk-brand { display: flex; align-items: center; gap: 10px; }

  .dk-brand-name {
    font-family: 'Rubik', sans-serif;
    font-size: 16px;
    font-weight: 800;
    background: linear-gradient(135deg, ${o.text}, ${o.accent});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }

  .dk-brand-tag { 
    font-family: 'Rubik', sans-serif;
    font-size: 9px; 
    color: ${o.dim}; 
    font-weight: 700; 
    text-transform: uppercase; 
    letter-spacing: 1.5px; 
  }

  .dk-verdict-pill {
    font-family: 'Rubik', sans-serif;
    font-size: 11px;
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
    background: ${o.border};
  }

  .dk-stat {
    background: rgba(255, 255, 255, 0.2);
    padding: 12px 10px;
    text-align: center;
  }

  .dk-stat-label {
    font-family: 'Rubik', sans-serif;
    font-size: 9px;
    color: ${o.dim};
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .dk-stat-value {
    font-family: 'Rubik', sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: ${o.text};
  }

  .dk-rec {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
    border-bottom: 1px solid ${o.border};
  }

  .dk-rec-title {
    font-family: 'Rubik', sans-serif;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .dk-chart-section { padding: 16px 18px; }

  .dk-range-tab {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 700;
    font-family: 'Rubik', sans-serif;
    transition: all var(--dk-transition);
  }

  .dk-range-tab.active {
    background: ${o.accent};
    color: white;
    box-shadow: 0 4px 12px rgba(161, 98, 7, 0.3);
  }

  .dk-chart-inner {
    background: ${o.inset};
    border: 1px solid ${o.border};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-alt-item {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid ${o.border};
    border-radius: 12px;
    padding: 12px;
    transition: var(--dk-transition);
  }

  .dk-alt-item:hover {
    background: rgba(255, 255, 255, 0.6);
    transform: translateX(4px);
    border-color: ${o.accent};
  }

  .dk-coupon-card {
    background: rgba(255, 255, 255, 0.2);
    border: 1px dashed ${o.accent};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-coupon-code {
    font-family: 'Inter', monospace;
    font-weight: 800;
    color: ${o.accent};
    font-size: 14px;
    background: rgba(161, 98, 7, 0.08);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .dk-alert-btn, .dk-submit-btn, .dk-coupon-copy {
    background: ${o.primary};
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'Rubik', sans-serif;
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
`;function ye(i){if(!i||i.length===0)return"";let e=i.map((t,s)=>{let a=t.min_spend?`Min spend: \u09F3${(t.min_spend/100).toFixed(0)}`:"No minimum spend",n=t.expires_at?`\xB7 Expires ${new Date(t.expires_at).toLocaleDateString("en-BD",{month:"short",day:"numeric"})}`:"";return`
      <div class="dk-coupon-card">
        <div class="dk-coupon-left">
          <div class="dk-coupon-code">${t.code}</div>
          <div class="dk-coupon-meta">${a}${n}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="dk-coupon-badge">${t.display_discount}</div>
          <button class="dk-coupon-copy" data-dk-copy="${t.code}" id="dkcp_${s}">Copy</button>
        </div>
      </div>`}).join("");return`
    <div class="dk-divider"></div>
    <div class="dk-coupons">
      <div class="dk-coupon-title" style="display:flex;align-items:center;gap:5px;">${x.tag} Available Coupons</div>
      <div class="dk-coupon-list">${e}</div>
    </div>`}function be(i){i.querySelectorAll("[data-dk-copy]").forEach(e=>{e.addEventListener("click",async()=>{let t=e.dataset.dkCopy;try{await navigator.clipboard.writeText(t),e.textContent="\u2705 Copied!",e.classList.add("copied"),setTimeout(()=>{e.textContent="Copy",e.classList.remove("copied")},2e3)}catch{e.textContent=t,e.select?.()}})})}function xe(){return`
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
    </div>`}function we(i){let e=me(i),s=Math.PI*24,a=s*(1-i/10);return`
    <svg width="58" height="36" viewBox="0 0 58 36" style="overflow:visible;">
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="${e}"
            stroke-width="4.5" stroke-linecap="round"
            stroke-dasharray="${s}" stroke-dashoffset="${a}"
            style="filter:drop-shadow(0 0 4px ${e});transition:stroke-dashoffset 0.9s cubic-bezier(.34,1.56,.64,1);"/>
      <text x="29" y="29" text-anchor="middle" fill="${e}"
            font-size="13" font-weight="900" font-family="Inter,sans-serif">${i}</text>
      <text x="29" y="35" text-anchor="middle" fill="${o.dim}"
            font-size="6.5" font-family="Inter,sans-serif">/10</text>
    </svg>`}function $e(i,e){let t=F[i.label]||F.INSUFFICIENT_DATA;if(!t.rec)return"";if(t.rec==="buy"){let s=e>0?`You save <strong style="color:${o.success}">${e}%</strong> vs the 30-day average.`:"This is at or below its typical price.";return`
      <div class="dk-rec">
        <div class="dk-rec-icon" style="color:${o.success}">${x.buy}</div>
        <div>
          <div class="dk-rec-title" style="color:${o.success}">Good Time to Buy</div>
          <div class="dk-rec-sub">${s} ${i.explanation}</div>
        </div>
      </div>`}else return`
      <div class="dk-rec">
        <div class="dk-rec-icon" style="color:${o.warn}">${x.wait}</div>
        <div>
          <div class="dk-rec-title" style="color:${o.warn}">Consider Waiting</div>
          <div class="dk-rec-sub">${i.explanation}</div>
        </div>
      </div>`}function _e(i){if(!i||i.length===0)return"";let e=i.slice(0,3).map(t=>{let s=t.image_url?`<img class="dk-alt-img" src="${t.image_url}" alt="" loading="lazy"/>`:`<img class="dk-alt-img" src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="background:#fff;object-fit:contain;padding:4px;" />`,a=t.savings>0?`<span class="dk-alt-save">Save ${f(t.savings)}</span>`:"";return`
      <div class="dk-alt-item" data-url="${t.url}">
        ${s}
        <div class="dk-alt-info">
          <div class="dk-alt-name">${t.title}</div>
          <div>
            <span class="dk-alt-price">${f(t.current_price)}</span>
            ${a}
          </div>
        </div>
        <div class="dk-alt-arrow">\u203A</div>
      </div>`}).join("");return`
    <div class="dk-divider" style="margin-bottom:12px;"></div>
    <div class="dk-alts">
      <div class="dk-alts-title" style="display:flex;align-items:center;gap:5px;">${x.chart} Look-alike Deals</div>
      <div class="dk-alt-list" id="dk-alt-list">${e}</div>
    </div>`}function Ce(i,e,t,s,a=[]){let{product:n,verdict:r}=i,h=F[r.label]||F.INSUFFICIENT_DATA,d=h.color,c=r.avg_30d&&n.current_price&&r.avg_30d>n.current_price?Math.round((r.avg_30d-n.current_price)/r.avg_30d*100):0,p=i.price_history||[];return`
  <div id="dkw">

    <!-- Top bar -->
    <div class="dk-bar">
      <div class="dk-brand">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="height:20px;filter:drop-shadow(0 0 6px rgba(108,99,255,0.3));" />
        <span class="dk-brand-name">DamKoi</span>
        <span class="dk-brand-tag">Price Intel</span>
      </div>
      <div class="dk-bar-right">
        <span class="dk-verdict-pill" style="color:${d};background:${h.bg};">
          ${h.icon} ${h.label}
        </span>
        ${we(r.deal_score)}
      </div>
    </div>

    <!-- Recommendation card -->
    ${$e(r,c)}

    <!-- Price stats (4 tiles) -->
    <div class="dk-stats">
      ${[["Current",f(n.current_price),o.accent],["30-Day Avg",r.avg_30d?f(r.avg_30d):"\u2014",o.text],["All-Time Low",r.all_time_low?f(r.all_time_low):"\u2014",o.success],["Highest Ever",r.all_time_high?f(r.all_time_high):`${p.length>0?f(Math.max(...p.map(l=>l.price))):"\u2014"}`,o.muted]].map(([l,u,v])=>`
        <div class="dk-stat">
          <div class="dk-stat-label">${l}</div>
          <div class="dk-stat-value" style="color:${v};">${u}</div>
          ${l==="30-Day Avg"&&c>0?`<div style="font-size:9px;color:${o.success};margin-top:2px;font-weight:600;">\u2193${c}% savings</div>`:'<div style="height:12px;"></div>'}
        </div>
      `).join("")}
    </div>

    <!-- Chart -->
    <div class="dk-chart-section">
      <div class="dk-chart-header">
        <span class="dk-chart-title" style="display:flex;align-items:center;gap:5px;">${x.chart} Price History</span>
        <div class="dk-range-tabs">
          ${["1M","3M","ALL"].map(l=>`<button class="dk-range-tab${l===s?" active":""}" data-range="${l}">${l}</button>`).join("")}
        </div>
      </div>
      <div class="dk-chart-inner" id="dk-chart-inner">
        ${t.svg}
      </div>
      <div class="dk-chart-legend">
        <span><span class="dk-legend-dot" style="background:${o.accent};"></span>Price line</span>
        <span><span class="dk-legend-dot" style="background:${o.success};"></span>All-time low</span>
        <span><span class="dk-legend-dot" style="background:${o.accent};filter:drop-shadow(0 0 3px ${o.accent});"></span>Now &nbsp; ${p.length} data points</span>
      </div>
    </div>

    <!-- Look-alike alternatives -->
    ${e?_e(e):'<div class="dk-divider"></div><div class="dk-loading"><span class="dk-spinner"></span>Loading similar products\u2026</div>'}

    <!-- Coupons -->
    ${ye(a)}

    <!-- Footer: explanation + alert CTA -->
    <div class="dk-footer">
      <p class="dk-explanation">${r.explanation}</p>
      <button class="dk-alert-btn" id="dk-alert-btn" style="display:flex;align-items:center;gap:6px;">${x.bell} Alert me</button>
    </div>

    <!-- Alert form (hidden) -->
    <div class="dk-alert-form" id="dk-alert-form">
      <div class="dk-alert-row">
        <input class="dk-input" type="email" id="dk-email" placeholder="your@email.com" autocomplete="email"/>
        <input class="dk-input dk-input-narrow" type="number" id="dk-target"
               placeholder="Target \u09F3"
               value="${r.avg_30d?Math.floor(r.avg_30d/100*.92):""}"/>
        <button class="dk-submit-btn" id="dk-submit">Set</button>
      </div>
      <div class="dk-status" id="dk-status"></div>
    </div>

  </div>`}function Q(i,e){if(!i||i.length===0||e==="ALL")return i;let t=e==="1M"?30:90,s=Date.now()-t*864e5,a=i.filter(n=>new Date(n.scraped_at).getTime()>=s);return a.length>=2?a:i}function Ee(i,e,t,s,a=[]){be(i),i.querySelectorAll(".dk-range-tab").forEach(d=>{d.addEventListener("click",()=>{let c=d.dataset.range;if(c===s)return;s=c;let p=Q(e.price_history||[],c),l=B(p,460,130),u=i.getElementById("dk-chart-inner");u&&(u.innerHTML=l.svg,l.initInteractivity(i)),i.querySelectorAll(".dk-range-tab").forEach(v=>v.classList.toggle("active",v.dataset.range===c))})});let n=i.getElementById("dk-alert-btn"),r=i.getElementById("dk-alert-form");n?.addEventListener("click",()=>{let d=r.style.display!=="none";r.style.display=d?"none":"block",n.innerHTML=d?`${x.bell} Alert me`:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel'}),i.getElementById("dk-submit")?.addEventListener("click",async()=>{let d=i.getElementById("dk-email")?.value?.trim(),c=parseFloat(i.getElementById("dk-target")?.value||"0"),p=i.getElementById("dk-status"),l=i.getElementById("dk-submit"),u=(v,g)=>{p.textContent=v,p.style.color=g};if(!d||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d))return u("Enter a valid email address.",o.danger);if(!c||c<=0)return u("Enter a valid target price.",o.danger);l.disabled=!0,u("Setting alert\u2026",o.muted);try{await S("CREATE_ALERT",{payload:{product_id:e.product.id,target_price:Math.round(c*100),email:d,channel:"email"}}),u(`Alert set! We'll email you when price drops to \u09F3${c.toLocaleString("en-BD")}.`,o.success),n.innerHTML=`${x.check} Alert set`}catch{u("Failed to set alert \u2014 please try again.",o.danger)}finally{l.disabled=!1}}),i.getElementById("dk-alt-list")?.addEventListener("click",d=>{let c=d.target.closest("[data-url]");c?.dataset?.url&&(window.location.href=c.dataset.url)})}function Se(){for(let i of ge){let e=document.querySelector(i);if(e)return e}return null}async function ee(i){document.getElementById(Z)?.remove();let e=Se();if(!e){console.warn("[DamKoi] No injection target found");return}let t=document.createElement("div");t.id=Z;let s=t.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=fe,s.appendChild(a);let n=document.createElement("div");s.appendChild(n),e.insertAdjacentElement("afterend",t),n.innerHTML=xe();let r="3M",h=Q(i.price_history||[],r),d=B(h,460,130);await new Promise(g=>requestAnimationFrame(g));let c=i.product.id,[p,l]=await Promise.allSettled([fetch(`${N}/v1/products/${c}/alternatives`).then(g=>g.ok?g.json():[]),fetch(`${N}/v1/products/${c}/coupons`).then(g=>g.ok?g.json():[])]),u=p.status==="fulfilled"?p.value||[]:[],v=l.status==="fulfilled"?l.value||[]:[];n.style.transition="opacity 0.25s ease",n.style.opacity="0",await new Promise(g=>setTimeout(g,120)),n.innerHTML=Ce(i,u,B(h,460,130),r,v),B(h,460,130).initInteractivity(s),Ee(s,i,u,r,v),n.style.opacity="1"}var O=class{constructor(){this.data=null,this.sidebar=null,this.currentTab="summary",this.alternativesCache=null,this.alertFormState={}}async init(){if(this.platform=this.detectPlatform(),!!this.platform){if(this.platform==="daraz-checkout"||this.platform==="pickaboo-checkout"){console.log("[DamKoi] Checkout detected. Launching coupon magic..."),this.initCouponMagic();return}console.log(`[DamKoi] Content script starting on ${this.platform}...`),this.data=await this.fetchData(window.location.href),this.data&&!this.data.notTracked&&(await this.enrichPriceHistory(),ee(this.data)),this.renderSidebar()}}async enrichPriceHistory(){if(this.data?.product?.id)try{let e=await S("FETCH_HISTORY",{productId:this.data.product.id,days:90});this.data.price_history=e.prices||[]}catch(e){console.warn("[DamKoi] Could not fetch history:",e),this.data.price_history=[]}}detectPlatform(){let{hostname:e,href:t}=window.location;return e.includes("daraz.com.bd")?t.includes("cart.daraz.com.bd")||t.includes("checkout.daraz.com.bd")?"daraz-checkout":/daraz\.com\.bd\/.*i\d+-s\d+/i.test(t)||t.includes("daraz.com.bd/products/")?"daraz":null:e.includes("cartup.com.bd")?t.includes("/products/")?"cartup":null:e.includes("rokomari.com")?/\/book\/\d+/.test(t)?"rokomari":null:e.includes("pickaboo.com")?t.includes("pickaboo.com/checkout/")?"pickaboo-checkout":t.includes("/product/")?"pickaboo":null:e.includes("chaldal.com")?t.includes("/p/")||t.split("/").length>3?"chaldal":null:e.includes("othoba.com")&&t.includes("/product/")?"othoba":null}async fetchData(e){try{let t=j("product",e),s=P(t);if(s)return console.log("[DamKoi] Loaded from cache:",e),s;let a=await S("FETCH_VERDICT",{url:e});return R(t,a),a}catch(t){return console.error("[DamKoi] Fetch failed:",t),{notTracked:!0,connectionError:!t.message?.startsWith("404")}}}detectPaymentMethod(){let e=["bkash","nagad","rocket","upay","tap","card","cod"],t=()=>{let a=[...document.querySelectorAll('[class*="payment"][class*="active"], [class*="payment"][class*="selected"], [class*="cashier"][class*="active"], [aria-checked="true"][class*="payment"]'),...document.querySelectorAll(".cashier-active, .payment-method-active, .pay-method--active")];for(let n of a){let r=(n.textContent||"").toLowerCase(),h=[...n.querySelectorAll("img")].map(c=>(c.alt||"").toLowerCase()).join(" "),d=r+" "+h;for(let c of e)if(d.includes(c))return c}return null};this._paymentMethod=t(),new MutationObserver(()=>{let a=t();a!==this._paymentMethod&&(this._paymentMethod=a,this._updateCouponWidgetLabel())}).observe(document.body,{subtree:!0,attributes:!0,attributeFilter:["class","aria-checked"]}),document.addEventListener("click",a=>{a.target.closest('[class*="payment"], [class*="cashier"], [class*="pay-method"]')&&setTimeout(()=>{let r=t();r!==this._paymentMethod&&(this._paymentMethod=r,this._updateCouponWidgetLabel())},300)},!0)}_updateCouponWidgetLabel(){let e=document.getElementById("dk-payment-label");if(!e)return;let t=this._paymentMethod;if(t){let s={bkash:"bKash",nagad:"Nagad",rocket:"Rocket",upay:"Upay",card:"Card",cod:"Cash on Delivery"};e.textContent=`Showing ${s[t]||t} codes`,e.style.color=t==="bkash"?"#e91e8c":t==="nagad"?"#f97316":"#a78bfa"}else e.textContent="Showing all codes",e.style.color="rgba(255,255,255,0.4)"}async initCouponMagic(){this._paymentMethod=null,this.detectPaymentMethod();let e=document.createElement("div");e.id="damkoi-coupon-widget",e.innerHTML=`
      <div style="background: rgba(10,10,12,0.95); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 16px; width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); backdrop-filter: blur(12px); color: white; font-family: system-ui, sans-serif; z-index: 999999; position: fixed; bottom: 20px; right: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width: 20px; height: 20px;" />
            <span style="font-weight: 800; font-size: 14px;">DamKoi Magic</span>
          </div>
          <span id="dk-payment-label" style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4);">Showing all codes</span>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 8px 0 16px 0; line-height: 1.4;">
          Found active coupons. Auto-test all to find best discount.
        </p>
        <button id="dk-apply-btn" style="width: 100%; background: #6366f1; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s;">
          Auto-Apply Coupons
        </button>
      </div>
    `,document.body.appendChild(e),this._updateCouponWidgetLabel(),document.getElementById("dk-apply-btn").onclick=async()=>{let t=document.getElementById("dk-apply-btn");t.innerText="Testing Coupons...",t.style.background="#4f46e5",t.style.opacity="0.7",t.disabled=!0;try{let s=window.location.hostname.includes("daraz"),a=await S("FETCH_COUPONS",{platform:s?"daraz":"pickaboo",paymentMethod:this._paymentMethod||void 0});if(!a||a.length===0){t.innerText="No valid coupons found",t.disabled=!1;return}let n=s?'input[placeholder*="oupon" i], input[name*="coupon" i], .next-input.next-medium input':'input[placeholder*="oupon" i], input[name*="coupon" i], .coupon-input input, #coupon-code',r=s?'button[data-spm*="coupon"], .next-btn.next-btn-primary.next-btn-medium, button[class*="couponApply"]':'button[class*="coupon"], .apply-coupon-btn, button[id*="couponApply"]',h=s?'.checkout-order-total-discount, [class*="discount"][class*="total"], [class*="coupon"][class*="discount"]':'.order-summary .discount-amount, [class*="discount-amount"]',d=0,c=null;for(let p=0;p<a.length;p++){let l=a[p];t.innerText=`Testing ${l.code} (${p+1}/${a.length})`;let u=document.querySelector(n),v=document.querySelector(r);if(u&&v){u.value=l.code,u.dispatchEvent(new Event("input",{bubbles:!0})),u.dispatchEvent(new Event("change",{bubbles:!0})),v.click(),await new Promise(A=>setTimeout(A,2e3));let g=document.querySelector(h);if(g){let A=g.innerText.match(/[\d,]+/);if(A){let m=parseInt(A[0].replace(/,/g,""));m>d&&(d=m,c=l.code)}}}}if(c){t.innerText=`Applying best: ${c}`;let p=document.querySelector(n),l=document.querySelector(r);p&&l&&(p.value=c,p.dispatchEvent(new Event("input",{bubbles:!0})),l.click(),await new Promise(u=>setTimeout(u,1e3))),t.innerText=`Saved \u09F3${d.toLocaleString("en-BD")}!`,t.style.background="#10b981",t.disabled=!1}else t.innerText="No coupons worked",t.style.background="#3f3f46",t.disabled=!1}catch(s){console.error("[DamKoi]",s),t.innerText="Error trying coupons",t.disabled=!1}}}renderSidebar(){this.sidebar&&this.sidebar.remove(),this.sidebar=document.createElement("div"),this.sidebar.id="damkoi-sidebar",this.sidebar.innerHTML=`
      <nav class="damkoi-nav">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width:28px;height:28px;margin-bottom:20px;opacity:0.9;" />
        <div class="damkoi-nav-item active" data-tab="summary">${w.summary}</div>
        <div class="damkoi-nav-item" data-tab="history">${w.history}</div>
        <div class="damkoi-nav-item" data-tab="alternatives">${w.alternatives}</div>
        <div class="damkoi-nav-item" data-tab="alerts">${w.alerts}</div>
      </nav>
      <main class="damkoi-main">
        <header class="damkoi-header">
          <span class="damkoi-logo">DamKoi</span>
          <div class="damkoi-close" title="Click to collapse">${w.close}</div>
        </header>
        <div id="damkoi-content">
          <!-- Skeleton shown until real data arrives -->
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
    `,document.body.appendChild(this.sidebar),this.setupEvents(),this.data&&!this.data.notTracked?this.switchTab("summary"):this.data&&this.switchTab("summary")}setupEvents(){this.sidebar.querySelector(".damkoi-close").onclick=()=>{this.sidebar.classList.toggle("collapsed")},this.sidebar.querySelectorAll(".damkoi-nav-item").forEach(e=>{e.onclick=t=>{let s=this.sidebar.classList.contains("collapsed");this.switchTab(e.dataset.tab),s?this.sidebar.classList.remove("collapsed"):(this.currentTab,e.dataset.tab)}})}switchTab(e){if(this.currentTab===e&&!this.sidebar?.classList.contains("collapsed"))return;this.currentTab=e,this.sidebar.querySelectorAll(".damkoi-nav-item").forEach(a=>{a.classList.toggle("active",a.dataset.tab===e)});let t=this.sidebar.querySelector("#damkoi-content");t.innerHTML="";let s=document.createElement("div");if(s.className="damkoi-section active",t.appendChild(s),!this.data||this.data.notTracked){this.renderNotTracked(s,e);return}switch(e){case"summary":this.renderSummary(s);break;case"history":this.renderHistory(s);break;case"alternatives":this.renderAlternatives(s);break;case"alerts":this.renderAlerts(s);break}}renderNotTracked(e,t){let s="https://damkoi.xynly.com",a=encodeURIComponent(window.location.href);if(this.data?.connectionError){e.innerHTML=`
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
            <a href="${s}" target="_blank" rel="noopener" class="dk-web-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open Web App
            </a>
            <button class="dk-retry-btn" onclick="window.location.reload()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Retry
            </button>
          </div>
        </div>
      `;return}if(t==="summary"){e.innerHTML=`
        <div class="dk-not-tracked">
          <div class="dk-nt-anim-wrap">
            <div class="dk-nt-ring"></div>
            <div class="dk-nt-ring dk-nt-ring2"></div>
            <svg class="dk-nt-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>

          <div class="dk-nt-badge">
            <span class="dk-nt-dot"></span>
            TRACKING STARTED
          </div>

          <h3 class="dk-nt-title">We're on it.</h3>
          <p class="dk-nt-desc">
            First price data arrives within <strong>15\u201330 minutes</strong>.
            Check back or get notified below.
          </p>

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

          <a href="${s}?url=${a}" target="_blank" rel="noopener" class="dk-web-cta dk-nt-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            Set Alert on Web App
          </a>
        </div>
      `;return}let n={history:{icon:w.history,title:"Price History",desc:"No data yet \u2014 we just added this product. Check back in 15\u201330 minutes."},alternatives:{icon:w.alternatives,title:"Alternatives",desc:"We'll surface similar products once our system indexes this item."},alerts:{icon:w.alerts,title:"Price Alerts",desc:"Set alerts once we collect the first price point. Almost there!"}},r=n[t]||n.history;e.innerHTML=`
      <div class="dk-tab-empty">
        <span class="dk-te-icon">${r.icon}</span>
        <h3>${r.title}</h3>
        <p class="dk-te-desc">${r.desc}</p>
        <a href="${s}?url=${a}" target="_blank" rel="noopener" class="dk-web-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open DamKoi
        </a>
      </div>
    `}renderSummary(e){let{verdict:t,product:s}=this.data,n={FAKE_DISCOUNT:"verdict-fake",BEST_PRICE:"verdict-best",GOOD_DEAL:"verdict-good",FAIR_PRICE:"verdict-fair",INSUFFICIENT_DATA:"verdict-pending"}[t.label]||"verdict-fair";e.innerHTML=`
      <div class="damkoi-card damkoi-score-card" style="margin-bottom:12px;">
        <div id="damkoi-gauge"></div>
      </div>
      <div class="damkoi-card" style="margin-bottom:12px;">
        <span class="verdict-badge ${n}">${t.display}</span>
        <p style="font-size:11px;color:rgba(226,226,240,0.55);line-height:1.6;margin-top:4px;">${t.explanation}</p>
      </div>
      <div class="damkoi-price-grid">
        <div class="damkoi-price-item">
          <div class="damkoi-label">Current Price</div>
          <div class="damkoi-value accent">\u09F3${(s.current_price/100).toLocaleString("en-BD")}</div>
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
          <div class="damkoi-label">Confidence</div>
          <div class="damkoi-value">${t.data_points||"\u2014"} pts</div>
        </div>
      </div>
    `,K.renderDealGauge(t.deal_score,"damkoi-gauge")}renderHistory(e){e.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${w.history}</span> Price Trend</h3>
      <p style="font-size: 11px; margin: 4px 0 15px; color: rgba(255,255,255,0.4);">Last 30 data points</p>
      <div id="damkoi-sparkline"></div>
      <div class="damkoi-price-grid">
        <div class="damkoi-price-item">
          <div class="damkoi-label">All-Time Low</div>
          <div class="damkoi-value">\u09F3${(this.data.verdict.all_time_low/100).toLocaleString()}</div>
          <div style="font-size: 10px; opacity: 0.4;">${this.data.verdict.all_time_low_date}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">Total Points</div>
          <div class="damkoi-value">${this.data.data_points}</div>
        </div>
      </div>
    `,K.renderPriceChart(this.data.price_history,"damkoi-sparkline")}renderAlternatives(e){e.innerHTML=`<h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${w.alternatives}</span> Look-Alike Deals</h3><div id="damkoi-alternatives-list">Loading...</div>`,this.alternativesCache?this.displayAlternatives(e,this.alternativesCache):this.fetchAlternatives(e)}async fetchAlternatives(e){let t=e.querySelector("#damkoi-alternatives-list");try{let s=j("alternatives",this.data.product.id),a=P(s);if(a){this.alternativesCache=a,this.displayAlternatives(e,a);return}let r=(await S("FETCH_ALTERNATIVES",{productId:this.data.product.id})).alternatives||[];this.alternativesCache=r,R(s,r),this.displayAlternatives(e,r)}catch{t.innerHTML='<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to load alternatives.</div>'}}displayAlternatives(e,t){let s=e.querySelector("#damkoi-alternatives-list"),a=t.filter(r=>!r.is_original_request);if(a.length===0){s.innerHTML='<div style="padding:20px;text-align:center;color:var(--dk-dim);">No cheaper alternatives in this category yet.</div>';return}let n=this.data.product.current_price;s.innerHTML=a.map((r,h)=>{let d=n&&r.current_price?n-r.current_price:0;return`
      <div class="damkoi-card" style="margin-bottom:10px;display:flex;gap:12px;cursor:pointer;" data-alt-url="${r.url}" data-alt-idx="${h}">
        ${r.image_url?`<img src="${r.image_url}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;box-shadow:var(--dk-insetSh);" />`:`<img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width:46px;height:46px;border-radius:8px;background:#fff;object-fit:contain;padding:6px;box-shadow:var(--dk-insetSh);flex-shrink:0;" />`}
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:var(--dk-accent);">${r.platform}</span>
          </div>
          <div style="font-size:11px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--dk-text);margin-bottom:4px;">${r.title}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:800;color:var(--dk-text);">${f(r.current_price)}</span>
            ${d>0?`<span style="font-size:10px;background:rgba(16,185,129,0.1);color:var(--dk-success);padding:2px 7px;border-radius:10px;font-weight:600;">Save ${f(d)}</span>`:""}
          </div>
        </div>
      </div>
    `}).join(""),s.addEventListener("click",r=>{let h=r.target.closest("[data-alt-url]");h&&(window.location.href=h.dataset.altUrl)})}renderAlerts(e){let t=Math.floor(this.data.product.current_price/100*.9),s=this.alertFormState.email||"",a=this.alertFormState.price||t;e.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${w.alerts}</span> Set Price Alert</h3>
      <p style="margin: 8px 0 20px; font-size: 12px; color: rgba(255,255,255,0.4);">
        Get an email the instant this product drops below your target.
      </p>
      <input type="email" id="alert-email" class="damkoi-input" placeholder="Your email address" value="${s}" />
      <div style="position: relative;">
        <span style="position: absolute; left: 16px; top: 12px; font-weight: 700; color: #a78bfa;">\u09F3</span>
        <input type="number" id="alert-price" class="damkoi-input" style="padding-left: 35px;" placeholder="Target Price" value="${a}" />
      </div>
      <button class="damkoi-btn" id="save-alert">Update Alert</button>
      <div id="alert-status" class="damkoi-status-pill"></div>
    `;let n=e.querySelector("#save-alert"),r=e.querySelector("#alert-email"),h=e.querySelector("#alert-price");n.replaceWith(n.cloneNode(!0)),e.querySelector("#save-alert").addEventListener("click",async()=>{let c=r.value.trim(),p=h.value.trim(),l=e.querySelector("#alert-status");if(!J(c)){T(l,"error","Enter a valid email address");return}if(!X(p)){T(l,"error","Enter a valid price");return}this.alertFormState={email:c,price:p},T(l,"info","Saving...");try{let u=Y(this.data.product.id,p,c);await S("CREATE_ALERT",{payload:u}),T(l,"success","Tracking active!")}catch{T(l,"error","Error saving alert")}})}},te=new O;document.readyState==="complete"?te.init():window.addEventListener("load",()=>te.init());})();
