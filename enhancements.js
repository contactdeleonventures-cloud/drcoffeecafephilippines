/* Customer-side only: no request/payment is submitted or stored. */
(function(){
  'use strict';
  var $=function(q,r){return (r||document).querySelector(q);};
  var $$=function(q,r){return Array.from((r||document).querySelectorAll(q));};
  var norm=function(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();};
  var search=$('#menuSearch');
  function filterMenu(){
    var term=norm(search.value.trim()),count=0,best=$('#bestBtn').getAttribute('aria-pressed')==='true';
    $$('#menuCols .cat').forEach(function(cat){var visible=0;
      $$('tbody tr',cat).forEach(function(row){var match=norm(row.cells[0].textContent).includes(term);row.hidden=!match;var shown=match&&(!best||row.classList.contains('bs'));if(shown){count++;visible++;}});
      cat.hidden=visible===0;
    });
    $$('.shelf-grid figure.drink').forEach(function(card){card.hidden=!norm(card.textContent).includes(term);});
    $('#menuSearchStatus').textContent=term||best?count+' menu item'+(count===1?'':'s')+' found'+(count===0?' — try another name or clear the filters.':'.'):'';
  }
  search.addEventListener('input',filterMenu);
  $('#clearMenu').onclick=function(){search.value='';if($('#bestBtn').getAttribute('aria-pressed')==='true')$('#bestBtn').click();filterMenu();search.focus();};
  $('#bestBtn').addEventListener('click',filterMenu);
  $$('.shelf-f').forEach(function(el){el.addEventListener('click',function(){setTimeout(filterMenu,0);});});
  // Keep the deep links and page focus useful when moving between hash views.
  window.addEventListener('hashchange',function(){filterMenu();var hash=location.hash;
    if(/^#(?:menu|rooms|customer-service|cebu-main|casa-mira|jamestown)(?:-|$)/.test(hash))(function(){var h=$('.view:not([hidden]) h1');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}})();
  });
})();
