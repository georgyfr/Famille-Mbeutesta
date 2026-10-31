import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, notify, logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

/* ══════════════════════════ utilitaires dates (UTC, YYYY-MM-DD) ══════════════════════════ */

const pad = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Première date de réunion : prochaine occurrence du jour choisi. */
function firstMeetingDate(frequency: string, meetingDay: number): Date {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (frequency === "monthly") {
    const day = Math.max(1, Math.min(28, meetingDay));
    const cand = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day));
    if (cand < base) cand.setUTCMonth(cand.getUTCMonth() + 1);
    return cand;
  }
  const delta = (((meetingDay - base.getUTCDay()) % 7) + 7) % 7;
  const cand = new Date(base);
  cand.setUTCDate(base.getUTCDate() + delta);
  return cand;
}

function addFrequency(frequency: string, date: Date, steps = 1): Date {
  const d = new Date(date);
  if (frequency === "monthly") d.setUTCMonth(d.getUTCMonth() + steps);
  else d.setUTCDate(d.getUTCDate() + (frequency === "biweekly" ? 14 : 7) * steps);
  return d;
}

/** Génère les N dates de réunion d'un cycle à partir de la prochaine occurrence. */
function generateRoundDates(frequency: string, meetingDay: number, count: number): string[] {
  const dates: string[] = [];
  let d = firstMeetingDate(frequency, meetingDay);
  for (let i = 0; i < count; i++) {
    dates.push(toISODate(d));
    d = addFrequency(frequency, d);
  }
  return dates;
}

/* ══════════════════════════ helpers ══════════════════════════ */

const fmtFcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

async function familyIdOf(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.memberId) return null;
  const member = await db.member.findUnique({ where: { id: user.memberId } });
  return member?.familyId ?? null;
}

/** Numéro de reçu unique : RC-<année>-<séquence>. */
async function nextReceiptNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `RC-${year}-`;
  const rows = await db.$queryRaw<{ rn: string }[]>`
    SELECT receiptNumber AS rn FROM tontine_payments
    WHERE receiptNumber LIKE ${prefix + "%"}
    ORDER BY receiptNumber DESC LIMIT 1`;
  let seq = 0;
  if (rows.length && rows[0].rn) {
    const m = rows[0].rn.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10);
  }
  return `${prefix}${String(seq + 1).padStart(4, "0")}`;
}

function expectedPotFor(t: { amount: number; recipientPays: boolean }, memberCount: number): number {
  return (t.recipientPays ? memberCount : Math.max(0, memberCount - 1)) * t.amount;
}

/* ── Tirage vérifiable (Phase 2) : graine publique + empreinte publiée, recalculable par tous ── */

async function sha256Hex(input: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  let out = "";
  for (const b of h) out += b.toString(16).padStart(2, "0");
  return out;
}

function randomSeedHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** PRNG déterministe mulberry32 — identique côté client pour la vérification. */
function mulberry32(seedBytes: Uint8Array): () => number {
  let a = ((seedBytes[0] << 24) | (seedBytes[1] << 16) | (seedBytes[2] << 8) | seedBytes[3]) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ordre initial dérivé de la graine (Fisher-Yates déterministe) — recalculable par chaque membre. */
async function drawInitialOrder(seedHex: string, joinedIds: string[]): Promise<string[]> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tontine-draw-v1:${seedHex}`)));
  const rng = mulberry32(digest);
  const ids = [...joinedIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** Empreinte publiée au moment du tirage : prouve la graine et l'ordre initial dérivé. */
async function drawHashOf(seedHex: string, initialOrder: string[]): Promise<string> {
  return (await sha256Hex(`tontine-draw-v1|${seedHex}|${initialOrder.join(",")}`)).slice(0, 32);
}

/** Journal de la tontine — ne contient jamais de données privées. */
async function tontineAudit(tontineId: string, action: string, detail: string, actorUserId: string | null, roundId?: string | null) {
  await db.tontineAudit.create({ data: { tontineId, roundId: roundId ?? null, action, detail, actorUserId } });
}

async function createDuesForRound(
  tontineId: string, roundId: string,
  members: { userId: string }[], amount: number,
  recipientUserId: string, recipientPays: boolean
) {
  const rows = members
    .filter((m) => recipientPays || m.userId !== recipientUserId)
    .map((m) => ({ tontineId, roundId, userId: m.userId, amount, status: "due" }));
  if (rows.length) await db.tontinePayment.createMany({ data: rows });
}

const ROLE_LABEL: Record<string, string> = { president: "Président", member: "Membre" };

type TontineType = Awaited<ReturnType<typeof db.tontine.findUnique>>;
type NonNullTontine = Exclude<TontineType, null>;

/* ══════════════════════════ sérialisation ══════════════════════════ */

async function serializeTontine(t: NonNullTontine, myUserId: string, detailed: boolean) {
  const members = await db.tontineMember.findMany({ where: { tontineId: t.id }, orderBy: { joinedAt: "asc" } });
  const nameByUser = new Map(members.map((m) => [m.userId, m.displayName]));
  const me = members.find((m) => m.userId === myUserId);
  const memberCount = members.length;
  const rounds = await db.tontineRound.findMany({
    where: { tontineId: t.id, cycleNumber: t.cycleNumber },
    orderBy: { roundNumber: "asc" },
    include: { payments: true },
  });
  const currentRound = rounds.find((r) => r.status === "current") ?? null;
  const collectedPot = currentRound
    ? currentRound.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0)
    : 0;
  // Statuts de la réunion en cours : visibles du groupe (défaut) ou du bureau seul.
  const showStatuses = t.visibility === "group" || (me?.role ?? "member") === "president";

  const myPayment = currentRound?.payments.find((p) => p.userId === myUserId) ?? null;

  const nextMeeting = currentRound
    ? {
        id: currentRound.id,
        roundNumber: currentRound.roundNumber,
        scheduledDate: currentRound.scheduledDate,
        recipientUserId: currentRound.recipientUserId,
        recipientName: nameByUser.get(currentRound.recipientUserId) ?? "Membre",
        isMyTurn: currentRound.recipientUserId === myUserId,
        expectedPot: currentRound.expectedPot,
        collectedPot,
        potHanded: !!currentRound.potHandedAt,
        potConfirmed: !!currentRound.potConfirmedAt,
        myDue: myPayment
          ? { status: myPayment.status, amount: myPayment.amount, method: myPayment.method, receiptNumber: myPayment.receiptNumber }
          : null,
      }
    : null;

  const base = {
    id: t.id,
    name: t.name,
    status: t.status,
    cycleNumber: t.cycleNumber,
    frequency: t.frequency,
    meetingDay: t.meetingDay,
    amount: t.amount,
    recipientPays: t.recipientPays,
    orderMode: t.orderMode,
    visibility: t.visibility,
    meals: t.meals,
    mealsAmount: t.mealsAmount,
    locationMode: t.locationMode,
    fixedLocation: t.fixedLocation,
    memberCount,
    myRole: me?.role ?? null,
    myRoleLabel: me ? (ROLE_LABEL[me.role] ?? me.role) : null,
    myPosition: me?.position ?? null,
    myJoined: !!me,
    startedAt: t.startedAt,
    createdAt: t.createdAt,
    nextMeeting,
  };

  if (!detailed) return base;

  const myPayments = await db.tontinePayment.findMany({
    where: { tontineId: t.id, userId: myUserId },
    include: { round: true },
  });

  // Phase 2 — données additionnelles (visibilité validée : amendes et présences PRIVÉES)
  const roundIds = rounds.map((r) => r.id);
  const attendanceRows = roundIds.length
    ? await db.tontineAttendance.findMany({ where: { tontineId: t.id, roundId: { in: roundIds } } })
    : [];
  const finesRows = roundIds.length
    ? await db.tontineFine.findMany({ where: { tontineId: t.id, roundId: { in: roundIds } }, orderBy: { createdAt: "asc" } })
    : [];
  const isBureau = (me?.role ?? "member") === "president";
  const fineOut = (f: (typeof finesRows)[number]) => ({
    id: f.id, userId: f.userId, userName: isBureau || f.userId === myUserId ? nameByUser.get(f.userId) ?? "Membre" : undefined,
    roundId: f.roundId, type: f.type, amount: f.amount, note: f.note, status: f.status,
    destination: f.destination, createdAt: f.createdAt, paidAt: f.paidAt,
  });

  let solidarity: { balance: number; movements: Record<string, unknown>[] } | null = null;
  if (t.solidarityEnabled) {
    const moves = await db.tontineSolidarityMove.findMany({ where: { tontineId: t.id }, orderBy: { createdAt: "desc" }, take: 60 });
    const allMoves = await db.tontineSolidarityMove.findMany({ where: { tontineId: t.id } });
    const balance = allMoves.reduce((s, m) => s + (m.direction === "in" ? m.amount : -m.amount), 0);
    solidarity = {
      balance,
      movements: moves.map((m) => ({
        id: m.id, direction: m.direction, source: m.source, amount: m.amount, note: m.note,
        userName: m.userId ? nameByUser.get(m.userId) ?? null : null, by: nameByUser.get(m.createdBy) ?? "Bureau", at: m.createdAt,
      })),
    };
  }

  const auditRows = await db.tontineAudit.findMany({ where: { tontineId: t.id }, orderBy: { createdAt: "desc" }, take: 40 });

  const roundsOut = rounds.map((r) => {
    const statuses: Record<string, string> = {};
    for (const p of r.payments) statuses[p.userId] = p.status;
    const collected = r.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    // Réunion en cours : selon la visibilité choisie ; historiques : bureau seul.
    const canSeeStatuses = r.status === "current" ? showStatuses : isBureau;
    const roundAttendance = attendanceRows.filter((a) => a.roundId === r.id);
    const roundFines = finesRows.filter((f) => f.roundId === r.id);
    return {
      id: r.id,
      roundNumber: r.roundNumber,
      cycleNumber: r.cycleNumber,
      scheduledDate: r.scheduledDate,
      recipientUserId: r.recipientUserId,
      recipientName: nameByUser.get(r.recipientUserId) ?? "Membre",
      expectedPot: r.expectedPot,
      collectedPot: collected,
      status: r.status,
      potHandedAmount: r.potHandedAmount,
      potHanded: !!r.potHandedAt,
      potHandedAt: r.potHandedAt,
      potConfirmed: !!r.potConfirmedAt,
      isMyTurn: r.recipientUserId === myUserId,
      canSeeStatuses,
      statuses: canSeeStatuses ? statuses : myUserId in statuses ? { [myUserId]: statuses[myUserId] } : {},
      // Compte rendu — visible du groupe (c'est la mémoire officielle de la réunion)
      report: r.reportText ? { text: r.reportText, by: nameByUser.get(r.reportBy ?? "") ?? "Bureau", at: r.reportAt } : null,
      // Présences — PRIVÉES : le bureau voit tout, le membre ne voit que la sienne
      myAttendance: roundAttendance.find((a) => a.userId === myUserId)?.status ?? null,
      attendance: isBureau ? Object.fromEntries(roundAttendance.map((a) => [a.userId, a.status])) : undefined,
      // Amendes — PRIVÉES : idem
      fines: isBureau ? roundFines.map(fineOut) : roundFines.filter((f) => f.userId === myUserId).map(fineOut),
    };
  });

  return {
    ...base,
    finesEnabled: t.finesEnabled,
    finesLateAmount: t.finesLateAmount,
    finesAbsenceAmount: t.finesAbsenceAmount,
    solidarityEnabled: t.solidarityEnabled,
    drawSeed: t.drawSeed,
    drawHash: t.drawHash,
    members: members.map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      role: m.role,
      roleLabel: ROLE_LABEL[m.role] ?? m.role,
      position: m.position,
      garantUserId: m.garantUserId,
      garantName: m.garantUserId ? nameByUser.get(m.garantUserId) ?? null : null,
      joinedAt: m.joinedAt,
      isMe: m.userId === myUserId,
    })),
    rounds: roundsOut,
    solidarity,
    audit: auditRows.map((a) => ({
      id: a.id, action: a.action, detail: a.detail, by: nameByUser.get(a.actorUserId ?? "") ?? "Bureau", at: a.createdAt,
    })),
    myPayments: myPayments.map((p) => ({
      id: p.id,
      roundId: p.roundId,
      roundNumber: p.round.roundNumber,
      scheduledDate: p.round.scheduledDate,
      amount: p.amount,
      status: p.status,
      method: p.method,
      reference: p.reference,
      receiptNumber: p.receiptNumber,
      declaredAt: p.declaredAt,
      confirmedAt: p.confirmedAt,
    })),
    isBureau,
    canStart: t.status === "formation" && (me?.role ?? "") === "president" && memberCount >= 2,
  };
}

/* ══════════════════════════ GET ══════════════════════════ */

/* ─── Tontine par défaut : comme les autres pages de l'app, la tontine existe
       dès l'arrivée. Créée automatiquement une seule fois par famille, avec les
       réglages de la co-conception (mensuelle, le 5, 10 000 FCFA) — le président
       peut tout ajuster dans « Réglages » avant de démarrer le cycle. ─── */
async function ensureDefaultTontine(famId: string, uid: string): Promise<void> {
  try {
    const existing = await db.tontine.findFirst({ where: { familyId: famId }, select: { id: true } });
    if (existing) return;
    const family = await db.family.findUnique({ where: { id: famId }, select: { name: true } });
    // Président = premier responsable familial connu, sinon le premier membre qui ouvre la page.
    const admin = await db.user.findFirst({
      where: { role: { in: ["PATRIARCHE", "CHEF_BRANCHE", "SECRETAIRE", "CONSEIL"] }, member: { familyId: famId } },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true },
    });
    const me = await db.user.findUnique({ where: { id: uid }, select: { fullName: true } });
    const presidentId = admin?.id ?? uid;
    const presidentName = admin?.fullName ?? me?.fullName ?? "Membre";
    const created = await db.tontine.create({
      data: {
        familyId: famId,
        name: `Tontine de la ${family?.name ?? "famille"}`,
        frequency: "monthly", meetingDay: 5, amount: 10000, recipientPays: false,
        orderMode: "random", visibility: "group", meals: "none", locationMode: "host",
        solidarityEnabled: false, finesEnabled: false,
        status: "formation", cycleNumber: 1, createdBy: presidentId,
      },
    });
    const founders: Array<{ id: string; name: string }> = [{ id: presidentId, name: presidentName }];
    if (uid !== presidentId) founders.push({ id: uid, name: me?.fullName ?? "Membre" });
    for (const f of founders) {
      await db.tontineMember.create({
        data: {
          tontineId: created.id, userId: f.id, displayName: f.name,
          role: f.id === presidentId ? "president" : "member",
        },
      });
    }
    await tontineAudit(created.id, "TONTINE_DEFAULT", "Tontine par défaut de la famille — réglages ajustables par le président avant le démarrage du cycle.", presidentId);
    await logSecurity(presidentId, "TONTINE_DEFAULT_CREATED", `Tontine par défaut de ${family?.name ?? "la famille"} créée automatiquement`);
  } catch {
    /* course entre deux membres : la première tontine créée gagne */
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth) return NextResponse.json({ ok: false, error: "Session expirée." }, { status: 401 });
  const uid = auth.user.id;
  const famId = await familyIdOf(uid);
  if (!famId) return NextResponse.json({ ok: false, error: "Aucun profil membre relié à ce compte." }, { status: 400 });

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "overview";

  // La tontine familiale par défaut est là avant même le premier clic.
  if (view !== "detail") await ensureDefaultTontine(famId, uid);

  if (view === "detail") {
    const id = url.searchParams.get("id") || "";
    const t = await db.tontine.findUnique({ where: { id } });
    if (!t || t.familyId !== famId) return NextResponse.json({ ok: false, error: "Tontine introuvable." }, { status: 404 });
    const membership = await db.tontineMember.findUnique({ where: { tontineId_userId: { tontineId: id, userId: uid } } });
    if (!membership) return NextResponse.json({ ok: false, error: "Seuls les membres de cette tontine voient son contenu." }, { status: 403 });
    return NextResponse.json({ ok: true, tontine: await serializeTontine(t, uid, true) });
  }

  // ── overview ──
  const myMemberships = await db.tontineMember.findMany({ where: { userId: uid } });
  const myTontineIds = myMemberships.map((m) => m.tontineId);
  const mine = myTontineIds.length
    ? await db.tontine.findMany({ where: { id: { in: myTontineIds }, familyId: famId }, orderBy: { createdAt: "desc" } })
    : [];
  const joinable = await db.tontine.findMany({
    where: { familyId: famId, status: "formation", id: { notIn: myTontineIds } },
    orderBy: { createdAt: "desc" },
  });

  const myTontines: Awaited<ReturnType<typeof serializeTontine>>[] = [];
  for (const t of mine) myTontines.push(await serializeTontine(t, uid, false));

  const joinableOut: Record<string, unknown>[] = [];
  for (const t of joinable) {
    const memberCount = await db.tontineMember.count({ where: { tontineId: t.id } });
    joinableOut.push({
      id: t.id, name: t.name, amount: t.amount, frequency: t.frequency, meetingDay: t.meetingDay,
      memberCount, createdAt: t.createdAt, recipientPays: t.recipientPays, orderMode: t.orderMode,
    });
  }

  // ── Mes cotisations (unifié) : tous mes versements de tontine ──
  const myDues = myTontineIds.length
    ? await db.tontinePayment.findMany({
        where: { userId: uid, tontineId: { in: myTontineIds } },
        include: { round: true },
      })
    : [];
  myDues.sort((a, b) => (a.round.scheduledDate < b.round.scheduledDate ? 1 : -1));
  const tontineNames = new Map<string, string>();
  if (myTontineIds.length) {
    const ts = await db.tontine.findMany({ where: { id: { in: myTontineIds } } });
    for (const t of ts) tontineNames.set(t.id, t.name);
  }
  const duesOut = myDues.map((p) => ({
    id: p.id,
    tontineId: p.tontineId,
    tontineName: tontineNames.get(p.tontineId) ?? "Tontine",
    roundNumber: p.round.roundNumber,
    cycleNumber: p.round.cycleNumber,
    scheduledDate: p.round.scheduledDate,
    amount: p.amount,
    status: p.status,
    method: p.method,
    reference: p.reference,
    receiptNumber: p.receiptNumber,
    declaredAt: p.declaredAt,
    confirmedAt: p.confirmedAt,
  }));

  // ── Ce que j'ai reçu : pots confirmés dont je suis le bénéficiaire ──
  const myRounds = myTontineIds.length
    ? await db.tontineRound.findMany({
        where: { recipientUserId: uid, potConfirmedAt: { not: null } },
        include: { tontine: true },
        orderBy: { potConfirmedAt: "desc" },
      })
    : [];
  const myReceived = myRounds.map((r) => ({
    tontineId: r.tontineId,
    tontineName: r.tontine.name,
    roundNumber: r.roundNumber,
    scheduledDate: r.scheduledDate,
    amount: r.potHandedAmount ?? r.expectedPot,
    confirmedAt: r.potConfirmedAt,
  }));

  // ── Statistiques personnelles ──
  const totalPaid = myDues.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalReceived = myReceived.reduce((s, p) => s + p.amount, 0);
  const onTime = myDues.filter(
    (p) =>
      p.status === "paid" && p.confirmedAt &&
      p.confirmedAt.toISOString().slice(0, 10) <= p.round.scheduledDate
  ).length;
  const paidCount = myDues.filter((p) => p.status === "paid").length;
  let myPosition: number | null = null;
  let myRoundDate: string | null = null;
  for (const t of mine) {
    if (t.status !== "active") continue;
    const myRound = await db.tontineRound.findFirst({
      where: { tontineId: t.id, cycleNumber: t.cycleNumber, recipientUserId: uid },
    });
    if (myRound) {
      myRoundDate = myRound.scheduledDate;
      myPosition = myRound.roundNumber;
      break;
    }
  }

  // ── Phase 2 : mes amendes + mes présences (données PRIVÉES, cf. mod 3) ──
  const myFines = myTontineIds.length
    ? await db.tontineFine.findMany({ where: { userId: uid, tontineId: { in: myTontineIds } }, orderBy: { createdAt: "desc" } })
    : [];
  const finesDue = myFines.filter((f) => f.status === "due").reduce((s, f) => s + f.amount, 0);
  const finesPaid = myFines.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const myAttendanceRows = myTontineIds.length
    ? await db.tontineAttendance.findMany({ where: { userId: uid, tontineId: { in: myTontineIds } } })
    : [];
  const attTotal = myAttendanceRows.length;
  const attPresent = myAttendanceRows.filter((a) => a.status === "present").length;
  const presenceRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;
  const myFinesOut = myFines.map((f) => ({
    id: f.id, tontineId: f.tontineId, tontineName: tontineNames.get(f.tontineId) ?? "Tontine",
    roundId: f.roundId, type: f.type, amount: f.amount, note: f.note, status: f.status,
    destination: f.destination, createdAt: f.createdAt, paidAt: f.paidAt,
  }));

  return NextResponse.json({
    ok: true,
    myTontines,
    joinableTontines: joinableOut,
    myDues: duesOut,
    myReceived,
    myFines: myFinesOut,
    myStats: {
      totalPaid,
      totalReceived,
      balance: totalReceived - totalPaid,
      paidCount,
      onTimeCount: onTime,
      ponctualite: paidCount > 0 ? Math.round((onTime / paidCount) * 100) : null,
      myPosition,
      myRoundDate,
      finesDue,
      finesPaid,
      presenceRate,
      attendanceCount: attTotal,
    },
  });
}

/* ══════════════════════════ POST (actions) ══════════════════════════ */

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth) return NextResponse.json({ ok: false, error: "Session expirée." }, { status: 401 });
  const uid = auth.user.id;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action || "");
  const famId = await familyIdOf(uid);
  if (!famId) return NextResponse.json({ ok: false, error: "Aucun profil membre relié à ce compte." }, { status: 400 });

  const displayName = auth.user.fullName;

  /* ── create : les 5 questions, puis validation par chacun ── */
  if (action === "create") {
    const name = String(b.name || "").trim().slice(0, 80) || "Tontine familiale";
    const frequency = ["weekly", "biweekly", "monthly"].includes(String(b.frequency)) ? String(b.frequency) : "monthly";
    const meetingDay = Math.max(0, Math.min(28, parseInt(String(b.meetingDay ?? "1"), 10) || 1));
    const amount = Math.round(Number(b.amount));
    if (!isFinite(amount) || amount < 100)
      return NextResponse.json({ ok: false, error: "Indiquez un montant de cotisation (au moins 100 FCFA)." }, { status: 400 });
    if (amount > 10_000_000) return NextResponse.json({ ok: false, error: "Montant trop élevé." }, { status: 400 });
    const recipientPays = b.recipientPays === true;
    const orderMode = String(b.orderMode) === "seniority" ? "seniority" : "random";
    const visibility = String(b.visibility) === "bureau" ? "bureau" : "group";
    const meals = ["none", "host", "fixed"].includes(String(b.meals)) ? String(b.meals) : "none";
    const mealsAmount = meals === "fixed" ? Math.max(0, Math.round(Number(b.mealsAmount) || 0)) : null;
    const locationMode = String(b.locationMode) === "fixed" ? "fixed" : "host";
    const fixedLocation = locationMode === "fixed" ? String(b.fixedLocation || "").trim().slice(0, 120) || null : null;
    // Phase 2 — Formule 2 (caisse de solidarité) + amendes optionnelles (off par défaut)
    const solidarityEnabled = b.solidarityEnabled === true;
    const finesEnabled = b.finesEnabled === true;
    const finesLateAmount = finesEnabled ? Math.max(0, Math.round(Number(b.finesLateAmount) || 0)) || null : null;
    const finesAbsenceAmount = finesEnabled ? Math.max(0, Math.round(Number(b.finesAbsenceAmount) || 0)) || null : null;
    if (b.accept !== true)
      return NextResponse.json({ ok: false, error: "Vous devez accepter le règlement pour créer la tontine." }, { status: 400 });

    const t = await db.tontine.create({
      data: {
        familyId: famId, name, frequency, meetingDay, amount, recipientPays, orderMode,
        visibility, meals, mealsAmount, locationMode, fixedLocation,
        solidarityEnabled, finesEnabled, finesLateAmount, finesAbsenceAmount,
        createdBy: uid, status: "formation",
      },
    });
    await db.tontineMember.create({ data: { tontineId: t.id, userId: uid, displayName, role: "president" } });
    await logSecurity(uid, "TONTINE_CREATED", `${name} — ${fmtFcfa(amount)} / ${frequency}`);
    return NextResponse.json({ ok: true, tontineId: t.id });
  }

  /* ── join : rejoindre = accepter le règlement (tontines en formation) ── */
  if (action === "join") {
    const t = await db.tontine.findUnique({ where: { id: String(b.tontineId || "") } });
    if (!t || t.familyId !== famId) return NextResponse.json({ ok: false, error: "Tontine introuvable." }, { status: 404 });
    if (t.status !== "formation")
      return NextResponse.json({ ok: false, error: "Le cycle a déjà démarré — vous pourrez rejoindre au prochain cycle." }, { status: 400 });
    const existing = await db.tontineMember.findUnique({ where: { tontineId_userId: { tontineId: t.id, userId: uid } } });
    if (existing) return NextResponse.json({ ok: true, tontineId: t.id });
    await db.tontineMember.create({ data: { tontineId: t.id, userId: uid, displayName, role: "member" } });
    const president = await db.tontineMember.findFirst({ where: { tontineId: t.id, role: "president" } });
    if (president && president.userId !== uid) {
      await notify(president.userId, {
        univers: "U4", typeCode: "TONTINE_JOIN", title: "Tontine — nouveau membre",
        body: `${displayName} a rejoint « ${t.name} » et accepté le règlement.`,
        link: "/#tontine",
      });
    }
    return NextResponse.json({ ok: true, tontineId: t.id });
  }

  /* ── les actions suivantes exigent d'être membre ── */
  const tontineId = String(b.tontineId || "");
  const t = await db.tontine.findUnique({ where: { id: tontineId } });
  if (!t || t.familyId !== famId) return NextResponse.json({ ok: false, error: "Tontine introuvable." }, { status: 404 });
  const membership = await db.tontineMember.findUnique({ where: { tontineId_userId: { tontineId, userId: uid } } });
  if (!membership) return NextResponse.json({ ok: false, error: "Seuls les membres de cette tontine peuvent agir." }, { status: 403 });
  const isPresident = membership.role === "president";
  const members = await db.tontineMember.findMany({ where: { tontineId }, orderBy: { joinedAt: "asc" } });
  const nameByUser = new Map(members.map((m) => [m.userId, m.displayName]));

  /* ── update_config : réglages ajustables par le président tant que le cycle
        n'est pas en cours (règle d'or : un changement ne vaut qu'au cycle suivant) ── */
  if (action === "update_config") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président peut modifier les réglages." }, { status: 403 });
    if (t.status === "active") return NextResponse.json({ ok: false, error: "Réunion en cours — les réglages se rouvriront dès le cycle terminé." }, { status: 400 });
    if (t.status === "closed") return NextResponse.json({ ok: false, error: "Cette tontine est fermée — ses réglages ne changent plus." }, { status: 400 });
    const name = String(b.name ?? t.name).trim().slice(0, 80) || t.name;
    const frequency = ["weekly", "biweekly", "monthly"].includes(String(b.frequency)) ? String(b.frequency) : t.frequency;
    const meetingDay = Math.max(0, Math.min(28, parseInt(String(b.meetingDay ?? t.meetingDay), 10) || t.meetingDay || 1));
    const amount = b.amount === undefined ? t.amount : Math.round(Number(b.amount));
    if (!isFinite(amount) || amount < 100) return NextResponse.json({ ok: false, error: "Indiquez un montant de cotisation (au moins 100 FCFA)." }, { status: 400 });
    if (amount > 10_000_000) return NextResponse.json({ ok: false, error: "Montant trop élevé." }, { status: 400 });
    const recipientPays = b.recipientPays === undefined ? t.recipientPays : b.recipientPays === true;
    const visibility = String(b.visibility ?? t.visibility) === "bureau" ? "bureau" : "group";
    const meals = ["none", "host", "fixed"].includes(String(b.meals)) ? String(b.meals) : t.meals || "none";
    const mealsAmount = meals === "fixed" ? Math.max(0, Math.round(Number(b.mealsAmount ?? t.mealsAmount) || 0)) : null;
    const locationMode = String(b.locationMode ?? t.locationMode) === "fixed" ? "fixed" : "host";
    const fixedLocation = locationMode === "fixed" ? String(b.fixedLocation ?? t.fixedLocation ?? "").trim().slice(0, 120) || null : null;
    const solidarityEnabled = b.solidarityEnabled === undefined ? t.solidarityEnabled : b.solidarityEnabled === true;
    const finesEnabled = b.finesEnabled === undefined ? t.finesEnabled : b.finesEnabled === true;
    const finesLateAmount = finesEnabled ? Math.max(0, Math.round(Number(b.finesLateAmount) || 0)) || null : null;
    const finesAbsenceAmount = finesEnabled ? Math.max(0, Math.round(Number(b.finesAbsenceAmount) || 0)) || null : null;
    await db.tontine.update({
      where: { id: tontineId },
      data: { name, frequency, meetingDay, amount, recipientPays, visibility, meals, mealsAmount, locationMode, fixedLocation, solidarityEnabled, finesEnabled, finesLateAmount, finesAbsenceAmount },
    });
    await tontineAudit(tontineId, "TONTINE_REGLAGES", `Réglages mis à jour par le président — ${amount.toLocaleString("fr-FR")} FCFA / ${frequency}, lieu ${locationMode === "fixed" ? fixedLocation ?? "lieu fixe" : "chez le receveur"}${solidarityEnabled ? ", Formule 2 (solidarité) activée" : ""}${finesEnabled ? ", amendes activées" : ""}.`, uid);
    await logSecurity(uid, "TONTINE_CONFIG_UPDATED", `${name} — ${amount.toLocaleString("fr-FR")} FCFA / ${frequency}`);
    return NextResponse.json({ ok: true, tontineId });
  }

  /* ── start : tirage/ordre + calendrier + échéances ── */
  if (action === "start") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président démarre le cycle." }, { status: 403 });
    if (t.status !== "formation") return NextResponse.json({ ok: false, error: "Le cycle est déjà démarré." }, { status: 400 });
    if (members.length < 2) return NextResponse.json({ ok: false, error: "Il faut au moins 2 membres pour démarrer une tontine." }, { status: 400 });
    // Tirage vérifiable : graine publique + empreinte publiée, recalculable par chaque membre.
    const joinedIds = members.map((m) => m.userId);
    const seedHex = randomSeedHex();
    const order = t.orderMode === "random" ? await drawInitialOrder(seedHex, joinedIds) : joinedIds;
    const dHash = await drawHashOf(seedHex, order);
    const dates = generateRoundDates(t.frequency, t.meetingDay, order.length);
    for (let i = 0; i < order.length; i++) {
      await db.tontineMember.update({
        where: { tontineId_userId: { tontineId, userId: order[i] } },
        data: { position: i + 1 },
      });
      const round = await db.tontineRound.create({
        data: {
          tontineId, cycleNumber: t.cycleNumber, roundNumber: i + 1, scheduledDate: dates[i],
          recipientUserId: order[i], expectedPot: expectedPotFor(t, order.length),
          status: i === 0 ? "current" : "upcoming",
        },
      });
      await createDuesForRound(tontineId, round.id, members, t.amount, order[i], t.recipientPays);
    }
    await db.tontine.update({ where: { id: tontineId }, data: { status: "active", startedAt: new Date(), drawSeed: seedHex, drawHash: dHash } });
    await tontineAudit(tontineId, "TONTINE_DRAW", `Tirage vérifiable du cycle n°${t.cycleNumber} — ${order.length} membres, graine ${seedHex.slice(0, 8)}…, empreinte ${dHash.slice(0, 8)}…`, uid);
    await logSecurity(uid, "TONTINE_STARTED", `${t.name} — cycle ${t.cycleNumber}, ${order.length} tours`);
    const first = nameByUser.get(order[0]) ?? "un membre";
    for (const m of members) {
      if (m.userId === uid) continue;
      await notify(m.userId, {
        univers: "U4", typeCode: "TONTINE_STARTED", title: `Tontine « ${t.name} » démarrée`,
        body: `Ordre des tours tiré et calendrier publié. Première réunion : ${dates[0]} — réception de ${first}.`,
        link: "/#tontine",
      });
    }
    return NextResponse.json({ ok: true, order, dates });
  }

  /* ── declare : « J'ai payé » — déclaration du membre (suivi déclaratif) ── */
  if (action === "declare") {
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    if (round.status !== "current") return NextResponse.json({ ok: false, error: "Cette réunion n'est pas en cours." }, { status: 400 });
    const payment = await db.tontinePayment.findUnique({ where: { roundId_userId: { roundId: round.id, userId: uid } } });
    if (!payment) return NextResponse.json({ ok: false, error: "Aucune cotisation attendue de vous pour cette réunion." }, { status: 400 });
    if (payment.status === "exempt") return NextResponse.json({ ok: false, error: "Vous êtes dispensé pour cette réunion." }, { status: 400 });
    if (payment.status === "paid") return NextResponse.json({ ok: true });
    const method = ["cash", "momo", "transfer"].includes(String(b.method)) ? String(b.method) : "cash";
    const reference = String(b.reference || "").trim().slice(0, 60) || null;
    await db.tontinePayment.update({
      where: { id: payment.id },
      data: { status: "declared", method, reference, declaredAt: new Date() },
    });
    const president = members.find((m) => m.role === "president");
    if (president && president.userId !== uid) {
      await notify(president.userId, {
        univers: "U4", typeCode: "TONTINE_DECLARE", title: "Tontine — versement à confirmer",
        body: `${displayName} déclare avoir versé ${fmtFcfa(payment.amount)} (réunion n°${round.roundNumber}). Confirmez à la réunion.`,
        link: "/#tontine",
      });
    }
    return NextResponse.json({ ok: true });
  }

  /* ── encaisser : le président (trésorier) enregistre un versement ── */
  if (action === "encaisser") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président (trésorier) enregistre les versements." }, { status: 403 });
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    if (round.status !== "current") return NextResponse.json({ ok: false, error: "Cette réunion n'est pas en cours." }, { status: 400 });
    const targetUserId = String(b.userId || uid);
    const payment = await db.tontinePayment.findUnique({ where: { roundId_userId: { roundId: round.id, userId: targetUserId } } });
    if (!payment) return NextResponse.json({ ok: false, error: "Aucune cotisation attendue pour ce membre." }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ ok: true, receiptNumber: payment.receiptNumber });
    if (payment.status === "exempt") return NextResponse.json({ ok: false, error: "Ce membre est dispensé pour cette réunion." }, { status: 400 });
    const receiptNumber = await nextReceiptNumber();
    const method = ["cash", "momo", "transfer"].includes(String(b.method)) ? String(b.method) : "cash";
    const reference = String(b.reference || "").trim().slice(0, 60) || null;
    await db.tontinePayment.update({
      where: { id: payment.id },
      data: {
        status: "paid", method, reference, receiptNumber,
        declaredAt: payment.declaredAt ?? new Date(), confirmedBy: uid, confirmedAt: new Date(),
      },
    });
    if (targetUserId !== uid) {
      await notify(targetUserId, {
        univers: "U4", typeCode: "TONTINE_RECEIPT", title: `Reçu ${receiptNumber} émis`,
        body: `Votre cotisation de ${fmtFcfa(payment.amount)} à « ${t.name} » (réunion n°${round.roundNumber}) est enregistrée.`,
        link: "/#tontine",
      });
    }
    return NextResponse.json({ ok: true, receiptNumber });
  }

  /* ── confirmer : le président confirme une déclaration → reçu émis ── */
  if (action === "confirmer") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président (trésorier) confirme les versements." }, { status: 403 });
    const payment = await db.tontinePayment.findUnique({ where: { id: String(b.paymentId || "") } });
    if (!payment || payment.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Versement introuvable." }, { status: 404 });
    if (payment.status !== "declared") return NextResponse.json({ ok: false, error: "Ce versement n'est pas en attente de confirmation." }, { status: 400 });
    const receiptNumber = await nextReceiptNumber();
    await db.tontinePayment.update({
      where: { id: payment.id },
      data: { status: "paid", receiptNumber, confirmedBy: uid, confirmedAt: new Date() },
    });
    if (payment.userId !== uid) {
      await notify(payment.userId, {
        univers: "U4", typeCode: "TONTINE_RECEIPT", title: `Reçu ${receiptNumber} émis`,
        body: `Votre cotisation de ${fmtFcfa(payment.amount)} à « ${t.name} » est confirmée. Le reçu est dans « Mes cotisations ».`,
        link: "/#tontine",
      });
    }
    return NextResponse.json({ ok: true, receiptNumber });
  }

  /* ── dispenser : dispense discrète (dignité préservée) ── */
  if (action === "dispenser") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président accorde une dispense." }, { status: 403 });
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    const targetUserId = String(b.userId || "");
    const payment = await db.tontinePayment.findUnique({ where: { roundId_userId: { roundId: round.id, userId: targetUserId } } });
    if (!payment) return NextResponse.json({ ok: false, error: "Aucune cotisation attendue pour ce membre." }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ ok: false, error: "Ce membre a déjà payé cette réunion." }, { status: 400 });
    await db.tontinePayment.update({
      where: { id: payment.id },
      data: { status: "exempt", confirmedBy: uid, confirmedAt: new Date() },
    });
    await logSecurity(uid, "TONTINE_EXEMPT", `${t.name} — réunion n°${round.roundNumber}, membre ${nameByUser.get(targetUserId) ?? targetUserId}`);
    return NextResponse.json({ ok: true });
  }

  /* ── remettre : le pot est remis (jamais par le bénéficiaire lui-même) ── */
  if (action === "remettre") {
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    if (round.status !== "current") return NextResponse.json({ ok: false, error: "Cette réunion n'est pas en cours." }, { status: 400 });
    if (round.potHandedAt) return NextResponse.json({ ok: false, error: "Le pot a déjà été remis pour cette réunion." }, { status: 400 });
    if (round.recipientUserId === uid)
      return NextResponse.json(
        { ok: false, error: "Règle de prudence : le bénéficiaire ne peut pas enregistrer lui-même la remise du pot. Un autre membre l'enregistre, puis vous confirmez la réception." },
        { status: 403 }
      );
    const payments = await db.tontinePayment.findMany({ where: { roundId: round.id } });
    const collected = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const amount = Math.max(0, Math.round(Number(b.amount)));
    if (!isFinite(amount) || amount <= 0) return NextResponse.json({ ok: false, error: "Indiquez le montant du pot remis." }, { status: 400 });
    if (amount > collected)
      return NextResponse.json({ ok: false, error: `Le montant dépasse le total encaissé (${fmtFcfa(collected)}).` }, { status: 400 });
    await db.tontineRound.update({
      where: { id: round.id },
      data: { potHandedAmount: amount, potHandedBy: uid, potHandedAt: new Date().toISOString() },
    });
    await logSecurity(uid, "TONTINE_POT_HANDED", `${t.name} — réunion n°${round.roundNumber}, ${fmtFcfa(amount)} à ${nameByUser.get(round.recipientUserId) ?? round.recipientUserId}`);
    await notify(round.recipientUserId, {
      univers: "U4", typeCode: "TONTINE_POT", priority: "HAUTE",
      title: "À votre tour de confirmer",
      body: `${fmtFcfa(amount)} vous a été remis (réunion n°${round.roundNumber}). Confirmez : « J'ai reçu le pot ».`,
      link: "/#tontine",
    });
    return NextResponse.json({ ok: true, amount });
  }

  /* ── confirmer_pot : « J'ai reçu le pot » — la preuve que le tour est terminé ── */
  if (action === "confirmer_pot") {
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    if (round.status !== "current" || !round.potHandedAt)
      return NextResponse.json({ ok: false, error: "Aucun pot en attente de confirmation." }, { status: 400 });
    if (round.recipientUserId !== uid) return NextResponse.json({ ok: false, error: "Seul le bénéficiaire confirme la réception du pot." }, { status: 403 });
    if (round.potConfirmedAt) return NextResponse.json({ ok: true });
    await db.tontineRound.update({
      where: { id: round.id },
      data: { potConfirmedBy: uid, potConfirmedAt: new Date().toISOString() },
    });
    const allRounds = await db.tontineRound.findMany({
      where: { tontineId, cycleNumber: t.cycleNumber },
      orderBy: { roundNumber: "asc" },
    });
    const next = allRounds.find((r) => r.status === "upcoming");
    await db.tontineRound.update({ where: { id: round.id }, data: { status: "completed" } });
    let cycleCompleted = false;
    if (next) {
      await db.tontineRound.update({ where: { id: next.id }, data: { status: "current" } });
      const nextName = nameByUser.get(next.recipientUserId) ?? "un membre";
      for (const m of members) {
        if (m.userId === uid) continue;
        await notify(m.userId, {
          univers: "U4", typeCode: "TONTINE_NEXT", title: "Tour suivant",
          body: `Réunion n°${round.roundNumber} close — pot de ${fmtFcfa(round.potHandedAmount ?? 0)} confirmé. Prochain tour : ${nextName}, le ${next.scheduledDate}.`,
          link: "/#tontine",
        });
      }
    } else {
      cycleCompleted = true;
      await db.tontine.update({ where: { id: tontineId }, data: { status: "cycle_completed" } });
      for (const m of members) {
        await notify(m.userId, {
          univers: "U4", typeCode: "TONTINE_CYCLE_END", title: "Cycle terminé — bilan disponible",
          body: `Tout le monde a reçu son pot dans « ${t.name} ». Le président peut lancer un nouveau cycle.`,
          link: "/#tontine",
        });
      }
    }
    await logSecurity(uid, "TONTINE_POT_CONFIRMED", `${t.name} — réunion n°${round.roundNumber}, ${fmtFcfa(round.potHandedAmount ?? 0)} confirmés`);
    return NextResponse.json({ ok: true, nextRound: next ? next.roundNumber : null, cycleCompleted });
  }

  /* ── reporter : report d'une réunion à venir (le calendrier se décale) ── */
  if (action === "reporter") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président reporte une réunion." }, { status: 403 });
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    if (round.status === "completed") return NextResponse.json({ ok: false, error: "Cette réunion est déjà terminée." }, { status: 400 });
    const newDate = String(b.newDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return NextResponse.json({ ok: false, error: "Indiquez une nouvelle date (AAAA-MM-JJ)." }, { status: 400 });
    // Décale la réunion reportée et toutes les suivantes du même écart (rythme régulier conservé).
    const old = new Date(round.scheduledDate + "T00:00:00Z");
    const nw = new Date(newDate + "T00:00:00Z");
    const deltaDays = Math.round((nw.getTime() - old.getTime()) / 86400000);
    const pending = await db.tontineRound.findMany({
      where: { tontineId, cycleNumber: t.cycleNumber, status: { not: "completed" } },
      orderBy: { roundNumber: "asc" },
    });
    const idx = pending.findIndex((r) => r.id === round.id);
    for (let i = idx; i < pending.length; i++) {
      const shifted = new Date(pending[i].scheduledDate + "T00:00:00Z");
      shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
      await db.tontineRound.update({ where: { id: pending[i].id }, data: { scheduledDate: toISODate(shifted) } });
    }
    await logSecurity(uid, "TONTINE_POSTPONED", `${t.name} — réunion n°${round.roundNumber} reportée au ${newDate}`);
    await tontineAudit(tontineId, "TONTINE_POSTPONED", `Réunion n°${round.roundNumber} reportée au ${newDate}`, uid, round.id);
    for (const m of members) {
      if (m.userId === uid) continue;
      await notify(m.userId, {
        univers: "U4", typeCode: "TONTINE_POSTPONED", title: "Réunion reportée",
        body: `La réunion n°${round.roundNumber} de « ${t.name} » est reportée au ${newDate}. Le calendrier est à jour.`,
        link: "/#tontine",
      });
    }
    return NextResponse.json({ ok: true });
  }

  /* ── swap : deux membres échangent leur place (accord du président) ── */
  if (action === "swap") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président valide un échange de places." }, { status: 403 });
    const userA = String(b.userA || ""), userB = String(b.userB || "");
    const a = members.find((m) => m.userId === userA);
    const bb = members.find((m) => m.userId === userB);
    if (!a || !bb || !a.position || !bb.position)
      return NextResponse.json({ ok: false, error: "Membres introuvables ou ordre pas encore établi." }, { status: 400 });
    await db.tontineMember.update({ where: { id: a.id }, data: { position: bb.position } });
    await db.tontineMember.update({ where: { id: bb.id }, data: { position: a.position } });
    const pending = await db.tontineRound.findMany({
      where: { tontineId, cycleNumber: t.cycleNumber, status: { in: ["upcoming", "current"] } },
    });
    for (const r of pending) {
      if (r.recipientUserId === userA) await db.tontineRound.update({ where: { id: r.id }, data: { recipientUserId: userB } });
      else if (r.recipientUserId === userB) await db.tontineRound.update({ where: { id: r.id }, data: { recipientUserId: userA } });
    }
    await logSecurity(uid, "TONTINE_SWAP", `${t.name} — échange de places entre ${a.displayName} et ${bb.displayName}`);
    await tontineAudit(tontineId, "TONTINE_SWAP", `Échange de places : ${a.displayName} ↔ ${bb.displayName}`, uid);
    return NextResponse.json({ ok: true });
  }

  /* ── next_cycle : tout le monde a reçu → on recommence ── */
  if (action === "next_cycle") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président lance un nouveau cycle." }, { status: 403 });
    if (t.status !== "cycle_completed") return NextResponse.json({ ok: false, error: "Le cycle en cours n'est pas terminé." }, { status: 400 });
    const joinedIds = members.map((m) => m.userId);
    const seedHex = randomSeedHex();
    const order = t.orderMode === "random" ? await drawInitialOrder(seedHex, joinedIds) : joinedIds;
    const dHash = await drawHashOf(seedHex, order);
    const cycleNumber = t.cycleNumber + 1;
    const dates = generateRoundDates(t.frequency, t.meetingDay, order.length);
    for (let i = 0; i < order.length; i++) {
      await db.tontineMember.update({
        where: { tontineId_userId: { tontineId, userId: order[i] } },
        data: { position: i + 1 },
      });
      const round = await db.tontineRound.create({
        data: {
          tontineId, cycleNumber, roundNumber: i + 1, scheduledDate: dates[i],
          recipientUserId: order[i], expectedPot: expectedPotFor(t, order.length),
          status: i === 0 ? "current" : "upcoming",
        },
      });
      await createDuesForRound(tontineId, round.id, members, t.amount, order[i], t.recipientPays);
    }
    await db.tontine.update({ where: { id: tontineId }, data: { status: "active", cycleNumber, drawSeed: seedHex, drawHash: dHash } });
    await tontineAudit(tontineId, "TONTINE_DRAW", `Tirage vérifiable du cycle n°${cycleNumber} — ${order.length} membres, graine ${seedHex.slice(0, 8)}…, empreinte ${dHash.slice(0, 8)}…`, uid);
    await logSecurity(uid, "TONTINE_NEW_CYCLE", `${t.name} — cycle ${cycleNumber} lancé`);
    return NextResponse.json({ ok: true, cycleNumber, dates });
  }

  /* ════════ Phase 2 — bureau élargi : garants, présences, amendes, solidarité, compte rendu ════════ */

  /* ── set_garant : désigner (ou retirer) le garant d'un membre — engagement public ── */
  if (action === "set_garant") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président désigne les garants." }, { status: 403 });
    const targetUserId = String(b.userId || "");
    const garantUserId = String(b.garantUserId || "") || null;
    const target = members.find((m) => m.userId === targetUserId);
    if (!target) return NextResponse.json({ ok: false, error: "Membre introuvable." }, { status: 404 });
    if (garantUserId) {
      const garant = members.find((m) => m.userId === garantUserId);
      if (!garant) return NextResponse.json({ ok: false, error: "Le garant doit être membre de la tontine." }, { status: 400 });
      if (garantUserId === targetUserId) return NextResponse.json({ ok: false, error: "Un membre ne peut pas se garantir lui-même." }, { status: 400 });
    }
    await db.tontineMember.update({ where: { id: target.id }, data: { garantUserId } });
    if (garantUserId) {
      await tontineAudit(tontineId, "TONTINE_GARANT", `${target.displayName} est garanti(e) par ${nameByUser.get(garantUserId)}`, uid);
      if (garantUserId !== uid)
        await notify(garantUserId, { univers: "U4", typeCode: "TONTINE_GARANT", title: "On compte sur vous", body: `${target.displayName} vous a désigné comme garant(e) dans « ${t.name} » — engagement : couvrir sa cotisation en cas de coup dur.`, link: "/#tontine" });
      if (targetUserId !== uid)
        await notify(targetUserId, { univers: "U4", typeCode: "TONTINE_GARANT", title: "Garant désigné", body: `${nameByUser.get(garantUserId)} est votre garant(e) dans « ${t.name} ».`, link: "/#tontine" });
    } else {
      await tontineAudit(tontineId, "TONTINE_GARANT", `Garant retiré pour ${target.displayName}`, uid);
    }
    return NextResponse.json({ ok: true });
  }

  /* ── mark_attendance : présences de la réunion en cours — historique PRIVÉ ── */
  if (action === "mark_attendance") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président (secrétaire) note les présences." }, { status: 403 });
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    if (round.status === "completed") return NextResponse.json({ ok: false, error: "Cette réunion est déjà terminée." }, { status: 400 });
    const records = Array.isArray(b.records) ? (b.records as { userId?: unknown; status?: unknown }[]) : [];
    let saved = 0;
    const counts = { present: 0, absent: 0, excused: 0 };
    for (const rec of records) {
      const ru = String(rec.userId || "");
      const st = String(rec.status || "");
      if (!ru || !["present", "absent", "excused"].includes(st)) continue;
      if (!members.some((m) => m.userId === ru)) continue;
      const existing = await db.tontineAttendance.findUnique({ where: { roundId_userId: { roundId: round.id, userId: ru } } });
      if (existing) await db.tontineAttendance.update({ where: { id: existing.id }, data: { status: st, recordedBy: uid } });
      else await db.tontineAttendance.create({ data: { tontineId, roundId: round.id, userId: ru, status: st, recordedBy: uid } });
      counts[st as keyof typeof counts] += 1;
      saved += 1;
    }
    if (saved === 0) return NextResponse.json({ ok: false, error: "Aucune présence valide à enregistrer." }, { status: 400 });
    await tontineAudit(tontineId, "TONTINE_ATTENDANCE", `Présences enregistrées — réunion n°${round.roundNumber} : ${counts.present} présent(s), ${counts.absent} absent(s), ${counts.excused} excusé(s)`, uid, round.id);
    return NextResponse.json({ ok: true, saved });
  }

  /* ── add_fine : amende (optionnelle, OFF par défaut) — PRIVÉE : l'intéressé est notifié en privé ── */
  if (action === "add_fine") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président enregistre une amende." }, { status: 403 });
    if (!t.finesEnabled) return NextResponse.json({ ok: false, error: "Les amendes ne sont pas activées dans cette tontine." }, { status: 400 });
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    const targetUserId = String(b.userId || "");
    if (!members.some((m) => m.userId === targetUserId)) return NextResponse.json({ ok: false, error: "Membre introuvable." }, { status: 404 });
    const type = ["late", "absence", "partial", "other"].includes(String(b.type)) ? String(b.type) : "other";
    let amount = Math.round(Number(b.amount));
    if (type === "late" && t.finesLateAmount) amount = t.finesLateAmount;
    if (type === "absence" && t.finesAbsenceAmount) amount = t.finesAbsenceAmount;
    if (!isFinite(amount) || amount <= 0) return NextResponse.json({ ok: false, error: "Indiquez le montant de l'amende." }, { status: 400 });
    if (amount > 100_000) return NextResponse.json({ ok: false, error: "Montant d'amende trop élevé." }, { status: 400 });
    const note = String(b.note || "").trim().slice(0, 140) || null;
    const fine = await db.tontineFine.create({
      data: { tontineId, roundId: round.id, userId: targetUserId, type, amount, note, createdBy: uid },
    });
    const TYPE_LABEL: Record<string, string> = { late: "retard", absence: "absence", partial: "cotisation partielle", other: "autre" };
    await tontineAudit(tontineId, "TONTINE_FINE", `Amende (${TYPE_LABEL[type]}, ${fmtFcfa(amount)}) enregistrée pour la réunion n°${round.roundNumber} — membre informé en privé`, uid, round.id);
    if (targetUserId !== uid)
      await notify(targetUserId, { univers: "U4", typeCode: "TONTINE_FINE", priority: "HAUTE", title: "Amende enregistrée (privé)", body: `Amende de ${fmtFcfa(amount)} (${TYPE_LABEL[type]}) pour la réunion n°${round.roundNumber} de « ${t.name} ». Cette information reste entre vous et le bureau.`, link: "/#tontine" });
    return NextResponse.json({ ok: true, fineId: fine.id });
  }

  /* ── waive_fine : amende annulée (clémence du bureau) ── */
  if (action === "waive_fine") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président annule une amende." }, { status: 403 });
    const fine = await db.tontineFine.findUnique({ where: { id: String(b.fineId || "") } });
    if (!fine || fine.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Amende introuvable." }, { status: 404 });
    if (fine.status !== "due") return NextResponse.json({ ok: false, error: "Cette amende n'est plus en attente." }, { status: 400 });
    await db.tontineFine.update({ where: { id: fine.id }, data: { status: "waived", paidAt: new Date() } });
    await tontineAudit(tontineId, "TONTINE_FINE_WAIVED", `Une amende (${fmtFcfa(fine.amount)}) a été annulée par le bureau`, uid);
    if (fine.userId !== uid)
      await notify(fine.userId, { univers: "U4", typeCode: "TONTINE_FINE", title: "Amende annulée (privé)", body: `Le bureau a annulé votre amende de ${fmtFcfa(fine.amount)} — aucune somme due.`, link: "/#tontine" });
    return NextResponse.json({ ok: true });
  }

  /* ── pay_fine : amende réglée — destination : caisse de solidarité (Formule 2) sinon rendue au groupe ── */
  if (action === "pay_fine") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président (trésorier) encaisse une amende." }, { status: 403 });
    const fine = await db.tontineFine.findUnique({ where: { id: String(b.fineId || "") } });
    if (!fine || fine.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Amende introuvable." }, { status: 404 });
    if (fine.status !== "due") return NextResponse.json({ ok: false, error: "Cette amende n'est plus en attente." }, { status: 400 });
    const destination = t.solidarityEnabled ? "solidarity" : "group";
    await db.tontineFine.update({ where: { id: fine.id }, data: { status: "paid", destination, paidAt: new Date() } });
    if (destination === "solidarity") {
      await db.tontineSolidarityMove.create({
        data: { tontineId, roundId: fine.roundId, direction: "in", source: "fine", userId: fine.userId, amount: fine.amount, note: "Amende encaissée", createdBy: uid },
      });
    }
    await tontineAudit(tontineId, "TONTINE_FINE_PAID", `Une amende (${fmtFcfa(fine.amount)}) a été réglée — ${destination === "solidarity" ? "versée à la caisse de solidarité" : "encaissée par le groupe"}`, uid);
    if (fine.userId !== uid)
      await notify(fine.userId, { univers: "U4", typeCode: "TONTINE_FINE", title: "Amende réglée (privé)", body: `Votre amende de ${fmtFcfa(fine.amount)} est enregistrée comme réglée. Merci.`, link: "/#tontine" });
    return NextResponse.json({ ok: true, destination });
  }

  /* ── solidarity_move : caisse de solidarité — solde interne simple (l'app note et prouve) ── */
  if (action === "solidarity_move") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président (trésorier) tient la caisse de solidarité." }, { status: 403 });
    if (!t.solidarityEnabled) return NextResponse.json({ ok: false, error: "Cette tontine n'a pas de caisse de solidarité (Formule 1)." }, { status: 400 });
    const direction = String(b.direction) === "out" ? "out" : "in";
    const amount = Math.round(Number(b.amount));
    if (!isFinite(amount) || amount <= 0) return NextResponse.json({ ok: false, error: "Indiquez un montant." }, { status: 400 });
    const note = String(b.note || "").trim().slice(0, 140) || null;
    const mvUserId = String(b.userId || "") || null;
    if (mvUserId && !members.some((m) => m.userId === mvUserId)) return NextResponse.json({ ok: false, error: "Membre introuvable." }, { status: 404 });
    if (direction === "out" && !mvUserId) return NextResponse.json({ ok: false, error: "Indiquez le membre aidé (il voit l'aide dans l'app)." }, { status: 400 });
    const moves = await db.tontineSolidarityMove.findMany({ where: { tontineId } });
    const balance = moves.reduce((s, m) => s + (m.direction === "in" ? m.amount : -m.amount), 0);
    if (direction === "out" && amount > balance) return NextResponse.json({ ok: false, error: `Solde insuffisant (${fmtFcfa(balance)} disponibles).` }, { status: 400 });
    const source = ["contribution", "gift", "aid", "adjust"].includes(String(b.source)) ? String(b.source) : direction === "out" ? "aid" : "contribution";
    await db.tontineSolidarityMove.create({ data: { tontineId, direction, source, userId: direction === "out" ? mvUserId : mvUserId, amount, note, createdBy: uid } });
    const newBalance = balance + (direction === "in" ? amount : -amount);
    await tontineAudit(tontineId, "TONTINE_SOLIDARITY", `Caisse de solidarité : ${direction === "in" ? "+" : "−"}${fmtFcfa(amount)} (${source === "fine" ? "amende" : source === "aid" ? "aide" : source === "gift" ? "don" : source === "adjust" ? "ajustement" : "cotisation"}) — solde ${fmtFcfa(newBalance)}`, uid);
    if (direction === "out" && mvUserId && mvUserId !== uid)
      await notify(mvUserId, { univers: "U4", typeCode: "TONTINE_SOLIDARITY", title: "Une aide vous a été accordée", body: `La tontine « ${t.name} » vous accorde ${fmtFcfa(amount)}${note ? ` — ${note}` : ""}. La caisse de solidarité reste à ${fmtFcfa(newBalance)}.`, link: "/#tontine" });
    return NextResponse.json({ ok: true, balance: newBalance });
  }

  /* ── save_report : compte rendu de réunion — visible du groupe, copiable pour WhatsApp ── */
  if (action === "save_report") {
    if (!isPresident) return NextResponse.json({ ok: false, error: "Seul le président (secrétaire) publie le compte rendu." }, { status: 403 });
    const round = await db.tontineRound.findUnique({ where: { id: String(b.roundId || "") } });
    if (!round || round.tontineId !== tontineId) return NextResponse.json({ ok: false, error: "Réunion introuvable." }, { status: 404 });
    const text = String(b.text || "").trim().slice(0, 3000) || null;
    await db.tontineRound.update({ where: { id: round.id }, data: { reportText: text, reportBy: uid, reportAt: text ? new Date() : null } });
    if (text) {
      await tontineAudit(tontineId, "TONTINE_REPORT", `Compte rendu de la réunion n°${round.roundNumber} publié`, uid, round.id);
      for (const m of members) {
        if (m.userId === uid) continue;
        await notify(m.userId, { univers: "U4", typeCode: "TONTINE_REPORT", title: "Compte rendu publié", body: `Le compte rendu de la réunion n°${round.roundNumber} de « ${t.name} » est disponible.`, link: "/#tontine" });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: `Action inconnue : ${action}` }, { status: 400 });
}
