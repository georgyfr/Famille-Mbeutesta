// Test E2E push sur la PRODUCTION (site statique démo + Worker fc-push)
const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const PORT = 9224;
const APP = "https://famille-mbeutetsa.pages.dev";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const proc = Bun.spawn(
    [CHROME, `--remote-debugging-port=${PORT}`, "--headless=new", "--no-sandbox",
     "--disable-gpu", "--no-first-run", `--user-data-dir=/tmp/chrome-push-prod`,
     "--disable-dev-shm-usage", "about:blank"],
    { stdout: "ignore", stderr: "ignore" }
  );
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/json/version`); if (r.ok) break; } catch {}
    await sleep(250);
  }
  const ver = await (await fetch(`http://localhost:${PORT}/json/version`)).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = rej; });

  let id = 0;
  const pend = new Map<number, Pending>();
  function send(method: string, params: any = {}, sessionId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const msg: any = { id: ++id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      pend.set(msg.id, { resolve, reject });
      ws.send(JSON.stringify(msg));
    });
  }
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data as string);
    if (m.id && pend.has(m.id)) {
      const p = pend.get(m.id)!;
      pend.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Browser.grantPermissions", { permissions: ["notifications"], origin: APP });
  await send("Page.enable", {}, sessionId);
  await send("Page.navigate", { url: APP + "/" }, sessionId);
  await sleep(7000);
  console.log("✓ Permission accordée pour", APP);

  const evalJS = async (expression: string) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error("JS: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result?.value;
  };

  // 1. Inscription via le mode démo (fetch intercepté) + abonnement push réel
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
    j = await post("/api/auth/phone", { action: "verify", verifyToken: j.verifyToken, code: j.demoCode, deviceName: "Prod E2E" });
    if (!j.ok) return { fail: "verify", j };
    if (!j.registered) {
      j = await post("/api/auth/phone", { action: "register", registerToken: j.registerToken, firstName: "Prod", lastName: "PushE2E", deviceName: "Prod E2E" });
      if (!j.ok) return { fail: "register", j };
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const kp = await (await fetch("/api/push/public-key")).json();
    if (!kp.ok || !kp.publicKey) return { fail: "vapid", kp };
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(kp.publicKey) });
    const s = await post("/api/push/subscribe", { subscription: sub.toJSON() });
    window.__lastPush = null;
    return { ok: true, s, endpoint: String(sub.toJSON().endpoint).slice(0, 70), keyFromWorker: kp.publicKey.startsWith("BMrg") };
  })()`);
  console.log("✓ Inscription + abonnement :", JSON.stringify(flow));
  if (!flow.ok) throw new Error("Échec flux: " + JSON.stringify(flow));

  // 2. Push de bienvenue (intercepteur démo → Worker → FCM → téléphone)
  await evalJS(`(async () => {
    const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "welcome" }) });
    window.__welcomeResult = await r.json();
  })()`);
  await sleep(4500);
  const w = await evalJS("window.__welcomeResult");
  const g1 = await evalJS("window.__lastPush");
  console.log("→ Bienvenue : envoi =", JSON.stringify(w), "| reçu =", JSON.stringify(g1));

  // 3. Push de test (le bouton « Vérifier que ça sonne » de Ma sécurité)
  await evalJS(`(async () => {
    const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    window.__testResult = await r.json();
  })()`);
  await sleep(4500);
  const t = await evalJS("window.__testResult");
  const g2 = await evalJS("window.__lastPush");
  console.log("→ Test : envoi =", JSON.stringify(t), "| reçu =", JSON.stringify(g2));

  const okWelcome = w?.sent === true && g1 && g1.tag === "fc-welcome";
  const okTest = t?.sent === true && g2 && g2.tag === "fc-push-test";
  console.log(okWelcome ? "✅ PUSH BIENVENUE (prod) : OK" : "❌ PUSH BIENVENUE : échec");
  console.log(okTest ? "✅ PUSH TEST (prod) : OK" : "❌ PUSH TEST : échec");
  proc.kill();
  process.exit(okWelcome && okTest ? 0 : 1);
}
main().catch((e) => { console.error("ERREUR:", e.message ?? e); process.exit(1); });
