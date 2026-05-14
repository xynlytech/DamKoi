(()=>{var Z=Object.defineProperty;var L=(e,t)=>()=>(e&&(t=e(e=0)),t);var Q=(e,t)=>{for(var o in t)Z(e,o,{get:t[o],enumerable:!0})};async function f(e,t={}){return new Promise((o,n)=>{chrome.runtime.sendMessage({type:e,...t},r=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):r&&r.success?o(r.data):n(new Error(r?.error||"Unknown error"))})})}function N(e,t){return`damkoi:${e}:${t}`}function F(e){try{let t=localStorage.getItem(e);if(!t)return null;let{data:o,timestamp:n}=JSON.parse(t);return Date.now()-n>oe?(localStorage.removeItem(e),null):o}catch(t){return console.warn("[DamKoi Cache] Failed to read cache:",t),null}}function O(e,t){try{localStorage.setItem(e,JSON.stringify({data:t,timestamp:Date.now()}))}catch(o){console.warn("[DamKoi Cache] Failed to save cache:",o)}}function re(){try{let e=localStorage.getItem(M);return e?JSON.parse(e):[]}catch(e){return console.warn("[DamKoi] Failed to read recent verdicts:",e),[]}}function H(e){try{let o=re().filter(r=>r.product_id!==e.product_id),n=[e,...o].slice(0,ne);localStorage.setItem(M,JSON.stringify(n))}catch(t){console.warn("[DamKoi] Failed to add recent verdict:",t)}}function K(e,t){try{let o=JSON.parse(localStorage.getItem(P)||"{}");o[e]={duration:t,timestamp:Date.now()},localStorage.setItem(P,JSON.stringify(o))}catch(o){console.warn("[DamKoi Perf] Failed to record metric:",o)}}function U(e){return e>=8?"#10b981":e>=6?"#f59e0b":e>=4?"#ef4444":"#dc2626"}function y(e){return e>=8?"score-green":e>=6?"score-amber":"score-red"}function u(e){return e?`\u09F3${(e/100).toLocaleString("en-BD")}`:"\u2014"}function z(e,t,o,n=[te]){return{product_id:e,target_price:parseInt(t)*100,email:o.trim(),notify_via:n}}function E(e,t,o){if(!e)return;let n=t==="success",r=t==="info";e.textContent=o,e.classList.remove("dk-status-success","dk-status-error","dk-status-info"),n?e.classList.add("dk-status-success"):r?e.classList.add("dk-status-info"):e.classList.add("dk-status-error")}function V(e){return e&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())}function G(e){let t=parseInt(e);return!isNaN(t)&&t>0}var C,R,ee,te,oe,ne,M,P,_=L(()=>{C="https://api.damkoi.com",R="https://damkoi.xynly.com";ee={EMAIL:"email",SMS:"sms",PUSH:"push"},te=ee.EMAIL,oe=60*60*1e3,ne=10,M="damkoi:recent-verdicts";P="damkoi:perf-metrics"});var A={};Q(A,{default:()=>he});var fe,he,D=L(()=>{_();fe={renderDealGauge(e,t){let o=document.getElementById(t);if(!o)return;let r=Math.min(Math.max(e,0),10)/10,i=U(e),a=Math.PI*40,s=a*(1-r);o.innerHTML=`
      <div class="damkoi-gauge-container">
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
            stroke-linecap="round" />
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="${i}"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="${a}"
            stroke-dashoffset="${s}"
            class="damkoi-gauge-fill" />
        </svg>
        <div class="damkoi-gauge-value ${y(e)}">${e}</div>
        <div class="damkoi-gauge-label">Deal Score</div>
      </div>
    `},renderPriceChart(e,t){let o=document.getElementById(t);if(!o||!e||e.length<2){o.innerHTML='<div class="damkoi-no-data">Not enough data for chart</div>';return}let n=[...e].sort((l,g)=>new Date(l.scraped_at)-new Date(g.scraped_at)),r=n.map(l=>l.price),i=Math.min(...r)*.95,a=Math.max(...r)*1.05-i,s=280,d=120,p=10,w=s-p*2,$=d-p*2,h=n.map((l,g)=>{let W=p+g*(w/(n.length-1)),X=p+($-(l.price-i)/a*$);return{x:W,y:X}}),B=h.map((l,g)=>`${g===0?"M":"L"} ${l.x} ${l.y}`).join(" "),q=`${B} L ${h[h.length-1].x} ${d-p} L ${h[0].x} ${d-p} Z`;o.innerHTML=`
      <div class="damkoi-chart-container">
        <svg width="${s}" height="${d}" viewBox="0 0 ${s} ${d}">
          <defs>
            <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgba(167, 139, 250, 0.4)" stop-opacity="1" />
              <stop offset="100%" stop-color="rgba(167, 139, 250, 0)" stop-opacity="1" />
            </linearGradient>
          </defs>
          <path d="${q}" fill="url(#chart-grad)" />
          <path d="${B}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Tooltip dots for each point (hidden by default) -->
          ${h.map((l,g)=>`
            <circle cx="${l.x}" cy="${l.y}" r="3" fill="#fff" class="damkoi-chart-dot" opacity="${g===h.length-1?1:0}">
              <title>${new Date(n[g].scraped_at).toLocaleDateString()}: ${u(n[g].price)}</title>
            </circle>
          `).join("")}
        </svg>
      </div>
    `}},he=fe});_();function b(e,t){return new Promise(o=>{chrome.storage.local.set({[e]:t},o)})}_();var ae=['input[placeholder*="oupon" i]','input[name*="coupon" i]','input[id*="coupon" i]','[data-spm*="coupon"] input',".coupon-input input","#coupon-code"],ce=['button[data-spm*="coupon"]','button[class*="coupon"]',".coupon-apply button",'button[id*="couponApply"]'],ie=['[class*="couponSuccess"]','[class*="discount-applied"]',".coupon-success",'[data-spm*="couponSuccess"]'],se=['[class*="couponError"]','[class*="coupon-invalid"]',".coupon-error"],de=3,le=1500;function x(e){for(let t of e){let o=document.querySelector(t);if(o)return o}return null}function ue(e=3e3){return new Promise(t=>{let o=Date.now()+e,n=setInterval(()=>{if(x(ie)){clearInterval(n),t(!0);return}(x(se)||Date.now()>o)&&(clearInterval(n),t(!1))},200)})}function me(e,t="success"){let o=document.getElementById("damkoi-coupon-toast");o&&o.remove();let n=document.createElement("div");n.id="damkoi-coupon-toast",n.style.cssText=`
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: ${t==="success"?"#10b981":"#6366f1"};
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px; font-weight: 700;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: damkoi-slide-in 0.3s ease;
  `,n.textContent=e;let r=document.createElement("style");r.textContent=`
    @keyframes damkoi-slide-in {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `,document.head.appendChild(r),document.body.appendChild(n),setTimeout(()=>n.remove(),5e3)}function pe(e){let t=document.getElementById("damkoi-copy-toast");t&&t.remove();let o=document.createElement("div");o.id="damkoi-copy-toast",o.style.cssText=`
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `,o.innerHTML=`
    <div style="font-weight:700;margin-bottom:6px;">DamKoi found a coupon!</div>
    <div style="font-family:monospace;font-size:15px;letter-spacing:0.1em;">${e}</div>
    <button id="damkoi-copy-btn" style="
      margin-top:8px; background:#6366f1; color:white; border:none;
      padding:6px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;
    ">Copy code</button>
  `,document.body.appendChild(o),document.getElementById("damkoi-copy-btn")?.addEventListener("click",()=>{navigator.clipboard.writeText(e).catch(()=>{}),o.remove()}),setTimeout(()=>o.remove(),1e4)}async function ge(e,t,o){return e.focus(),e.value=o,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),await new Promise(n=>setTimeout(n,300)),t.click(),ue(3e3)}async function k(e,t){let o=x(ae),n=x(ce);if(!o||!n){console.log("[DamKoi] Coupon input/button not found on this page.");return}let r;try{r=await f("FETCH_COUPONS",{platform:e,cartTotal:t})}catch{return}if(!r||r.length===0)return;let i=!1,c=0,a="";for(let s=0;s<Math.min(de,r.length);s++){let d=r[s]?.code;if(!d)continue;let p=await ge(o,n,d);if(chrome.runtime.sendMessage({type:"LOG_COUPON",payload:{platform:e,coupon_code:d,cart_total:t,savings:p?r[s]?.discount_amount??0:0,success:p}}),p){i=!0,c=r[s]?.discount_amount??0,a=d;break}await new Promise(w=>setTimeout(w,le))}i&&c>0?me(`\u2713 DamKoi saved you \u09F3${(c/100).toLocaleString("en-BD")} with ${a}`):!i&&r[0]?.code&&pe(r[0].code)}var v=document.getElementById("loading-state"),j=document.getElementById("not-daraz-state"),T=document.getElementById("verdict-state"),S=document.getElementById("error-state"),Y=document.getElementById("optin-modal"),Ee=Date.now();function I(e){let t=Date.now()-Ee;K(`popup_${e}`,t),console.log(`[DamKoi] ${e}: ${t}ms`)}function m(e){[v,j,T,S,Y].forEach(t=>t?.classList.add("hidden")),e?.classList.remove("hidden")}async function ye(){try{let[e]=await chrome.tabs.query({active:!0,currentWindow:!0});if(!(e?.url&&(e.url.includes("daraz.com.bd/products/")||/daraz\.com\.bd\/.*i\d+-s\d+/i.test(e.url)||e.url.includes("cartup.com.bd/products/")||e.url.includes("rokomari.com/book/")||e.url.includes("pickaboo.com/product/")||/chaldal\.com\/.+\/.+/.test(e.url)||e.url.includes("othoba.com/product/")))){m(j),Ie(),I("not-daraz");return}m(v);let o=N("product",e.url),n=F(o),r=!1;if(n)r=!0,console.log("[DamKoi Popup] Loaded from cache (< 50ms expected)");else{let i=Date.now(),c=await fetch(`${C}/v1/products/lookup?url=${encodeURIComponent(e.url)}`);if(console.log(`[DamKoi] API fetch: ${Date.now()-i}ms, status: ${c.status}`),c.status===404){m(T),document.getElementById("product-title").textContent="Product not yet tracked";let a=document.getElementById("verdict-badge");a.textContent="TRACKING STARTING",a.classList.add("text-orange"),document.getElementById("deal-score").textContent="",document.getElementById("verdict-explanation").textContent="This product will be picked up in our next scrape cycle. Check back in an hour!",document.querySelector(".price-grid").classList.add("hidden"),I("fetch-not-found");return}if(!c.ok)throw new Error(`API error ${c.status}`);n=await c.json(),O(o,n)}J(n,r),I(r?"render-cached":"render-fresh")}catch(e){console.error("[DamKoi Popup]",e),m(S),document.getElementById("error-message").textContent="Could not connect to DamKoi. Please try again.",I("error")}}function J(e,t=!1){m(T);let{product:o,verdict:n}=e;document.getElementById("product-title").textContent=o.title;let r={FAKE_DISCOUNT:"fake",BEST_PRICE:"best",GOOD_DEAL:"good",FAIR_PRICE:"fair",INSUFFICIENT_DATA:"pending"},i=document.getElementById("verdict-badge");if(i.textContent=n.display,i.className=`verdict-badge ${r[n.label]||"fair"}`,document.getElementById("current-price").textContent=u(o.current_price),document.getElementById("avg-price").textContent=u(n.avg_30d),document.getElementById("lowest-price").textContent=u(n.all_time_low),document.getElementById("verdict-explanation").textContent=n.explanation,document.getElementById("history-link").href=`${R}/product/${o.id}`,Promise.resolve().then(()=>(D(),A)).then(({default:c})=>{c.renderDealGauge(n.deal_score,"deal-gauge")}).catch(()=>{let c=document.getElementById("deal-gauge");c.innerHTML=`<div class="gauge-plain">${n.deal_score}<span class="gauge-plain-sub">/10</span></div>`,c.querySelector(".gauge-plain").classList.add(y(n.deal_score))}),H({product_id:o.id,title:o.title,url:window.location.href,verdict_label:n.label,deal_score:n.deal_score,timestamp:Date.now()}),Se(o),chrome.runtime.sendMessage({type:"UPDATE_BADGE",score:n.deal_score}),t){let c=document.getElementById("product-title"),a=document.createElement("span");a.className="cache-badge",a.textContent="cached",c.appendChild(a)}ve(o.id),_e(o.id),xe(o.id)}async function ve(e){try{let t=await f("FETCH_HISTORY",{productId:e,days:30});if(!t.prices||t.prices.length<2)return;let{default:o}=await Promise.resolve().then(()=>(D(),A));document.getElementById("price-chart-container").classList.remove("hidden"),o.renderPriceChart(t.prices,"price-chart-container")}catch(t){console.warn("[DamKoi] Chart load failed:",t)}}async function _e(e){try{let t=await f("FETCH_ALTERNATIVES",{productId:e});if(!t||t.length===0)return;let o=document.getElementById("alternatives-section"),n=document.getElementById("alternatives-list");o.classList.remove("hidden"),n.innerHTML=t.map(r=>`
      <a href="${r.url}" target="_blank" class="alternative-item">
        ${r.image_url?`<img src="${r.image_url}" alt="" class="alt-image" />`:'<img src="icons/dk_logo.svg" alt="" class="alt-image alt-image-logo" />'}
        <div class="alt-info">
          <div class="alt-title">${r.title.slice(0,50)}${r.title.length>50?"\u2026":""}</div>
          <div class="alt-price">${u(r.current_price)}
            <span class="alt-savings">Save ${u(r.savings)}</span>
          </div>
        </div>
        <div class="alt-score-val ${y(r.deal_score)}">${r.deal_score}/10</div>
      </a>
    `).join("")}catch(t){console.warn("[DamKoi] Alternatives load failed:",t)}}async function xe(e){try{let t=await f("FETCH_COMPARE",{productId:e}),o=(t?.alternatives||[]).filter(a=>!a.is_original_request);if(o.length===0)return;let n=document.getElementById("compare-section"),r=document.getElementById("compare-list");n.classList.remove("hidden");let i=o.filter(a=>a.current_price!=null).sort((a,s)=>a.current_price-s.current_price).slice(0,3),c=t.alternatives.find(a=>a.is_original_request);r.innerHTML=i.map(a=>{let s=c?.current_price!=null?a.current_price-c.current_price:null,d=s!==null?`<span class="${s<0?"alt-savings":"alt-more"}">${s<0?"Save "+u(Math.abs(s)):"+"+u(s)}</span>`:"";return`
        <a href="${a.url}" target="_blank" class="alternative-item">
          ${a.image_url?`<img src="${a.image_url}" alt="" class="alt-image" />`:'<img src="icons/dk_logo.svg" alt="" class="alt-image alt-image-logo" />'}
          <div class="alt-info">
            <div class="alt-platform">${a.platform}</div>
            <div class="alt-price">${u(a.current_price)} ${d}</div>
          </div>
        </a>
      `}).join("")}catch(t){console.warn("[DamKoi] Compare load failed:",t)}}function Ie(){let e=document.getElementById("url-input"),t=document.getElementById("url-submit");t?.addEventListener("click",async()=>{let o=e?.value?.trim();if(!(o&&(o.includes("daraz.com.bd")||o.includes("cartup.com.bd")||o.includes("rokomari.com")||o.includes("pickaboo.com")||o.includes("chaldal.com")||o.includes("othoba.com")))){e.classList.add("border-danger");return}m(v);try{let r=await fetch(`${C}/v1/products/lookup?url=${encodeURIComponent(o)}`);if(r.status===404){m(S),document.getElementById("error-message").textContent="Product not found or not yet tracked.";return}if(!r.ok)throw new Error(`API error ${r.status}`);J(await r.json())}catch{m(S),document.getElementById("error-message").textContent="Could not reach DamKoi. Check your connection."}}),e?.addEventListener("keydown",o=>{o.key==="Enter"&&t?.click()})}function Se(e){let t=document.getElementById("set-alert"),o=document.getElementById("alert-price"),n=document.getElementById("alert-email"),r=document.getElementById("alert-status");t?.addEventListener("click",async()=>{let i=n?.value?.trim(),c=o?.value?.trim();if(!V(i)){E(r,"error","Enter a valid email address");return}if(!G(c)){E(r,"error","Enter a valid price");return}E(r,"info","Setting alert...");try{let a=z(e.id,c,i);await f("CREATE_ALERT",{payload:a}),E(r,"success",`Alert set! We'll email ${i}`),o.value="",n.value=""}catch(a){E(r,"error",a.message)}})}function we(e,t){m(Y),document.getElementById("optin-yes")?.addEventListener("click",async()=>{await b("coupon_optin","always"),m(v),await k(e,t),window.close()},{once:!0}),document.getElementById("optin-once")?.addEventListener("click",async()=>{m(v),await k(e,t),window.close()},{once:!0}),document.getElementById("optin-no")?.addEventListener("click",async()=>{await b("coupon_optin","no"),window.close()},{once:!0})}chrome.runtime.onMessage.addListener(e=>{e.type==="CART_DETECTED"&&we(e.platform,e.cartTotal)});document.addEventListener("DOMContentLoaded",ye);})();
