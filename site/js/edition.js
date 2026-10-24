'use strict';
/* =========================================================
   Edition switch — which "edition" of TeachersDeck is running in this tab.
   -----------------------------------------------------------------
   Must load FIRST, before cloud.js/app.js: both read window.TD_EDITION the
   moment they run (app.js's state.lang default, and isOff()'s widget gate).

   Priority: ?edition=<id> in the URL > a sticky choice saved earlier
   (localStorage) > 'default'. ?edition=canvas is made sticky so a reload
   inside the same Canvas iframe/tab keeps the right widget set even if a
   later navigation inside that tab drops the query string; ?edition=default
   clears the sticky choice.
   ========================================================= */
window.TD_EDITION = (() => {
  const STICKY_KEY = 'td_edition_v1';
  const KNOWN = ['default', 'canvas'];
  const params = new URLSearchParams(location.search);

  let id = params.get('edition');
  if (!KNOWN.includes(id)) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STICKY_KEY)); } catch (e) { /* ignore */ }
    id = (saved && KNOWN.includes(saved.id)) ? saved.id : 'default';
  }
  if (params.get('edition') === 'canvas') {
    try { localStorage.setItem(STICKY_KEY, JSON.stringify({ id: 'canvas' })); } catch (e) { /* ignore */ }
  } else if (params.get('edition') === 'default') {
    try { localStorage.removeItem(STICKY_KEY); } catch (e) { /* ignore */ }
  }

  // The Canvas pilot's ~15 core, board/lesson-running widgets — no personal student data, and
  // nothing that needs its own sign-in (roster/gradebook access is off by default for Canvas;
  // see the pilot proposal §6). Plain config array: adjusting the pilot scope later is a one-line
  // change here, not a change to how gating works (see js/app.js's isOff()).
  const CANVAS_WIDGETS = [
    'clock', 'timer', 'stopwatch', 'countdown', 'traffic', 'scoreboard', 'noise',
    'instructions', 'dice', 'checklist', 'qrcode', 'agenda', 'namepicker', 'hallpass', 'calendar',
  ];

  const canvas = id === 'canvas';
  const launchLang = params.get('lang');

  const api = {
    id,
    canvas,
    lang: (launchLang === 'vi' || launchLang === 'en') ? launchLang : null,
    ltiCode: canvas ? params.get('lti_code') : null,
    hides(widgetId) { return canvas && !CANVAS_WIDGETS.includes(widgetId); },
  };

  document.documentElement.classList.toggle('ed-canvas', canvas);
  return api;
})();
