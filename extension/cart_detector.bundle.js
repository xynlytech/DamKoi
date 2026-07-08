(()=>{function p(e){return new Promise(t=>{chrome.storage.local.get([e],o=>{t(o[e]??null)})})}async function f(e,t={}){return new Promise((o,n)=>{chrome.runtime.sendMessage({type:e,...t},r=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):r&&r.success?o(r.data):n(new Error(r?.error||"Unknown error"))})})}var x={EMAIL:"email",SMS:"sms",PUSH:"push"},N=x.EMAIL,O=60*60*1e3;var _=['input[placeholder*="oupon" i]','input[name*="coupon" i]','input[id*="coupon" i]','[data-spm*="coupon"] input',".coupon-input input","#coupon-code"],y=['button[data-spm*="coupon"]','button[class*="coupon"]',".coupon-apply button",'button[id*="couponApply"]'],E=['[class*="couponSuccess"]','[class*="discount-applied"]',".coupon-success",'[data-spm*="couponSuccess"]'],S=['[class*="couponError"]','[class*="coupon-invalid"]',".coupon-error"],b=3,v=1500;function i(e){for(let t of e){let o=document.querySelector(t);if(o)return o}return null}function C(e=3e3){return new Promise(t=>{let o=Date.now()+e,n=setInterval(()=>{if(i(E)){clearInterval(n),t(!0);return}(i(S)||Date.now()>o)&&(clearInterval(n),t(!1))},200)})}function A(e,t="success"){let o=document.getElementById("damkoi-coupon-toast");o&&o.remove();let n=document.createElement("div");n.id="damkoi-coupon-toast",n.style.cssText=`
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
  `,document.head.appendChild(r),document.body.appendChild(n),setTimeout(()=>n.remove(),5e3)}function P(e){let t=document.getElementById("damkoi-copy-toast");t&&t.remove();let o=document.createElement("div");o.id="damkoi-copy-toast",o.style.cssText=`
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
  `,document.body.appendChild(o),document.getElementById("damkoi-copy-btn")?.addEventListener("click",()=>{navigator.clipboard.writeText(e).catch(()=>{}),o.remove()}),setTimeout(()=>o.remove(),1e4)}async function T(e,t,o){return e.focus(),e.value=o,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),await new Promise(n=>setTimeout(n,300)),t.click(),C(3e3)}async function g(e,t){let o=i(_),n=i(y);if(!o||!n){console.log("[DamKoi] Coupon input/button not found on this page.");return}let r;try{r=await f("FETCH_COUPONS",{platform:e,cartTotal:t})}catch{return}if(!r||r.length===0)return;let s=!1,u=0,m="";for(let a=0;a<Math.min(b,r.length);a++){let c=r[a]?.code;if(!c)continue;let l=await T(o,n,c);if(chrome.runtime.sendMessage({type:"LOG_COUPON",payload:{platform:e,coupon_code:c,cart_total:t,savings:l?r[a]?.discount_amount??0:0,success:l}}),l){s=!0,u=r[a]?.discount_amount??0,m=c;break}await new Promise(w=>setTimeout(w,v))}s&&u>0?A(`\u2713 DamKoi saved you \u09F3${(u/100).toLocaleString("en-BD")} with ${m}`):!s&&r[0]?.code&&P(r[0].code)}var I=/\/(checkout|cart)\//i,D=['[data-spm="totalPrice"]',".checkout-order-summary__price--total",".cart-summary__total","#cart-total",'[class*="totalPrice"]','[class*="orderTotal"]'];function k(){for(let e of D){let t=document.querySelector(e);if(!t)continue;let o=t.textContent.replace(/[^\d.]/g,""),n=parseFloat(o);if(!isNaN(n)&&n>0)return Math.round(n*100)}return null}function h(){return I.test(window.location.pathname)}async function d(){let e=await p("coupon_optin");if(e==="no")return;let t=k();e==="yes"||e==="always"?await g("daraz",t):chrome.runtime.sendMessage({type:"CART_DETECTED",platform:"daraz",cartTotal:t,url:window.location.href})}function R(){if(!h())return;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d,{once:!0}):d();let e=window.location.pathname;new MutationObserver(()=>{window.location.pathname!==e&&(e=window.location.pathname,h()&&d())}).observe(document.body,{childList:!0,subtree:!0})}R();})();
