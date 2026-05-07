(()=>{function m(t){return new Promise(e=>{chrome.storage.local.get([t],o=>{e(o[t]??null)})})}async function f(t,e={}){return new Promise((o,n)=>{chrome.runtime.sendMessage({type:t,...e},r=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):r&&r.success?o(r.data):n(new Error(r?.error||"Unknown error"))})})}var S={EMAIL:"email",SMS:"sms",PUSH:"push"},O=S.EMAIL,N=60*60*1e3;var _=['input[placeholder*="oupon" i]','input[name*="coupon" i]','input[id*="coupon" i]','[data-spm*="coupon"] input',".coupon-input input","#coupon-code"],y=['button[data-spm*="coupon"]','button[class*="coupon"]',".coupon-apply button",'button[id*="couponApply"]'],E=['[class*="couponSuccess"]','[class*="discount-applied"]',".coupon-success",'[data-spm*="couponSuccess"]'],w=['[class*="couponError"]','[class*="coupon-invalid"]',".coupon-error"],C=3,b=1500;function s(t){for(let e of t){let o=document.querySelector(e);if(o)return o}return null}function v(t=3e3){return new Promise(e=>{let o=Date.now()+t,n=setInterval(()=>{if(s(E)){clearInterval(n),e(!0);return}(s(w)||Date.now()>o)&&(clearInterval(n),e(!1))},200)})}function T(t,e="success"){let o=document.getElementById("damkoi-coupon-toast");o&&o.remove();let n=document.createElement("div");n.id="damkoi-coupon-toast",n.style.cssText=`
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: ${e==="success"?"#10b981":"#6366f1"};
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px; font-weight: 700;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: damkoi-slide-in 0.3s ease;
  `,n.textContent=t;let r=document.createElement("style");r.textContent=`
    @keyframes damkoi-slide-in {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `,document.head.appendChild(r),document.body.appendChild(n),setTimeout(()=>n.remove(),5e3)}function A(t){let e=document.getElementById("damkoi-copy-toast");e&&e.remove();let o=document.createElement("div");o.id="damkoi-copy-toast",o.style.cssText=`
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `,o.innerHTML=`
    <div style="font-weight:700;margin-bottom:6px;">DamKoi found a coupon!</div>
    <div style="font-family:monospace;font-size:15px;letter-spacing:0.1em;">${t}</div>
    <button id="damkoi-copy-btn" style="
      margin-top:8px; background:#6366f1; color:white; border:none;
      padding:6px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;
    ">Copy code</button>
  `,document.body.appendChild(o),document.getElementById("damkoi-copy-btn")?.addEventListener("click",()=>{navigator.clipboard.writeText(t).catch(()=>{}),o.remove()}),setTimeout(()=>o.remove(),1e4)}async function I(t,e,o){return t.focus(),t.value=o,t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})),await new Promise(n=>setTimeout(n,300)),e.click(),v(3e3)}async function g(t,e){let o=s(_),n=s(y);if(!o||!n){console.log("[DamKoi] Coupon input/button not found on this page.");return}let r;try{r=await f("FETCH_COUPONS",{platform:t,cartTotal:e})}catch{return}if(!r||r.length===0)return;let i=!1,u=0,p="";for(let a=0;a<Math.min(C,r.length);a++){let c=r[a]?.code;if(!c)continue;let d=await I(o,n,c);if(chrome.runtime.sendMessage({type:"LOG_COUPON",payload:{platform:t,coupon_code:c,cart_total:e,savings:d?r[a]?.discount_amount??0:0,success:d}}),d){i=!0,u=r[a]?.discount_amount??0,p=c;break}await new Promise(x=>setTimeout(x,b))}i&&u>0?T(`\u2713 DamKoi saved you \u09F3${(u/100).toLocaleString("en-BD")} with ${p}`):!i&&r[0]?.code&&A(r[0].code)}var D=/\/(checkout|cart)\//i,P=['[data-spm="totalPrice"]',".checkout-order-summary__price--total",".cart-summary__total","#cart-total",'[class*="totalPrice"]','[class*="orderTotal"]'];function k(){for(let t of P){let e=document.querySelector(t);if(!e)continue;let o=e.textContent.replace(/[^\d.]/g,""),n=parseFloat(o);if(!isNaN(n)&&n>0)return Math.round(n*100)}return null}function h(){return D.test(window.location.pathname)}async function l(){let t=await m("coupon_optin");if(t==="no")return;let e=k();t==="yes"||t==="always"?await g("daraz",e):chrome.runtime.sendMessage({type:"CART_DETECTED",platform:"daraz",cartTotal:e,url:window.location.href})}function L(){if(!h())return;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",l,{once:!0}):l();let t=window.location.pathname;new MutationObserver(()=>{window.location.pathname!==t&&(t=window.location.pathname,h()&&l())}).observe(document.body,{childList:!0,subtree:!0})}L();})();
