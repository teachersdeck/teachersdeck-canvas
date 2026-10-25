'use strict';
/* =========================================================
   TeachersDeck for Canvas — the launch bootstrap. tools/build_platform.py loads it in the Canvas build only, after
   js/cloud.js (so firebase is initialized and TDCloud is ready) and BEFORE js/app.js. app.js does not call init()
   itself in this build (TD_PLATFORM.deferInit, see the bottom of app.js) — it waits for this file to call
   window.__tdInit() once a Canvas launch is confirmed, because the one-time code exchange below is asynchronous and
   the role gate needs its result before the normal UI is built. A preview (?demo=1, js/platform.js) skips all of
   this and app.js starts straight away.
   ========================================================= */
(() => {
  const P = window.TD_PLATFORM;
  if (!(P && P.id === 'canvas') || P.preview) return;

  const MSG = {
    noCode: { en: 'This page only opens from inside a Canvas course.', vi: 'Trang này chỉ mở được từ trong một khóa học Canvas.' },
    notConfigured: { en: "TeachersDeck isn't set up for Canvas yet. Ask your administrator.", vi: 'TeachersDeck chưa được thiết lập cho Canvas. Hãy hỏi quản trị viên của bạn.' },
    expired: { en: 'This Canvas link has expired. Go back to Canvas and open TeachersDeck again.', vi: 'Liên kết Canvas này đã hết hạn. Hãy quay lại Canvas và mở TeachersDeck lại.' },
    notTeacher: { en: 'Ask your teacher to open TeachersDeck from Canvas.', vi: 'Hãy nhờ giáo viên của bạn mở TeachersDeck từ Canvas.' },
    reopen: { en: 'TeachersDeck was reloaded and needs Canvas to sign you in again. Go back to Canvas and open TeachersDeck again.', vi: 'TeachersDeck vừa được tải lại và cần Canvas đăng nhập lại cho bạn. Hãy quay lại Canvas và mở TeachersDeck lại.' },
  };
  // A teacher's launch, remembered for this tab only (sessionStorage), so a reload — the in-app update warning reloads the
  // page, platforms/js/update.js — can carry on with the same Firebase sign-in instead of asking for a new Canvas launch.
  const RESUME_KEY = 'td_canvas_launch';
  const msg = (key) => (MSG[key] || {})[P.lang === 'vi' ? 'vi' : 'en'] || key;

  // An overlay, not a document.body.innerHTML replacement: app.js still runs after this file
  // (only its init() call is skipped — see the bottom of app.js) and its top-level wiring code
  // (outside init()) unconditionally queries elements from index.html's static skeleton. Wiping
  // the body would null out those lookups and throw before app.js ever reaches the init() guard.
  function showPlaceholder(text) {
    const el = document.createElement('div');
    el.id = 'td-canvas-placeholder';
    el.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;'
      + 'padding:2rem;font:16px/1.5 system-ui,sans-serif;text-align:center;color:#333;background:#f4f6fa';
    el.innerHTML = `<p style="max-width:420px">${text}</p>`;
    document.body.appendChild(el);
  }

  function stripLtiCodeFromUrl() {
    const url = new URL(location.href);
    url.searchParams.delete('lti_code');
    url.searchParams.delete('edition');
    history.replaceState(null, '', url.toString());
  }

  async function run() {
    const code = P.ltiCode;
    let resumeUid = null;
    try { resumeUid = sessionStorage.getItem(RESUME_KEY); } catch (e) { /* storage blocked */ }
    if (!code && !resumeUid) { showPlaceholder(msg('noCode')); return; }
    if (typeof firebase === 'undefined' || typeof TDCloud === 'undefined' || !TDCloud.isConfigured()) {
      showPlaceholder(msg('notConfigured'));
      return;
    }
    if (!code) {   // a reload in the same tab after a teacher launch: wait for Firebase to restore that sign-in
      const user = await new Promise((resolve) => { const off = firebase.auth().onAuthStateChanged((u) => { off(); resolve(u); }); });
      if (user && user.uid === resumeUid) {
        P.role = 'teacher';
        if (typeof window.__tdInit === 'function') window.__tdInit();
        return;
      }
      try { sessionStorage.removeItem(RESUME_KEY); } catch (e) { /* storage blocked */ }
      showPlaceholder(msg('reopen'));
      return;
    }
    try {
      const exchange = firebase.functions().httpsCallable('ltiExchange');
      const result = (await exchange({ code })).data;
      await firebase.auth().signInWithCustomToken(result.token);
      stripLtiCodeFromUrl(); // single-use code — don't leave it sitting in history/referrers
      P.role = result.role;
      if (result.role !== 'teacher') { showPlaceholder(msg('notTeacher')); return; }
      try { sessionStorage.setItem(RESUME_KEY, firebase.auth().currentUser.uid); } catch (e) { /* storage blocked: a reload asks for a new launch */ }
      if (typeof window.__tdInit === 'function') window.__tdInit();
    } catch (e) {
      showPlaceholder(msg('expired'));
    }
  }

  run();
})();
