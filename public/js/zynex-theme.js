// Dominio canónico: unificar sesiones en www.zynexapp.com
(function(){
  if(location.hostname==='litper-semaforo.vercel.app'){
    location.replace('https://www.zynexapp.com'+location.pathname+location.search+location.hash);
  }
})();
// ═══ ZYNEX THEME — toggle día/noche unificado (clave compartida 'lp-theme') ═══
(function(){
  var KEY='lp-theme';
  function apply(light){
    document.body.classList.toggle('light', light);
    var b=document.getElementById('zx-theme-btn');
    if(b) b.textContent = light ? '☀️' : '🌙';
    var d=document.querySelector('[onclick="toggleTheme()"]');
    if(d) d.textContent = light ? '☀️' : '🌙';
  }
  function current(){ return localStorage.getItem(KEY)==='light'; }
  window.zxToggleTheme=function(){
    var light=!current();
    localStorage.setItem(KEY, light?'light':'dark');
    apply(light);
  };
  function init(){
    // Si la página ya trae su propio botón (dashboard), no duplicar
    if(!document.querySelector('[onclick="toggleTheme()"]') && !document.getElementById('zx-theme-btn')){
      var btn=document.createElement('button');
      btn.id='zx-theme-btn'; btn.className='zx-theme-btn';
      btn.title='Modo día / noche'; btn.textContent='🌙';
      btn.onclick=window.zxToggleTheme;
      document.body.appendChild(btn);
    }
    apply(current());
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
