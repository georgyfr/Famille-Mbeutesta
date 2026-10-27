/**
 * LegacyApp — version « Lite » d'Famille.Mbeutetsa pour les navigateurs de 2015
 * (Android 5/6 · Chrome 40-79 · iOS 9 / Safari 9).
 *
 * Le bundle React/Next ne s'exécute pas sur ces navigateurs (pas de modules ES,
 * pas d'optional chaining…). Le layout.tsx pose donc une classe `fc-legacy` ou
 * `fc-modern` sur <html> (browser gate ES5) :
 *  - fc-legacy : ce markup statique + public/fc-lite.js (ES5 pur) prend le relais ;
 *  - fc-modern : ce bloc est masqué par CSS puis retiré du DOM par MainApp.
 *
 * Contraintes 2015 respectées ici : aucun JS inline, CSS sans variables/grille/gap,
 * flexbox préfixée -webkit-, positions fixed, emojis comme icônes (rendus nativement
 * sur Android 5 et iOS 9), box-sizing explicite, fallback safe-area.
 */

const LITE_CSS = `
html.fc-modern #fc-legacy{display:none!important}
html.fc-legacy .fc-root{display:none!important}
html.fc-legacy .fc-footer{display:none!important}
html.fc-legacy body{background:#F4F1E9;margin:0}
#fc-legacy{
  font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#2B3530;
  -webkit-text-size-adjust:100%;-webkit-tap-highlight-color:rgba(42,74,58,.12);
}
#fc-legacy *{box-sizing:border-box;-webkit-box-sizing:border-box}
#fc-legacy img{border:0}
#fc-legacy button{cursor:pointer;outline:none;font-family:inherit}
#fc-legacy input{font-family:inherit;-webkit-appearance:none;appearance:none}
#fc-legacy p{margin:0}

.l-app{max-width:480px;margin:0 auto;padding:12px 14px 96px}

/* ── En-tête ── */
.l-header{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;
  -webkit-justify-content:space-between;justify-content:space-between;margin-bottom:12px}
.l-brand{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center}
.l-logo{width:42px;height:42px;border-radius:12px;background:#FBF7EA;padding:3px;
  border:1px solid #E5DCC0;margin-right:10px}
.l-brand-name{font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:bold;
  color:#1E4D2B;line-height:1.15}
.l-brand-sub{font-size:11px;color:#8A9288;line-height:1.15}
.l-bell{position:relative;background:none;border:0;padding:8px;font-size:20px;line-height:1}
.l-badge{position:absolute;top:0;right:-2px;background:#B91C1C;color:#fff;font-size:10px;
  font-weight:bold;border-radius:9px;padding:1px 5px;line-height:1.3}

/* ── Cartes & champs ── */
.l-card{background:#FBF7EA;border:1px solid #E5DCC0;border-radius:16px;padding:16px;
  box-shadow:0 4px 14px rgba(42,74,58,.08);margin-bottom:12px}
.l-card-title{font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:bold;
  color:#1E4D2B;margin-bottom:4px}
.l-label{font-size:14px;font-weight:bold;color:#1E4D2B;margin-bottom:8px}
.l-sub{font-size:13px;color:#5C6B60;line-height:1.45;margin-bottom:12px}
.l-hint{font-size:11px;color:#8A9288;text-align:center;margin-top:10px;line-height:1.4}
.l-input{width:100%;height:50px;border:1px solid #C9B98A;border-radius:12px;background:#FFFDF6;
  font-size:16px;color:#2B3530;padding:0 14px;margin-bottom:10px}
.l-phone-row{display:-webkit-flex;display:flex;-webkit-align-items:stretch;align-items:stretch}
.l-phone-row .l-input{margin-bottom:0;-webkit-flex:1;flex:1}
.l-indicatif{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;
  background:#FFFDF6;border:1px solid #C9B98A;border-right:0;border-radius:12px 0 0 12px;
  padding:0 12px;font-size:15px;font-weight:bold;color:#2B3530;white-space:nowrap}
.l-phone-row .l-input{border-radius:0 12px 12px 0}
.l-mt8{margin-top:8px}

/* ── Boutons ── */
.l-btn{display:block;width:100%;min-height:48px;background:#1F5B3F;color:#fff;border:0;
  border-radius:12px;font-size:16px;font-weight:bold;padding:12px;margin-top:12px;
  -webkit-appearance:none;appearance:none;text-align:center}
.l-btn:active{background:#184A33}
.l-btn-gold{background:#C89F62;color:#2B2416}
.l-btn-danger{background:#B91C1C}
.l-btn-ghost{background:none;color:#5C6B60;font-weight:normal;font-size:14px;min-height:40px}
.l-btn[disabled]{opacity:.5}

/* ── Auth : en-tête de marque ── */
.l-auth-head{text-align:center;padding:8px 0 14px}
.l-auth-logo{width:84px;border-radius:20px;background:#FBF7EA;padding:5px;
  border:1px solid #E5DCC0}
.l-auth-title{font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;
  color:#1E4D2B;margin-top:10px}
.l-auth-sub{font-size:13px;color:#5C6B60;line-height:1.5;margin:6px auto 0;max-width:320px}

/* ── Notification simulée + étapes ── */
.l-push{background:#fff;border:1px solid #E5DCC0;border-radius:12px;padding:12px;margin:10px 0}
.l-push-head{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;
  margin-bottom:6px}
.l-push-logo{width:34px;height:34px;border-radius:8px;background:#FBF7EA;padding:2px;
  border:1px solid #E5DCC0;margin-right:8px}
.l-push-head p{font-size:12px;color:#8A9288}
.l-push-head b{color:#2B3530}
.l-push-body{font-size:13px;color:#5C6B60;line-height:1.45}
.l-push-body b{color:#1E4D2B;letter-spacing:1px}
.l-steps{list-style:none;margin:14px 0 0;padding:0}
.l-steps li{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;
  margin-bottom:10px;font-size:14px;color:#8A9288}
.l-dot{width:20px;height:20px;border-radius:50%;border:2px solid #D9D2BC;margin-right:10px;
  -webkit-flex-shrink:0;flex-shrink:0;background:#fff;color:#fff;font-size:12px;line-height:16px;
  text-align:center;font-weight:bold}
.l-steps li.l-done{color:#1E4D2B}
.l-steps li.l-done .l-dot{background:#16A34A;border-color:#16A34A}
.l-steps li.l-run{color:#2B3530}
.l-steps li.l-run .l-dot{border-color:#2A4A3A;border-top-color:transparent;
  -webkit-animation:lspin 1s linear infinite;animation:lspin 1s linear infinite}
@-webkit-keyframes lspin{to{-webkit-transform:rotate(360deg)}}
@keyframes lspin{to{transform:rotate(360deg)}}
.l-code{text-align:center;font-size:20px;letter-spacing:6px}

/* ── Tableau de bord Lite ── */
.l-profile-card{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center}
.l-avatar{width:52px;height:52px;border-radius:50%;background:#2A4A3A;color:#FBF7EA;
  font-size:22px;font-weight:bold;text-align:center;line-height:52px;margin-right:12px;
  -webkit-flex-shrink:0;flex-shrink:0}
.l-user-name{font-size:16px;font-weight:bold;color:#1E4D2B}
.l-user-meta{font-size:12px;color:#8A9288}
.l-stats{display:-webkit-flex;display:flex;margin-bottom:12px}
.l-stat{-webkit-flex:1;flex:1;background:#FBF7EA;border:1px solid #E5DCC0;border-radius:14px;
  padding:12px 6px;text-align:center;margin-right:10px}
.l-stat-last{margin-right:0}
.l-stat-num{font-size:18px;font-weight:bold;color:#1E4D2B}
.l-stat-lbl{font-size:10px;color:#8A9288;margin-top:2px}
.l-grid{display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;
  -webkit-justify-content:space-between;justify-content:space-between}
.l-shortcut{width:48.5%;background:#FBF7EA;border:1px solid #E5DCC0;border-radius:14px;
  padding:14px 10px;text-align:center;margin-bottom:10px}
.l-shortcut-ico{font-size:24px;display:block;margin-bottom:4px}
.l-shortcut-lbl{font-size:12px;color:#2B3530;font-weight:bold}
.l-announce{background:#FFFDF6;border:1px solid #C89F62;border-radius:14px;padding:12px}
.l-announce-tag{font-size:10px;font-weight:bold;color:#7A5B2E;text-transform:uppercase;
  letter-spacing:1px;margin-bottom:4px}
.l-announce-body{font-size:13px;color:#2B3530;line-height:1.45}

/* ── Alertes ── */
.l-notif{display:-webkit-flex;display:flex;background:#FBF7EA;border:1px solid #E5DCC0;
  border-radius:14px;padding:12px;margin-bottom:10px}
.l-notif-unread{background:#FFFDF6;border-color:#C89F62}
.l-notif-ico{width:38px;height:38px;border-radius:50%;background:#2A4A3A;color:#fff;
  text-align:center;line-height:38px;font-size:17px;margin-right:10px;-webkit-flex-shrink:0;flex-shrink:0}
.l-notif-title{font-size:14px;font-weight:bold;color:#1E4D2B}
.l-notif-body{font-size:12px;color:#5C6B60;line-height:1.4;margin-top:2px}
.l-notif-time{font-size:10px;color:#8A9288;margin-top:3px}
.l-empty{font-size:13px;color:#8A9288;text-align:center;padding:16px 0}

/* ── Sécurité ── */
.l-sec-row{display:-webkit-flex;display:flex;font-size:13px;margin-bottom:10px}
.l-sec-key{width:38%;color:#8A9288}
.l-sec-val{-webkit-flex:1;flex:1;color:#2B3530;font-weight:bold;word-break:break-all}
.l-note{font-size:12px;color:#5C6B60;line-height:1.5;background:#FFFDF6;border:1px solid #E5DCC0;
  border-radius:12px;padding:10px 12px;margin:12px 0}
.l-copy{text-align:center;font-size:11px;color:#8A9288;padding:14px 0 4px}

/* ── Navigation basse ── */
.l-nav{position:fixed;bottom:0;left:0;right:0;max-width:480px;margin:0 auto;z-index:30;
  display:-webkit-flex;display:flex;background:#FBF7EA;border-top:1px solid #E5DCC0;
  padding-bottom:0;padding-bottom:env(safe-area-inset-bottom);
  box-shadow:0 -4px 14px rgba(42,74,58,.06)}
.l-navbtn{-webkit-flex:1;flex:1;min-height:58px;background:none;border:0;border-top:2px solid
  transparent;font-size:11px;color:#8A9288;position:relative;padding:7px 0 4px;font-weight:bold}
.l-navbtn span{display:block;font-size:20px;font-style:normal;margin-bottom:2px}
.l-navbtn.l-active{color:#1E4D2B;border-top-color:#C89F62}
.l-navbadge{position:absolute;top:4px;right:18%;background:#B91C1C;color:#fff;font-size:9px;
  font-weight:bold;border-radius:8px;padding:1px 5px;font-style:normal}

/* ── Toast ── */
.l-toast{position:fixed;left:14px;right:14px;bottom:76px;max-width:452px;margin:0 auto;
  background:#2A4A3A;color:#fff;border-radius:12px;padding:12px 14px;font-size:14px;
  line-height:1.4;z-index:40;display:none;opacity:0;
  box-shadow:0 6px 20px rgba(0,0,0,.25);
  -webkit-transition:opacity .25s;transition:opacity .25s}
.l-toast.l-err{background:#B91C1C}
.l-toast.l-ok{background:#16A34A}
.l-toast.l-show{display:block;opacity:1}

@media (min-width:900px){
  html.fc-legacy body{background:#EFE9DA}
  .l-app{padding-top:24px}
}
`;

export function LegacyApp() {
  return (
    <div id="fc-legacy">
      <style dangerouslySetInnerHTML={{ __html: LITE_CSS }} />

      <div className="l-app">
        {/* ── En-tête ── */}
        <header className="l-header">
          <div className="l-brand">
            <img src="/logo-famille.png" alt="Armoiries de la famille Mbeutetsa" className="l-logo" />
            <div>
              <p className="l-brand-name">Famille.Mbeutetsa</p>
              <p className="l-brand-sub">Le registre vivant</p>
            </div>
          </div>
          <button id="l-bell" type="button" className="l-bell" aria-label="Notifications">
            🔔
            <span id="l-bell-badge" className="l-badge" style={{ display: "none" }}>
              0
            </span>
          </button>
        </header>

        {/* ══ Parcours d'inscription façon WhatsApp ══ */}
        <div id="l-auth">
          <div className="l-auth-head">
            <img src="/logo-famille.png" alt="" className="l-auth-logo" />
            <p className="l-auth-title">Bienvenue 🌳</p>
            <p className="l-auth-sub">
              Votre numéro de téléphone est votre identifiant — comme sur WhatsApp. Aucun mot de passe à
              retenir.
            </p>
          </div>

          {/* Étape 1 — numéro */}
          <div id="l-step-phone" className="l-card">
            <p className="l-label">Votre numéro de téléphone</p>
            <p className="l-sub">Nous vous envoyons une notification pour vérifier qu&apos;il s&apos;agit bien de votre téléphone.</p>
            <div className="l-phone-row">
              <span className="l-indicatif">🇨🇲 +237</span>
              <input
                id="l-phone"
                className="l-input"
                type="tel"
                placeholder="6 91 23 45 67"
                maxLength={13}
                autoComplete="tel-national"
                aria-label="Numéro de téléphone"
              />
            </div>
            <button id="l-btn-phone" type="button" className="l-btn">
              🔔 Recevoir la notification
            </button>
            <p className="l-hint">Format camerounais — 9 chiffres commençant par 6 (mobile) ou 2 (fixe).</p>
          </div>

          {/* Étape 2 — notification + vérification de l'appareil */}
          <div id="l-step-verify" className="l-card" style={{ display: "none" }}>
            <p className="l-label">Vérification du numéro</p>
            <p className="l-sub">
              Notification envoyée au <b id="l-verify-phone">+237 …</b>
            </p>
            <div id="l-push" className="l-push" style={{ display: "none" }}>
              <div className="l-push-head">
                <img src="/logo-famille.png" alt="" className="l-push-logo" />
                <p>
                  <b>Famille.Mbeutetsa</b> · à l&apos;instant
                </p>
              </div>
              <p className="l-push-body">
                Votre code de vérification est <b id="l-push-code">······</b>. Ne le partagez avec personne.
              </p>
            </div>
            <ol className="l-steps" aria-label="Progression de la vérification">
              <li id="l-st-1">
                <span className="l-dot" /> <span>Notification envoyée sur votre téléphone</span>
              </li>
              <li id="l-st-2">
                <span className="l-dot" /> <span>Vérification du numéro sur cet appareil…</span>
              </li>
              <li id="l-st-3">
                <span className="l-dot" /> <span>Lecture de la notification…</span>
              </li>
            </ol>
            <button id="l-btn-verify" type="button" className="l-btn l-btn-ghost">
              Saisir le code manuellement
            </button>
            <div id="l-manual" style={{ display: "none" }}>
              <input
                id="l-code"
                className="l-input l-code l-mt8"
                type="tel"
                placeholder="● ● ● ● ● ●"
                maxLength={6}
                autoComplete="one-time-code"
                aria-label="Code de vérification à 6 chiffres"
              />
              <button id="l-btn-code" type="button" className="l-btn">
                🛡️ Confirmer mon numéro
              </button>
            </div>
          </div>

          {/* Étape 3 — nom / prénom */}
          <div id="l-step-profile" className="l-card" style={{ display: "none" }}>
            <p className="l-label">Comment vous appelez-vous ?</p>
            <p className="l-sub">
              Numéro <b id="l-profile-phone">+237 …</b> vérifié ✓. Indiquez votre prénom et votre nom — vous
              entrerez immédiatement au tableau de bord.
            </p>
            <input
              id="l-firstname"
              className="l-input"
              type="text"
              placeholder="Prénom (ex : Jean)"
              autoComplete="given-name"
              aria-label="Prénom"
            />
            <input
              id="l-lastname"
              className="l-input"
              type="text"
              placeholder="Nom (ex : Mbeutetsa)"
              autoComplete="family-name"
              aria-label="Nom"
            />
            <button id="l-btn-profile" type="button" className="l-btn">
              ✓ Créer mon compte
            </button>
          </div>
        </div>

        {/* ══ Tableau de bord Lite ══ */}
        <div id="l-dash" style={{ display: "none" }}>
          {/* Accueil */}
          <div id="l-tab-home">
            <div className="l-card l-profile-card">
              <div id="l-user-initial" className="l-avatar">
                M
              </div>
              <div>
                <p id="l-user-name" className="l-user-name">
                  Membre Mbeutetsa
                </p>
                <p id="l-user-meta" className="l-user-meta">
                  Membre · Branche Douala
                </p>
              </div>
            </div>

            <div className="l-stats">
              <div className="l-stat">
                <p className="l-stat-num">52</p>
                <p className="l-stat-lbl">Membres</p>
              </div>
              <div className="l-stat">
                <p className="l-stat-num">245 000 F</p>
                <p className="l-stat-lbl">Caisse familiale</p>
              </div>
              <div className="l-stat l-stat-last">
                <p className="l-stat-num">3</p>
                <p className="l-stat-lbl">Événements</p>
              </div>
            </div>

            <p className="l-label">Raccourcis</p>
            <div className="l-grid" style={{ marginBottom: "12px" }}>
              <button type="button" className="l-shortcut" data-toast="Registre des membres — disponible dans la version complète.">
                <span className="l-shortcut-ico" aria-hidden="true">
                  👥
                </span>
                <span className="l-shortcut-lbl">Membres</span>
              </button>
              <button type="button" className="l-shortcut" data-toast="Trésor familial — disponible dans la version complète.">
                <span className="l-shortcut-ico" aria-hidden="true">
                  💰
                </span>
                <span className="l-shortcut-lbl">Trésor</span>
              </button>
              <button type="button" className="l-shortcut" data-toast="Événements familiaux — disponible dans la version complète.">
                <span className="l-shortcut-ico" aria-hidden="true">
                  📅
                </span>
                <span className="l-shortcut-lbl">Événements</span>
              </button>
              <button type="button" className="l-shortcut" data-toast="Solidarité & entraide — disponible dans la version complète.">
                <span className="l-shortcut-ico" aria-hidden="true">
                  🤝
                </span>
                <span className="l-shortcut-lbl">Solidarité</span>
              </button>
              <button type="button" className="l-shortcut" data-toast="Votes du Conseil — disponible dans la version complète.">
                <span className="l-shortcut-ico" aria-hidden="true">
                  🗳️
                </span>
                <span className="l-shortcut-lbl">Votes</span>
              </button>
              <button type="button" className="l-shortcut" data-toast="Mémoire familiale — disponible dans la version complète.">
                <span className="l-shortcut-ico" aria-hidden="true">
                  📜
                </span>
                <span className="l-shortcut-lbl">Mémoire</span>
              </button>
            </div>

            <div className="l-announce">
              <p className="l-announce-tag">📢 Annonce du Conseil</p>
              <p className="l-announce-body">
                Réunion familiale dimanche à 15h chez le Patriarche — présence des chefs de branche
                requise.
              </p>
            </div>
          </div>

          {/* Alertes */}
          <div id="l-tab-notif" style={{ display: "none" }}>
            <div className="l-card">
              <p className="l-card-title">Alertes familiales</p>
              <p className="l-sub">Vos notifications — bienvenue, connexions, annonces du Conseil.</p>
              <button id="l-btn-readall" type="button" className="l-btn l-btn-ghost" style={{ marginTop: 0 }}>
                ✓ Tout marquer comme lu
              </button>
            </div>
            <div id="l-notif-list" />
          </div>

          {/* Sécurité */}
          <div id="l-tab-security" style={{ display: "none" }}>
            <div className="l-card">
              <p className="l-card-title">Sécurité &amp; session</p>
              <div className="l-sec-row">
                <span className="l-sec-key">Membre</span>
                <span id="l-sec-name" className="l-sec-val">
                  —
                </span>
              </div>
              <div className="l-sec-row">
                <span className="l-sec-key">Téléphone</span>
                <span id="l-sec-phone" className="l-sec-val">
                  —
                </span>
              </div>
              <div className="l-sec-row">
                <span className="l-sec-key">Appareil</span>
                <span id="l-sec-device" className="l-sec-val">
                  —
                </span>
              </div>
              <div className="l-sec-row">
                <span className="l-sec-key">Session ouverte</span>
                <span id="l-sec-since" className="l-sec-val">
                  —
                </span>
              </div>
            </div>
            <div className="l-note">
              📱 <b>Session permanente</b> — comme sur WhatsApp, l&apos;application s&apos;ouvre directement
              sur cet appareil. La déconnexion est volontaire uniquement ; en cas de changement de
              téléphone, réinsérez le même numéro pour retrouver votre compte.
            </div>
            <button id="l-btn-logout" type="button" className="l-btn l-btn-danger">
              Se déconnecter
            </button>
            <p className="l-copy">Famille.Mbeutetsa © 2026 · Cameroun — Mode compatibilité anciens téléphones</p>
          </div>
        </div>

        {/* ── Navigation basse ── */}
        <nav className="l-nav" id="l-nav" aria-label="Navigation principale">
          <button type="button" data-tab="home" className="l-navbtn l-active">
            <span aria-hidden="true">🏠</span>
            Accueil
          </button>
          <button type="button" data-tab="notif" className="l-navbtn">
            <span aria-hidden="true">🔔</span>
            Alertes
            <i id="l-nav-badge" className="l-navbadge" style={{ display: "none" }}>
              0
            </i>
          </button>
          <button type="button" data-tab="security" className="l-navbtn">
            <span aria-hidden="true">🛡️</span>
            Sécurité
          </button>
        </nav>

        {/* ── Toast ── */}
        <div id="l-toast" className="l-toast" role="status" aria-live="polite" />
      </div>
    </div>
  );
}
