/* ═══════════════════════════════════════════════════════════════════════════
   Famille.Mbeutetsa — Application Lite (mode compatibilité 2015)
   Navigateurs ciblés : Android 5/6 (Chromium 37-53), Chrome 40-79, iOS 9 / Safari 9.
   ES5 strict : pas de let/const, pas de fonctions fléchées, pas de template
   literals, pas de fetch/Promise, pas de classList.toggle(x,force), pas de
   element.remove(), pas de Array.find/includes, pas de closest().
   Le browser gate (layout.tsx) pose `fc-modern` sur <html> pour les navigateurs
   récents : dans ce cas ce script ne fait rien (l'app React prend le relais).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  window.__fcLiteLoaded = true;

  if (String(document.documentElement.className).indexOf("fc-modern") !== -1) return;

  /* ── Utilitaires ── */
  function $(id) { return document.getElementById(id); }
  function text(el, s) { if (el) { if ("textContent" in el) { el.textContent = s; } else { el.innerText = s; } } }
  function show(el) { if (el) { el.style.display = "block"; } }
  function hide(el) { if (el) { el.style.display = "none"; } }
  function storeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function storeDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* rien */ } }
  function digitsOnly(s) { return String(s).replace(/\D/g, ""); }
  function trim(s) { return String(s).replace(/^\s+/, "").replace(/\s+$/, ""); }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function groupPhone(d) {
    var p = [d.slice(0, 1), d.slice(1, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)];
    var out = [];
    for (var i = 0; i < p.length; i++) { if (p[i]) { out.push(p[i]); } }
    return out.join(" ");
  }
  function prettyPhone(d) { return "+237 " + groupPhone(d); }
  function genCode() {
    var s = "";
    for (var i = 0; i < 6; i++) { s += String(Math.floor(Math.random() * 10)); }
    return s;
  }
  function deviceLabel() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/.test(ua)) { return "iPhone / iPad"; }
    if (/Android/.test(ua)) { return "Android"; }
    if (/Windows/.test(ua)) { return "Windows"; }
    if (/Macintosh/.test(ua)) { return "Mac"; }
    return "Appareil";
  }

  /* ── Toast (notifications éphémères en bas d'écran) ── */
  var toastTimer = null;
  function toast(msg, kind) {
    var t = $("l-toast");
    if (!t) { return; }
    text(t, msg);
    t.className = "l-toast l-show" + (kind === "err" ? " l-err" : kind === "ok" ? " l-ok" : "");
    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () { t.className = "l-toast"; }, 3400);
  }

  /* ── État + minuteurs de la séquence de vérification ── */
  var S = { phone: "", code: "", timers: [] };
  function later(fn, ms) { var id = setTimeout(fn, ms); S.timers.push(id); return id; }
  function clearTimers() {
    for (var i = 0; i < S.timers.length; i++) { clearTimeout(S.timers[i]); }
    S.timers = [];
  }

  /* ── Centre d'alertes (localStorage, seed après inscription) ── */
  function notifsGet() {
    try {
      var raw = storeGet("fc_lite_notifs");
      var arr = raw ? JSON.parse(raw) : null;
      return arr && typeof arr.length === "number" ? arr : null;
    } catch (e) { return null; }
  }
  function notifsSet(arr) { storeSet("fc_lite_notifs", JSON.stringify(arr)); }
  function unreadCount(arr) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) { if (!arr[i].read) { n++; } }
    return n;
  }
  function renderNotifs() {
    var arr = notifsGet() || [];
    var unread = unreadCount(arr);
    var b1 = $("l-bell-badge");
    var b2 = $("l-nav-badge");
    if (b1) {
      if (unread > 0) { text(b1, unread > 9 ? "9+" : String(unread)); b1.style.display = "block"; }
      else { b1.style.display = "none"; }
    }
    if (b2) {
      if (unread > 0) { text(b2, unread > 9 ? "9+" : String(unread)); b2.style.display = "inline-block"; }
      else { b2.style.display = "none"; }
    }
    var list = $("l-notif-list");
    if (!list) { return; }
    if (!arr.length) {
      list.innerHTML = '<p class="l-empty">Aucune notification pour le moment.</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < arr.length; i++) {
      var n = arr[i];
      html += '<div class="l-notif' + (n.read ? "" : " l-notif-unread") + '">'
        + '<div class="l-notif-ico">' + esc(n.icon || "🔔") + '</div>'
        + '<div><p class="l-notif-title">' + esc(n.title) + '</p>'
        + '<p class="l-notif-body">' + esc(n.body) + '</p>'
        + '<p class="l-notif-time">' + esc(n.time || "") + '</p></div></div>';
    }
    list.innerHTML = html;
  }
  function pushNotif(icon, title, body) {
    var arr = notifsGet() || [];
    arr.unshift({ icon: icon, title: title, body: body, time: "à l'instant", read: false });
    if (arr.length > 20) { arr = arr.slice(0, 20); }
    notifsSet(arr);
    renderNotifs();
  }
  function markAllRead() {
    var arr = notifsGet() || [];
    for (var i = 0; i < arr.length; i++) { arr[i].read = true; }
    notifsSet(arr);
    renderNotifs();
    toast("Toutes les alertes sont marquées comme lues ✓", "ok");
  }

  /* ── Navigation par onglets ── */
  var TABS = ["home", "notif", "security"];
  function goTab(tab) {
    for (var i = 0; i < TABS.length; i++) {
      var pane = $("l-tab-" + TABS[i]);
      if (pane) { pane.style.display = TABS[i] === tab ? "block" : "none"; }
    }
    var btns = document.getElementsByTagName("button");
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      var t = b.getAttribute("data-tab");
      if (t) { b.className = t === tab ? "l-navbtn l-active" : "l-navbtn"; }
    }
    if (tab === "notif") {
      var arr = notifsGet() || [];
      var changed = false;
      for (var k = 0; k < arr.length; k++) {
        if (!arr[k].read) { arr[k].read = true; changed = true; }
      }
      if (changed) { notifsSet(arr); }
    }
    window.scrollTo(0, 0);
    renderNotifs();
  }

  /* ── Inscription façon WhatsApp : numéro → notification → appareil → nom ── */
  function showStep(name) {
    hide($("l-step-phone"));
    hide($("l-step-verify"));
    hide($("l-step-profile"));
    show($("l-step-" + name));
    window.scrollTo(0, 0);
  }

  function setStepDone(li) {
    if (!li) { return; }
    li.className = "l-done";
    var dot = li.getElementsByTagName("span")[0];
    if (dot) { dot.innerHTML = "✓"; }
  }
  function resetStep(li) {
    if (!li) { return; }
    li.className = "";
    var dot = li.getElementsByTagName("span")[0];
    if (dot) { dot.innerHTML = ""; }
  }

  function enterDash(sess, isNew) {
    window.__fcLiteEnterDash = true;
    hide($("l-auth"));
    show($("l-dash"));
    text($("l-user-initial"), String(sess.name || "M").slice(0, 1).toUpperCase());
    text($("l-user-name"), sess.name);
    text($("l-user-meta"), "Membre · Branche Douala");
    text($("l-sec-name"), sess.name);
    text($("l-sec-phone"), prettyPhone(sess.phone));
    text($("l-sec-device"), sess.device || deviceLabel());
    var d = new Date(sess.since);
    text($("l-sec-since"), isNaN(d.getTime()) ? "à l'instant" : d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear());
    if (!notifsGet()) {
      pushNotif("🌳", "Bienvenue dans la famille !", "Votre compte a été créé. Bienvenue au registre vivant des Mbeutetsa.");
      pushNotif("📱", "Session permanente activée", "L'application s'ouvrira directement sur cet appareil — comme sur WhatsApp.");
    }
    renderNotifs();
    goTab("home");
    if (isNew) { toast("Bienvenue dans la famille, " + String(sess.name).split(" ")[0] + " ! 🌳", "ok"); }
  }

  function startVerify() {
    var input = $("l-phone");
    var digits = digitsOnly((input && input.value) || "");
    if (digits.length !== 9) {
      toast("Entrez un numéro camerounais à 9 chiffres (ex : 6 91 23 45 67).", "err");
      return;
    }
    S.phone = digits;
    S.code = genCode();
    clearTimers();
    text($("l-verify-phone"), prettyPhone(digits));
    text($("l-profile-phone"), prettyPhone(digits));
    text($("l-push-code"), S.code);
    hide($("l-manual"));
    resetStep($("l-st-1"));
    resetStep($("l-st-2"));
    resetStep($("l-st-3"));
    showStep("verify");
    hide($("l-push"));
    toast("Notification de vérification envoyée au " + prettyPhone(digits));

    /* Séquence automatique — comme WhatsApp qui lit le SMS à l'arrivée */
    later(function () { show($("l-push")); }, 500);
    later(function () { setStepDone($("l-st-1")); }, 1200);
    later(function () { var li = $("l-st-2"); if (li) { li.className = "l-run"; } }, 1700);
    later(function () {
      setStepDone($("l-st-2"));
      setStepDone($("l-st-3"));
      toast("Code détecté automatiquement sur votre téléphone");
    }, 2700);
    later(function () {
      showStep("profile");
      toast("Numéro vérifié ✓ — première inscription, continuez.");
    }, 3500);
  }

  function manualMode() {
    clearTimers();
    show($("l-manual"));
    var c = $("l-code");
    if (c && c.focus) { c.focus(); }
    toast("Saisissez les 6 chiffres reçus en notification.");
  }

  function confirmCode() {
    var input = $("l-code");
    var val = digitsOnly((input && input.value) || "");
    if (val.length !== 6) { toast("Saisissez les 6 chiffres du code reçu en notification.", "err"); return; }
    if (val !== S.code) { toast("Code incorrect — vérifiez la notification.", "err"); return; }
    clearTimers();
    showStep("profile");
    toast("Numéro vérifié ✓ — première inscription, continuez.");
  }

  function register() {
    var fn = trim(($("l-firstname") && $("l-firstname").value) || "");
    var ln = trim(($("l-lastname") && $("l-lastname").value) || "");
    if (fn.length < 2 || ln.length < 2) {
      toast("Indiquez votre prénom et votre nom pour créer votre compte.", "err");
      return;
    }
    var sess = { name: fn + " " + ln, phone: S.phone, device: deviceLabel(), since: Date.now() };
    if (!storeSet("fc_lite_session", JSON.stringify(sess))) {
      toast("Impossible d'enregistrer la session (mémoire indisponible).", "err");
      return;
    }
    enterDash(sess, true);
    pushNotif("📱", "Connexion sur un nouvel appareil", deviceLabel() + " — " + prettyPhone(S.phone));
  }

  function logout() {
    var ok = window.confirm(
      "Se déconnecter de Famille.Mbeutetsa ?\n\nVotre session restera fermée jusqu'à votre prochaine connexion avec votre numéro."
    );
    if (!ok) { return; }
    storeDel("fc_lite_session");
    storeDel("fc_lite_notifs");
    clearTimers();
    window.location.reload();
  }

  /* ── Démarrage ── */
  function boot() {
    var root = $("fc-legacy");
    if (!root) { window.__fcLiteNoDom = true; return; }
    if (root.getAttribute("data-lite-bound") === "1") { return; }
    root.setAttribute("data-lite-bound", "1");
    window.__fcLiteBooted = true;

    /* Session existante → l'application s'ouvre directement (comme WhatsApp) */
    var raw = storeGet("fc_lite_session");
    if (raw) {
      try { enterDash(JSON.parse(raw), false); }
      catch (e) { showStep("phone"); }
    } else {
      showStep("phone");
    }

    function on(id, fn) {
      var el = $(id);
      if (el && el.addEventListener) { el.addEventListener("click", fn, false); }
    }
    on("l-btn-phone", startVerify);
    on("l-btn-verify", manualMode);
    on("l-btn-code", confirmCode);
    on("l-btn-profile", register);
    on("l-btn-logout", logout);
    on("l-btn-readall", markAllRead);
    on("l-bell", function () { goTab("notif"); });

    /* Navigation basse + raccourcis (data-tab / data-toast) */
    var btns = document.getElementsByTagName("button");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        var tab = b.getAttribute("data-tab");
        var msg = b.getAttribute("data-toast");
        if (!tab && !msg) { return; }
        if (!b.addEventListener) { return; }
        b.addEventListener("click", function () {
          if (tab) { goTab(tab); }
          if (msg) { toast(msg); }
        }, false);
      })(btns[i]);
    }

    /* Entrée clavier */
    var phone = $("l-phone");
    if (phone) {
      phone.onkeydown = function (e) {
        e = e || window.event;
        var k = e.keyCode || e.which;
        if (k === 13) { startVerify(); }
      };
    }
    var code = $("l-code");
    if (code) {
      code.onkeydown = function (e) {
        e = e || window.event;
        var k = e.keyCode || e.which;
        if (k === 13) { confirmCode(); }
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, false);
  } else {
    boot();
  }

  /* Chien de garde ES5 : si le DOM Lite est recréé après coup (re-render React en
     développement), l'attribut data-lite-bound disparaît → re-attachement auto. */
  setInterval(function () {
    var root = $("fc-legacy");
    if (root && root.getAttribute("data-lite-bound") !== "1") { boot(); }
  }, 800);
})();
