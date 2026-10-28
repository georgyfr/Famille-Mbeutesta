// Test E2E des notifications push réelles — navigateur Chromium piloté via CDP
// 1. Accorde la permission "notifications" (Browser.grantPermissions)
// 2. Parcourt le flux d'inscription via fetch (session cookie)
// 3. S'abonne au push (clé VAPID du serveur) — abonnement enregistré côté Node ET Worker KV
// 4. Déclenche : (a) push de test via l'API Node, (b) push via le Worker Cloudflare
// 5. Vérifie la réception dans la page (window.__lastPush via le Service Worker)

const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const PORT = 9223;
const APP = "http://localhost:3000";
const WORKER = "https://fc-push.famille-mbeutetsa.workers.dev";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function launchChrome(): Promise<void> {
  const proc = Bun.spawn(
    [CHROME, `--remote-debugging-port=${PORT}`, "--headless=new", "--no-sandbox",
     "--disable-gpu", "--no-first-run", `--user-data-dir=/tmp/chrome-push-test`,
     "--disable-dev-shm-usage", "about:blank"],
    { stdout: "ignore", stderr: "ignore" }
  );
  // attend le point d'entrée CDP
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/json/version`);
      if (r.ok) return;
    } catch { /* pas prêt */ }
    await sleep(250);
  }
  proc.kill();
  throw new Error("Chromium n'a pas démarré");
}

type Pending = { resolve: (v: any) => void; reject: (e: any) => void };

async function main() {
  await launchChrome();
  const ver = await (await fetch(`http://localhost:${PORT}/json/version`)).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = rej; });

  let id = 0;
  const pend = new Map<number, Pending>();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data as string);
    if (m.id && pend.has(m.id)) {
      const p = pend.get(m.id)!;
      pend.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
    }
  };
  const send = (method: string, params: any = {}, sessionId?: string): Promise<any> =>
    new Promise((resolve, reject) => {
      const msg: any = { id: ++id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      pend.set(msg.id, { resolve, reject });
      ws.send(JSON.stringify(msg));
    });

  // Onglet cible
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

  // Permission notifications sur l'origine de l'app
  await send("Browser.grantPermissions", {
    permissions: ["notifications"],
    origin: APP,
  });
  console.log("✓ Permission notifications accordée (CDP)");

  await send("Page.enable", {}, sessionId);
  await send("Page.navigate", { url: APP + "/" }, sessionId);
  await sleep(6000); // splash + hydratation

  const evalJS = async (expression: string) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error("JS: " + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result?.value;
  };

  // ── 1. Inscription complète via fetch (cookies de session) ──
  const flow = await evalJS(`(async () => {
    const b64u8 = (b64) => {
      let s = b64.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const raw = atob(s);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      return arr.buffer;
    };
    const post = (p, b) => fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());
    const phone = "6" + String(Math.floor(10000000 + Math.random() * 89999999));
    let j = await post("/api/auth/phone", { action: "request", phone });
    if (!j.ok) return { fail: "request", j };
    j = await post("/api/auth/phone", { action: "verify", verifyToken: j.verifyToken, code: j.demoCode, deviceName: "Test CDP Push" });
    if (!j.ok) return { fail: "verify", j };
    const isNew = !j.registered;
    if (isNew) {
      j = await post("/api/auth/phone", { action: "register", registerToken: j.registerToken, firstName: "Test", lastName: "PushE2E", deviceName: "Test CDP Push" });
      if (!j.ok) return { fail: "register", j };
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const kp = await (await fetch("/api/push/public-key")).json();
    if (!kp.ok) return { fail: "vapid", kp };
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(kp.publicKey) });
    const subJson = sub.toJSON();
    const sNode = await post("/api/push/subscribe", { subscription: subJson });
    let sWorker = { ok: false, skipped: "pas de worker" };
    try {
      sWorker = await (await fetch("${WORKER}/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subJson, phone }) })).json();
    } catch (e) { sWorker = { ok: false, error: String(e) }; }
    window.__lastPush = null;
    return { ok: true, isNew, phone, sNode, sWorker, endpoint: String(subJson.endpoint).slice(0, 70) };
  })()`);
  console.log("✓ Flux + abonnement :", JSON.stringify(flow));
  if (!flow.ok) throw new Error("Échec du flux: " + JSON.stringify(flow));

  // ── 2. Push via l'API NODE (web-push npm) ──
  await evalJS(`(async () => {
    const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    window.__nodePushResult = await r.json();
  })()`);
  await sleep(4000);
  const nodePush = await evalJS("window.__nodePushResult");
  const got1 = await evalJS("window.__lastPush");
  console.log("→ Node : envoi =", JSON.stringify(nodePush), "| reçu =", JSON.stringify(got1));

  // ── 3. Push via le WORKER Cloudflare (VAPID + RFC 8291 maison) ──
  await evalJS(`(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg.pushManager.getSubscription();
    const r = await fetch("${WORKER}/send-one", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), title: "🔔 Test Worker Cloudflare", body: "Push envoyé par le worker fc-push (VAPID + RFC 8291).", tag: "fc-worker-test" }) });
    window.__workerPushResult = await r.json();
  })()`);
  await sleep(4000);
  const workerPush = await evalJS("window.__workerPushResult");
  const got2 = await evalJS("window.__lastPush");
  console.log("→ Worker : envoi =", JSON.stringify(workerPush), "| reçu =", JSON.stringify(got2));

  // ── Verdict ──
  const nodeOK = nodePush?.sent === true && got1 && got1.tag === "fc-push-test";
  const workerOK = workerPush?.sent === true && got2 && got2.tag === "fc-worker-test";
  console.log(nodeOK ? "✅ PUSH NODE : E2E OK (FCM → SW → page)" : "❌ PUSH NODE : échec");
  console.log(workerOK ? "✅ PUSH WORKER : E2E OK (crypto maison validée)" : "❌ PUSH WORKER : échec");
  ws.close();
  process.exit(nodeOK && workerOK ? 0 : 1);
}

main().catch((e) => {
  console.error("ERREUR TEST:", e.message ?? e);
  process.exit(1);
});
