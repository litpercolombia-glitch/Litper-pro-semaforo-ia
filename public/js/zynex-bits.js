// ═══ ZYNEX BITS — activador de efectos (port vanilla de ReactBits, MIT) ═══
(function(){
  function init(){
    // AURORA: fondo animado (solo si la página lo pide con data o clase contenedora)
    if(!document.querySelector('.zx-aurora')){
      var au=document.createElement('div'); au.className='zx-aurora';
      au.innerHTML='<i></i><i></i><i></i>';
      document.body.prepend(au);
    }

    // SPOTLIGHT: cards que iluminan donde está el mouse
    var spotSel=['.q','.card','.metric','.plan','.zx-card'];
    document.querySelectorAll(spotSel.join(',')).forEach(function(el){
      el.classList.add('zx-spot');
      el.addEventListener('mousemove',function(e){
        var r=el.getBoundingClientRect();
        el.style.setProperty('--mx',(e.clientX-r.left)+'px');
        el.style.setProperty('--my',(e.clientY-r.top)+'px');
      });
    });

    // TILT 3D en quick-cards del hero
    document.querySelectorAll('.q').forEach(function(el){
      el.classList.add('zx-tilt');
      el.addEventListener('mousemove',function(e){
        var r=el.getBoundingClientRect();
        var rx=((e.clientY-r.top)/r.height-.5)*-8;
        var ry=((e.clientX-r.left)/r.width-.5)*8;
        el.style.transform='perspective(700px) rotateX('+rx+'deg) rotateY('+ry+'deg) translateY(-2px)';
      });
      el.addEventListener('mouseleave',function(){el.style.transform='';});
    });

    // SHINY TEXT en el nombre Zyan del hero
    var em=document.querySelector('.hero h1 em');
    if(em) em.classList.add('zx-shiny');

    // ELECTRIC BORDER en el CTA principal
    var cta=document.querySelector('.newchat');
    if(cta) cta.classList.add('zx-electric');

    // COUNT UP: fila de stats bajo el subtítulo del hero
    var heroP=document.querySelector('.hero p');
    if(heroP && !document.querySelector('.zx-stats')){
      var stats=[[13,'Transportadoras'],[2300,'Ciudades'],[426,'Novedades'],[849,'Oficinas']];
      var row=document.createElement('div'); row.className='zx-stats';
      stats.forEach(function(s){
        var d=document.createElement('div'); d.className='zx-stat';
        d.innerHTML='<b data-n="'+s[0]+'">0</b><span>'+s[1]+'</span>';
        row.appendChild(d);
      });
      heroP.after(row);
      row.querySelectorAll('b').forEach(function(b){
        var target=+b.dataset.n, t0=null;
        function step(ts){
          if(!t0)t0=ts; var p=Math.min((ts-t0)/1200,1);
          b.textContent=Math.floor(target*(1-Math.pow(1-p,3))).toLocaleString('es-CO');
          if(p<1)requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }

    // FADE UP escalonado en cards visibles
    document.querySelectorAll('.q,.zx-stat').forEach(function(el,i){
      el.classList.add('zx-fade'); el.style.animationDelay=(i*70)+'ms';
    });

    // CLICK SPARK: chispas cian/magenta al hacer clic
    document.addEventListener('click',function(e){
      for(var i=0;i<7;i++){
        var s=document.createElement('div'); s.className='zx-spark';
        var a=(Math.PI*2/7)*i, d=22+Math.random()*16;
        s.style.left=e.clientX+'px'; s.style.top=e.clientY+'px';
        s.style.setProperty('--sx',Math.cos(a)*d+'px');
        s.style.setProperty('--sy',Math.sin(a)*d+'px');
        if(i%2)s.style.background='#E5199B';
        document.body.appendChild(s);
        setTimeout(function(el){return function(){el.remove();};}(s),520);
      }
    },{passive:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
