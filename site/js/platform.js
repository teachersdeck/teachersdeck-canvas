'use strict';
/* =========================================================
   TeachersDeck for Canvas — the platform file. Sets window.TD_PLATFORM, which the shared js/app.js and js/cloud.js read
   (their "platform:" hooks) and js/canvas.js builds on. tools/build_platform.py puts this file straight after
   js/edition.js, so it runs before cloud.js, demo.js and app.js. The suite's own TeachersDeck never loads it.
   See PLATFORMS.md.

   The hosted site IS the Canvas edition. Two ways in:
     - a Canvas launch: the backend's ltiLaunch redirects here with ?lti_code=…&lang=… (and edition=canvas, now ignored);
       js/canvas.js swaps the one-time code for a sign-in, then starts the app — teachers only.
     - a preview, for the demo site and for trying it out: ?demo=1 (or the older ?edition=default) with no lti_code.
       It runs the same Canvas widget set on TeachersDeck's built-in demo data, with no Canvas sign-in.
   ========================================================= */
window.TD_PLATFORM = (() => {
  const BUILD = 'canvas.7';   // the platform build for local builds; the publish workflow numbers live builds itself (tools/build_platform.py --against)
  const params = new URLSearchParams(location.search);

  // The Canvas pilot's core, board/lesson-running widgets (26: DrawDeck since canvas.2, ten more since canvas.3) — no personal student data, and nothing that needs its own
  // sign-in (roster/gradebook access is off by default for Canvas; see the pilot proposal §6). An allow-list, so a widget
  // added to TeachersDeck later stays out of Canvas until it is added here.
  const CANVAS_WIDGETS = [
    'clock', 'timer', 'stopwatch', 'countdown', 'traffic', 'scoreboard', 'noise',
    'instructions', 'dice', 'checklist', 'qrcode', 'agenda', 'namepicker', 'hallpass', 'calendar',
    'drawdeck',   // the whiteboard; its share/assign-to-students buttons stay hidden, since Canvas links no cloud class
    // canvas.3: lesson and language tools with no student records and no extra sign-in
    'poll', 'groupmaker', 'games', 'grammarref', 'idiomday', 'convocards', 'ttsreader', 'music', 'videoplayer',
    'files',      // the teacher's own files; showing an Office file full screen needs a Google sign-in pop-up, which Canvas's frame may block
  ];

  const ltiCode = params.get('lti_code');
  const preview = !ltiCode && (params.get('demo') === '1' || params.get('edition') === 'default');
  const launchLang = params.get('lang');
  const appVersion = (window.DECK_EDITION && window.DECK_EDITION.version) || '0.0.0';

  try {
    localStorage.removeItem('td_edition_v1');                 // the old sticky edition switch; nothing reads it any more
    if (ltiCode) localStorage.removeItem('td_demo_flag');    // a real launch never runs on demo data left over from a preview
  } catch (e) { /* storage blocked: nothing to clear */ }

  const api = {
    id: 'canvas',
    name: 'TeachersDeck for Canvas',
    build: BUILD,
    version: `${appVersion}-${BUILD}`,
    lang: (launchLang === 'vi' || launchLang === 'en') ? launchLang : null,
    ltiCode: ltiCode || null,
    preview,
    role: null,                                // set by js/canvas.js after the launch exchange
    fixedWidgets: true,                        // app.js: the allow-list IS the curation
    schoolPro: true,                           // app.js / cloud.js: a school's Pro licence makes its teachers Pro
    deferInit: !preview,                       // app.js: wait for js/canvas.js to finish the launch before building the UI
    hides(widgetId) { return !CANVAS_WIDGETS.includes(widgetId); },
    presetFor() { return null; },
  };

  document.documentElement.classList.add('ed-canvas');
  return api;
})();
