/**
 * Runs before hydration. One-time bust of broken App Shell service workers that
 * served /~offline for every navigation (React #418). Keeps utility-pdf-* caches.
 */
export const SW_RECOVERY_SCRIPT = `(function(){
  var VER="2026-09-05-sw-nav";
  var KEY="utility-sw-bust";
  function clearAndReload(){
    var tasks=[];
    try{
      if("serviceWorker" in navigator){
        tasks.push(navigator.serviceWorker.getRegistrations().then(function(rs){
          return Promise.all(rs.map(function(r){return r.unregister();}));
        }));
      }
      if("caches" in window){
        tasks.push(caches.keys().then(function(ks){
          return Promise.all(ks.filter(function(k){
            return k!=="utility-pdf-v2" && k.indexOf("utility-pdf")!==0;
          }).map(function(k){return caches.delete(k);}));
        }));
      }
    }catch(e){}
    Promise.all(tasks).then(function(){location.reload();}).catch(function(){location.reload();});
  }
  function run(){
    try{
      if(localStorage.getItem(KEY)===VER){
        var h1=document.querySelector("h1");
        if(navigator.onLine && h1 && (h1.textContent||"").trim()==="You're Offline"){
          clearAndReload();
        }
        return;
      }
      localStorage.setItem(KEY,VER);
      if(!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.getRegistrations().then(function(rs){
        if(!rs.length && !navigator.serviceWorker.controller) return;
        clearAndReload();
      }).catch(function(){});
    }catch(e){}
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",run);
  }else{
    run();
  }
})();`;
