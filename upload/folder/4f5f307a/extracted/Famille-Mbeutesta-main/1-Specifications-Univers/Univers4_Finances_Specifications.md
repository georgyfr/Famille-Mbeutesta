# Univers 4 — Les Finances

**La caisse, les cotisations et la transparence financière**

| Document | Spécifications fonctionnelles — Univers 4 |
|---|---|
| Version | 1.0 |
| Date | Septembre 2026 |
| Statut | Pour validation |
| Audience | Chefs de famille, trésoriers, comité de pilotage, équipe produit, équipe développement |
| Prérequis | Spécifications Univers 1 — La Famille, Univers 2 — La Vie familiale, Univers 3 — La Solidarité |

---

## Synthèse exécutive

L'Univers 4, intitulé **« Les Finances »**, est le poumon technique de l'application. Sans lui, aucun versement n'est possible, aucune cotisation n'est traçable, aucune solidarité ne peut être concrétisée. Plus encore que l'Univers 3, qui traite des situations de solidarité, l'Univers 4 gère l'infrastructure financière qui sous-tend toute la vie familiale : la caisse, les cotisations régulières, les paiements Mobile Money, la comptabilité, le budget, l'audit et la transparence. C'est le module où une faille technique ou une perte de confiance peut discréditer définitivement l'ensemble du système.

La proposition centrale de l'Univers 4 est de remplacer la gestion opaque d'aujourd'hui — cahiers du trésorier, transferts WhatsApp non tracés, cotisations en espèces sans reçu, rapports annuels approximatifs — par une **infrastructure financière numérique transparente, traçable et auditable**. Chaque FCFA qui entre ou sort de la caisse familiale est enregistré dans un journal immutable, rapproché avec un paiement Mobile Money ou un justificatif, validé selon des règles de gouvernance, et consultable par les autorités familiales. Le système ne supprime pas le trésorier : il le dote d'outils professionnels et le protège des soupçons.

Le présent document définit le rôle, les objectifs, l'architecture en sept modules, le modèle de données, les règles de gestion, les cas limites et la roadmap de l'Univers 4. Il s'appuie sur l'Univers 1 (membres, branches, rôles) pour identifier les ayants droit et les responsables, sur l'Univers 2 (événements) pour le déclenchement des budgets et des paiements, et sur l'Univers 3 (solidarité) pour les collectes ciblées. L'Univers 4 est conçu pour transformer un sujet explosif en une discipline partagée, sans alourdir la charge des trésoriers bénévoles qui assurent ce service essentiel.

---

## 1. Rôle et finalité de l'Univers 4

### 1.1 Rôle stratégique

L'Univers 4 joue quatre rôles stratégiques imbriqués qui en font le poumon technique de l'application.

**Premièrement, il est l'infrastructure de paiement de toute la famille.** Chaque FCFA qui transite par la famille — cotisation mensuelle, contribution à un décès, versement d'une bourse scolaire, paiement d'un fournisseur pour un congrès — passe par l'Univers 4. Celui-ci intègre les opérateurs Mobile Money du Cameroun (MTN MoMo, Orange Money), les virements bancaires pour la diaspora, la gestion des espèces pour les membres sans accès numérique, et la prise en charge des devises étrangères. Sans cette infrastructure, l'Univers 3 (Solidarité) ne pourrait pas exécuter ses collectes, et les Univers 2 et 5 ne pourraient pas organiser leurs événements et votes impliquant des contributions.

**Deuxièmement, il est le garant de la transparence financière.** Dans les grandes familles africaines, l'argent est la source numéro un des conflits. Les rumeurs de détournement, les soupçons sur les montants réellement collectés, les frustrations sur les dépenses non justifiées : tout cela déchire les familles plus souvent qu'on ne le pense. L'Univers 4 impose la discipline radicale déjà évoquée dans l'Univers 3, mais étendue à l'ensemble des flux financiers : chaque entrée et chaque sortie sont enregistrées dans un journal immutable, rapprochées avec un justificatif, validées selon des règles de gouvernance, et publiées dans des rapports automatiques. La transparence n'est plus une option negociable : elle est inscrite dans le système.

**Troisièmement, il est le cadre de la planification budgétaire.** Une grande famille dépense chaque année plusieurs millions de FCFA : congrès biennal, aides sociales récurrentes, frais de fonctionnement (communications, déplacements des représentants), investissements exceptionnels (achat d'un terrain familial, construction d'une case de passage). Sans planification, ces dépenses se font au fil de l'eau, sous la pression des événements, et aboutissent à des déficits ou à des cotisations exceptionnelles mal reçues. L'Univers 4 propose un cadre budgétaire annuel, voté par le conseil, suivi mensuellement, avec alertes en cas de dérive. C'est la fin de l'improvisation financière.

**Quatrièmement, il est la mémoire comptable de la famille.** Chaque exercice annuel est clôturé, archivé, et consultable. Les descendants peuvent, dans vingt ou cinquante ans, voir comment la famille gérait ses finances, quelles étaient les priorités de dépense, comment les cotisations évoluaient. Cette mémoire est précieuse pour la transmission institutionnelle et pour la prévention des conflits : en cas de contestation, même des années plus tard, les archives comptables tranchent.

### 1.2 Finalité opérationnelle

Sur le plan opérationnel, l'Univers 4 poursuit une finalité claire : **qu'à tout moment, tout membre autorisé puisse répondre à six questions fondamentales** :

1. Quel est le solde actuel de la caisse familiale, et sa décomposition par caisse (principale, branches, solidarité) ?
2. Suis-je à jour de mes cotisations, et quel est mon historique de contribution sur les 12 derniers mois ?
3. Comment puis-je effectuer un paiement (cotisation, contribution à un événement), et par quel canal ?
4. Quelles sont les dépenses du mois, et avec quels justificatifs ?
5. Quel est le budget annuel en cours, et où en est l'exécution ?
6. En cas de question ou de contestation, à qui m'adresser, et quel est le processus d'audit ?

Si ces six questions trouvent une réponse immédiate et fiable, l'Univers 4 remplit sa mission. La finance cesse d'être un sujet d'inquiétude pour devenir un fonctionnement maîtrisé.

### 1.3 Trois piliers de la confiance financière

L'Univers 4 distinguera systématiquement trois piliers qui structurent toute la conception :

- **Le pilier opérationnel** — les outils du quotidien : caisse, cotisations, paiements,.Mobile Money. Leur qualité conditionne l'adoption par les trésoriers et les membres.
- **Le pilier comptable** — la rigueur de la trace : journal, plan comptable, balance, états financiers, clôture annuelle. Leur qualité conditionne la confiance et la résilience aux contestations.
- **Le pilier de gouvernance** — les règles du contrôle : double validation, justificatifs, audit, transparence. Leur qualité conditionne la prévention des fraudes et des erreurs.

Ces trois piliers sont indissociables. Un système opérationnel sans rigueur comptable finit dans le chaos ; un système comptable sans outils opérationnels est contourné ; un système avec contrôles sans infrastructure de paiement est inutile. L'Univers 4 les traite conjointement.

---

## 2. Objectifs mesurables

L'Univers 4 doit être évalué sur des indicateurs concrets. Les objectifs ci-dessous sont proposés pour la première année d'exploitation, sur une famille pilote de 150 à 300 membres.

| Objectif | Indicateur | Cible année 1 |
|---|---|---|
| Taux de cotisation à jour | Pourcentage de membres ayant réglé leur cotisation du trimestre en cours | ≥ 80 % |
| Délai de versement | Délai moyen entre échéance et réception du paiement | ≤ 14 jours |
| Taux de rapprochement Mobile Money | Pourcentage de paiements Mobile Money automatiquement rapprochés | ≥ 95 % |
| Taux de justificatifs | Pourcentage de dépenses > 10 000 FCFA justifiées par pièce jointe | 100 % |
| Délai de validation des dépenses | Délai moyen entre proposition et validation d'une dépense | ≤ 3 jours |
| Précision budgétaire | Écart entre budget prévisionnel et exécution réelle | ≤ 15 % |
| Délai de clôture annuelle | Délai entre fin d'exercice et clôture validée | ≤ 90 jours |
| Satisfaction du trésorier | Note donnée par le trésorier sur l'outil | ≥ 4/5 |
| Satisfaction des membres | Note moyenne sur la transparence financière | ≥ 4/5 |
| Indisponibilité du service | Temps cumulé d'indisponibilité par mois | ≤ 60 minutes |

Ces cibles sont indicatives ; elles devront être ajustées avec les familles pilotes. Elles traduisent l'ambition : une gestion financière professionnelle, transparente et accessible, sans délaisser la dimension humaine.

---

## 3. Architecture fonctionnelle

L'Univers 4 est composé de **sept modules fonctionnels** qui s'articulent autour d'un cœur commun : la caisse familiale. Les cotisations, paiements, budget, comptabilité, audit et reporting sont autant de dimensions complémentaires de la gestion financière.

### Vue d'ensemble des modules

```
┌─────────────────────────────────────────────────────────────┐
│              UNIVERS 4 — LES FINANCES                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CŒUR : Caisse familiale multi-niveaux                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐  │
│   ▼          ▼          ▼          ▼          ▼          ▼  │
│  Cotisations Mobile     Budget &   Comptabilité Audit &  Re- │
│  & contri-   Money &    prévisions & journal    contrôles  porting│
│  butions     paiements                              & trans- │
│                                                       paren- │
│                                                       ce    │
└─────────────────────────────────────────────────────────────┘
```

L'organisation de l'application reflète cette architecture : un tableau de bord financier affiche le solde global, l'état des cotisations du trimestre, les dépenses du mois, et l'avancement du budget. Les membres consultent leur propre situation (cotisations, contributions, reçus). Le trésorier et le conseil accèdent aux vues de gestion (journal, balance, audit, reporting).

### Navigation principale

La navigation de l'Univers 4 s'organise autour de cinq entrées principales :

1. **Caisse** — solde global, décomposition par caisse, mouvements récents.
2. **Mes cotisations** — échéances, statut, historique, reçus.
3. **Payer** — assistant de paiement (cotisation, contribution à un événement, don).
4. **Budget** — budget annuel en cours, exécution par poste.
5. **Rapports** — rapports mensuels, bilan annuel, exports.

Le trésorier et le conseil disposent en plus d'une entrée **Comptabilité** (journal, balance, rapprochement, audit) accessible uniquement aux rôles autorisés.

---

## 4. Module 4.1 — La caisse familiale multi-niveaux

### 4.1.1 Description

La caisse familiale n'est pas un compte unique : c'est un ensemble de caisses distinctes, chacune avec son objet, son solde, ses règles de gestion. Cette structure multi-niveaux est essentielle pour refléter la réalité des grandes familles, où coexistent une caisse principale pour le fonctionnement, des caisses de branches pour les dépenses locales, des caisses de solidarité pour les situations difficiles, et des caisses d'événement pour les congrès et mariages.

### 4.1.2 Types de caisses

| Type | Description | Solde cible | Gestionnaire |
|---|---|---|---|
| Caisse principale | Fonctionnement général de la famille | Selon budget | Trésorier + conseil |
| Caisse de branche | Dépenses de la branche (réunions, déplacements) | Selon budget de branche | Trésorier de branche |
| Caisse de solidarité | Versements d'aides sociales récurrentes | Fonds de roulement ≥ 3 mois | Trésorier + comité médiation |
| Caisse d'événement | Collecte et dépenses d'un événement spécifique | Selon budget de l'événement | Référent de l'événement |
| Caisse de réserve | Épargne de précaution, placements | Selon politique du conseil | Trésorier + conseil |
| Caisse d'investissement | Projets à long terme (terrain, construction) | Selon projet | Conseil + comité ad hoc |

### 4.1.3 Virements inter-caisses

Les virements entre caisses sont possibles, mais soumis à des règles strictes :

- Un virement depuis la caisse principale vers une caisse de branche est validé par le trésorier seul.
- Un virement depuis la caisse de réserve vers la caisse principale est validé par le conseil.
- Un virement depuis la caisse de solidarité vers une autre caisse est exceptionnel et validé par le conseil et le comité médiation.
- Tout virement est tracé dans le journal immutable avec motif, validateur, et date.

### 4.1.4 Soldes et plafonds

Chaque caisse possède des règles de solde et de plafond, configurables par le conseil :

- **Solde minimum** — en dessous duquel une alerte est émise (par exemple, caisse de solidarité ne doit jamais descendre sous 3 mois d'aides sociales).
- **Solde cible** — niveau optimal pour le fonctionnement.
- **Plafond** — au-delà duquel un excédent est transféré vers la caisse de réserve.

Ces règles préviennent les déséquilibres (caisse principale trop faible, caisse de réserve trop abondante au détriment du fonctionnement) et assurent une discipline financière de long terme.

### 4.1.5 Comptes bancaires et comptes Mobile Money

Chaque caisse est rattachée à un ou plusieurs comptes externes :

- Compte bancaire (pour les montants importants et la diaspora).
- Compte Mobile Money (pour les cotisations et petites dépenses).
- Compte espèces (pour les paiements en espèces, gérés par le trésorier).

Le rapprochement entre les soldes internes (caisse) et les soldes externes (banque, Mobile Money) est effectué automatiquement par le système, à partir des relevés et des webhooks des opérateurs. Tout écart est signalé et doit être justifié.

### 4.1.6 Cas limite — caisse en déficit

Si une caisse passe en solde négatif (par exemple, dépenses engagées avant réception des cotisations), le système alerte immédiatement le trésorier et le conseil. Le déficit est couvert soit par un virement depuis la caisse de réserve, soit par une cotisation exceptionnelle, soit par un prêt familial interne (voir Univers 3). La situation ne peut pas durer plus de 30 jours sans plan de redressement validé par le conseil.

---

## 5. Module 4.2 — Cotisations et contributions

### 5.1 Description

Les cotisations régulières sont la ressource principale de la caisse familiale. Leur perception fiable et leur suivi transparent sont les conditions de la santé financière de la famille. Aujourd'hui, ce suivi repose sur des appels WhatsApp, des cahiers et des promesses non tenues. L'Univers 4 propose un système structuré, automatisé et transparent.

### 5.2 Types de cotisations

| Type | Description | Fréquence | Barème par défaut |
|---|---|---|---|
| Cotisation mensuelle | Contribution de fonctionnement courant | Mensuelle | 5 000 FCFA / membre adulte |
| Cotisation trimestrielle | Alternative à la mensuelle pour les membres diaspora | Trimestrielle | 15 000 FCFA |
| Cotisation annuelle | Cotisation principale, votée au congrès | Annuelle | 50 000 FCFA |
| Cotisation exceptionnelle | Pour un événement ou un projet spécifique | Ponctuelle | Variable, selon décision |
| Cotisation de branche | Pour le fonctionnement de la branche | Variable | Selon budget de branche |
| Contribution à un événement | Pour un mariage, décès, congrès (lien U2, U3) | Ponctuelle | Variable |

Les barèmes par défaut sont indicatifs et configurables par le conseil. Le barème gradué décrit dans l'Univers 3 (module 4.5) s'applique aux cotisations exceptionnelles et aux grandes contributions.

### 5.3 Calendrier et échéances

Chaque cotisation possède un calendrier d'échéance :

- Cotisation mensuelle : le 5 de chaque mois.
- Cotisation trimestrielle : le 5 des mois de janvier, avril, juillet, octobre.
- Cotisation annuelle : le 31 mars, après vote au congrès de décembre.
- Cotisation exceptionnelle : date fixée par le conseil lors du vote.

Le calendrier est publié à tous les membres, et intégré au calendrier familial (Univers 2). Les rappels automatiques sont envoyés à J-7, J-1, J+3, J+10. Au-delà de J+15, le membre est marqué « en retard » et le chef de branche est notifié.

### 5.4 Suivi individuel

Chaque membre dispose d'un suivi individuel de ses cotisations, visible dans son profil :

- Échéances à venir.
- Statut de chaque échéance (à jour, en retard, exonéré).
- Historique des 24 derniers mois.
- Reçus téléchargeables (PDF).

Le suivi individuel est confidentiel : seul le membre, son chef de branche, le trésorier et le conseil y ont accès. La publication des « retardataires » est strictement interdite par les règles de gouvernance.

### 5.5 Exonérations

Les exonérations, déjà décrites dans l'Univers 3 (module 4.5), s'appliquent aux cotisations régulières. Un membre en précarité peut être exonéré totalement ou partiellement, sur décision confidentielle du comité médiation. Le membre exonéré apparaît comme « à jour » dans le suivi individuel, sans mention de l'exonération, ce qui préserve sa dignité.

### 5.6 Relances automatiques

Les relances sont automatiques et mesurées :

- **Rappel J-7** — message poli, anticipant l'échéance.
- **Rappel J+3** — message indiquant le retard et le mode de paiement.
- **Rappel J+10** — message plus explicite, avec lien direct vers le paiement.
- **Notification chef de branche J+15** — le chef de branche est informé, sans détail du montant.
- **Action conseil J+30** — le conseil est saisi, une procédure de médiation peut être ouverte.

Les relances respectent les fuseaux horaires et les préférences de canal. Un membre exonéré ne reçoit aucune relance.

---

## 6. Module 4.3 — Mobile Money et paiements

### 6.1 Description

L'intégration Mobile Money est la clé de voûte de l'Univers 4. Au Cameroun et en zone CEMAC, la majorité des transactions familiales se font via MTN MoMo ou Orange Money. Sans intégration native, l'application contraindrait les membres à des manipulations manuelles (envoyer la preuve de paiement par WhatsApp, saisie par le trésorier), ce qui recréerait l'opacité que l'application vise à éliminer.

### 6.2 Intégration MTN MoMo et Orange Money

L'Univers 4 intègre les API officielles de MTN MoMo (MoMo API) et Orange Money (Orange Money Web Payment), avec les fonctionnalités suivantes :

- **Paiement entrant** — un membre paie sa cotisation ou contribution via Mobile Money, depuis l'application. Le paiement est déclenché par un bouton « Payer », qui ouvre l'interface de l'opérateur (USSD, application mobile, ou popup selon le contexte).
- **Webhook de confirmation** — l'opérateur notifie l'application en temps réel du succès du paiement. L'application enregistre automatiquement l'écriture comptable et envoie un reçu au membre.
- **Rapprochement automatique** — chaque paiement Mobile Money est rapproché avec une écriture comptable. En cas de paiement sans écriture correspondante (par exemple, un membre a payé sans passer par l'app), le système détecte l'écart et propose une régularisation.
- **Paiement sortant** — pour les dépenses validées (aides sociales, factures), le trésorier peut effectuer un paiement Mobile Money directement depuis l'application, avec traçabilité complète.

### 6.3 Autres canaux de paiement

| Canal | Usage | Traçabilité |
|---|---|---|
| Mobile Money (MTN, Orange) | Cotisations, contributions, petites dépenses | Automatique via API |
| Virement bancaire | Cotisations diaspora, gros montants | Semi-automatique (relevé) |
| Carte bancaire | Diaspora hors zone CEMAC | Via passerelle de paiement |
| Espèces | Membres sans Mobile Money, événements en présentiel | Saisie manuelle par trésorier, avec reçu |
| PayPal / Wise | Diaspora internationale | Semi-automatique, avec justificatif |
| Crypto (optionnel) | Diaspora dans certains pays | À l'étude, non prioritaire |

### 6.4 Cas hors-ligne

La connexion Internet n'est pas garantie dans les zones rurales du Cameroun. Le système prévoit un mode hors-ligne pour les opérations critiques :

- Saisie d'un paiement en espèces hors-ligne, avec synchronisation au retour de connexion.
- Consultation des soldes hors-ligne (dernière valeur connue).
- Émission d'un reçu PDF hors-ligne, avec identifiant unique.

Ce mode hors-ligne est essentiel pour les congrès en zone rurale et pour les membres en mobilité.

### 6.5 Reçus et justificatifs

Chaque paiement génère automatiquement un reçu PDF, avec :

- Identifiant unique du reçu.
- Date et heure.
- Montant et devise.
- Canal de paiement.
- Émetteur et bénéficiaire (caisse).
- Motif (cotisation, contribution, don).
- Référence de transaction opérateur.

Le reçu est téléchargeable par le membre, archivé dans son historique, et joignable à toute contestation éventuelle.

### 6.6 Sécurité des paiements

Les paiements sont soumis à des règles de sécurité strictes :

- Authentification à deux facteurs pour toute opération supérieure à 50 000 FCFA.
- Plafond quotidien configurable (par défaut 200 000 FCFA par membre).
- Détection automatique des paiements anormaux (montant inhabituel, fréquence suspecte).
- Journalisation de toute tentative de paiement, réussie ou échouée.
- Conformité aux exigences réglementaires de la BEAC et de l'COBAC.

---

## 7. Module 4.4 — Budget et prévisions

### 7.1 Description

Le budget est l'instrument de planification financière de la famille. Sans budget, les dépenses se font au fil de l'eau, sous la pression des événements, et aboutissent à des déficits ou à des cotisations exceptionnelles mal reçues. L'Univers 4 propose un cadre budgétaire annuel, voté par le conseil, suivi mensuellement, avec alertes en cas de dérive.

### 7.2 Cycle budgétaire annuel

Le cycle budgétaire suit le calendrier suivant :

| Mois | Étape |
|---|---|
| Septembre | Préparation du projet de budget par le trésorier |
| Octobre | Consultation des chefs de branche et des comités |
| Novembre | Finalisation et arbitrage par le conseil |
| Décembre (congrès) | Vote du budget par l'assemblée |
| Janvier | Démarrage de l'exercice, ouverture des caisses |
| Mars, juin, septembre | Revues trimestrielles d'exécution |
| Décembre (congrès suivant) | Bilan de l'exercice, clôture |

### 7.3 Structure du budget

Le budget est organisé en postes, eux-mêmes regroupés en grandes catégories :

| Catégorie | Postes typiques |
|---|---|
| Fonctionnement | Communications, déplacements des représentants, frais administratifs |
| Événements | Congrès biennal, assemblée générale, journées familiales |
| Solidarité | Aides sociales récurrentes, secours exceptionnels |
| Investissement | Terrain familial, construction, équipements |
| Réserve | Alimentation de la caisse de réserve |

Chaque poste possède un montant prévisionnel, un responsable, et un calendrier de dépense. Le suivi mensuel compare le prévisionnel au réel, et signale les écarts supérieurs à un seuil (par défaut 15 %).

### 7.4 Budget par événement

Chaque événement de l'Univers 2 (congrès, mariage, funérailles) possède son propre budget, rattaché au budget annuel global. Le budget d'événement suit le même cycle (préparation, validation, exécution, clôture), mais sur une durée plus courte. La clôture de l'événement (Univers 2) déclenche la clôture budgétaire, avec bilan transmis au conseil.

### 7.5 Budget par branche

Chaque branche peut disposer de son propre budget de fonctionnement, financé par une cotisation de branche ou par une dotation de la caisse principale. Le trésorier de branche gère ce budget, avec les mêmes outils que le trésorier principal (suivi mensuel, justificatifs, clôture). Cette décentralisation reflète la réalité des grandes familles, où les branches ont une autonomie de fonctionnement significative.

### 7.6 Ajustements en cours d'exercice

Le budget voté n'est pas figé. En cours d'exercice, des ajustements sont possibles :

- **Virement de poste** — transfert d'un poste à un autre, dans la limite de 10 % du poste source, validé par le trésorier seul.
- **Virement significatif** — au-delà de 10 %, validation du conseil.
- **Budget additionnel** — en cas d'événement imprévu, le conseil peut voter un budget additionnel financé par la réserve ou par une cotisation exceptionnelle.

Tout ajustement est tracé dans le journal et publié dans le rapport mensuel suivant.

---

## 8. Module 4.5 — Comptabilité et journal

### 8.1 Description

La comptabilité est la mémoire rigoureuse de la famille. Elle transforme une collection de paiements et de dépenses en un système cohérent, auditable et consultable. L'Univers 4 propose une comptabilité simplifiée mais professionnelle, adaptée aux besoins des grandes familles et à la formation de trésoriers bénévoles.

### 8.2 Plan comptable simplifié

Le plan comptable est inspiré du SYSCOHADA (système comptable OHADA applicable en zone CEMAC), mais simplifié pour rester accessible. Les principales classes sont :

| Classe | Intitulé | Exemples de comptes |
|---|---|---|
| 1 | Comptes de capitaux | Caisse principale, caisses de réserve, report à nouveau |
| 2 | Comptes d'immobilisations | Terrain familial, constructions, matériel |
| 4 | Comptes de tiers | Cotisants, fournisseurs, débiteurs divers |
| 5 | Comptes de trésorerie | Banque, Mobile Money, caisse espèces |
| 6 | Comptes de charges | Fonctionnement, événements, solidarité |
| 7 | Comptes de produits | Cotisations, dons, contributions |

Chaque compte possède un code, un intitulé, et un solde. Le trésorier peut ajouter des sous-comptes pour affiner le suivi, dans la limite d'un nombre raisonnable (par défaut, 100 comptes maximum).

### 8.3 Journal des écritures

Le journal est la chronologie de toutes les écritures comptables. Chaque écriture comporte :

- Numéro d'écriture (incrémental, non modifiable).
- Date de l'écriture.
- Compte débité et compte crédité.
- Montant.
- Motif (description libre).
- Pièce justificative (lien vers le document).
- Auteur de l'écriture.
- Validateur (pour les dépenses soumises à double validation).
- Statut (brouillon, validée, rapprochée, archivée).

Le journal est immutable : aucune écriture ne peut être modifiée ou supprimée après validation. Toute correction se fait par écriture compensatoire (écriture inverse annulant l'écriture erronée, puis nouvelle écriture correcte). Cette immuabilité est la garantie fondamentale de l'auditabilité.

### 8.4 Balance et états financiers

À partir du journal, le système génère automatiquement :

- **La balance générale** — solde de chaque compte à une date donnée.
- **Le compte de résultat** — produits et charges de l'exercice, solde net.
- **Le bilan** — situation patrimoniale à la clôture.
- **La balance âgée** — détail des créances et dettes par ancienneté.
- **Les états de caisse** — solde de chaque caisse, mouvements du mois.

Ces états sont générés à la demande, et automatiquement à chaque clôture mensuelle et annuelle. Ils sont consultables par le trésorier et le conseil, et publiés dans le rapport mensuel (version agrégée, sans détail nominatif).

### 8.5 Exercice annuel et clôture

L'exercice annuel suit l'année civile (1er janvier au 31 décembre). La clôture se déroule en trois étapes :

1. **Clôture provisoire** (janvier) — par le trésorier, avec inventaire, régularisations, et arrêté des comptes.
2. **Audit éventuel** (février) — par un commissaire aux comptes externe, si la famille le souhaite ou si les statuts l'exigent.
3. **Clôture définitive** (mars) — validation par le conseil, présentation au congrès, archivage.

La clôture est un moment important de la vie familiale. Elle donne lieu à un bilan annuel transmis à tous les membres, présenté au congrès, et archivé dans l'Univers 6 (Mémoire).

### 8.6 Lien avec l'Univers 3

L'Univers 3 (Solidarité) utilise l'infrastructure comptable de l'Univers 4 pour enregistrer les collectes et les dépenses de solidarité. Chaque dossier de solidarité génère des écritures dans le journal U4, avec un code analytique spécifique permettant de les isoler. Le rapprochement entre U3 et U4 est automatique et garantit la cohérence entre le suivi opérationnel (U3) et la comptabilité (U4).

---

## 9. Module 4.6 — Audit et contrôles

### 9.1 Description

L'audit est la garantie ultime de la confiance. Même avec un journal immutable et des justificatifs obligatoires, des contrôles périodiques sont nécessaires pour détecter les anomalies, les erreurs, et les tentatives de fraude. L'Univers 4 intègre plusieurs niveaux d'audit, complétant ceux déjà décrits dans l'Univers 3.

### 9.2 Journal immutable des écritures

Déjà évoqué, ce journal est la pierre angulaire de l'audit. Toute écriture, une fois validée, ne peut plus être modifiée. Les corrections se font par écriture compensatoire, avec mention du motif et de l'auteur. Le journal est consultable par le conseil et le comité médiation, et exportable en mode audit.

### 9.3 Double validation des dépenses

Toute dépense supérieure à un seuil configurable (par défaut 50 000 FCFA) est soumise à double validation :

- Le référent du dossier ou le trésorier propose la dépense (montant, bénéficiaire, motif, justificatif).
- Un second validateur (trésorier pour une dépense de branche, membre du conseil pour une dépense principale) valide.
- Le paiement est alors effectué via l'Univers 4.

Pour les dépenses supérieures à un second seuil (par défaut 500 000 FCFA), une triple validation est requise, incluant le patriarche ou le conseil au complet.

### 9.4 Justificatifs obligatoires

Toute dépense supérieure à 10 000 FCFA doit être justifiée par une pièce jointe : facture, reçu, photo, contrat. Les justificatifs sont téléversés dans l'application, visibles par le conseil et le comité médiation, et archivés. En l'absence de justificatif, la dépense est signalée et doit être régularisée ou remboursée.

### 9.5 Rapprochement bancaire

Le rapprochement entre les écritures comptables et les relevés externes (banque, Mobile Money) est effectué automatiquement par le système, à partir des relevés et des webhooks des opérateurs. Tout écart est signalé et doit être justifié par le trésorier. Le rapprochement est obligatoire mensuellement, et présenté dans le rapport mensuel.

### 9.6 Audit aléatoire

Le comité médiation ou un commissaire aux comptes externe peut, à tout moment, déclencher un audit aléatoire sur un échantillon de dossiers ou de writes comptables. Le système génère un export complet (écritures, justificatifs, journaux d'accès) pour la période et le périmètre concernés. L'audit aléatoire est un facteur de dissuasion essentiel : savoir que tout peut être contrôlé à tout moment réduit considérablement les tentations.

### 9.7 Audit externe annuel

Pour les familles qui le souhaitent, ou dont les statuts l'exigent, un audit externe annuel est organisé par un commissaire aux comptes indépendant. L'application fournit un export complet d'audit (écritures, justificatifs, journaux d'accès, rapprochements), permettant à l'auditeur de travailler sans avoir à demander des informations supplémentaires. Le rapport d'audit est archivé dans l'Univers 6.

### 9.8 Mode audit

Sur décision du conseil, ou à l'occasion d'un changement de trésorier, le mode audit est activable. Il génère un export complet :

- Toutes les transactions sur une période donnée.
- Tous les justificatifs.
- Tous les bilans de dossiers.
- Les journaux d'audit (qui a consulté quoi, quand, qui a validé quoi).

Cet export est destiné à un comptable externe ou à un commissaire aux comptes, pour une vérification indépendante. Cette capacité d'audit est un gage de sérieux qui distingue l'application d'une simple cagnotte informelle.

---

## 10. Module 4.7 — Reporting et transparence

### 10.1 Description

Le reporting est l'instrument de la transparence. Même avec une comptabilité parfaite, si les membres ne voient pas l'état des finances, la méfiance s'installe. L'Univers 4 propose plusieurs niveaux de reporting, adaptés aux différents rôles, et publiés automatiquement.

### 10.2 Rapport mensuel automatique

Chaque mois, le système génère automatiquement un rapport financier transmis à tous les membres. Ce rapport comprend :

- Le bilan du mois (entrées, sorties, solde global).
- La décomposition par caisse (principale, branches, solidarité).
- L'état des cotisations (taux de participation, retards, exonérations).
- Les dépenses majeures du mois (sans détail nominatif des bénéficiaires).
- L'avancement du budget annuel (par poste, avec écarts).
- Les alertes (écarts significatifs, dépenses non justifiées, retards de validation).

Ce rapport mensuel est un acte de transparence fort. Il montre que le système est vivant, surveillé, et tenu à jour.

### 10.3 Bilan annuel

Chaque année, en mars-avril, un bilan annuel complet est transmis à tous les membres et présenté au congrès. Il comprend :

- Le compte de résultat de l'exercice.
- Le bilan patrimonial.
- L'évolution sur 5 ans (produits, charges, solde, patrimoine).
- Le rapport d'audit éventuel.
- Les motions adoptées par le congrès relatives aux finances.

Le bilan annuel est archivé dans l'Univers 6 (Mémoire) et reste consultable indéfiniment.

### 10.4 Niveaux de détail par rôle

Le niveau de détail des rapports varie selon le rôle du destinataire :

| Rôle | Niveau de détail |
|---|---|
| Membre ordinaire | Vue agrégée, sans montants nominatifs |
| Chef de branche | Vue agrégée + détail de sa branche |
| Trésorier | Vue complète, y compris nominative |
| Conseil | Vue complète + analytique par poste et par branche |
| Comité médiation | Vue complète + dossiers sensibles |
| Commissaire aux comptes | Mode audit, export complet |

Cette gradation protège la confidentialité des membres (par exemple, un membre en précarité bénéficiant d'une aide sociale n'est pas identifié dans les rapports agrégés) tout en garantissant la transparence pour les autorités.

### 10.5 Exports PDF et Excel

Tous les rapports peuvent être exportés en PDF (pour diffusion) et Excel (pour analyse approfondie). Les exports PDF comportent un filigrane nominatif (nom du membre ayant généré l'export), ce qui dissuade les diffusions non autorisées. Le nombre d'exports par membre et par mois est limité (par défaut 10), pour prévenir les fuites massives.

### 10.6 Tableau de bord financier en temps réel

En complément des rapports périodiques, un tableau de bord financier en temps réel est accessible aux rôles autorisés (trésorier, conseil). Il affiche :

- Le solde global et par caisse, mis à jour en temps réel.
- Les mouvements du jour (entrées, sorties).
- L'état des cotisations du trimestre en cours.
- Les dépenses en attente de validation.
- Les alertes en cours (déficit de caisse, dépenses non justifiées, rapprochements en attente).

Ce tableau de bord est l'outil de pilotage du trésorier et du conseil au quotidien.

---

## 11. Modèle de données conceptuel

Le modèle de données de l'Univers 4 s'articule autour de sept entités principales.

| Entité | Description | Attributs clés |
|---|---|---|
| Caisse | Une caisse du système multi-niveaux | Identifiant, type, solde, plafonds, gestionnaire |
| Cotisation | Une cotisation due par un membre | Membre, type, échéance, montant, statut |
| Paiement | Un paiement effectif (entrant ou sortant) | Caisse, montant, date, canal, référence opérateur |
| ÉcritureComptable | Une écriture dans le journal | Numéro, date, compte débit, compte crédit, montant, justificatif |
| Justificatif | Une pièce justificative d'une dépense | Écriture, type, URL, validateur |
| Budget | Un budget annuel ou d'événement | Exercice, postes, montants prévisionnels, exécution |
| Audit | Journal d'une action sensible | Auteur, action, cible, date, justification |

### 11.1 Relations principales

- Une **Caisse** possède plusieurs **Paiements** et plusieurs **ÉcrituresComptables**.
- Une **Cotisation** est due par un **Membre** (lien U1) et peut donner lieu à un **Paiement**.
- Un **Paiement** génère une ou plusieurs **ÉcrituresComptables**.
- Une **ÉcritureComptable** possède un **Justificatif** (pour les dépenses > seuil).
- Un **Budget** est composé de plusieurs postes, chacun suivi mensuellement.
- Un **Audit** est généré à chaque action sensible (validation, modification, consultation de données confidentielles).

### 11.2 Règles d'intégrité

- Aucune écriture ne peut être modifiée après validation (immutable).
- Aucune écriture ne peut être créée sans compte débit et compte crédit équilibrés (partie double).
- Un paiement ne peut être rapproché qu'une seule fois avec une écriture.
- Une dépense > seuil ne peut être validée sans justificatif.
- Une cotisation ne peut être enregistrée comme payée sans paiement correspondant.
- Toute suppression est interdite ; les écritures sont compensatoires, jamais effacées.

---

## 12. Règles de gestion essentielles

Les règles ci-dessous s'imposent à tous les modules de l'Univers 4. Elles sont configurables par chaque famille.

| # | Règle | Justification |
|---|---|---|
| R1 | Le journal des écritures est immutable ; toute correction se fait par écriture compensatoire | Garantit l'auditabilité |
| R2 | Toute dépense > 10 000 FCFA est justifiée par pièce jointe | Garantit la transparence |
| R3 | Toute dépense > 50 000 FCFA est soumise à double validation | Prévient les erreurs et détournements |
| R4 | Toute dépense > 500 000 FCFA est soumise à triple validation (conseil) | Protège les montants significatifs |
| R5 | Tout virement inter-caisses est tracé avec motif et validateur | Garantit la cohérence |
| R6 | Le rapprochement bancaire est obligatoire mensuellement | Détecte les écarts rapidement |
| R7 | Aucune caisse ne peut rester en déficit plus de 30 jours sans plan de redressement | Préserve la santé financière |
| R8 | Un rapport mensuel est transmis automatiquement à tous les membres | Renforce la transparence |
| R9 | Les exports PDF comportent un filigrane nominatif | Dissuade les diffusions non autorisées |
| R10 | Le mode audit est activable sur décision du conseil, avec export complet | Permet les vérifications indépendantes |
| R11 | L'exercice annuel est clôturé dans les 90 jours suivant la fin d'exercice | Garantit la régularité |
| R12 | Les cotisations en retard > 30 jours déclenchent une procédure de médiation | Prévient l'accumulation des impayés |
| R13 | Les paiements > 50 000 FCFA requièrent authentification à deux facteurs | Sécurise les transactions |
| R14 | Les barèmes de cotisation sont votés annuellement par le congrès | Garantit la légitimité |
| R15 | Les ajustements budgétaires > 10 % d'un poste sont validés par le conseil | Préserve la discipline budgétaire |

---

## 13. Cas limites et situations sensibles

### 13.1 Décès ou indisponibilité du trésorier

Le trésorier est le pivot du système. Son indisponibilité (décès, maladie, démission) ne doit pas bloquer le fonctionnement financier. Le système prévoit :

- Un trésorier adjoint, désigné formellement, qui peut prendre le relais immédiatement.
- Une procédure d'urgence permettant au conseil de désigner un trésorier intérimaire.
- Un audit de transition obligatoire, pour vérifier l'état des comptes lors du changement.
- Une traçabilité complète des accès du trésorier sortant, conservée pour audit ultérieur.

### 13.2 Caisse en déficit

Si la caisse principale passe en déficit (par exemple, dépenses engagées avant réception des cotisations), le système déclenche :

- Une alerte immédiate au trésorier et au conseil.
- Un gel des dépenses non urgentes, sauf validation explicite du conseil.
- Un plan de redressement à soumettre au conseil dans les 30 jours.
- Une communication transparente aux membres, expliquant la situation et les mesures prises.

### 13.3 Fraude suspectée

En cas de soupçon de fraude (écriture suspecte, justificatif falsifié, dépense non justifiée), la procédure est :

- Signalement au comité médiation par tout membre autorisé.
- Gel immédiat des écritures concernées.
- Audit ciblé par le comité médiation ou un commissaire aux comptes.
- Si la fraude est avérée, restitution des fonds, sanction du fraudeur (exclusion temporaire ou définitive), et communication au conseil.
- Le cas échéant, dépôt de plainte auprès des autorités.

### 13.4 Devise étrangère (diaspora)

Les membres diaspora peuvent cotiser en devise locale (euro, dollar, livre). Le système gère la conversion automatique vers le FCFA, au taux du jour de la Banque Centrale. Le montant en devise est conservé dans l'écriture, pour traçabilité. Les écarts de conversion (en cas de retard entre le paiement et la réception) sont supportés par la caisse principale, sauf décision contraire du conseil.

### 13.5 Membre sans Mobile Money

Certains membres (aînés, membres en zone rurale sans couverture Mobile Money) ne peuvent pas utiliser les canaux numériques. Le système prévoit :

- La saisie manuelle d'un paiement en espèces par le trésorier, avec reçu remis au membre.
- La possibilité pour un proche (enfant, neveu) de payer pour le compte du membre, avec mention dans l'écriture.
- L'accompagnement humain d'un référent pour les membres en difficulté avec les outils numériques.

### 13.6 Transition de pouvoir

Lors d'un changement de patriarche, de trésorier ou de conseil, le système génère automatiquement :

- Un bilan de fin de mandat, présenté au conseil et à l'assemblée.
- Un audit de transition (interne ou externe selon les statuts).
- Un transfert formel des accès au nouveau titulaire, avec journalisation.
- Une archive complète du mandat sortant, conservée dans l'Univers 6.

Cette procédure prévient les contestations et garantit la continuité institutionnelle.

### 13.7 Audit qui révèle des anomalies

Si un audit révèle des anomalies (erreurs, écarts, fraudes avérées), le système prévoit :

- Un rapport d'audit détaillé, transmis au conseil et au comité médiation.
- Un plan de redressement, avec échéances et responsables.
- Une communication aux membres, proportionnée à la gravité.
- Le cas échéant, des sanctions disciplinaires ou des poursuites.

La transparence sur les anomalies est essentielle : la tentative de dissimulation est toujours plus grave que l'anomalie elle-même.

### 13.8 Cotisation non reçue mais réclamée

Un membre peut contester avoir payé une cotisation que le système réclame. La procédure est :

- Vérification du journal des paiements et des relevés Mobile Money / bancaires.
- Si le paiement est retrouvé, régularisation immédiate avec excuse.
- Si le paiement n'est pas retrouvé, demande de justificatif au membre (reçu, capture d'écran).
- En cas de désaccord persistant, saisine du comité médiation.

Le journal immutable et les justificatifs permettent en général de trancher rapidement ce type de contestation.

---

## 14. Wireframes textuels des écrans clés

Cette section décrit en pseudo-maquettes les cinq écrans les plus importants de l'Univers 4.

### 14.1 Tableau de bord financier

```
┌────────────────────────────────────────────────────────────┐
│  FINANCES — Tableau de bord                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  💰 SOLDE GLOBAL : 12 450 000 FCFA                        │
│                                                            │
│  ─── DÉCOMPOSITION PAR CAISSE ─────────                    │
│  • Caisse principale      : 5 200 000 FCFA                │
│  • Caisse de réserve      : 4 800 000 FCFA                │
│  • Caisse de solidarité   : 1 950 000 FCFA                │
│  • Caisses de branches    :   500 000 FCFA (×6)           │
│                                                            │
│  ─── COTISATIONS DU TRIMESTRE ─────────                    │
│  T3 2026 — échéance 5 octobre                             │
│  Payé : 178 / 220 (81%)                                   │
│  En retard : 32 — En attente : 10                         │
│  Total collecté : 8 900 000 FCFA                          │
│                                                            │
│  ─── DÉPENSES DU MOIS ─────────────────                    │
│  Total : 1 850 000 FCFA                                   │
│  • Aides sociales (12 versements) — 850 000 FCFA          │
│  • Fonctionnement — 320 000 FCFA                          │
│  • Préparation congrès — 680 000 FCFA                     │
│  Justificatifs : 28 / 28 ✓                                │
│                                                            │
│  ─── BUDGET ANNUEL ────────────────────                    │
│  Exécution : 68 % du budget à 75 % de l'année             │
│  Poste le plus consommateur : Congrès (78 %)              │
│  Poste sous-exécuté : Fonctionnement (52 %)               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.2 Cotisation mensuelle (vue membre)

```
┌────────────────────────────────────────────────────────────┐
│  MES COTISATIONS                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ─── COTISATION TRIMESTRE T3 2026 ─────                    │
│  Échéance : 5 octobre 2026                                │
│  Montant : 15 000 FCFA                                    │
│  Statut : ⏳ À payer (J-7)                                │
│                                                            │
│  [📱 Payer par Mobile Money]                              │
│  [🏦 Payer par virement]                                  │
│  [💵 Payer en espèces (saisie trésorier)]                 │
│                                                            │
│  ─── HISTORIQUE 12 DERNIERS MOIS ──────                    │
│  T2 2026 (juillet)    ✓ Payé 15 000  (Reçu #RC-2026-089) │
│  T1 2026 (avril)      ✓ Payé 15 000  (Reçu #RC-2026-031) │
│  T4 2025 (janv. 2026) ✓ Payé 15 000  (Reçu #RC-2025-142) │
│  T3 2025 (oct. 2025)  ✓ Payé 15 000  (Reçu #RC-2025-108) │
│  ...                                                      │
│                                                            │
│  ─── COTISATION ANNUELLE 2026 ────────                     │
│  Échéance : 31 mars 2026 (vote congrès déc. 2025)         │
│  Montant : 50 000 FCFA                                    │
│  Statut : ✓ Payé 50 000 (Reçu #RC-2026-014)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.3 Paiement Mobile Money

```
┌────────────────────────────────────────────────────────────┐
│  PAIEMENT — Cotisation T3 2026                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Montant : 15 000 FCFA                                    │
│  Bénéficiaire : Caisse principale — Famille NDONGO        │
│  Motif : Cotisation trimestrielle T3 2026                 │
│                                                            │
│  ─── CANAL ────────────────────────────                    │
│  ◉ MTN MoMo  ○ Orange Money                              │
│                                                            │
│  ─── NUMÉRO ───────────────────────────                    │
│  +237 6 99 12 34 56                                       │
│                                                            │
│  ─── AUTHENTIFICATION ────────────────                     │
│  Code USSD : #126# (à valider sur votre téléphone)        │
│                                                            │
│  [Confirmer le paiement]                                  │
│                                                            │
│  ⏳ En attente de confirmation opérateur...               │
│  (généralement < 30 secondes)                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.4 Journal comptable (vue trésorier)

```
┌────────────────────────────────────────────────────────────┐
│  JOURNAL COMPTABLE — Septembre 2026                       │
├────────────────────────────────────────────────────────────┤
│  Filtres : [Mois ▾] [Caisse ▾] [Type ▾]                   │
│                                                            │
│  N°    Date     Compte    Libellé              Débit   Crédit │
│  ──    ────     ──────    ───────              ─────   ───── │
│  0142  01/09    512→411   Cotisation J. NDONGO        15 000│
│  0143  03/09    601→512   Aide sociale M. K.          85 000│
│        03/09    512→601                                85 000│
│  0144  05/09    605→512   Prép. congrès (facture)    450 000│
│        05/09    512→605                               450 000│
│  0145  08/09    512→411   Cotisation P. BIYA         15 000│
│  0146  12/09    601→512   Bourse scolaire (×3)       90 000│
│        12/09    512→601                                90 000│
│  ...                                                      │
│                                                            │
│  Totaux du mois                                           │
│  Débits : 4 850 000 FCFA                                  │
│  Crédits : 4 850 000 FCFA                                 │
│  Solde : équilibré ✓                                      │
│                                                            │
│  Justificatifs : 42 / 42 ✓                                │
│  Rapprochement Mobile Money : 38 / 42 (4 en attente)      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.5 Rapport mensuel (extrait)

```
┌────────────────────────────────────────────────────────────┐
│  RAPPORT FINANCIER — Septembre 2026                       │
│  Famille NDONGO — Édité le 5 octobre 2026                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ─── SYNTHÈSE DU MOIS ────────────────                     │
│  Solde en début de mois : 11 200 000 FCFA                 │
│  Entrées : 4 850 000 FCFA                                 │
│    • Cotisations T3 (156 paiements) : 2 340 000          │
│    • Contributions solidarité (47)     : 1 850 000       │
│    • Dons divers                        :   660 000       │
│  Sorties : 3 600 000 FCFA                                 │
│    • Aides sociales (12 versements)  :   850 000         │
│    • Préparation congrès             :   680 000         │
│    • Solidarité décès Maman Rosine   : 1 850 000         │
│    • Fonctionnement                  :   220 000         │
│  Solde en fin de mois : 12 450 000 FCFA                  │
│                                                            │
│  ─── ÉTAT DES COTISATIONS ────────────                     │
│  T3 2026 (échéance 5 oct.) : 178 / 220 (81%)             │
│  Retards > 30 jours : 8 membres (procédure médiation)    │
│  Exonérations actives : 12 membres (confidentiel)        │
│                                                            │
│  ─── BUDGET ────────────────────────────                   │
│  Exécution à fin septembre : 68 % du budget annuel       │
│  Poste sous-exécuté : Fonctionnement (52 %)              │
│  Poste sur-exécuté : Solidarité (78 %, dû au décès)      │
│                                                            │
│  ─── ALERTES ───────────────────────────                   │
│  • 4 rapprochements Mobile Money en attente              │
│  • Caisse de solidarité : solde faible (1,95 M / 3 M)    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Roadmap MVP et séquençage

L'Univers 4 est séquencé en trois phases pour permettre une adoption progressive.

### 15.1 Phase 1 — MVP (mois 4 à 9)

| Périmètre | Détail |
|---|---|
| Caisse principale | Solde, mouvements, rapprochement Mobile Money |
| Cotisations trimestrielles | Calendrier, relances, suivi individuel |
| Mobile Money | Intégration MTN MoMo + Orange Money (API entrantes) |
| Reçus PDF | Génération automatique, archivage |
| Journal comptable | Écritures manuelles + automatiques, immutable |
| Rapport mensuel | Automatique, transmission à tous les membres |
| Double validation | Pour les dépenses > 50 000 FCFA |

**Critères de sortie** : taux de cotisation à jour ≥ 80 %, taux de rapprochement Mobile Money ≥ 95 %, transparence 100 % (toutes les dépenses justifiées).

### 15.2 Phase 2 — Enrichissement (mois 10 à 14)

| Périmètre | Détail |
|---|---|
| Caisse multi-niveaux | Caisses de branches, de solidarité, d'événement |
| Budget annuel | Préparation, vote, suivi mensuel |
| Plan comptable simplifié | Inspiré SYSCOHADA, balance, états financiers |
| Paiements sortants Mobile Money | Pour les aides sociales et dépenses validées |
| Multi-devises | Diaspora (euro, dollar, livre) |
| Mode audit | Export complet pour comptable externe |
| Mode hors-ligne | Saisie espèces, consultation soldes |

**Critères de sortie** : précision budgétaire ≤ 15 %, satisfaction trésorier ≥ 4/5, clôture annuelle dans les 90 jours.

### 15.3 Phase 3 — Maturité (mois 15 à 20)

| Périmètre | Détail |
|---|---|
| IA prévisionnelle | Anticipation des déficits, suggestions d'ajustement |
| Audit externe annuel | Workflow complet avec commissaire aux comptes |
| Investissements | Gestion des projets (terrain, construction) |
| Prêts familiaux avancés | Échéanciers, rappels automatiques |
| Carte familiale financière | Visualisation des flux par branche |
| Notifications vocales | Appels automatiques pour rappels aux aînés |

**Critères de sortie** : 95 % des cotisations reçues dans les 14 jours, 100 % des clôtures annuelles dans les 90 jours, satisfaction membres ≥ 4/5.

---

## 16. Risques et points d'attention

### 16.1 Fraude

La fraude est le risque numéro un. Elle peut prendre plusieurs formes : fausse dépense, justificatif falsifié, détournement de cotisation en espèces, création de membre fictif. La mitigation repose sur la combinaison de mesures techniques (journal immutable, double validation, rapprochement automatique), de mesures organisationnelles (audit aléatoire, rotation du trésorier), et de mesures culturelles (formation, exemplarité du conseil, sanction exemplaire en cas de fraude avérée).

### 16.2 Erreurs de saisie

Les erreurs de saisie sont plus fréquentes que les fraudes et peuvent avoir des conséquences significatives (mauvaise attribution, double comptabilisation, écriture déséquilibrée). La mitigation repose sur la validation automatique (partie double, contrôles de cohérence), la confirmation visuelle avant validation, et la possibilité de corriger par écriture compensatoire.

### 16.3 Indisponibilité Mobile Money

Les opérateurs Mobile Money peuvent être indisponibles (panne réseau, maintenance, saturation). Le système prévoit :

- Un mode espèces de secours, avec saisie manuelle différée.
- Une file d'attente des paiements en attente, traités dès le retour de la connexion.
- Une communication transparente aux membres en cas d'indisponibilité prolongée.

### 16.4 Tensions sur les dépenses

Certaines dépenses peuvent être contestées (par exemple, frais de déplacement jugés excessifs, dépenses de représentation). La mitigation repose sur la transparence (publication dans le rapport mensuel), la procédure de contestation (déjà décrite dans l'Univers 3), et l'arbitrage par le comité médiation ou le conseil.

### 16.5 Confidentialité des montants

Les montants des cotisations et des aides sociales sont confidentiels. La divulgation involontaire (par exemple, un rapport trop détaillé circulant hors du cercle autorisé) peut nuire à la dignité des membres. La mitigation repose sur la gradation des niveaux de détail par rôle, le filigrane nominatif sur les exports PDF, et la limitation du nombre d'exports par membre.

### 16.6 Dépendance aux opérateurs

L'application dépend de MTN MoMo et Orange Money pour les paiements. Une défaillance durable d'un opérateur, ou un changement unilatéral de ses conditions, peut affecter le service. La mitigation repose sur la double intégration (MTN + Orange, bascule possible), la capacité à traiter des paiements par virement bancaire en secours, et la veille réglementaire sur l'évolution du marché Mobile Money en zone CEMAC.

### 16.7 Surcharge du trésorier

Le trésorier est un bénévole, souvent actif professionnellement, qui consacre un temps significatif à la gestion financière de la famille. Le système ne doit pas alourdir sa charge, mais la faciliter. La mitigation repose sur l'automatisation maximale (rapprochement, reçus, rapports), une interface ergonomique, un trésorier adjoint formé, et la possibilité de déléguer certaines tâches au conseil.

---

## 17. Indicateurs de succès

| Indicateur | Définition | Cible | Fréquence |
|---|---|---|---|
| Taux de cotisation à jour | Membres ayant réglé le trimestre en cours | ≥ 80 % | Trimestriel |
| Délai de versement | Échéance → réception du paiement | ≤ 14 jours | Mensuel |
| Taux de rapprochement Mobile Money | Paiements automatiquement rapprochés | ≥ 95 % | Mensuel |
| Taux de justificatifs | Dépenses > 10 000 FCFA justifiées | 100 % | Mensuel |
| Délai de validation des dépenses | Proposition → validation | ≤ 3 jours | Par dépense |
| Précision budgétaire | Écart prévisionnel / réel | ≤ 15 % | Trimestriel |
| Délai de clôture annuelle | Fin d'exercice → clôture validée | ≤ 90 jours | Annuel |
| Satisfaction trésorier | Note donnée par le trésorier | ≥ 4/5 | Trimestriel |
| Satisfaction membres | Note moyenne sur la transparence | ≥ 4/5 | Annuel |
| Indisponibilité du service | Temps cumulé par mois | ≤ 60 min | Mensuel |

---

## 18. Conclusion

L'Univers 4 est le socle technique de l'application. Sans lui, l'Univers 3 ne peut exécuter ses collectes, l'Univers 2 ne peut organiser ses événements, et l'Univers 5 ne peut financer ses décisions. Plus que tout autre module, il porte la responsabilité de la confiance : si les membres doutent de l'intégrité du système financier, c'est l'ensemble de l'application qui est discréditée.

La proposition centrale de l'Univers 4 est simple : remplacer la gestion opaque d'aujourd'hui par une infrastructure financière numérique transparente, traçable et auditable. Chaque FCFA qui entre ou sort de la caisse familiale est enregistré dans un journal immutable, rapproché avec un paiement Mobile Money ou un justificatif, validé selon des règles de gouvernance, et consultable par les autorités familiales. Le système ne supprime pas le trésorier : il le dote d'outils professionnels et le protège des soupçons.

L'Univers 4 ne se substitue pas à la confiance humaine : il la rend possible à grande échelle. Dans une famille de 200 ou 300 membres, la confiance ne peut plus reposer sur la seule connaissance personnelle du trésorier ; elle doit s'appuyer sur des procédures transparentes, des contrôles croisés, et des archives consultables. C'est exactement ce que propose ce module.

Les prochaines étapes recommandées sont les suivantes :

1. **Validation de cette spécification** par le comité de pilotage et par au moins deux familles pilotes, avec un accent particulier sur les seuils de validation (10 000, 50 000, 500 000 FCFA) et les règles de rapprochement.
2. **Production des maquettes interactives** des cinq écrans clés (tableau de bord, cotisations, paiement Mobile Money, journal, rapport mensuel).
3. **Définition des interfaces avec les opérateurs Mobile Money** (MTN MoMo, Orange Money) et de la stratégie de secours en cas d'indisponibilité.
4. **Construction du MVP Phase 1** avec un périmètre strictement limité à la caisse principale, aux cotisations trimestrielles, à l'intégration Mobile Money entrante, et au journal comptable immutable.
5. **Onboarding de la première famille pilote** dans un délai de neuf mois après le démarrage du développement, avec un accompagnement particulier du trésorier et du trésorier adjoint.

L'Univers 4, s'il est bien conçu et bien livré, deviendra l'épine dorsale financière de la famille : un lieu où chaque FCFA trouve sa trace, chaque dépense sa justification, et chaque membre la transparence à laquelle il a droit. Il transformera la gestion financière d'un sujet de tension en un fonctionnement maîtrisé, libérant le trésorier des tâches ingrates pour qu'il se concentre sur l'accompagnement humain et le conseil.
