/* Current-pouch product previews. The source photos keep the full stand intact. */
(function (global) {
  'use strict';

  var FLAVORS = [
    {id: 'spanish-latte', name: 'Spanish Latte', c: ['#E2C7A3', '#CBA37A', '#A57C55']},
    {id: 'green-apple-yakult', name: 'Green Apple Yakult', c: ['#DCEA90', '#BCD34B', '#98B032']},
    {id: 'cold-brew', name: 'Cold Brew', c: ['#8C5B35', '#56341F', '#311D12']},
    {id: 'vietnamese', name: 'Vietnamese', c: ['#C69B70', '#A07046', '#7B502D']}
  ];

  function create(host, options) {
    var o = options || {};
    var flavors = FLAVORS;
    var byId = {};
    flavors.forEach(function (flavor) { byId[flavor.id] = flavor; });
    var frame = document.createElement('div');
    frame.className = 'stat-photo-frame';
    var fallback = document.createElement('p');
    fallback.className = 'stat-photo-fallback';
    fallback.textContent = 'Preview unavailable. Please try another flavour.';
    fallback.hidden = true;
    host.replaceChildren(frame, fallback);
    host.classList.add('stat-photo');
    host.classList.remove('live', 'grab');
    host.setAttribute('role', 'img');

    var media = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var requestedMotion = false;
    var inView = !('IntersectionObserver' in global);
    var destroyed = false;
    var requestId = 0;
    var current = null;
    var currentFlavor = null;
    var idle = null;
    var fades = [];
    var observer;
    var motionObserver;

    function mayMove() {
      return requestedMotion && inView && !destroyed && !document.hidden &&
        !(media && media.matches) && !document.documentElement.classList.contains('dc-reduced');
    }

    function finishFade() {
      fades.forEach(function (animation) { animation.cancel(); });
      fades = [];
      Array.from(frame.children).forEach(function (child) {
        if (child !== current) child.remove();
      });
      if (current) current.style.opacity = '1';
    }

    function syncMotion() {
      if (mayMove() && current && frame.animate) {
        if (!idle) {
          // A quiet camera-like movement of the whole preview, never a swinging stand.
          idle = frame.animate([
            {transform: 'translateY(0)'},
            {transform: 'translateY(-2px)'},
            {transform: 'translateY(0)'}
          ], {duration: 7000, iterations: Infinity, easing: 'ease-in-out'});
        }
      } else {
        if (idle) idle.cancel();
        idle = null;
        finishFade();
      }
    }

    function imageName(flavor) {
      return flavor.name + ' STAT Bag product preview: one pouch on the left hook of a chrome stand, with both hooks and the round base visible.';
    }

    function setFlavor(id, immediate) {
      var flavor = byId[id];
      if (!flavor || destroyed) return Promise.resolve(false);
      var token = ++requestId;
      if (currentFlavor && currentFlavor.id === id) {
        host.removeAttribute('aria-busy');
        return Promise.resolve(true);
      }
      host.setAttribute('aria-busy', 'true');
      var next = new Image();
      next.className = 'stat-photo-image';
      next.width = 1122;
      next.height = 1402;
      // The host is the accessible image, so a fading duplicate is never announced.
      next.alt = '';
      next.setAttribute('aria-hidden', 'true');
      next.draggable = false;
      next.decoding = 'async';
      var src = (o.assetBase || '/images/stat/') + flavor.id + '-2026-11-14.webp';

      return new Promise(function (resolve) {
        function fail() {
          if (token === requestId && !destroyed) {
            host.removeAttribute('aria-busy');
            if (!current) {
              fallback.hidden = false;
              host.setAttribute('aria-label', fallback.textContent);
            }
            host.dispatchEvent(new CustomEvent('statphotoerror', {
              bubbles: true,
              detail: {requestedFlavor: id, currentFlavor: currentFlavor && currentFlavor.id}
            }));
          }
          resolve(false);
        }

        next.onerror = fail;
        next.onload = async function () {
          try {
            if (next.decode) await next.decode();
          } catch (error) {
            if (!next.complete || !next.naturalWidth) { fail(); return; }
          }
          if (destroyed || token !== requestId) { resolve(false); return; }
          if (!next.naturalWidth) { fail(); return; }
          finishFade();
          var previous = current;
          current = next;
          currentFlavor = flavor;
          fallback.hidden = true;
          frame.appendChild(next);
          host.dataset.statFlavor = id;
          host.setAttribute('aria-label', imageName(flavor));
          host.removeAttribute('aria-busy');

          if (previous && !immediate && mayMove() && next.animate) {
            fades = [
              previous.animate([{opacity: 1}, {opacity: 0}], {duration: 420, fill: 'both', easing: 'ease-in-out'}),
              next.animate([{opacity: 0}, {opacity: 1}], {duration: 420, fill: 'both', easing: 'ease-in-out'})
            ];
            var thisFade = fades;
            Promise.all(thisFade.map(function (animation) {
              return animation.finished.catch(function () {});
            })).then(function () {
              if (fades === thisFade) finishFade();
            });
          } else {
            finishFade();
          }
          syncMotion();
          resolve(true);
        };
        next.src = src;
      });
    }

    if ('IntersectionObserver' in global) {
      observer = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        syncMotion();
      }, {threshold: 0});
      observer.observe(host);
    }
    if ('MutationObserver' in global) {
      motionObserver = new MutationObserver(syncMotion);
      motionObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
    }
    document.addEventListener('visibilitychange', syncMotion);
    if (media && media.addEventListener) media.addEventListener('change', syncMotion);

    var api = {
      element: frame,
      flavors: flavors,
      setFlavor: setFlavor,
      flavor: function () { return currentFlavor ? currentFlavor.id : null; },
      start: function () { requestedMotion = true; syncMotion(); },
      stop: function () { requestedMotion = false; syncMotion(); },
      still: function () { requestedMotion = false; syncMotion(); },
      // Compatibility with the old page intro. No retired checkboxes are rendered.
      drop: function () { syncMotion(); },
      tick: function () {},
      hideTick: function () {},
      destroy: function () {
        destroyed = true;
        ++requestId;
        syncMotion();
        if (observer) observer.disconnect();
        if (motionObserver) motionObserver.disconnect();
        document.removeEventListener('visibilitychange', syncMotion);
        if (media && media.removeEventListener) media.removeEventListener('change', syncMotion);
      }
    };
    api.ready = setFlavor(byId[o.flavor] ? o.flavor : flavors[0].id, true);
    return api;
  }

  global.DCStatPhoto = {create: create, flavors: FLAVORS};
})(window);
