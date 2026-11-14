const grid = document.getElementById('roomGrid');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
function motionAllowed() {
    return !motionPreference.matches && !document.documentElement.classList.contains('dc-reduced');
}
function enhanceGallery(card) {
    const photo = card.querySelector('.room-main-photo');
    const thumbnails = Array.from(card.querySelectorAll('[data-room-photo]'));
    const thumbnailRow = card.querySelector('.room-thumbnails');
    if (!photo || !thumbnailRow || thumbnails.length < 2)
        return () => { };
    const controls = document.createElement('div');
    controls.className = 'room-tour-controls';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'room-tour-toggle';
    toggle.textContent = 'Play photo tour';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Play photo tour of ' + card.querySelector('h3')?.textContent);
    controls.append(toggle);
    thumbnailRow.append(controls);
    let timer;
    let playing = false;
    let advancing = false;
    let revision = 0;
    let outgoing;
    let fade;
    let zoom;
    function clearTransition() {
        revision += 1;
        fade?.cancel();
        outgoing?.remove();
        outgoing = undefined;
        zoom?.cancel();
    }
    function pause() {
        playing = false;
        clearTimeout(timer);
        zoom?.pause();
        toggle.textContent = 'Play photo tour';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'Play photo tour of ' + card.querySelector('h3')?.textContent);
        card.querySelector('.photo-count')?.setAttribute('aria-live', 'polite');
    }
    function animatePhoto() {
        zoom?.cancel();
        if (!motionAllowed() || !playing)
            return;
        zoom = photo.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }], { duration: 6500, easing: 'ease-in-out', fill: 'forwards' });
    }
    function scheduleNext() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (!playing || document.hidden || !motionAllowed()) {
                pause();
                return;
            }
            const current = thumbnails.findIndex(button => button.getAttribute('aria-pressed') === 'true');
            advancing = true;
            thumbnails[(current + 1) % thumbnails.length].click();
            advancing = false;
            scheduleNext();
        }, 6000);
    }
    function onToggle() {
        if (playing) {
            pause();
            return;
        }
        if (!motionAllowed())
            return;
        playing = true;
        toggle.textContent = 'Pause photo tour';
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'Pause photo tour of ' + card.querySelector('h3')?.textContent);
        card.querySelector('.photo-count')?.setAttribute('aria-live', 'off');
        animatePhoto();
        scheduleNext();
    }
    function onPhotoClick(event) {
        const button = event.target.closest('[data-room-photo]');
        if (!button)
            return;
        if (!advancing)
            pause();
        if (button.getAttribute('aria-pressed') === 'true')
            return;
        const previousTransform = getComputedStyle(photo).transform;
        clearTransition();
        if (!motionAllowed())
            return;
        // The existing gallery handler updates the real image and its accessible description.
        // Keep the previous angle visible until the replacement has decoded.
        const previous = photo.cloneNode();
        previous.classList.add('room-photo-outgoing');
        previous.alt = '';
        previous.setAttribute('aria-hidden', 'true');
        previous.removeAttribute('loading');
        previous.style.transform = previousTransform;
        photo.after(previous);
        outgoing = previous;
        const selectedRevision = revision;
        requestAnimationFrame(async () => {
            if (selectedRevision !== revision || !card.isConnected)
                return;
            try {
                await photo.decode();
            }
            catch {
                if (selectedRevision === revision)
                    clearTransition();
                return;
            }
            if (selectedRevision !== revision || !card.isConnected)
                return;
            fade = previous.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: 'ease-in-out' });
            fade.onfinish = () => previous.remove();
            animatePhoto();
        });
    }
    function onKeyboard(event) {
        const current = thumbnails.indexOf(event.target);
        if (current < 0 || !['ArrowLeft', 'ArrowRight'].includes(event.key))
            return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = thumbnails[(current + direction + thumbnails.length) % thumbnails.length];
        next.focus();
        next.click();
    }
    function onVisibility() {
        if (document.hidden)
            pause();
    }
    function onMotionPreference() {
        controls.hidden = !motionAllowed();
        if (!motionAllowed()) {
            pause();
            clearTransition();
        }
    }
    const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting)
            pause();
    }, { threshold: 0 });
    observer.observe(photo);
    toggle.addEventListener('click', onToggle);
    card.addEventListener('click', onPhotoClick, true);
    thumbnailRow.addEventListener('keydown', onKeyboard);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('hashchange', pause);
    motionPreference.addEventListener('change', onMotionPreference);
    onMotionPreference();
    return () => {
        pause();
        clearTransition();
        observer.disconnect();
        toggle.removeEventListener('click', onToggle);
        card.removeEventListener('click', onPhotoClick, true);
        thumbnailRow.removeEventListener('keydown', onKeyboard);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('hashchange', pause);
        motionPreference.removeEventListener('change', onMotionPreference);
        controls.remove();
    };
}
if (grid) {
    let cleanups = [];
    const refresh = () => {
        cleanups.forEach(cleanup => cleanup());
        cleanups = Array.from(grid.querySelectorAll('.space-card')).map(enhanceGallery);
        if (motionAllowed()) {
            grid.querySelectorAll('.space-card').forEach((card, index) => {
                card.style.setProperty('--motion-delay', `${index * 60}ms`);
                card.classList.add('motion-enter');
            });
        }
    };
    new MutationObserver(refresh).observe(grid, { childList: true });
    refresh();
}
export {};
