(function () {
  var carousels = document.querySelectorAll('.carousel');
  if (!carousels.length) return;

  var dialog = null, dImg, dVid, dCount, dState = null;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ensureDialog(labels) {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'viewer';
    dialog.setAttribute('aria-label', labels.enlarge);
    dialog.innerHTML =
      '<button type="button" class="v-close" aria-label="' + labels.close + '">×</button>' +
      '<button type="button" class="v-prev" aria-label="' + labels.prev + '">←</button>' +
      '<img alt="">' +
      '<video controls playsinline loop hidden></video>' +
      '<button type="button" class="v-next" aria-label="' + labels.next + '">→</button>' +
      '<p class="v-count" aria-live="polite"></p>';
    document.body.appendChild(dialog);
    dImg = dialog.querySelector('img');
    dVid = dialog.querySelector('video');
    dCount = dialog.querySelector('.v-count');
    dialog.querySelector('.v-close').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('.v-prev').addEventListener('click', function () { dState.go(-1); });
    dialog.querySelector('.v-next').addEventListener('click', function () { dState.go(1); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { dState.go(-1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { dState.go(1); e.preventDefault(); }
    });
    dialog.addEventListener('close', function () {
      dVid.pause(); dVid.removeAttribute('src'); dVid.load();
      if (dState) { dState.stage.focus(); dState.show(); }
    });
  }

  function syncViewer(state) {
    var slide = state.slides[state.i];
    var clip = slide.querySelector('video');
    if (clip) {
      dImg.hidden = true; dImg.removeAttribute('src');
      dVid.hidden = false;
      dVid.src = clip.getAttribute('src');
      dVid.poster = clip.getAttribute('poster') || '';
      dVid.muted = true;
      dVid.play().catch(function () {});
    } else {
      var src = slide.querySelector('img');
      dVid.pause(); dVid.hidden = true; dVid.removeAttribute('src'); dVid.load();
      dImg.hidden = false;
      dImg.src = src.getAttribute('src');
      dImg.alt = src.alt;
    }
    dCount.textContent = (state.i + 1) + ' ' + state.labels.of + ' ' + state.slides.length;
  }

  carousels.forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll('figure'));
    if (slides.length < 2) return;
    var labels = {
      prev: root.dataset.prev, next: root.dataset.next, enlarge: root.dataset.enlarge,
      close: root.dataset.close, of: root.dataset.of
    };
    var state = { i: 0, slides: slides, labels: labels };
    var track = root.querySelector('.car-slides');
    slides.forEach(function (s) { var v = s.querySelector('video'); if (v) v.removeAttribute('controls'); });
    root.classList.add('js');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-roledescription', 'carousel');

    var row = document.createElement('div');
    row.className = 'car-row';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'car-arrow'; prev.textContent = '←'; prev.setAttribute('aria-label', labels.prev);
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'car-arrow'; next.textContent = '→'; next.setAttribute('aria-label', labels.next);
    var count = document.createElement('span');
    count.className = 'car-count'; count.setAttribute('aria-live', 'polite');
    var mid = document.createElement('div');
    mid.className = 'car-mid';
    var dots = document.createElement('div');
    dots.className = 'car-dots';
    var dotEls = slides.map(function (s, n) {
      var d = document.createElement('button');
      d.type = 'button'; d.className = 'car-dot';
      d.setAttribute('aria-label', (n + 1) + ' ' + labels.of + ' ' + slides.length);
      d.addEventListener('click', function () { state.i = n; show(); });
      dots.appendChild(d);
      return d;
    });
    mid.appendChild(dots); mid.appendChild(count);
    root.insertBefore(row, track);
    row.appendChild(prev); row.appendChild(track); row.appendChild(next);
    root.appendChild(mid);

    track.tabIndex = 0;
    state.stage = track;

    function show() {
      slides.forEach(function (s, n) {
        var on = n === state.i;
        s.hidden = !on;
        s.setAttribute('aria-label', (n + 1) + ' ' + labels.of + ' ' + slides.length);
        var im = s.querySelector('img');
        if (im && Math.abs(n - state.i) <= 1) im.loading = 'eager';
        var vd = s.querySelector('video');
        if (vd) {
          if (on && !reduceMotion && !(dialog && dialog.open && dState === state)) vd.play().catch(function () {});
          else vd.pause();
        }
      });
      count.textContent = (state.i + 1) + ' ' + labels.of + ' ' + slides.length;
      dotEls.forEach(function (d, n) { d.setAttribute('aria-current', n === state.i ? 'true' : 'false'); });
      if (dialog && dialog.open && dState === state) syncViewer(state);
    }
    state.show = show;
    state.go = function (d) {
      state.i = (state.i + d + slides.length) % slides.length;
      show();
    };

    prev.addEventListener('click', function () { state.go(-1); });
    next.addEventListener('click', function () { state.go(1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { state.go(-1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { state.go(1); e.preventDefault(); }
    });

    var startX = null;
    track.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    track.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX; startX = null;
      if (Math.abs(dx) > 50) { state.go(dx < 0 ? 1 : -1); state.swiped = true; }
    });

    slides.forEach(function (s) {
      var a = s.querySelector('a');
      if (!a) return;
      a.setAttribute('aria-label', labels.enlarge);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (state.swiped) { state.swiped = false; return; }
        ensureDialog(labels);
        dState = state;
        syncViewer(state);
        if (typeof dialog.showModal === 'function') dialog.showModal();
      });
    });

    show();
  });
})();
