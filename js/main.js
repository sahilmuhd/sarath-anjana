(function(){
  "use strict";

  var CFG = window.WEDDING_CONFIG || {};
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hasGsap = typeof window.gsap !== 'undefined';
  if(!hasGsap) document.documentElement.classList.add('no-gsap');

  /* ---------------------------------------------------------
     0. FILL CONTENT FROM CONFIG
        data-cfg="path.to.value"      → text (arrays become lines)
        data-cfg-href="path.to.value" → href
  --------------------------------------------------------- */
  function getPath(path){
    return path.split('.').reduce(function(o, k){ return (o && o[k] !== undefined) ? o[k] : undefined; }, CFG);
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  document.querySelectorAll('[data-cfg]').forEach(function(el){
    var v = getPath(el.getAttribute('data-cfg'));
    if(v === undefined || v === null) return;
    if(Array.isArray(v)) el.innerHTML = v.map(escapeHtml).join('<br>');
    else el.textContent = v;
  });
  document.querySelectorAll('[data-cfg-href]').forEach(function(el){
    var v = getPath(el.getAttribute('data-cfg-href'));
    if(v) el.setAttribute('href', v);
  });

  /* ---------------------------------------------------------
     1. BACKGROUND MUSIC ENGINE
        - starts only after a user interaction
        - never plays at the same time as the intro video's sound
        - smooth fade in / out (Web Audio gain where available so
          fades also work on iPhone, where media .volume is fixed)
        - gentle loop: fade out → short pause → fade back in
  --------------------------------------------------------- */
  var M = CFG.music || {};
  var bgMusic = document.getElementById('bg-music');
  var musicToggle = document.getElementById('music-toggle');
  var TARGET_VOL = typeof M.volume === 'number' ? M.volume : 0.45;
  var FADE_IN = (M.fadeInSeconds || 2.5);
  var FADE_OUT = (M.fadeOutSeconds || 1.8);

  var music = {
    available: !!M.src,
    unlocked: false,
    wanted: false,      // the visitor wants music on (not muted)
    fadingOut: false,
    ctx: null, gain: null,
    rafId: 0, loopTimer: 0
  };

  if(music.available){
    bgMusic.src = M.src;
    bgMusic.addEventListener('error', function(){
      // file missing or unsupported → hide the control instead of showing a broken button
      music.available = false;
      musicToggle.classList.add('is-hidden');
      musicToggle.classList.remove('is-visible');
    });
  }

  function setupWebAudio(){
    if(music.ctx || location.protocol === 'file:') return;  // file:// would route silence
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    try{
      music.ctx = new AC();
      var srcNode = music.ctx.createMediaElementSource(bgMusic);
      music.gain = music.ctx.createGain();
      music.gain.gain.value = 0;
      srcNode.connect(music.gain);
      music.gain.connect(music.ctx.destination);
    }catch(e){ music.ctx = null; music.gain = null; }
  }

  /* Called inside the "Tap to Begin" gesture: lets the browser
     (especially iOS Safari) allow this element to play later. */
  function unlockMusic(){
    if(!music.available || music.unlocked) return;
    music.unlocked = true;
    setupWebAudio();
    if(music.ctx && music.ctx.state === 'suspended') music.ctx.resume();
  }

  function currentLevel(){
    return music.gain ? music.gain.gain.value : bgMusic.volume;
  }
  function rampTo(target, seconds, done){
    cancelAnimationFrame(music.rafId);
    if(music.gain && music.ctx){
      var g = music.gain.gain, now = music.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(target, now + seconds);
      if(done) setTimeout(done, seconds * 1000 + 30);
      return;
    }
    var from = bgMusic.volume, start = performance.now(), dur = seconds * 1000;
    (function step(t){
      var k = Math.min(1, (t - start) / dur);
      try{ bgMusic.volume = Math.max(0, Math.min(1, from + (target - from) * k)); }catch(e){}
      if(k < 1) music.rafId = requestAnimationFrame(step);
      else if(done) done();
    })(start);
  }

  function updateToggleUI(){
    var on = music.wanted && !bgMusic.paused;
    musicToggle.classList.toggle('is-muted', !on);
    musicToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    musicToggle.setAttribute('aria-label', on ? 'Mute music' : 'Play music');
  }

  function showToggle(){
    if(!music.available) return;
    musicToggle.classList.remove('is-hidden');
    musicToggle.classList.add('is-visible');
  }

  function playMusic(fromStart){
    if(!music.available) return;
    music.wanted = true;
    music.everStarted = true;
    if(fromStart){ try{ bgMusic.currentTime = 0; }catch(e){} }
    clearTimeout(music.loopTimer);
    if(music.ctx && music.ctx.state === 'suspended') music.ctx.resume();
    if(music.gain) music.gain.gain.value = 0; else { try{ bgMusic.volume = 0; }catch(e){} }
    music.fadingOut = false;
    var p = bgMusic.play();
    var ok = function(){ musicToggle.classList.remove('needs-tap'); rampTo(TARGET_VOL, FADE_IN); updateToggleUI(); };
    if(p && p.then){
      p.then(ok).catch(function(){
        // blocked by the browser — invite a tap on the music button
        music.wanted = false;
        musicToggle.classList.add('needs-tap');
        updateToggleUI();
      });
    } else ok();
  }

  function pauseMusic(byUser){
    if(byUser) music.wanted = false;
    clearTimeout(music.loopTimer);
    rampTo(0, 0.6, function(){ bgMusic.pause(); updateToggleUI(); });
  }

  if(music.available){
    bgMusic.addEventListener('timeupdate', function(){
      var d = bgMusic.duration;
      if(!M.loop || !d || isNaN(d) || music.fadingOut) return;
      if(d - bgMusic.currentTime <= FADE_OUT){
        music.fadingOut = true;
        rampTo(0, Math.max(0.2, d - bgMusic.currentTime));
      }
    });
    bgMusic.addEventListener('ended', function(){
      if(!M.loop || !music.wanted){ music.wanted = false; updateToggleUI(); return; }
      music.loopTimer = setTimeout(function(){
        if(!music.wanted) return;
        bgMusic.currentTime = 0;
        playMusic();
      }, (M.loopGapSeconds || 1.5) * 1000);
    });
    bgMusic.addEventListener('play', updateToggleUI);
    bgMusic.addEventListener('pause', updateToggleUI);

    musicToggle.addEventListener('click', function(){
      unlockMusic();
      if(music.wanted && !bgMusic.paused) pauseMusic(true);
      else playMusic();
    });

    // Pause quietly when the tab/app is hidden; resume if it was playing
    var resumeOnShow = false;
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){
        if(music.wanted && !bgMusic.paused){ resumeOnShow = true; bgMusic.pause(); }
      } else if(resumeOnShow){
        resumeOnShow = false;
        if(music.wanted) playMusic();
      }
    });
  }

  /* ---------------------------------------------------------
     2. TAP TO BEGIN → VIDEO → HERO TRANSITION
  --------------------------------------------------------- */
  var openingEl = document.getElementById('opening');
  var openingCover = document.getElementById('opening-cover');
  var video = document.getElementById('opening-video');
  var main = document.getElementById('main');
  var skipBtn = document.getElementById('skip-intro');
  var openBtn = document.getElementById('open-invitation-btn');
  var introDone = false;
  var videoStarted = false;
  var safetyTimer = 0;

  function endIntro(){
    if(introDone) return;
    introDone = true;
    clearTimeout(safetyTimer);
    skipBtn.classList.remove('is-active');
    openingEl.classList.add('is-fading');
    main.classList.add('is-visible');
    document.body.classList.remove('intro-active');
    triggerHero();
    video.pause();
    showToggle();
    // Music normally started on "Tap to Begin"; start it here only if that was blocked
    if(!music.everStarted) playMusic(true);
    setTimeout(function(){
      openingEl.style.display = 'none';
      if(window.ScrollTrigger) ScrollTrigger.refresh();
    }, 1500);
  }

  function startInvitation(){
    if(videoStarted) return;
    videoStarted = true;
    // The song starts from 0:00 right on the tap (a direct user gesture,
    // so it is allowed on Android and iPhone). The intro video plays
    // silently underneath so the two sounds never overlap.
    unlockMusic();
    showToggle();
    playMusic(true);

    openingCover.classList.add('is-hidden');
    skipBtn.classList.add('is-active');

    video.muted = true;
    var attempt = video.play();
    if(attempt && attempt.catch){
      attempt.catch(function(){ endIntro(); });
    }
  }

  openBtn.addEventListener('click', startInvitation);
  video.addEventListener('ended', endIntro);
  skipBtn.addEventListener('click', function(){ unlockMusic(); endIntro(); });
  video.addEventListener('error', function(){ if(videoStarted) endIntro(); });
  video.addEventListener('playing', function(){
    clearTimeout(safetyTimer);
    var d = (video.duration && isFinite(video.duration)) ? video.duration : 10;
    safetyTimer = setTimeout(endIntro, (d + 6) * 1000);   // never trap the visitor
  });

  /* ---------------------------------------------------------
     3. COUNTDOWN
  --------------------------------------------------------- */
  var weddingTarget = Date.parse((CFG.wedding && CFG.wedding.countdownTarget) || '2027-01-26T10:30:00+05:30');

  function pad(n){ return String(n).padStart(2,'0'); }
  function setFlipDigit(el, value){
    if(!el || el.textContent === value) return;
    el.textContent = value;
    var card = el.closest('.flip-card');
    if(card && !reduceMotion){
      card.classList.remove('is-flipping');
      void card.offsetWidth;
      card.classList.add('is-flipping');
    }
  }
  function updateCountdown(){
    var el = document.getElementById('countdown-wedding');
    if(!el || isNaN(weddingTarget)) return;
    var diff = Math.max(0, weddingTarget - Date.now());
    setFlipDigit(el.querySelector('[data-d]'), pad(Math.floor(diff / 86400000)));
    setFlipDigit(el.querySelector('[data-h]'), pad(Math.floor((diff % 86400000) / 3600000)));
    setFlipDigit(el.querySelector('[data-m]'), pad(Math.floor((diff % 3600000) / 60000)));
    setFlipDigit(el.querySelector('[data-s]'), pad(Math.floor((diff % 60000) / 1000)));
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------------------------------------------------------
     4. RSVP — only reports success when the endpoint confirms
        the response was saved.
  --------------------------------------------------------- */
  (function initRsvp(){
    var form = document.getElementById('rsvp-form');
    if(!form) return;
    var R = CFG.rsvp || {};
    var endpoint = (R.endpoint || '').trim();
    var maxGuests = R.maxGuests || 10;
    var note = document.getElementById('rsvp-setup-note');
    var submit = document.getElementById('rsvp-submit');
    var response = document.getElementById('rsvp-response');
    var guestsField = document.getElementById('guests-field');
    var guestsInput = document.getElementById('rsvp-guests');
    var nameInput = document.getElementById('rsvp-name');
    var radios = form.querySelectorAll('input[name="attendance"]');
    guestsInput.max = maxGuests;

    if(!endpoint){
      note.hidden = false;
      submit.disabled = true;
      submit.textContent = 'RSVP Not Yet Open';
    }

    function say(msg, isError){
      response.textContent = msg;
      response.classList.toggle('is-error', !!isError);
    }

    radios.forEach(function(r){
      r.addEventListener('change', function(){
        radios.forEach(function(x){ x.closest('.rsvp-btn').classList.toggle('is-checked', x.checked); });
        var declining = form.attendance.value === 'decline';
        guestsField.hidden = declining;
        guestsInput.disabled = declining;
      });
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!endpoint){ say('RSVP collection has not been set up yet, so your response was not sent.', true); return; }
      if(form.website.value) return; // bot

      var name = nameInput.value.trim();
      var attendance = form.attendance.value;
      var guests = parseInt(guestsInput.value, 10);
      nameInput.removeAttribute('aria-invalid'); guestsInput.removeAttribute('aria-invalid');

      if(!name){ nameInput.setAttribute('aria-invalid','true'); nameInput.focus(); say('Please enter your name.', true); return; }
      if(!attendance){ radios[0].focus(); say('Please choose whether you can attend.', true); return; }
      if(attendance === 'accept' && (!guests || guests < 1 || guests > maxGuests)){
        guestsInput.setAttribute('aria-invalid','true'); guestsInput.focus();
        say('Please enter a number of guests between 1 and ' + maxGuests + '.', true); return;
      }

      var data = new URLSearchParams();
      data.append('name', name);
      data.append('attendance', attendance);
      data.append('guests', attendance === 'accept' ? String(guests) : '0');
      data.append('wishes', form.wishes.value.trim());

      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = 'Sending…';
      say('');

      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var to = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 20000);

      fetch(endpoint, { method:'POST', body:data, signal: ctrl ? ctrl.signal : undefined })
        .then(function(res){ if(!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function(json){
          if(!json || json.result !== 'success') throw new Error((json && json.message) || 'Not saved');
          form.reset();
          radios.forEach(function(x){ x.closest('.rsvp-btn').classList.remove('is-checked'); });
          guestsField.hidden = false; guestsInput.disabled = false;
          say(attendance === 'accept'
            ? 'Thank you, ' + name + ' — your RSVP has been received. We can’t wait to celebrate with you.'
            : 'Thank you, ' + name + ', for letting us know. You will be missed.');
        })
        .catch(function(){
          say('Sorry, we couldn’t save your RSVP just now. Please check your connection and try again.', true);
        })
        .then(function(){ clearTimeout(to); submit.disabled = false; submit.textContent = label; });
    });
  })();

  /* ---------------------------------------------------------
     5. SCROLL ANIMATIONS (GSAP + ScrollTrigger)
  --------------------------------------------------------- */
  function initAnimations(){
    if(!hasGsap) return;
    if(window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    if(reduceMotion){
      gsap.set('.reveal, .reveal-scale, .hero-art, .swatch', { opacity:1, y:0, x:0, scale:1 });
      return;
    }

    document.querySelectorAll('.section').forEach(function(section){
      if(section.id === 'hero') return;   // hero plays when the intro ends
      var reveals = section.querySelectorAll('.reveal');
      var scales = section.querySelectorAll('.reveal-scale');
      if(reveals.length){
        gsap.to(reveals, {
          opacity:1, y:0, duration:1.2, ease:'power2.out', stagger:0.12,
          scrollTrigger:{ trigger:section, start:'top 78%', once:true }
        });
      }
      if(scales.length){
        gsap.to(scales, {
          opacity:1, scale:1, duration:1.4, ease:'power2.out',
          scrollTrigger:{ trigger:section, start:'top 75%', once:true }
        });
      }
    });

    // Colour code: fabric rolls slide in one after another
    if(document.querySelector('.swatch-stack')){
      gsap.to('.swatch', {
        opacity:1, x:0, duration:1, ease:'power3.out', stagger:0.09,
        scrollTrigger:{ trigger:'.swatch-stack', start:'top 82%', once:true }
      });
    }

    // Very slow decorative parallax
    document.querySelectorAll('[data-parallax]').forEach(function(el){
      var amt = parseFloat(el.getAttribute('data-parallax')) || 0.04;
      gsap.fromTo(el, { yPercent: amt * 100 }, {
        yPercent: -amt * 100, ease:'none',
        scrollTrigger:{ trigger:el.closest('.section'), start:'top bottom', end:'bottom top', scrub:1.2 }
      });
    });
    var art = document.querySelector('.artwork-bg img');
    if(art){
      gsap.fromTo(art, { yPercent:-6 }, {
        yPercent:0, ease:'none',
        scrollTrigger:{ trigger:'#artwork', start:'top bottom', end:'bottom top', scrub:1.5 }
      });
    }

  }

  var heroPlayed = false;
  function triggerHero(){
    if(heroPlayed) return;
    heroPlayed = true;
    if(!hasGsap || reduceMotion){
      document.querySelectorAll('#hero .reveal, #hero .reveal-scale, #hero .hero-art').forEach(function(el){
        el.style.opacity = 1; el.style.transform = 'none';
      });
      return;
    }
    var tl = gsap.timeline({ delay:0.35 });
    tl.to('#hero .reveal', { opacity:1, y:0, duration:1.2, ease:'power2.out', stagger:0.12 }, 0);
    tl.to('#hero .reveal-scale', { opacity:1, scale:1, duration:1.4, ease:'power2.out' }, 0.15);
    tl.to('#hero .hero-art', { opacity:1, y:0, duration:1.8, ease:'power2.out' }, 0.45);
  }

  initAnimations();

  /* ---------------------------------------------------------
     6. GALLERY PHOTO WALL — enter / drift / parallax / touch
  --------------------------------------------------------- */
  (function initGalleryWall(){
    var wall = document.getElementById('photoWall');
    if(!wall) return;
    var cards = wall.querySelectorAll('.photo-card');
    if(!cards.length) return;

    function revealCard(card){ card.classList.add('is-in'); }

    if(reduceMotion || !('IntersectionObserver' in window)){
      Array.prototype.forEach.call(cards, revealCard);
    } else {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(!en.isIntersecting) return;
          revealCard(en.target);
          io.unobserve(en.target);
        });
      }, { threshold:0.12, rootMargin:'0px 0px -6% 0px' });
      Array.prototype.forEach.call(cards, function(card){ io.observe(card); });
    }

    Array.prototype.forEach.call(cards, function(card){
      card.addEventListener('pointerdown', function(e){
        if(e.pointerType === 'mouse') return;
        card.classList.add('is-touched');
        setTimeout(function(){ card.classList.remove('is-touched'); }, 560);
      }, { passive:true });
    });

    if(reduceMotion) return;

    var ticking = false, speeds = [];
    Array.prototype.forEach.call(cards, function(card, i){
      var raw = parseFloat(card.getAttribute('data-speed'));
      speeds[i] = isNaN(raw) ? ((i % 2 === 0) ? 0.05 : -0.04) : raw;
    });
    function updateParallax(){
      ticking = false;
      var vh = window.innerHeight || 1, mid = vh * 0.5;
      for(var i = 0; i < cards.length; i++){
        var card = cards[i];
        if(!card.classList.contains('is-in')) continue;
        var rect = card.getBoundingClientRect();
        if(rect.bottom < -80 || rect.top > vh + 80) continue;
        var offset = Math.max(-16, Math.min(16, (rect.top + rect.height * 0.5 - mid) * speeds[i]));
        card.style.setProperty('--parallax-y', offset.toFixed(2) + 'px');
      }
    }
    window.addEventListener('scroll', function(){
      if(ticking) return; ticking = true; requestAnimationFrame(updateParallax);
    }, { passive:true });
    updateParallax();
  })();

  window.addEventListener('load', function(){
    if(window.ScrollTrigger) ScrollTrigger.refresh();
  });

  /* Background slow-zoom runs only while a section is on screen */
  (function(){
    var secs = document.querySelectorAll('.section');
    if(!('IntersectionObserver' in window)){ secs.forEach(function(s){ s.classList.add('in-view'); }); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ en.target.classList.toggle('in-view', en.isIntersecting); });
    }, { rootMargin:'100px 0px' });
    secs.forEach(function(s){ io.observe(s); });
  })();

  /* ---------------------------------------------------------
     6b. COLOUR CODE — tap a shade to copy its code
  --------------------------------------------------------- */
  document.querySelectorAll('.swatch-inner').forEach(function(btn){
    var hexEl = btn.querySelector('.swatch-hex');
    var hex = btn.getAttribute('data-hex');
    var timer = 0;
    btn.addEventListener('click', function(){
      function done(ok){
        hexEl.textContent = ok ? 'Copied ' + hex : hex;
        btn.parentNode.classList.toggle('is-copied', ok);
        clearTimeout(timer);
        timer = setTimeout(function(){ hexEl.textContent = hex; btn.parentNode.classList.remove('is-copied'); }, 1600);
      }
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(hex).then(function(){ done(true); }, function(){ done(false); });
      } else {
        try{
          var ta = document.createElement('textarea'); ta.value = hex; ta.setAttribute('readonly','');
          ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta);
          ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); done(ok);
        }catch(e){ done(false); }
      }
    });
  });

  /* ---------------------------------------------------------
     7. CUSTOM CURSOR (fine pointer only)
  --------------------------------------------------------- */
  var cursorDot = document.getElementById('cursor-dot');
  var hasFinePointer = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(cursorDot && hasFinePointer){
    window.addEventListener('mousemove', function(e){
      cursorDot.style.left = e.clientX + 'px';
      cursorDot.style.top = e.clientY + 'px';
    }, { passive:true });
    document.querySelectorAll('a, button, label, .photo-card__paper, input, textarea').forEach(function(el){
      el.addEventListener('mouseenter', function(){ cursorDot.classList.add('is-active'); });
      el.addEventListener('mouseleave', function(){ cursorDot.classList.remove('is-active'); });
    });
  } else if(cursorDot){
    cursorDot.style.display = 'none';
  }

  /* ---------------------------------------------------------
     8. SCROLL PROGRESS + BACK TO TOP
  --------------------------------------------------------- */
  var progressBar = document.getElementById('scroll-progress');
  var backToTop = document.getElementById('back-to-top');
  var scrollMax = 1, uiTicking = false;
  function measure(){ scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
  function onScrollUI(){
    uiTicking = false;
    var y = window.scrollY;
    progressBar.style.transform = 'scaleX(' + Math.min(1, y / scrollMax).toFixed(4) + ')';
    if(backToTop) backToTop.classList.toggle('show', y > window.innerHeight * 0.9);
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  window.addEventListener('scroll', function(){
    if(uiTicking) return; uiTicking = true; requestAnimationFrame(onScrollUI);
  }, { passive:true });
  onScrollUI();
  if(backToTop){
    backToTop.addEventListener('click', function(){
      window.scrollTo({ top:0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     9. GALLERY LIGHTBOX
  --------------------------------------------------------- */
  (function initLightbox(){
    var lightbox = document.getElementById('gallery-lightbox');
    var lightboxImg = document.getElementById('gallery-lightbox-img');
    var lightboxClose = document.getElementById('gallery-lightbox-close');
    var triggers = document.querySelectorAll('[data-lightbox]');
    if(!lightbox || !triggers.length) return;
    var lastFocus = null;

    function openLightbox(trigger){
      var imgEl = trigger.querySelector('img');
      lastFocus = trigger;
      lightboxImg.src = trigger.getAttribute('data-full');
      lightboxImg.alt = imgEl ? imgEl.alt : '';
      lightbox.classList.add('show');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lightboxClose.focus();
    }
    function closeLightbox(){
      lightbox.classList.remove('show');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if(lastFocus) lastFocus.focus();
    }
    triggers.forEach(function(t){
      t.addEventListener('click', function(){ openLightbox(t); });
      t.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openLightbox(t); }
      });
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function(e){ if(e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && lightbox.classList.contains('show')) closeLightbox();
    });
  })();

  /* ---------------------------------------------------------
     10. AMBIENT PARTICLES — gold dust + petals (subtle)
  --------------------------------------------------------- */
  (function initParticles(){
    if(reduceMotion) return;
    var canvas = document.getElementById('particles');
    if(!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var w, h;
    function resize(){ w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    var COUNT = window.innerWidth < 700 ? 14 : 26;
    function spawn(){
      var petal = Math.random() > 0.6;
      return {
        x: Math.random() * w, y: Math.random() * h - h,
        r: petal ? (3 + Math.random() * 3.5) : (1 + Math.random() * 1.5),
        speedY: 0.16 + Math.random() * 0.34,
        speedX: (Math.random() - 0.5) * 0.4,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.008 + Math.random() * 0.014,
        opacity: 0.16 + Math.random() * 0.3,
        petal: petal
      };
    }
    var particles = [];
    for(var i = 0; i < COUNT; i++) particles.push(spawn());

    var lastDraw = 0;
    function draw(t){
      requestAnimationFrame(draw);
      if(t - lastDraw < 33) return;          // ~30 fps is plenty for slow drifting dust
      lastDraw = t;
      ctx.clearRect(0, 0, w, h);
      for(var i = 0; i < particles.length; i++){
        var p = particles[i];
        p.sway += p.swaySpeed * 2;
        p.x += (p.speedX + Math.sin(p.sway) * 0.3) * 2;
        p.y += p.speedY * 2;
        if(p.y > h + 20){ p.y = -20; p.x = Math.random() * w; }
        if(p.x > w + 20) p.x = -20;
        if(p.x < -20) p.x = w + 20;
        ctx.beginPath();
        if(p.petal){
          ctx.fillStyle = 'rgba(217,171,85,' + p.opacity + ')';
          ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, p.sway, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = 'rgba(255,248,236,' + p.opacity + ')';
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  })();
})();
