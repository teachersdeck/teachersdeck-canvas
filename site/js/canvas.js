'use strict';
/* =========================================================
   Canvas edition bootstrap — inert unless TD_EDITION.canvas (see js/edition.js).
   -----------------------------------------------------------------
   Loads after js/cloud.js (so firebase is already initialized and TDCloud is
   ready) and BEFORE js/app.js. app.js does not call init() itself when this
   edition is active (see the bottom of app.js) — it waits for this file to
   call window.__tdInit() once a Canvas launch is confirmed, because the
   one-time code exchange below is asynchronous and the role gate needs its
   result before the normal UI is built.
   ========================================================= */
(() => {
  if (!(window.TD_EDITION && TD_EDITION.canvas)) return;

  const MSG = {
    noCode: { en: 'This page only opens from inside a Canvas course.', vi: 'Trang này chỉ mở được từ trong một khóa học Canvas.' },
    notConfigured: { en: "TeachersDeck isn't set up for Canvas yet. Ask your administrator.", vi: 'TeachersDeck chưa được thiết lập cho Canvas. Hãy hỏi quản trị viên của bạn.' },
    expired: { en: 'This Canvas link has expired. Go back to Canvas and open TeachersDeck again.', vi: 'Liên kết Canvas này đã hết hạn. Hãy quay lại Canvas và mở TeachersDeck lại.' },
    notTeacher: { en: 'Ask your teacher to open TeachersDeck from Canvas.', vi: 'Hãy nhờ giáo viên của bạn mở TeachersDeck từ Canvas.' },
  };
  const msg = (key) => (MSG[key] || {})[TD_EDITION.lang === 'vi' ? 'vi' : 'en'] || key;

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
    history.replaceState(null, '', url.toString());
  }

  async function run() {
    const code = TD_EDITION.ltiCode;
    if (!code) { showPlaceholder(msg('noCode')); return; }
    if (typeof firebase === 'undefined' || typeof TDCloud === 'undefined' || !TDCloud.isConfigured()) {
      showPlaceholder(msg('notConfigured'));
      return;
    }
    try {
      const exchange = firebase.functions().httpsCallable('ltiExchange');
      const result = (await exchange({ code })).data;
      await firebase.auth().signInWithCustomToken(result.token);
      stripLtiCodeFromUrl(); // single-use code — don't leave it sitting in history/referrers
      TD_EDITION.role = result.role;
      if (result.role !== 'teacher') { showPlaceholder(msg('notTeacher')); return; }
      if (typeof window.__tdInit === 'function') window.__tdInit();
    } catch (e) {
      showPlaceholder(msg('expired'));
    }
  }

  run();
})();
