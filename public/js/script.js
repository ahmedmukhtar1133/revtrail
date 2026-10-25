/*! RevTrail tracker: <script defer data-website-id="SITE_ID" src="https://YOUR-HOST/js/script.js"></script> */
(function () {
  'use strict';
  var w = window, d = document, loc = w.location, nav = w.navigator;
  var script = d.currentScript;
  if (!script) return;

  var siteId = script.getAttribute('data-website-id');
  var endpoint = script.getAttribute('data-api') || new URL(script.src).origin + '/api/event';
  var allowLocal = script.hasAttribute('data-allow-localhost');
  // No cookies and no storage for visitors: the server recognises them, and the id it returns lives only
  // in this page, to tag checkout links.
  var vid = null;

  var queued = (w.revtrail && w.revtrail.q) || [];
  function noop() {}

  // Opt yourself out: visit any page with ?rt_ignore=true (undo with ?rt_ignore=false). Only ever set by
  // the site owner on their own browser.
  try {
    var ig = new URLSearchParams(loc.search).get('rt_ignore');
    if (ig === 'true') localStorage.setItem('rt_ignore', '1');
    if (ig === 'false') localStorage.removeItem('rt_ignore');
  } catch (e) {}
  var ignored = false;
  try { ignored = localStorage.getItem('rt_ignore') === '1'; } catch (e) {}
  var local = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|.*\.local$)/.test(loc.hostname) || loc.protocol === 'file:';
  if (!siteId || ignored || nav.webdriver || (local && !allowLocal)) {
    w.revtrail = noop;
    w.revtrail.attribution = function () { return {}; };
    return;
  }

  // ---- transport
  // Personal data in URLs (e.g. ?email= on a payment return page) never leaves the browser.
  var PRIVATE_PARAM = /^(e-?mail|name|phone|password|pass|token|access_token|id_token|auth|code|secret|key|api_key|license_key|license)$/i;
  function cleanUrl(href) {
    try {
      var u = new URL(href);
      var drop = [];
      u.searchParams.forEach(function (_, k) { if (PRIVATE_PARAM.test(k)) drop.push(k); });
      for (var i = 0; i < drop.length; i++) u.searchParams.delete(drop[i]);
      return u.toString();
    } catch (e) { return href; }
  }
  function send(type, extra, beacon) {
    var body = { w: siteId, t: type, u: cleanUrl(loc.href), sw: w.screen ? screen.width : 0 };
    for (var k in extra) if (extra[k] !== undefined) body[k] = extra[k];
    var json = JSON.stringify(body);
    // text/plain keeps this a "simple" request: no CORS preflight, works with sendBeacon.
    if (beacon && nav.sendBeacon) {
      try { if (nav.sendBeacon(endpoint, new Blob([json], { type: 'text/plain' }))) return; } catch (e) {}
    }
    try {
      fetch(endpoint, { method: 'POST', body: json, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } })
        .then(function (res) { return res.json(); })
        .then(function (r) { if (r && r.v && r.v !== vid) { vid = r.v; tagLinks(); } })
        .catch(noop);
    } catch (e) {}
  }

  // ---- engaged time (only while the tab is visible)
  var visibleSince = d.visibilityState === 'visible' ? Date.now() : 0;
  var pending = 0, pings = 0;
  function flushTime(beacon) {
    if (visibleSince) { pending += Date.now() - visibleSince; visibleSince = d.visibilityState === 'visible' ? Date.now() : 0; }
    if (pending >= 1000) { send('ping', { d: Math.round(pending) }, beacon); pending = 0; }
  }
  d.addEventListener('visibilitychange', function () {
    if (d.visibilityState === 'visible') visibleSince = Date.now();
    else flushTime(true);
  });
  w.addEventListener('pagehide', function () { flushTime(true); });
  setInterval(function () {
    if (d.visibilityState === 'visible' && pings < 30) { pings++; flushTime(false); }
  }, 60000);

  // ---- pageviews (including single-page-app navigation)
  var lastPage = null, firstView = true;
  function pageview() {
    var page = loc.pathname + loc.search;
    if (page === lastPage) return;
    if (lastPage !== null) flushTime(false);
    lastPage = page;
    pings = 0;
    send('pageview', { r: firstView ? d.referrer : '' });
    firstView = false;
  }
  var hist = w.history;
  if (hist && hist.pushState) {
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = hist[fn];
      hist[fn] = function () { var r = orig.apply(this, arguments); setTimeout(pageview, 0); return r; };
    });
    w.addEventListener('popstate', pageview);
  }

  // ---- goals, outbound links, Dodo and Polar checkout links
  function goal(name, props) {
    if (!name) return;
    send('goal', { n: String(name).slice(0, 64), p: props || undefined }, true);
  }
  function attribution() {
    return vid ? { rt_visitor_id: vid } : {};
  }
  // Checkout links carry the visitor: Dodo as metadata, Polar as reference_id (which Polar keeps on the
  // checkout). They're tagged as soon as the id is known and whenever links appear, not just on click,
  // because other scripts may copy the href and navigate before our click handler runs.
  function tagLink(a) {
    if (!vid) return;
    try {
      var u = new URL(a.href);
      if (/(^|\.)dodopayments\.com$/.test(u.hostname)) u.searchParams.set('metadata_rt_visitor_id', vid);
      else if (/(^|\.)polar\.sh$/.test(u.hostname)) u.searchParams.set('reference_id', vid);
      else return;
      var next = u.toString();
      if (a.href !== next) a.href = next;
    } catch (e) {}
  }
  function tagLinks() {
    var links = d.querySelectorAll('a[href*="dodopayments.com"], a[href*="polar.sh"]');
    for (var i = 0; i < links.length; i++) tagLink(links[i]);
  }
  var tagQueued = false;
  function queueTag() {
    if (tagQueued) return;
    tagQueued = true;
    setTimeout(function () { tagQueued = false; tagLinks(); }, 50);
  }
  if (w.MutationObserver) {
    new MutationObserver(queueTag).observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }
  function onPress(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (a) tagLink(a);
  }
  d.addEventListener('pointerdown', onPress, true);
  d.addEventListener('keydown', function (e) { if (e.key === 'Enter') onPress(e); }, true);
  function onClick(e) {
    var el = e.target && e.target.closest ? e.target : null;
    if (!el) return;
    var g = el.closest('[data-rt-goal]');
    if (g) {
      var props = {};
      for (var i = 0; i < g.attributes.length; i++) {
        var at = g.attributes[i];
        if (at.name.indexOf('data-rt-goal-') === 0) props[at.name.slice(13)] = at.value.slice(0, 255);
      }
      goal(g.getAttribute('data-rt-goal'), Object.keys(props).length ? props : undefined);
    }
    var a = el.closest('a[href]');
    if (a) {
      tagLink(a);
      try {
        var u = new URL(a.href, loc.href);
        if (/^https?:$/.test(u.protocol) && u.hostname !== loc.hostname) {
          send('outbound', { n: u.origin + u.pathname }, true);
        }
      } catch (err) {}
    }
  }
  d.addEventListener('click', onClick, true);
  d.addEventListener('auxclick', onClick, true);

  // ---- public API
  function api(cmd, a, b) {
    if (cmd === 'goal' || cmd === 'track') goal(a, b);
    else if (cmd === 'identify' && a) send('identify', { p: { user_id: a.user_id || a.id, email: a.email, name: a.name } });
    else if (cmd === 'pageview') { lastPage = null; pageview(); }
  }
  api.attribution = attribution;
  w.revtrail = api;

  pageview();
  for (var q = 0; q < queued.length; q++) api.apply(null, queued[q]);
})();
