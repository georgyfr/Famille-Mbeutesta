# FamilleConnect — Plan de Test et de Recette

**Stratégie de test par univers, scénarios clés, critères d'acceptation**

| Document | Plan de test et de recette de la plateforme FamilleConnect |
|---|---|
| Version | 1.0 |
| Date | Octobre 2026 |
| Statut | Pour validation |
| Audience | Équipe QA, développeurs, Product Manager, comité de pilotage |
| Prérequis | Spécifications fonctionnelles des 7 univers, Architecture technique, Schéma PostgreSQL |

---

## Synthèse exécutive

Ce document définit la stratégie de test et de recette de la plateforme FamilleConnect, couvrant les 7 univers et les composants transverses. Il traduit les spécifications fonctionnelles et techniques en scénarios de test concrets, avec des critères d'acceptation mesurables, alignés sur les 3 phases de développement.

La stratégie repose sur une pyramide de tests classique : tests unitaires (70 % de couverture), tests d'intégration (20 %), tests end-to-end (10 %), complétés par des tests de performance, de sécurité, et de recette utilisateur (UAT). Chaque univers possède ses propres scénarios clés, dérivés des cas d'usage les plus critiques : annonce de décès (U2), collecte de solidarité (U3), paiement Mobile Money (U4), vote en session (U5), archivage automatique (U6), mise en relation de mentorat (U7).

Le document couvre également les tests transverses : sécurité (authentification, chiffrement, immutabilité), performance (latence, charge, pics), notifications (anti-saturation, multi-canal, fuseaux horaires), offline-first (synchronisation, gestion des conflits), et accessibilité. Les critères de sortie de chaque phase sont définis de manière objective, avec des seuils chiffrés (couverture de code, taux de réussite, temps de réponse, satisfaction utilisateur).

---

## 1. Stratégie de test globale

### 1.1 Principes directeurs

La stratégie de test de FamilleConnect est guidée par cinq principes :

**Shift-left.** Les tests sont écrits en même temps que le code, pas après. Chaque fonctionnalité développée est accompagnée de tests unitaires et d'intégration. Les critères d'acceptation sont définis avant le développement (Behavior-Driven Development).

**Risk-based.** Les efforts de test sont proportionnels au risque. Les univers critiques (U3 Solidarité, U4 Finances) reçoivent plus d'attention que les univers moins risqués (U6 Mémoire, U7 Réseau). Les fonctionnalités sensibles (paiements, décisions, données personnelles) sont testées plus en profondeur.

**Automatisation maximale.** Les tests unitaires, d'intégration, et end-to-end sont automatisés. Les tests manuels sont réservés à l'exploratoire, à l'accessibilité, et à la recette utilisateur. L'objectif est de pouvoir exécuter la suite de tests complète en moins de 30 minutes en CI/CD.

**Offline-first testing.** Tous les scénarios critiques sont testés en mode hors-ligne, en mode connecté, et en mode intermittent. La gestion des conflits de synchronisation est testée systématiquement.

**Données réalistes.** Les tests utilisent un jeu de données de démonstration réaliste (famille NDONGO, 247 membres, 6 branches, 9 pays) qui reflète les conditions réelles d'utilisation.

### 1.2 Pyramide de tests

| Niveau | Part | Outil | Couverture cible | Exécution |
|---|---|---|---|---|
| Tests unitaires | 70 % | Jest | ≥ 80 % du code | À chaque commit |
| Tests d'intégration | 20 % | Jest + Testcontainers | ≥ 70 % des modules | À chaque PR |
| Tests end-to-end | 7 % | Playwright | Scénarios critiques | À chaque merge |
| Tests de performance | 2 % | k6 | Points de charge | Hebdomadaire |
| Tests de sécurité | 1 % | OWASP ZAP, Snyk | Vulnérabilités critiques | Hebdomadaire |
| Tests manuels (UAT) | — | Recette familiale pilote | Acceptation | Par phase |

### 1.3 Environnements de test

| Environnement | Usage | Données | Refresh |
|---|---|---|---|
| **Local** | Développement et tests unitaires | Docker Compose, données synthétiques | À la demande |
| **Dev** | Tests d'intégration continue | Données synthétiques auto-générées | Quotidien |
| **Staging** | Tests d'intégration, e2e, performance | Anonymisé de production (Phase 2+) | Hebdomadaire |
| **Pre-prod** | Recette utilisateur (UAT) | Copie de production anonymisée | Avant chaque release |
| **Production** | Monitoring, tests smoke | Données réelles | — |

---

## 2. Tests par univers

### 2.1 Univers 1 — La Famille

#### Scénarios clés

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| U1-01 | Ajout d'un nouveau membre par un chef de branche | Critique | Le membre est créé avec statut "en attente", le patriarche reçoit une notification, le membre apparaît dans la branche après validation |
| U1-02 | Validation d'un nouveau membre par le patriarche | Critique | Le membre passe en statut "actif", une notification est envoyée à toute la famille, le membre apparaît dans l'arbre généalogique |
| U1-03 | Marquage d'un décès | Critique | Le membre passe en statut "décédé", la date et le lieu de décès sont enregistrés, les notifications U2/U3 sont déclenchées automatiquement |
| U1-04 | Gestion de la polygamie | Élevée | Un père peut avoir plusieurs épouses simultanées, chaque enfant identifie sa mère biologique, l'arbre affiche les unions multiples |
| U1-05 | Recherche de membre par nom (recherche floue) | Élevée | La recherche tolère les fautes de frappe et les accents, retourne les résultats en moins de 500 ms |
| U1-06 | Arbre généalogique sur 3 générations | Élevée | L'arbre s'affiche correctement avec navigation par nœud, chargement en moins de 2 secondes |
| U1-07 | Transition de patriarche | Critique | La transition est tracée, les accès sont transférés, la famille est notifiée, le nouveau patriarche peut exercer ses prérogatives |
| U1-08 | Membre diaspora signale son installation | Moyenne | Le relais diaspora du pays est notifié, un guide d'accueil est fourni, une rencontre est planifiée |
| U1-09 | Exonération confidentielle de cotisation | Critique | Le membre exonéré apparaît comme "à jour", aucune mention d'exonération n'est visible publiquement, le comité médiation a accès |
| U1-10 | Consultation du journal d'audit | Moyenne | Un membre peut voir qui a consulté ses données sensibles, le journal est immuable |

#### Tests spécifiques U1

- **Recherche full-text** : tester les trigrammes PostgreSQL avec noms camerounais (accents, tirets, particules).
- **Arbre récursif** : tester la requête CTE récursive avec une famille de 500 membres sur 5 générations.
- **Permissions RBAC** : tester que chaque rôle ne voit que ce qu'il est autorisé à voir.
- **Immutabilité** : vérifier qu'une écriture comptable validée ne peut pas être modifiée (trigger PostgreSQL).

---

### 2.2 Univers 2 — La Vie familiale

#### Scénarios clés

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| U2-01 | Annonce de décès avec double validation | Critique | L'annonce est envoyée à toute la famille en moins de 30 minutes, multi-canal (push + SMS + vocal), le ciblage est correct |
| U2-02 | Déclenchement automatique du workflow décès | Critique | Les 8 étapes sont créées automatiquement, chaque étape a un responsable, la première étape (annonce) est complétée |
| U2-03 | Progression d'une étape de workflow | Élevée | L'étape passe de "pending" à "completed" avec validation, l'étape suivante est déclenchée, les notifications sont envoyées |
| U2-04 | Détection d'étape en retard | Élevée | Une étape non complétée après J+3 passe en "overdue", une notification Urgent est envoyée au responsable |
| U2-05 | Inscription à un congrès | Élevée | Le membre peut confirmer sa présence, indiquer ses accompagnants, le compteur d'inscrits est mis à jour en temps réel |
| U2-06 | Création d'un album photo collaboratif | Moyenne | Plusieurs membres peuvent téléverser des photos, le tagging automatique propose des tags, les photos sont visibles par les participants |
| U2-07 | Conflit de dates détecté | Moyenne | La création d'un événement sur une date existante déclenche un avertissement, l'organisateur peut maintenir ou déplacer |
| U2-08 | Clôture d'un événement avec bilan | Élevée | Le bilan est généré automatiquement, transmis aux contributeurs, l'événement est archivé dans U6 |
| U2-09 | Calendrier — respect des fuseaux horaires | Critique | Un membre à Paris reçoit les rappels en heure locale, pas en heure de Yaoundé |
| U2-10 | Mode hors-ligne — saisie d'événement | Élevée | Un événement peut être créé hors-ligne, synchronisé au retour de connexion, sans perte de données |

#### Tests spécifiques U2

- **Workflow engine** : tester avec une définition de workflow modifiée (ajout/suppression d'étapes) sans modification de code.
- **Notifications temps réel** : vérifier que les notifications push sont reçues en moins de 30 secondes via WebSocket.
- **Calendrier** : tester la synchronisation avec Google Calendar, Apple Calendar, Outlook.
- **Albums** : tester le téléversement de 100 photos simultanées, vérifier le tagging automatique.

---

### 2.3 Univers 3 — La Solidarité

#### Scénarios clés

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| U3-01 | Déclenchement automatique d'un dossier de solidarité | Critique | Un décès déclaré en U2 crée automatiquement un dossier U3, la collecte est ouverte en moins de 4 heures |
| U3-02 | Contribution via Mobile Money | Critique | Le paiement MTN MoMo est initié, le webhook confirme, l'écriture comptable est créée, le reçu PDF est généré |
| U3-03 | Double validation d'une dépense | Critique | Une dépense > 50 000 FCFA requiert deux validateurs, le paiement n'est effectué qu'après double validation |
| U3-04 | Justificatif obligatoire | Élevée | Une dépense > 10 000 FCFA sans justificatif est signalée, le trésorier est notifié |
| U3-05 | Clôture d'un dossier avec bilan | Élevée | Le bilan financier est généré, transmis à tous les contributeurs, le dossier est archivé dans U6 |
| U3-06 | Relances automatiques respectant les exonérations | Critique | Un membre exonéré ne reçoit aucune relance, les autres reçoivent les relances J+3, J+7, J+14 |
| U3-07 | Confidentialité d'un dossier sensible | Critique | Un dossier marqué "confidentiel" n'est visible que par le comité médiation et le référent, les autres membres n'en voient pas l'existence |
| U3-08 | Aide sociale récurrente — versement mensuel | Élevée | Le versement est effectué automatiquement à la date prévue, le bénéficiaire reçoit une notification silencieuse |
| U3-09 | Suivi de maladie longue | Moyenne | Les jalons sont enregistrés, les visites sont planifiées, le comité médiation est informé |
| U3-10 | Journal immutable des transactions | Critique | Aucune transaction ne peut être modifiée après création, les corrections se font par écriture compensatoire |

#### Tests spécifiques U3

- **Immutabilité** : tenter de modifier une transaction validée doit lever une exception.
- **Confidentialité** : tester avec différents rôles (membre ordinaire, chef de branche, comité médiation) que les données sensibles sont correctement masquées.
- **Mobile Money** : tester en sandbox MTN MoMo et Orange Money, simuler les webhooks de paiement.
- **Barème gradué** : tester le calcul des montants attendus par membre selon la branche, la génération, la diaspora.

---

### 2.4 Univers 4 — Les Finances

#### Scénarios clés

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| U4-01 | Paiement cotisation via Mobile Money | Critique | Le paiement est initié, confirmé par webhook, rapproché automatiquement, le reçu est généré, le solde est mis à jour |
| U4-02 | Rapprochement automatique Mobile Money | Critique | Chaque paiement Mobile Money est rapproché avec une écriture comptable, les écarts sont signalés |
| U4-03 | Double validation des dépenses | Critique | Dépense > 50 000 FCFA : double validation, > 500 000 FCFA : triple validation, paiement impossible sans validation |
| U4-04 | Journal comptable immutable | Critique | Aucune écriture validée ne peut être modifiée, les corrections se font par écriture compensatoire |
| U4-05 | Balance comptable et états financiers | Élevée | La balance est générée correctement, le compte de résultat et le bilan sont équilibrés (partie double) |
| U4-06 | Rapport mensuel automatique | Élevée | Le rapport est généré le 1er du mois, transmis à tous les membres, les montants sont agrégés sans détail nominatif |
| U4-07 | Caisse en déficit — alerte | Critique | Un solde négatif déclenche une alerte Critique multi-canal au trésorier et au patriarche |
| U4-08 | Budget annuel — suivi d'exécution | Moyenne | L'exécution est suivie par poste, les écarts > 15 % sont signalés |
| U4-09 | Mode espèces — saisie manuelle | Élevée | Un paiement en espèces est saisi par le trésorier, un reçu est généré, l'écriture est créée |
| U4-10 | Multi-devises (diaspora) | Moyenne | Un paiement en euros est converti en FCFA au taux du jour, le montant en devise est conservé |

#### Tests spécifiques U4

- **Partie double** : vérifier que pour chaque écriture, débit = crédit (trigger PostgreSQL).
- **Rapprochement** : simuler 100 paiements Mobile Money, vérifier que 100 % sont rapprochés.
- **Immutabilité** : tenter de UPDATE une écriture validée doit échouer.
- **Clôture annuelle** : tester la clôture d'un exercice complet avec 1 000 écritures.
- **Mode hors-ligne** : saisir un paiement en espèces hors-ligne, vérifier la synchronisation au retour.

---

### 2.5 Univers 5 — La Gouvernance

#### Scénarios clés

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| U5-01 | Création et clôture d'un vote simple | Critique | Le vote est créé avec ses paramètres, les votants sont notifiés, les bulletins sont chiffrés, les résultats sont publiés après clôture |
| U5-02 | Quorum non atteint | Élevée | Si le quorum n'est pas atteint à la clôture, le vote est marqué "non valide", le conseil est notifié |
| U5-03 | Vote anonyme — vérifiabilité | Critique | Le bulletin est chiffré, le votant reçoit un reçu avec hash, le choix n'est jamais visible individuellement |
| U5-04 | Élection complète (5 étapes) | Critique | Annonce → candidatures → campagne → scrutin → proclamation, chaque étape envoie les bonnes notifications |
| U5-05 | PV immutable après validation | Critique | Un PV validé ne peut pas être modifié, les corrections se font par avenant |
| U5-06 | Recours et médiation | Élevée | Un recours peut être déposé, le comité médiation l'examine sous 14 jours, la décision est motivée |
| U5-07 | Assemblée hybride (présentiel + visio) | Moyenne | Les votes des deux populations sont synchronisés, le quorum global est calculé correctement |
| U5-08 | Règlement intérieur — amendement | Moyenne | Un amendement est proposé, voté à majorité qualifiée 2/3, la nouvelle version est publiée avec historique |
| U5-09 | Conformité des décisions au règlement | Élevée | Chaque décision est rattachée à un article du règlement, la non-conformité est signalée |
| U5-10 | Transition de patriarche — traçabilité | Critique | La transition est enregistrée avec date, prédécesseur, successeur, validateur, les accès sont transférés |

#### Tests spécifiques U5

- **Chiffrement des bulletins** : vérifier que les bulletins sont chiffrés jusqu'à la clôture, déchiffrables uniquement après.
- **Égalité** : tester la procédure en cas d'égalité (nouveau vote, puis arbitrage du patriarche).
- **Fraude électorale** : tenter un double vote, vérifier le rejet et le signalement.
- **PV** : tester la génération automatique du PV à partir des votes et motions.

---

### 2.6 Univers 6 — La Mémoire

#### Scénarios clés

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| U6-01 | Archivage automatique d'un dossier clôturé | Critique | Un dossier U2/U3/U4/U5 clôturé est automatiquement archivé dans U6, avec toutes ses métadonnées et cross-références |
| U6-02 | Interview d'ancien — enregistrement et transcription | Élevée | L'interview audio/vidéo est enregistrée, la transcription automatique est générée, les chapitres sont créés |
| U6-03 | Recherche full-text dans les archives | Élevée | La recherche retourne des résultats pertinents en moins de 2 secondes, avec extraits mis en évidence |
| U6-04 | Document scellé — accès conditionnel | Critique | Un document scellé n'est pas visible avant la date définie, l'accès requiert validation du patriarche |
| U6-05 | Triple stockage des fichiers | Critique | Chaque fichier est stocké sur 3 supports (S3, sauvegarde, archive froide), la restauration est testée |
| U6-06 | Droit à l'oubli — retrait d'informations | Élevée | Un membre peut demander le retrait de ses données nominatives, l'archive anonymisée est conservée |
| U6-07 | Tradition restreinte — confidentialité | Élevée | Une tradition restreinte n'est visible que par les membres autorisés, la documentation allégée est affichée aux autres |
| U6-08 | Frise chronologique — navigation | Moyenne | La frise est navigable, filtrable par type et par branche, les liens vers les archives sont fonctionnels |
| U6-09 | Migration de formats (tous les 5 ans) | Moyenne | La migration est planifiée, les formats sont vérifiés, les fichiers migrés sont consultables |
| U6-10 | Sauvegarde externe trimestrielle | Critique | L'export chiffré est généré, transféré vers un lieu distant, l'intégrité est vérifiée |

#### Tests spécifiques U6

- **Volume** : tester avec 10 000 photos, 500 documents, 100 interviews, vérifier les performances.
- **Restauration** : simuler une perte de données, restaurer depuis la sauvegarde externe, vérifier l'intégrité.
- **Full-text** : tester la recherche avec des requêtes en français et en langues locales.
- **URLs signées** : vérifier que les URLs signées expirent après leur durée de validité.

---

### 2.7 Univers 7 — Le Réseau

#### Scénarios clés

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| U7-01 | Publication d'un profil de compétences | Élevée | Le profil est publié, visible par les membres autorisés, la vérification par le chef de branche est proposée |
| U7-02 | Demande de mentorat et appariement | Élevée | Le mentor reçoit la demande, peut accepter ou refuser, le mentorat est créé avec plan et objectifs |
| U7-03 | Opportunité professionnelle — modération a priori | Élevée | L'opportunité est soumise à modération, validée, diffusée aux membres avec compétences correspondantes |
| U7-04 | Messagerie — anti-harcèlement | Critique | Après 3 messages sans réponse, l'expéditeur est bloqué, le comité médiation est notifié |
| U7-05 | Blocage d'un membre | Critique | Un membre peut bloquer un autre membre, aucune communication n'est possible, le blocage est réversible |
| U7-06 | Recommandation — vérification d'interaction | Élevée | Une recommandation ne peut être publiée que par un membre ayant effectivement interagi avec le destinataire |
| U7-07 | Accueil d'un nouvel arrivant diaspora | Moyenne | Le relais diaspora est notifié, un guide d'accueil est fourni, une rencontre est planifiée dans les 30 jours |
| U7-08 | Plafond de mentorés par mentor | Moyenne | Un mentor ne peut pas avoir plus de 3 mentorés simultanés (configurable) |
| U7-09 | Opportunité frauduleuse — modération | Critique | Une opportunité signalée est retirée temporairement, examinée par le comité médiation, retirée définitivement si fraude |
| U7-10 | Prévention de l'épuisement (entraide) | Moyenne | Un membre ayant reçu plus de 5 demandes par mois est alerté, peut mettre en pause ses propositions |

#### Tests spécifiques U7

- **Anti-harcèlement** : simuler 3 messages sans réponse, vérifier le blocage automatique.
- **Matching** : tester la suggestion automatique de mentors basée sur les compétences et préférences.
- **Modération** : soumettre une opportunité avec contenu inapproprié, vérifier le rejet par le modérateur.
- **Confidentialité** : vérifier qu'un membre peut masquer ses coordonnées et n'accepter que la messagerie interne.

---

## 3. Tests transverses

### 3.1 Sécurité

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| SEC-01 | Authentification 2FA pour opérations sensibles | Critique | Le 2FA est requis pour paiement > 50 000, vote, modification de rôles |
| SEC-02 | Chiffrement au repos et en transit | Critique | Toutes les données sont chiffrées (AES-256 au repos, TLS 1.3 en transit) |
| SEC-03 | Base SQLite locale chiffrée (mobile) | Critique | La base mobile est chiffrée (SQLCipher), inaccessible sans le jeton |
| SEC-04 | Prévention injection SQL et XSS | Critique | Toutes les entrées sont validées et sanitizées, aucun payload malveillant ne passe |
| SEC-05 | Rate limiting API | Élevée | Un client dépassant 100 requêtes/minute est bloqué (429) |
| SEC-06 | Jeton JWT révocable | Élevée | Un jeton révoqué n'est plus accepté, même avant expiration |
| SEC-07 | Audit des accès aux données sensibles | Élevée | Toute consultation de dossier sensible est journalisée, consultable par le membre |
| SEC-08 | Conformité RGPD-like | Élevée | Droit d'accès, rectification, effacement partiel, portabilité fonctionnels |

### 3.2 Performance

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| PERF-01 | Latence API REST | Critique | 95 % des requêtes en moins de 500 ms |
| PERF-02 | Latence WebSocket | Élevée | 95 % des messages en moins de 2 secondes |
| PERF-03 | Charge — 500 utilisateurs simultanés | Critique | Aucune dégradation sous 500 utilisateurs concurrents |
| PERF-04 | Pic — décès simultanés | Critique | 10 décès simultanés n'entrainent pas de perte de notifications |
| PERF-05 | Recherche full-text | Élevée | Résultats en moins de 2 secondes avec 100 000 documents indexés |
| PERF-06 | Synchronisation mobile | Moyenne | Synchronisation de 1 000 modifications en moins de 30 secondes |
| PERF-07 | Génération de rapport mensuel | Moyenne | Génération en moins de 60 secondes pour 1 000 transactions |

### 3.3 Notifications

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| NOTIF-01 | Notification critique multi-canal | Critique | Push + SMS + Vocal envoyés en moins de 5 minutes |
| NOTIF-02 | Anti-saturation — plafond quotidien | Critique | Au-delà de 5 notifications standard/jour, les suivantes sont regroupées en digest |
| NOTIF-03 | Respect des fuseaux horaires | Critique | Une notification standard envoyée à 23h UTC+1 est différée à 7h pour un membre à UTC-5 |
| NOTIF-04 | Digest quotidien | Élevée | Le digest est envoyé à 19h locale, regroupe les notifications excédentaires et silencieuses |
| NOTIF-05 | Désactivation par catégorie | Élevée | Un membre peut désactiver une catégorie, les notifications critiques restent obligatoires |
| NOTIF-06 | Rapprochement paiement → notification reçu | Élevée | La notification "Paiement reçu" est envoyée en moins de 30 secondes après le webhook |

### 3.4 Offline-first

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| OFF-01 | Consultation du registre hors-ligne | Critique | Le registre est consultable sans connexion, les données sont à jour de la dernière sync |
| OFF-02 | Saisie d'un paiement en espèces hors-ligne | Critique | Le paiement est saisi, un reçu est généré, synchronisé au retour de connexion |
| OFF-03 | Gestion des conflits de synchronisation | Élevée | Deux modifications concurrentes sont détectées, la dernière gagne ou résolution manuelle |
| OFF-04 | Reprise de synchronisation après coupure | Élevée | La sync reprend là où elle s'est arrêtée, sans perte ni doublon |
| OFF-05 | Mode hors-ligne prolongé (congrès en brousse) | Moyenne | L'application fonctionne 48h hors-ligne, sync au retour avec toutes les données |

### 3.5 Accessibilité

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| A11Y-01 | Navigation au clavier | Élevée | Toutes les actions atteignables au clavier, focus visible |
| A11Y-02 | Lecteur d'écran | Élevée | Sémantique HTML correcte, ARIA sur les composants complexes |
| A11Y-03 | Gros caractères | Moyenne | Tailles de police ajustables, pas de débordement |
| A11Y-04 | Contrastes | Moyenne | Respect des ratios WCAG 2.1 AA |
| A11Y-05 | Multi-langue | Moyenne | Interface disponible en français et anglais, architecture i18n en place |

---

## 4. Critères d'acceptation par phase

### 4.1 Phase 1 — MVP (mois 1-9)

| Critère | Cible | Mesure |
|---|---|---|
| Couverture de code (tests unitaires) | ≥ 80 % | Jest coverage report |
| Tests d'intégration réussis | 100 % | CI/CD pipeline |
| Tests e2e réussis (scénarios critiques) | 100 % | Playwright |
| Tests de performance | PERF-01 à PERF-04 validés | k6 |
| Tests de sécurité | SEC-01 à SEC-04 validés | OWASP ZAP |
| Scénarios U1 | U1-01 à U1-07 validés | Recette |
| Scénarios U2 | U2-01 à U2-04 validés | Recette |
| Scénarios U4 | U4-01 à U4-06 validés | Recette |
| Scénarios transverses | NOTIF-01 à NOTIF-03, OFF-01 à OFF-03, SEC-01 à SEC-04 | Recette |
| Recette famille pilote | ≥ 4/5 satisfaction | Questionnaire |
| Bugs critiques ouverts | 0 | Bug tracker |
| Bugs majeurs ouverts | ≤ 5 | Bug tracker |

### 4.2 Phase 2 — Enrichissement (mois 10-18)

| Critère | Cible |
|---|---|
| Couverture de code | ≥ 80 % |
| Tests e2e réussis | 100 % |
| Scénarios U1 | U1-01 à U1-10 validés |
| Scénarios U2 | U2-01 à U2-10 validés |
| Scénarios U3 | U3-01 à U3-10 validés |
| Scénarios U4 | U4-01 à U4-10 validés |
| Scénarios U5 | U5-01 à U5-06 validés |
| Scénarios transverses | Tous validés |
| Performance sous charge | 1 000 utilisateurs simultanés |
| Recette 5 familles pilotes | ≥ 4/5 satisfaction |
| Bugs critiques ouverts | 0 |
| Bugs majeurs ouverts | ≤ 10 |

### 4.3 Phase 3 — Maturité (mois 19-30)

| Critère | Cible |
|---|---|
| Couverture de code | ≥ 80 % |
| Tous les scénarios (70+) | 100 % validés |
| Performance sous charge | 5 000 utilisateurs simultanés |
| Tests de sécurité complets | Pen-test externe passé |
| Recette 10+ familles | ≥ 4/5 satisfaction |
| Bugs critiques ouverts | 0 |
| Bugs majeurs ouverts | ≤ 5 |

---

## 5. Gestion des bugs

### 5.1 Sévérités

| Sévérité | Définition | Délai de correction | Blocage release ? |
|---|---|---|---|
| **Critique (S1)** | Perte de données, sécurité compromise, fonctionnalité critique indisponible | 24 heures | Oui |
| **Majeur (S2)** | Fonctionnalité importante dégradée, contournement possible | 7 jours | Oui si > 5 |
| **Mineur (S3)** | Fonctionnalité secondaire dégradée, impact limité | 30 jours | Non |
| **Cosmétique (S4)** | Problème visuel, typo, alignement | Au prochain sprint | Non |

### 5.2 Cycle de vie des bugs

```
Nouveau → Assigné → En cours → Résolu → Vérifié → Fermé
                ↓                    ↓
            Rejeté              Réouvert
```

### 5.3 Outils

- **Bug tracker** : GitHub Issues (intégré au CI/CD)
- **Suivi des tests** : Jest coverage report, Playwright HTML report
- **Monitoring production** : Datadog, Sentry (pour les erreurs runtime)

---

## 6. Stratégie d'automatisation

### 6.1 Tests automatisés en CI/CD

| Étape | Outil | Fréquence | Durée cible |
|---|---|---|---|
| Lint | ESLint + Prettier | À chaque commit | < 30s |
| Tests unitaires | Jest | À chaque commit | < 5 min |
| Tests d'intégration | Jest + Testcontainers | À chaque PR | < 10 min |
| Build | Docker | À chaque PR | < 5 min |
| Tests e2e | Playwright | À chaque merge | < 15 min |
| Tests de sécurité | Snyk + OWASP ZAP | Hebdomadaire | < 30 min |
| Tests de charge | k6 | Hebdomadaire | < 30 min |

### 6.2 Données de test

- **Jeu de données de référence** : famille NDONGO (247 membres, 6 branches, 9 pays, 3 générations d'historique).
- **Génération automatique** : script de génération de données synthétiques pour les tests de charge.
- **Anonymisation** : script d'anonymisation des données de production pour staging (Phase 2+).
- **Seed** : script de seed pour les environnements de dev et staging.

### 6.3 Tests de régression

- **Suite de régression** : tous les scénarios e2e sont exécutés à chaque merge sur main.
- **Smoke tests** : 10 scénarios critiques exécutés après chaque déploiement en production.
- **Tests de non-régression** : les bugs corrigés sont accompagnés d'un test de non-régression automatisé.

---

## 7. Plan de test par phase

### 7.1 Phase 1 — MVP (mois 1-9)

| Mois | Activité de test |
|---|---|
| M1-M3 | Tests unitaires et d'intégration des modules U1 et U4 |
| M4-M5 | Tests e2e des scénarios U1-01 à U1-07 et U4-01 à U4-06 |
| M6 | Tests de performance et de sécurité initiaux |
| M7 | Tests offline-first (OFF-01 à OFF-05) |
| M8 | Recette interne (équipe) sur environnement pre-prod |
| M9 | Recette famille pilote (1-2 familles), correction des bugs, release |

### 7.2 Phase 2 — Enrichissement (mois 10-18)

| Mois | Activité de test |
|---|---|
| M10-M12 | Tests des modules U2, U3, U5 |
| M13-M14 | Tests e2e des scénarios complets U2, U3, U5 |
| M15 | Tests de performance sous charge (1 000 utilisateurs) |
| M16 | Tests de sécurité approfondis (pen-test interne) |
| M17 | Recette 5 familles pilotes |
| M18 | Correction, optimisation, release Phase 2 |

### 7.3 Phase 3 — Maturité (mois 19-30)

| Mois | Activité de test |
|---|---|
| M19-M22 | Tests des modules U6, U7 |
| M23-M24 | Tests e2e des scénarios complets U6, U7 |
| M25 | Tests de performance sous charge (5 000 utilisateurs) |
| M26 | Pen-test externe par un cabinet indépendant |
| M27-M28 | Recette 10+ familles, optimisation |
| M29-M30 | Release Phase 3, monitoring, support |

---

## 8. Risques de test et mitigations

| Risque | Mitigation |
|---|---|
| Données de test insuffisantes | Jeu de données NDONGO réaliste + génération automatique |
| Environnement Mobile Money sandbox instable | Mock des webhooks + tests en sandbox avec monitoring |
| Tests offline difficiles à automatiser | Utilisation de Playwright avec simulation réseau |
| Recette famille pilote retardée | Prévoir 2 familles de secours, recette interne préalable |
| Couverture de code insuffisante | Seuil de 80 % bloquant en CI/CD |
| Bugs de production non détectés | Monitoring Datadog + Sentry + smoke tests post-déploiement |

---

## 9. Conclusion

Le plan de test et de recette de FamilleConnect couvre l'intégralité des 7 univers et des composants transverses, avec plus de 70 scénarios clés, des critères d'acceptation mesurables, et une stratégie d'automatisation alignée sur le CI/CD. La pyramide de tests (70 % unitaires, 20 % intégration, 10 % e2e) garantit une couverture exhaustive tout en maintenant des temps d'exécution compatibles avec un développement agile.

L'accent est mis sur les scénarios critiques : annonce de décès en moins de 30 minutes, paiement Mobile Money avec rapprochement automatique, immutabilité des écritures comptables, chiffrement des bulletins de vote, archivage automatique des dossiers clôturés, anti-harcèlement dans la messagerie. Ces scénarios sont testés en profondeur, en mode connecté et hors-ligne, avec des données réalistes.

La recette par les familles pilotes est l'étape ultime de validation. Elle permet de vérifier que l'application répond aux besoins réels des grandes familles camerounaises, dans leurs conditions d'utilisation quotidiennes. Le retour de ces familles pilotes est intégré dans le processus d'amélioration continue, et leur satisfaction (cible ≥ 4/5) est le critère d'acceptation final de chaque phase.

Les prochaines étapes consistent à mettre en place l'infrastructure de test (CI/CD, environnements, jeu de données), à écrire les premiers tests unitaires pour les modules U1 et U4, et à préparer la recette avec les familles pilotes sélectionnées.
