(()=>{var N="https://backend-seven-flame-14.vercel.app";async function S(i,t={}){return new Promise((e,a)=>{chrome.runtime.sendMessage({type:i,...t},r=>{chrome.runtime.lastError?a(new Error(chrome.runtime.lastError.message)):r&&r.success?e(r.data):a(new Error(r?.error||"Unknown error"))})})}var pt={EMAIL:"email",SMS:"sms",PUSH:"push"},ut=pt.EMAIL,mt=60*60*1e3;function z(i,t){return`damkoi:${i}:${t}`}function P(i){try{let t=localStorage.getItem(i);if(!t)return null;let{data:e,timestamp:a}=JSON.parse(t);return Date.now()-a>mt?(localStorage.removeItem(i),null):e}catch(t){return console.warn("[DamKoi Cache] Failed to read cache:",t),null}}function R(i,t){try{localStorage.setItem(i,JSON.stringify({data:t,timestamp:Date.now()}))}catch(e){console.warn("[DamKoi Cache] Failed to save cache:",e)}}function G(i){return i>=8?"#10b981":i>=6?"#f59e0b":i>=4?"#ef4444":"#dc2626"}function W(i){return i>=8?"score-green":i>=6?"score-amber":"score-red"}function y(i){return i?`\u09F3${(i/100).toLocaleString("en-BD")}`:"\u2014"}function V(i,t,e,a=[ut]){return{product_id:i,target_price:parseInt(t)*100,email:e.trim(),notify_via:a}}function A(i,t,e){if(!i)return;let a=t==="success",r=t==="info";i.textContent=e,i.classList.remove("dk-status-success","dk-status-error","dk-status-info"),a?i.classList.add("dk-status-success"):r?i.classList.add("dk-status-info"):i.classList.add("dk-status-error")}function J(i){return i&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.trim())}function X(i){let t=parseInt(i);return!isNaN(t)&&t>0}var gt={renderDealGauge(i,t){let e=document.getElementById(t);if(!e)return;let r=Math.min(Math.max(i,0),10)/10,d=G(i),m=Math.PI*40,n=m*(1-r);e.innerHTML=`
      <div class="damkoi-gauge-container">
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
            stroke-linecap="round" />
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="${d}"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="${m}"
            stroke-dashoffset="${n}"
            class="damkoi-gauge-fill" />
        </svg>
        <div class="damkoi-gauge-value ${W(i)}">${i}</div>
        <div class="damkoi-gauge-label">Deal Score</div>
      </div>
    `},renderPriceChart(i,t){let e=document.getElementById(t);if(!e||!i||i.length<2){e.innerHTML='<div class="damkoi-no-data">Not enough data for chart</div>';return}let a=[...i].sort((k,f)=>new Date(k.scraped_at)-new Date(f.scraped_at)),r=a.map(k=>k.price),d=Math.min(...r)*.95,m=Math.max(...r)*1.05-d,n=280,c=120,p=10,l=n-p*2,u=c-p*2,g=a.map((k,f)=>{let C=p+f*(l/(a.length-1)),B=p+(u-(k.price-d)/m*u);return{x:C,y:B}}),h=g.map((k,f)=>`${f===0?"M":"L"} ${k.x} ${k.y}`).join(" "),T=`${h} L ${g[g.length-1].x} ${c-p} L ${g[0].x} ${c-p} Z`;e.innerHTML=`
      <div class="damkoi-chart-container">
        <svg width="${n}" height="${c}" viewBox="0 0 ${n} ${c}">
          <defs>
            <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgba(167, 139, 250, 0.4)" stop-opacity="1" />
              <stop offset="100%" stop-color="rgba(167, 139, 250, 0)" stop-opacity="1" />
            </linearGradient>
          </defs>
          <path d="${T}" fill="url(#chart-grad)" />
          <path d="${h}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Tooltip dots for each point (hidden by default) -->
          ${g.map((k,f)=>`
            <circle cx="${k.x}" cy="${k.y}" r="3" fill="#fff" class="damkoi-chart-dot" opacity="${f===g.length-1?1:0}">
              <title>${new Date(a[f].scraped_at).toLocaleDateString()}: ${y(a[f].price)}</title>
            </circle>
          `).join("")}
        </svg>
      </div>
    `}},j=gt;var x={summary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',alternatives:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 21v-8"/><path d="m7 16 5 5 5-5"/></svg>',alerts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'};var Y="damkoi-inline-root";var vt=['[class*="pdp-product-price"]','[class*="product-price"]','[class*="pdp-info-block"]',".pdp-product-main--price",'[class*="pdp-block"]',"#module_add_to_cart",'[class*="add-to-cart"]','form[action*="cart"]','[class*="pdp-product-detail"]'],s={bg:"#FAFAF9",raised:"rgba(255, 255, 255, 0.45)",inset:"rgba(0, 0, 0, 0.04)",border:"rgba(255, 255, 255, 0.5)",accent:"#A16207",success:"#059669",danger:"#DC2626",warn:"#D97706",text:"#0C0A09",muted:"#44403C",dim:"#A8A29E"},F={BEST_PRICE:{icon:"\u{1F3C6}",label:"Best Price",color:s.success,bg:"rgba(16,185,129,0.12)",rec:"buy"},GOOD_DEAL:{icon:"\u2705",label:"Good Deal",color:"#34d399",bg:"rgba(52,211,153,0.1)",rec:"buy"},FAIR_PRICE:{icon:"\u{1F7E1}",label:"Fair Price",color:s.warn,bg:"rgba(245,158,11,0.1)",rec:"wait"},FAKE_DISCOUNT:{icon:"\u274C",label:"Fake Discount",color:s.danger,bg:"rgba(239,68,68,0.1)",rec:"wait"},INSUFFICIENT_DATA:{icon:"\u{1F4CA}",label:"Not Enough Data",color:s.muted,bg:"rgba(123,123,158,0.1)",rec:null}};function ht(i){return i>=9?s.success:i>=7?"#34d399":i>=5?s.warn:s.danger}function M(i,t=480,e=130){if(!i||i.length<2)return{svg:`<div style="text-align:center;color:${s.dim};font-size:12px;padding:28px 0;">
              Not enough price data yet \u2014 check back in a few hours as we build your history.
            </div>`,initInteractivity:()=>{}};let a=[...i].sort((v,b)=>new Date(v.scraped_at)-new Date(b.scraped_at)),r=a.map(v=>v.price),d=Math.min(...r),o=Math.max(...r),m=o-d||1,n={top:12,right:56,bottom:26,left:10},c=t-n.left-n.right,p=e-n.top-n.bottom,l=v=>n.left+v/(a.length-1)*c,u=v=>n.top+p-(v-d)/m*p,g=a.map((v,b)=>`${b===0?"M":"L"}${l(b).toFixed(1)},${u(v.price).toFixed(1)}`).join(" "),h=`${g} L${l(a.length-1).toFixed(1)},${(n.top+p).toFixed(1)} L${n.left},${(n.top+p).toFixed(1)} Z`,k=[0,Math.floor(a.length/2),a.length-1].map(v=>{let $=new Date(a[v].scraped_at).toLocaleDateString("en-BD",{month:"short",day:"numeric"});return`<text x="${l(v).toFixed(1)}" y="${e-5}" text-anchor="middle"
              fill="${s.dim}" font-size="9" font-family="Inter,sans-serif">${$}</text>`}).join(""),f=u(d),C=u(o),B=r.lastIndexOf(d),O=`dkg_${Math.random().toString(36).slice(2,7)}`,et=a.map((v,b)=>{let $=v.price===d&&b===B,E=b===a.length-1;if(!$&&!E)return"";let w=$?s.success:s.accent,I=E?5:4;return`<circle cx="${l(b).toFixed(1)}" cy="${u(v.price).toFixed(1)}" r="${I}"
      fill="${w}" stroke="${s.bg}" stroke-width="1.5"
      style="filter:drop-shadow(0 0 4px ${w});"/>`}).join(""),_=`dksvg_${Math.random().toString(36).slice(2,7)}`,it=`
    <svg id="${_}" width="${t}" height="${e}" viewBox="0 0 ${t} ${e}"
         style="display:block;overflow:visible;cursor:crosshair;">
      <defs>
        <linearGradient id="${O}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${s.accent}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${s.accent}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${n.left}" y1="${C.toFixed(1)}" x2="${t-n.right}" y2="${C.toFixed(1)}"
            stroke="rgba(0,0,0,0.06)" stroke-dasharray="3 3" stroke-width="1"/>
      <line x1="${n.left}" y1="${f.toFixed(1)}" x2="${t-n.right}" y2="${f.toFixed(1)}"
            stroke="rgba(16,185,129,0.12)" stroke-dasharray="3 3" stroke-width="1"/>

      <!-- Area + line -->
      <path d="${h}" fill="url(#${O})"/>
      <path d="${g}" fill="none" stroke="${s.accent}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Price labels right side -->
      <text x="${t-n.right+4}" y="${(C+4).toFixed(1)}"
            fill="${s.muted}" font-size="9" font-family="Inter,sans-serif">${y(o)}</text>
      <text x="${t-n.right+4}" y="${(f+4).toFixed(1)}"
            fill="${s.success}" font-size="9" font-family="Inter,sans-serif">${y(d)}</text>

      <!-- Key dots -->
      ${et}

      <!-- Hover crosshair (hidden by default) -->
      <line id="${_}_hline" x1="0" y1="0" x2="0" y2="${e-n.bottom}"
            stroke="${s.accent}" stroke-width="1" stroke-dasharray="3 2" opacity="0"
            style="pointer-events:none;"/>
      <circle id="${_}_hdot" cx="0" cy="0" r="5"
              fill="${s.accent}" stroke="${s.bg}" stroke-width="2"
              opacity="0" style="pointer-events:none;"/>

      <!-- X labels -->
      ${k}
    </svg>

    <!-- Hover tooltip -->
    <div id="${_}_tip" style="
      display:none;position:absolute;
      background:${s.raised};border:1px solid ${s.border};
      border-radius:8px;padding:6px 10px;font-size:11px;
      color:${s.text};font-family:Inter,sans-serif;
      box-shadow:-2px -2px 6px rgba(255,255,255,0.8),2px 2px 8px rgba(0,0,0,0.1);
      pointer-events:none;white-space:nowrap;z-index:10;
    "></div>`;function at(v){let b=v.getElementById(_),$=v.getElementById(`${_}_hline`),E=v.getElementById(`${_}_hdot`),w=v.getElementById(`${_}_tip`);if(!b||!$||!E||!w)return;let I=b.parentElement;I&&(I.style.position="relative"),b.addEventListener("mousemove",st=>{let D=b.getBoundingClientRect(),rt=(st.clientX-D.left)/D.width*t,ot=Math.max(n.left,Math.min(t-n.right,rt)),nt=Math.round((ot-n.left)/c*(a.length-1)),q=Math.max(0,Math.min(a.length-1,nt)),H=a[q],L=l(q),U=u(H.price);$.setAttribute("x1",L.toFixed(1)),$.setAttribute("x2",L.toFixed(1)),$.setAttribute("opacity","0.7"),E.setAttribute("cx",L.toFixed(1)),E.setAttribute("cy",U.toFixed(1)),E.setAttribute("opacity","1");let dt=new Date(H.scraped_at).toLocaleDateString("en-BD",{month:"short",day:"numeric",year:"numeric"});w.innerHTML=`<span style="color:${s.dim}">${dt}</span>&nbsp;&nbsp;<strong style="color:${s.accent}">${y(H.price)}</strong>`,w.style.display="block";let ct=L/t*D.width+(L>t*.65?-(180+8):12),lt=U/e*D.height-16;w.style.left=`${ct}px`,w.style.top=`${lt}px`}),b.addEventListener("mouseleave",()=>{$.setAttribute("opacity","0"),E.setAttribute("opacity","0"),w.style.display="none"})}return{svg:it,initInteractivity:at}}var kt=`
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
    border: 1px solid ${s.border};
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(28, 25, 23, 0.12);
    overflow: hidden;
    line-height: 1.4;
    font-size: 13px;
    color: ${s.text};
    position: relative;
  }

  .dk-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px;
    border-bottom: 1px solid ${s.border};
  }

  .dk-brand { display: flex; align-items: center; gap: 10px; }

  .dk-brand-name {
    font-family: 'Rubik', sans-serif;
    font-size: 16px;
    font-weight: 800;
    background: linear-gradient(135deg, ${s.text}, ${s.accent});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }

  .dk-brand-tag { 
    font-family: 'Rubik', sans-serif;
    font-size: 9px; 
    color: ${s.dim}; 
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
    background: ${s.border};
  }

  .dk-stat {
    background: rgba(255, 255, 255, 0.2);
    padding: 12px 10px;
    text-align: center;
  }

  .dk-stat-label {
    font-family: 'Rubik', sans-serif;
    font-size: 9px;
    color: ${s.dim};
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .dk-stat-value {
    font-family: 'Rubik', sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: ${s.text};
  }

  .dk-rec {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
    border-bottom: 1px solid ${s.border};
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
    background: ${s.accent};
    color: white;
    box-shadow: 0 4px 12px rgba(161, 98, 7, 0.3);
  }

  .dk-chart-inner {
    background: ${s.inset};
    border: 1px solid ${s.border};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-alt-item {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid ${s.border};
    border-radius: 12px;
    padding: 12px;
    transition: var(--dk-transition);
  }

  .dk-alt-item:hover {
    background: rgba(255, 255, 255, 0.6);
    transform: translateX(4px);
    border-color: ${s.accent};
  }

  .dk-coupon-card {
    background: rgba(255, 255, 255, 0.2);
    border: 1px dashed ${s.accent};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-coupon-code {
    font-family: 'Inter', monospace;
    font-weight: 800;
    color: ${s.accent};
    font-size: 14px;
    background: rgba(161, 98, 7, 0.08);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .dk-alert-btn, .dk-submit-btn, .dk-coupon-copy {
    background: ${s.primary};
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'Rubik', sans-serif;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .dk-skel {
  .dk-skel-footer { display:flex; justify-content:space-between; gap:10px; }
  .dk-skel-foot-l { height:22px; flex:1; border-radius:6px; }
  .dk-skel-btn    { height:30px; width:90px; border-radius:8px; }
`;function ft(i){return!i||i.length===0?"":`
    <div class="dk-divider"></div>
    <div class="dk-coupons">
      <div class="dk-coupon-title">\u{1F3F7}\uFE0F Available Coupons</div>
      <div class="dk-coupon-list">${i.map((e,a)=>{let r=e.min_spend?`Min spend: \u09F3${(e.min_spend/100).toFixed(0)}`:"No minimum spend",d=e.expires_at?`\xB7 Expires ${new Date(e.expires_at).toLocaleDateString("en-BD",{month:"short",day:"numeric"})}`:"";return`
      <div class="dk-coupon-card">
        <div class="dk-coupon-left">
          <div class="dk-coupon-code">${e.code}</div>
          <div class="dk-coupon-meta">${r}${d}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="dk-coupon-badge">${e.display_discount}</div>
          <button class="dk-coupon-copy" data-dk-copy="${e.code}" id="dkcp_${a}">Copy</button>
        </div>
      </div>`}).join("")}</div>
    </div>`}function yt(i){i.querySelectorAll("[data-dk-copy]").forEach(t=>{t.addEventListener("click",async()=>{let e=t.dataset.dkCopy;try{await navigator.clipboard.writeText(e),t.textContent="\u2705 Copied!",t.classList.add("copied"),setTimeout(()=>{t.textContent="Copy",t.classList.remove("copied")},2e3)}catch{t.textContent=e,t.select?.()}})})}function bt(){return`
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
    </div>`}function xt(i){let t=ht(i),a=Math.PI*24,r=a*(1-i/10);return`
    <svg width="58" height="36" viewBox="0 0 58 36" style="overflow:visible;">
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="${t}"
            stroke-width="4.5" stroke-linecap="round"
            stroke-dasharray="${a}" stroke-dashoffset="${r}"
            style="filter:drop-shadow(0 0 4px ${t});transition:stroke-dashoffset 0.9s cubic-bezier(.34,1.56,.64,1);"/>
      <text x="29" y="29" text-anchor="middle" fill="${t}"
            font-size="13" font-weight="900" font-family="Inter,sans-serif">${i}</text>
      <text x="29" y="35" text-anchor="middle" fill="${s.dim}"
            font-size="6.5" font-family="Inter,sans-serif">/10</text>
    </svg>`}function $t(i,t){let e=F[i.label]||F.INSUFFICIENT_DATA;if(!e.rec)return"";if(e.rec==="buy"){let a=t>0?`You save <strong style="color:${s.success}">${t}%</strong> vs the 30-day average.`:"This is at or below its typical price.";return`
      <div class="dk-rec">
        <div class="dk-rec-icon">\u{1F7E2}</div>
        <div>
          <div class="dk-rec-title" style="color:${s.success}">Good Time to Buy</div>
          <div class="dk-rec-sub">${a} ${i.explanation}</div>
        </div>
      </div>`}else return`
      <div class="dk-rec">
        <div class="dk-rec-icon">\u23F3</div>
        <div>
          <div class="dk-rec-title" style="color:${s.warn}">Consider Waiting</div>
          <div class="dk-rec-sub">${i.explanation}</div>
        </div>
      </div>`}function wt(i){return!i||i.length===0?"":`
    <div class="dk-divider" style="margin-bottom:12px;"></div>
    <div class="dk-alts">
      <div class="dk-alts-title">\u{1F50D} Look-alike Deals</div>
      <div class="dk-alt-list" id="dk-alt-list">${i.slice(0,3).map(e=>{let a=e.image_url?`<img class="dk-alt-img" src="${e.image_url}" alt="" loading="lazy"/>`:`<img class="dk-alt-img" src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="background:#fff;object-fit:contain;padding:4px;" />`,r=e.savings>0?`<span class="dk-alt-save">Save ${y(e.savings)}</span>`:"";return`
      <div class="dk-alt-item" data-url="${e.url}">
        ${a}
        <div class="dk-alt-info">
          <div class="dk-alt-name">${e.title}</div>
          <div>
            <span class="dk-alt-price">${y(e.current_price)}</span>
            ${r}
          </div>
        </div>
        <div class="dk-alt-arrow">\u203A</div>
      </div>`}).join("")}</div>
    </div>`}function _t(i,t,e,a,r=[]){let{product:d,verdict:o}=i,m=F[o.label]||F.INSUFFICIENT_DATA,n=m.color,c=o.avg_30d&&d.current_price&&o.avg_30d>d.current_price?Math.round((o.avg_30d-d.current_price)/o.avg_30d*100):0,p=i.price_history||[];return`
  <div id="dkw">

    <!-- Top bar -->
    <div class="dk-bar">
      <div class="dk-brand">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="height:20px;filter:drop-shadow(0 0 6px rgba(108,99,255,0.3));" />
        <span class="dk-brand-name">DamKoi</span>
        <span class="dk-brand-tag">Price Intel</span>
      </div>
      <div class="dk-bar-right">
        <span class="dk-verdict-pill" style="color:${n};background:${m.bg};">
          ${m.icon} ${m.label}
        </span>
        ${xt(o.deal_score)}
      </div>
    </div>

    <!-- Recommendation card -->
    ${$t(o,c)}

    <!-- Price stats (4 tiles) -->
    <div class="dk-stats">
      ${[["Current",y(d.current_price),s.accent],["30-Day Avg",o.avg_30d?y(o.avg_30d):"\u2014",s.text],["All-Time Low",o.all_time_low?y(o.all_time_low):"\u2014",s.success],["Highest Ever",o.all_time_high?y(o.all_time_high):`${p.length>0?y(Math.max(...p.map(l=>l.price))):"\u2014"}`,s.muted]].map(([l,u,g])=>`
        <div class="dk-stat">
          <div class="dk-stat-label">${l}</div>
          <div class="dk-stat-value" style="color:${g};">${u}</div>
          ${l==="30-Day Avg"&&c>0?`<div style="font-size:9px;color:${s.success};margin-top:2px;font-weight:600;">\u2193${c}% savings</div>`:'<div style="height:12px;"></div>'}
        </div>
      `).join("")}
    </div>

    <!-- Chart -->
    <div class="dk-chart-section">
      <div class="dk-chart-header">
        <span class="dk-chart-title">\u{1F4C8} Price History</span>
        <div class="dk-range-tabs">
          ${["1M","3M","ALL"].map(l=>`<button class="dk-range-tab${l===a?" active":""}" data-range="${l}">${l}</button>`).join("")}
        </div>
      </div>
      <div class="dk-chart-inner" id="dk-chart-inner">
        ${e.svg}
      </div>
      <div class="dk-chart-legend">
        <span><span class="dk-legend-dot" style="background:${s.accent};"></span>Price line</span>
        <span><span class="dk-legend-dot" style="background:${s.success};"></span>All-time low</span>
        <span><span class="dk-legend-dot" style="background:${s.accent};filter:drop-shadow(0 0 3px ${s.accent});"></span>Now &nbsp; ${p.length} data points</span>
      </div>
    </div>

    <!-- Look-alike alternatives -->
    ${t?wt(t):'<div class="dk-divider"></div><div class="dk-loading"><span class="dk-spinner"></span>Loading similar products\u2026</div>'}

    <!-- Coupons -->
    ${ft(r)}

    <!-- Footer: explanation + alert CTA -->
    <div class="dk-footer">
      <p class="dk-explanation">${o.explanation}</p>
      <button class="dk-alert-btn" id="dk-alert-btn">\u{1F514} Alert me</button>
    </div>

    <!-- Alert form (hidden) -->
    <div class="dk-alert-form" id="dk-alert-form">
      <div class="dk-alert-row">
        <input class="dk-input" type="email" id="dk-email" placeholder="your@email.com" autocomplete="email"/>
        <input class="dk-input dk-input-narrow" type="number" id="dk-target"
               placeholder="Target \u09F3"
               value="${o.avg_30d?Math.floor(o.avg_30d/100*.92):""}"/>
        <button class="dk-submit-btn" id="dk-submit">Set</button>
      </div>
      <div class="dk-status" id="dk-status"></div>
    </div>

  </div>`}function Z(i,t){if(!i||i.length===0||t==="ALL")return i;let e=t==="1M"?30:90,a=Date.now()-e*864e5,r=i.filter(d=>new Date(d.scraped_at).getTime()>=a);return r.length>=2?r:i}function Et(i,t,e,a,r=[]){yt(i),i.querySelectorAll(".dk-range-tab").forEach(n=>{n.addEventListener("click",()=>{let c=n.dataset.range;if(c===a)return;a=c;let p=Z(t.price_history||[],c),l=M(p,460,130),u=i.getElementById("dk-chart-inner");u&&(u.innerHTML=l.svg,l.initInteractivity(i)),i.querySelectorAll(".dk-range-tab").forEach(g=>g.classList.toggle("active",g.dataset.range===c))})});let d=i.getElementById("dk-alert-btn"),o=i.getElementById("dk-alert-form");d?.addEventListener("click",()=>{let n=o.style.display!=="none";o.style.display=n?"none":"block",d.textContent=n?"\u{1F514} Alert me":"\u2715 Cancel"}),i.getElementById("dk-submit")?.addEventListener("click",async()=>{let n=i.getElementById("dk-email")?.value?.trim(),c=parseFloat(i.getElementById("dk-target")?.value||"0"),p=i.getElementById("dk-status"),l=i.getElementById("dk-submit"),u=(g,h)=>{p.textContent=g,p.style.color=h};if(!n||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n))return u("Enter a valid email address.",s.danger);if(!c||c<=0)return u("Enter a valid target price.",s.danger);l.disabled=!0,u("Setting alert\u2026",s.muted);try{await S("CREATE_ALERT",{payload:{product_id:t.product.id,target_price:Math.round(c*100),email:n,channel:"email"}}),u(`\u2705 Alert set! We'll email you when price drops to \u09F3${c.toLocaleString("en-BD")}.`,s.success),d.textContent="\u2705 Alert set"}catch{u("Failed to set alert \u2014 please try again.",s.danger)}finally{l.disabled=!1}}),i.getElementById("dk-alt-list")?.addEventListener("click",n=>{let c=n.target.closest("[data-url]");c?.dataset?.url&&(window.location.href=c.dataset.url)})}function St(){for(let i of vt){let t=document.querySelector(i);if(t)return t}return null}async function Q(i){document.getElementById(Y)?.remove();let t=St();if(!t){console.warn("[DamKoi] No injection target found");return}let e=document.createElement("div");e.id=Y;let a=e.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=kt,a.appendChild(r);let d=document.createElement("div");a.appendChild(d),t.insertAdjacentElement("afterend",e),d.innerHTML=bt();let o="3M",m=Z(i.price_history||[],o),n=M(m,460,130);await new Promise(h=>requestAnimationFrame(h));let c=i.product.id,[p,l]=await Promise.allSettled([fetch(`${N}/products/${c}/alternatives`).then(h=>h.ok?h.json():[]),fetch(`${N}/products/${c}/coupons`).then(h=>h.ok?h.json():[])]),u=p.status==="fulfilled"?p.value||[]:[],g=l.status==="fulfilled"?l.value||[]:[];d.style.transition="opacity 0.25s ease",d.style.opacity="0",await new Promise(h=>setTimeout(h,120)),d.innerHTML=_t(i,u,M(m,460,130),o,g),M(m,460,130).initInteractivity(a),Et(a,i,u,o,g),d.style.opacity="1"}var K=class{constructor(){this.data=null,this.sidebar=null,this.currentTab="summary",this.alternativesCache=null,this.alertFormState={}}async init(){if(this.platform=this.detectPlatform(),!!this.platform){if(this.platform==="daraz-checkout"||this.platform==="pickaboo-checkout"){console.log("[DamKoi] Checkout detected. Launching coupon magic..."),this.initCouponMagic();return}console.log(`[DamKoi] Content script starting on ${this.platform}...`),this.data=await this.fetchData(window.location.href),this.data&&!this.data.notTracked&&(await this.enrichPriceHistory(),Q(this.data)),this.renderSidebar()}}async enrichPriceHistory(){if(this.data?.product?.id)try{let t=await S("FETCH_HISTORY",{productId:this.data.product.id,days:90});this.data.price_history=t.prices||[]}catch(t){console.warn("[DamKoi] Could not fetch history:",t),this.data.price_history=[]}}detectPlatform(){let{hostname:t,href:e}=window.location;return t.includes("daraz.com.bd")?e.includes("cart.daraz.com.bd")||e.includes("checkout.daraz.com.bd")?"daraz-checkout":/daraz\.com\.bd\/.*i\d+-s\d+/i.test(e)||e.includes("daraz.com.bd/products/")?"daraz":null:t.includes("cartup.com.bd")?e.includes("/products/")?"cartup":null:t.includes("rokomari.com")?/\/book\/\d+/.test(e)?"rokomari":null:t.includes("pickaboo.com")?e.includes("pickaboo.com/checkout/")?"pickaboo-checkout":e.includes("/product/")?"pickaboo":null:t.includes("chaldal.com")?e.includes("/p/")||e.split("/").length>3?"chaldal":null:t.includes("othoba.com")&&e.includes("/product/")?"othoba":null}async fetchData(t){try{let e=z("product",t),a=P(e);if(a)return console.log("[DamKoi] Loaded from cache:",t),a;let r=await S("FETCH_VERDICT",{url:t});return R(e,r),r}catch(e){return console.error("[DamKoi] Fetch failed:",e),{notTracked:!0,connectionError:!e.message?.startsWith("404")}}}async initCouponMagic(){let t=document.createElement("div");t.id="damkoi-coupon-widget",t.innerHTML=`
      <div style="background: rgba(10,10,12,0.95); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 16px; width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); backdrop-filter: blur(12px); color: white; font-family: system-ui, sans-serif; z-index: 999999; position: fixed; bottom: 20px; right: 20px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width: 20px; height: 20px;" />
          <span style="font-weight: 800; font-size: 14px;">DamKoi Magic</span>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 0 0 16px 0; line-height: 1.4;">
          We found active coupons. Do you want to test them all to find the best discount?
        </p>
        <button id="dk-apply-btn" style="width: 100%; background: #6366f1; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s;">
          Auto-Apply Coupons
        </button>
      </div>
    `,document.body.appendChild(t),document.getElementById("dk-apply-btn").onclick=async()=>{let e=document.getElementById("dk-apply-btn");e.innerText="Testing Coupons...",e.style.background="#4f46e5",e.style.opacity="0.7",e.disabled=!0;try{let a=await S("FETCH_COUPONS",{});if(!a||a.length===0){e.innerText="No valid coupons found";return}let r=window.location.hostname.includes("daraz"),d=r?".next-input.next-medium input":".coupon-input-field",o=r?".next-btn.next-btn-primary.next-btn-medium":".apply-coupon-btn",m=0,n=null;for(let c=0;c<a.length;c++){let p=a[c];e.innerText=`Testing ${p.code} (${c+1}/${a.length})`;let l=document.querySelector(d),u=document.querySelector(o);if(l&&u){l.value=p.code,l.dispatchEvent(new Event("input",{bubbles:!0})),l.dispatchEvent(new Event("change",{bubbles:!0})),u.click(),await new Promise(T=>setTimeout(T,2e3));let g=r?".checkout-order-total-discount":".order-summary .discount-amount",h=document.querySelector(g);if(h){let k=h.innerText.match(/[\d,]+/);if(k){let f=parseInt(k[0].replace(/,/g,""));f>m&&(m=f,n=p.code)}}}}if(n){e.innerText=`Applying best code: ${n}`;let c=document.querySelector(d),p=document.querySelector(o);c&&p&&(c.value=n,c.dispatchEvent(new Event("input",{bubbles:!0})),p.click(),await new Promise(l=>setTimeout(l,1e3))),e.innerText=`Saved \u09F3${m}!`,e.style.background="#10b981"}else e.innerText="No coupons worked \u{1F614}",e.style.background="#3f3f46"}catch(a){console.error(a),e.innerText="Error trying coupons"}}}renderSidebar(){this.sidebar&&this.sidebar.remove(),this.sidebar=document.createElement("div"),this.sidebar.id="damkoi-sidebar",this.sidebar.innerHTML=`
      <nav class="damkoi-nav">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width:28px;height:28px;margin-bottom:20px;opacity:0.9;" />
        <div class="damkoi-nav-item active" data-tab="summary">${x.summary}</div>
        <div class="damkoi-nav-item" data-tab="history">${x.history}</div>
        <div class="damkoi-nav-item" data-tab="alternatives">${x.alternatives}</div>
        <div class="damkoi-nav-item" data-tab="alerts">${x.alerts}</div>
      </nav>
      <main class="damkoi-main">
        <header class="damkoi-header">
          <span class="damkoi-logo">DamKoi</span>
          <div class="damkoi-close" title="Click to collapse">${x.close}</div>
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
    `,document.body.appendChild(this.sidebar),this.setupEvents(),this.data&&!this.data.notTracked?this.switchTab("summary"):this.data&&this.switchTab("summary")}setupEvents(){this.sidebar.querySelector(".damkoi-close").onclick=()=>{this.sidebar.classList.toggle("collapsed")},this.sidebar.querySelectorAll(".damkoi-nav-item").forEach(t=>{t.onclick=e=>{let a=this.sidebar.classList.contains("collapsed");this.switchTab(t.dataset.tab),a?this.sidebar.classList.remove("collapsed"):(this.currentTab,t.dataset.tab)}})}switchTab(t){if(this.currentTab===t&&!this.sidebar?.classList.contains("collapsed"))return;this.currentTab=t,this.sidebar.querySelectorAll(".damkoi-nav-item").forEach(r=>{r.classList.toggle("active",r.dataset.tab===t)});let e=this.sidebar.querySelector("#damkoi-content");e.innerHTML="";let a=document.createElement("div");if(a.className="damkoi-section active",e.appendChild(a),!this.data||this.data.notTracked){this.renderNotTracked(a,t);return}switch(t){case"summary":this.renderSummary(a);break;case"history":this.renderHistory(a);break;case"alternatives":this.renderAlternatives(a);break;case"alerts":this.renderAlerts(a);break}}renderNotTracked(t,e){if(this.data?.connectionError){t.innerHTML=`
        <h3>Connection Error</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          Could not reach DamKoi servers. Check your internet connection and try refreshing the page.
        </p>
      `;return}e==="history"?t.innerHTML=`
        <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${x.history}</span> Price History</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          No price history available yet. We are tracking this item starting today.
        </p>
      `:e==="alternatives"?t.innerHTML=`
        <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${x.alternatives}</span> Alternatives</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          Searching for similar deals... This will populate once our system analyzes the product.
        </p>
      `:e==="alerts"?t.innerHTML=`
        <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${x.alerts}</span> Price Alerts</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          You can set target price alerts once the initial price data is gathered. Check back soon!
        </p>
      `:t.innerHTML=`
        <h3>Getting Started</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          This product is not fully tracked yet. We've added it to our next scrape batch.
        </p>
        <div class="damkoi-card">
          <p style="font-size: 13px; color: var(--dk-text); font-weight: 600;">Check back in about 15-30 minutes for a full price drop history and verdict.</p>
        </div>
      `}renderSummary(t){let{verdict:e,product:a}=this.data,d={FAKE_DISCOUNT:"verdict-fake",BEST_PRICE:"verdict-best",GOOD_DEAL:"verdict-good",FAIR_PRICE:"verdict-fair",INSUFFICIENT_DATA:"verdict-pending"}[e.label]||"verdict-fair";t.innerHTML=`
      <div class="damkoi-card damkoi-score-card" style="margin-bottom:12px;">
        <div id="damkoi-gauge"></div>
      </div>
      <div class="damkoi-card" style="margin-bottom:12px;">
        <span class="verdict-badge ${d}">${e.display}</span>
        <p style="font-size:11px;color:rgba(226,226,240,0.55);line-height:1.6;margin-top:4px;">${e.explanation}</p>
      </div>
      <div class="damkoi-price-grid">
        <div class="damkoi-price-item">
          <div class="damkoi-label">Current Price</div>
          <div class="damkoi-value accent">\u09F3${(a.current_price/100).toLocaleString("en-BD")}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">30-Day Avg</div>
          <div class="damkoi-value">\u09F3${e.avg_30d?(e.avg_30d/100).toLocaleString("en-BD"):"\u2014"}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">All-Time Low</div>
          <div class="damkoi-value success">\u09F3${e.all_time_low?(e.all_time_low/100).toLocaleString("en-BD"):"\u2014"}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">Confidence</div>
          <div class="damkoi-value">${e.data_points||"\u2014"} pts</div>
        </div>
      </div>
    `,j.renderDealGauge(e.deal_score,"damkoi-gauge")}renderHistory(t){t.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${x.history}</span> Price Trend</h3>
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
    `,j.renderPriceChart(this.data.price_history,"damkoi-sparkline")}renderAlternatives(t){t.innerHTML=`<h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${x.alternatives}</span> Look-Alike Deals</h3><div id="damkoi-alternatives-list">Loading...</div>`,this.alternativesCache?this.displayAlternatives(t,this.alternativesCache):this.fetchAlternatives(t)}async fetchAlternatives(t){let e=t.querySelector("#damkoi-alternatives-list");try{let a=z("alternatives",this.data.product.id),r=P(a);if(r){this.alternativesCache=r,this.displayAlternatives(t,r);return}let o=(await S("FETCH_ALTERNATIVES",{productId:this.data.product.id})).alternatives||[];this.alternativesCache=o,R(a,o),this.displayAlternatives(t,o)}catch{e.innerHTML='<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to load alternatives.</div>'}}displayAlternatives(t,e){let a=t.querySelector("#damkoi-alternatives-list"),r=e.filter(o=>!o.is_original_request);if(r.length===0){a.innerHTML='<div style="padding:20px;text-align:center;color:var(--dk-dim);">No cheaper alternatives in this category yet.</div>';return}let d=this.data.product.current_price;a.innerHTML=r.map((o,m)=>{let n=d&&o.current_price?d-o.current_price:0;return`
      <div class="damkoi-card" style="margin-bottom:10px;display:flex;gap:12px;cursor:pointer;" data-alt-url="${o.url}" data-alt-idx="${m}">
        ${o.image_url?`<img src="${o.image_url}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;box-shadow:var(--dk-insetSh);" />`:`<img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width:46px;height:46px;border-radius:8px;background:#fff;object-fit:contain;padding:6px;box-shadow:var(--dk-insetSh);flex-shrink:0;" />`}
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:var(--dk-accent);">${o.platform}</span>
          </div>
          <div style="font-size:11px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--dk-text);margin-bottom:4px;">${o.title}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:800;color:var(--dk-text);">${y(o.current_price)}</span>
            ${n>0?`<span style="font-size:10px;background:rgba(16,185,129,0.1);color:var(--dk-success);padding:2px 7px;border-radius:10px;font-weight:600;">Save ${y(n)}</span>`:""}
          </div>
        </div>
      </div>
    `}).join(""),a.addEventListener("click",o=>{let m=o.target.closest("[data-alt-url]");m&&(window.location.href=m.dataset.altUrl)})}renderAlerts(t){let e=Math.floor(this.data.product.current_price/100*.9),a=this.alertFormState.email||"",r=this.alertFormState.price||e;t.innerHTML=`
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${x.alerts}</span> Set Price Alert</h3>
      <p style="margin: 8px 0 20px; font-size: 12px; color: rgba(255,255,255,0.4);">
        Get an email the instant this product drops below your target.
      </p>
      <input type="email" id="alert-email" class="damkoi-input" placeholder="Your email address" value="${a}" />
      <div style="position: relative;">
        <span style="position: absolute; left: 16px; top: 12px; font-weight: 700; color: #a78bfa;">\u09F3</span>
        <input type="number" id="alert-price" class="damkoi-input" style="padding-left: 35px;" placeholder="Target Price" value="${r}" />
      </div>
      <button class="damkoi-btn" id="save-alert">Update Alert</button>
      <div id="alert-status" class="damkoi-status-pill"></div>
    `;let d=t.querySelector("#save-alert"),o=t.querySelector("#alert-email"),m=t.querySelector("#alert-price");d.replaceWith(d.cloneNode(!0)),t.querySelector("#save-alert").addEventListener("click",async()=>{let c=o.value.trim(),p=m.value.trim(),l=t.querySelector("#alert-status");if(!J(c)){A(l,"error","Enter a valid email address");return}if(!X(p)){A(l,"error","Enter a valid price");return}this.alertFormState={email:c,price:p},A(l,"info","Saving...");try{let u=V(this.data.product.id,p,c);await S("CREATE_ALERT",{payload:u}),A(l,"success","Tracking active!")}catch{A(l,"error","Error saving alert")}})}},tt=new K;document.readyState==="complete"?tt.init():window.addEventListener("load",()=>tt.init());})();
