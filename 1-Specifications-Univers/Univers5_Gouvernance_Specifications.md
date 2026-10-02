# Univers 5 — La Gouvernance

**Les décisions, les votes et l'architecture du pouvoir familial**

| Document | Spécifications fonctionnelles — Univers 5 |
|---|---|
| Version | 1.0 |
| Date | Septembre 2026 |
| Statut | Pour validation |
| Audience | Chefs de famille, membres du conseil, comité de pilotage, équipe produit, équipe développement |
| Prérequis | Spécifications Univers 1 à 4 |

---

## Synthèse exécutive

L'Univers 5, intitulé **« La Gouvernance »**, est le pilier invisible de l'application. Sans lui, aucune décision n'est véritablement légitime : le vote d'un budget, l'élection d'un trésorier, la désignation d'un nouveau chef de branche, l'arbitrage d'un conflit, le choix du lieu du prochain congrès — toutes ces décisions resteraient aujourd'hui prises dans le flou, contestées a posteriori, ou pire, confisquées par les plus véhéments. La gouvernance est ce qui transforme une somme d'individus en institution capable de décider ensemble et de respecter ses décisions.

La proposition centrale de l'Univers 5 est de remplacer les décisions implicites et orales d'aujourd'hui par des **processus tracés, configurables et légitimes**. Chaque type de décision — consultation, vote simple, vote des responsables, vote du conseil, décision du patriarche — possède son propre protocole, ses règles de quorum et de majorité, son périmètre de votants, et sa trace formelle. Les comités familiaux disposent d'espaces de travail dédiés. Les élections (trésorier, chef de branche, patriarche) suivent des processus formels. Le règlement intérieur est consultable, amendable et voté. Les procès-verbaux des assemblées et congrès sont archivés et consultables. En cas de contestation, une procédure de recours est ouverte.

Le présent document définit le rôle, les objectifs, l'architecture en sept modules, le modèle de données, les règles de gestion, les cas limites et la roadmap de l'Univers 5. Il s'appuie sur l'Univers 1 (membres, branches, rôles) pour identifier les votants et les éligibles, sur l'Univers 2 (événements) pour les assemblées et congrès, sur l'Univers 3 (solidarité, médiation) pour les recours, et sur l'Univers 4 (finances) pour les votes budgétaires. L'Univers 5 est conçu pour transformer un sujet souvent confisqué par les aînés ou les plus véhements en une discipline partagée, sans déraciner les traditions familiales qui font leur légitimité.

---

## 1. Rôle et finalité de l'Univers 5

### 1.1 Rôle stratégique

L'Univers 5 joue quatre rôles stratégiques imbriqués qui en font le pilier invisible de l'application.

**Premièrement, il est le cadre de légitimité des décisions.** Dans une grande famille camerounaise, les décisions importantes — vote du budget annuel, désignation du trésorier, choix du lieu du congrès, arbitrage d'un conflit, destitution d'un chef de branche — peuvent être prises par différentes instances selon les traditions : le patriarche seul, le conseil familial, l'assemblée générale, ou un référendum de tous les membres. Sans cadre explicite, ces décisions sont contestées : « qui a décidé ? », « qui avait le droit de voter ? », « la majorité était-elle atteinte ? ». L'Univers 5 impose un cadre : chaque décision est rattachée à un type de processus, avec ses règles, ses votants, son quorum, sa majorité, et sa trace. La légitimité devient vérifiable, plus seulement alléguée.

**Deuxièmement, il est l'infrastructure de la participation.** Une grande famille de 200 ou 300 membres ne peut décider efficacement que si la participation est organisée. Les consultations WhatsApp génèrent 150 messages incohérents, dont on ne sait jamais si un consensus s'est dégagé. L'Univers 5 propose un système structuré : consultation ciblée, vote avec bulletins, résultats agrégés automatiquement, délai d'expression défini. La participation devient possible à grande échelle, sans noyer les décisions dans le bruit.

**Troisièmement, il est la mémoire des décisions passées.** Chaque décision importante est consignée dans un procès-verbal, archivé, et consultable. Les descendants peuvent, dans vingt ou cinquante ans, voir quelles décisions ont été prises, par qui, avec quelle majorité, et pour quels motifs. Cette mémoire est précieuse pour la transmission institutionnelle et pour la prévention des conflits : en cas de contestation, même des années plus tard, les archives tranchent.

**Quatrièmement, il est le gardien des équilibres traditionnels et démocratiques.** Les grandes familles africaines ne fonctionnent ni sur un modèle purement traditionnel (où l'aîné décide seul), ni sur un modèle purement démocratique (où la majorité décide sans respect des aînés). Elles fonctionnent sur un modèle hybride, où l'autorité des anciens coexiste avec la consultation des membres. L'Univers 5 propose un cadre configurable qui respecte cette hybridité : chaque famille peut définir ses propres règles, en mixant les niveaux de décision (consultation → vote simple → vote des responsables → vote du conseil → décision du patriarche) selon le type de sujet.

### 1.2 Finalité opérationnelle

Sur le plan opérationnel, l'Univers 5 poursuit une finalité claire : **qu'à tout moment, tout membre autorisé puisse répondre à cinq questions fondamentales** :

1. Quelles sont les décisions en cours dans la famille, et lesquelles me concernent directement ?
2. Comment puis-je participer à une consultation ou à un vote, et quelle est la procédure ?
3. Qui sont les membres des différents comités, et quel est leur mandat ?
4. Où trouver les procès-verbaux des dernières assemblées et congrès ?
5. En cas de désaccord avec une décision, quel est le processus de recours ?

Si ces cinq questions trouvent une réponse immédiate et fiable, l'Univers 5 remplit sa mission. La gouvernance cesse d'être un sujet d'opacité ou de contestation pour devenir un fonctionnement partagé.

### 1.3 Quatre dimensions de la gouvernance

L'Univers 5 distinguera systématiquement quatre dimensions de la gouvernance, qui appellent des réponses différentes :

- **La dimension délibérative** — consultations, votes, motions. Elle est portée par le module Votes et consultations, et par le module Assemblées et congrès.
- **La dimension représentative** — comités, conseils, mandats. Elle est portée par le module Comités et conseils, et par le module Élections et mandats.
- **La dimension normative** — règlement intérieur, statuts, règles. Elle est portée par le module Règlement intérieur.
- **La dimension contentieuse** — recours, médiation, contestations. Elle est portée par le module Médiation et recours, en lien avec le comité médiation de l'Univers 3.

Cette distinction structure tout l'Univers 5 : chaque décision, chaque instance, chaque règle, chaque contestation est rattachée à l'une de ces dimensions, ce qui évite la confusion entre ce qui relève de la délibération, de la représentation, de la norme, et du contentieux.

---

## 2. Objectifs mesurables

L'Univers 5 doit être évalué sur des indicateurs concrets. Les objectifs ci-dessous sont proposés pour la première année d'exploitation, sur une famille pilote de 150 à 300 membres.

| Objectif | Indicateur | Cible année 1 |
|---|---|---|
| Taux de participation aux votes | Pourcentage de votants sur les membres concernés | ≥ 60 % |
| Délai de décision | Délai moyen entre lancement d'une consultation et clôture | ≤ 14 jours |
| Taux de décisions contestées | Pourcentage de décisions faisant l'objet d'un recours | ≤ 5 % |
| Délai de traitement des recours | Délai moyen de réponse du comité médiation | ≤ 14 jours |
| Couverture des PV | Pourcentage d'assemblées et congrès avec PV archivé | 100 % |
| Taux de comités actifs | Pourcentage de comités ayant tenu au moins une réunion dans le trimestre | ≥ 80 % |
| Satisfaction sur la légitimité | Note moyenne des membres sur la légitimité des décisions | ≥ 4/5 |
| Traçabilité des mandats | Pourcentage de mandats avec début, fin, et validateur tracés | 100 % |
| Adoption du règlement intérieur | Pourcentage de familles ayant un règlement intérieur voté dans l'app | ≥ 90 % |
| Taux d'abstention | Pourcentage d'abstentions sur les votes (cible basse) | ≤ 20 % |

Ces cibles sont indicatives ; elles devront être ajustées avec les familles pilotes. Elles traduisent l'ambition : une gouvernance participative, traçable, légitime et respectée.

---

## 3. Architecture fonctionnelle

L'Univers 5 est composé de **sept modules fonctionnels** qui s'articulent autour d'un cœur commun : la décision. Les votes, comités, élections, règlement, PV, assemblées et recours sont autant de dimensions complémentaires de la gouvernance familiale.

### Vue d'ensemble des modules

```
┌─────────────────────────────────────────────────────────────┐
│              UNIVERS 5 — LA GOUVERNANCE                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CŒUR : La décision (vote, motion, élection, arbitrage) │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐  │
│   ▼          ▼          ▼          ▼          ▼          ▼  │
│  Votes &   Comités &  Élections  Règlement  PV &     Assem- │
│  consult-  conseils  & mandats  intérieur  archives  blées &│
│  ations                                            congrès  │
│                                                              │
│                       ┌────────────────┐                     │
│                       │ Médiation &    │                     │
│                       │ recours        │                     │
│                       └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

L'organisation de l'application reflète cette architecture : un tableau de bord de la gouvernance affiche les votes en cours, les comités actifs, les prochains scrutins, et les derniers PV. Les membres consultent leur implication (droit de vote, mandats, comités) et participent aux consultations.

### Navigation principale

La navigation de l'Univers 5 s'organise autour de cinq entrées principales :

1. **Votes en cours** — consultations et scrutins ouverts, avec mon droit de vote.
2. **Comités** — liste des comités, membres, comptes-rendus récents.
3. **Décisions** — motions adoptées, PV archivés, historique consultable.
4. **Règlement** — règlement intérieur consultable, amendements en cours.
5. **Recours** — formulaire de contestation, suivi des recours.

Le patriarche, le conseil et les chefs de branche disposent en plus d'une entrée **Administration** (gestion des élections, validation des motions, ouverture des consultations) accessible uniquement aux rôles autorisés.

---

## 4. Module 4.1 — Votes et consultations

### 4.1.1 Description

Le module Votes et consultations est le cœur opérationnel de l'Univers 5. Il transforme les décisions floues en processus traçables. Chaque consultation ou vote est un objet distinct, avec son type, son périmètre, ses règles, et son résultat officiel.

### 4.1.2 Les cinq niveaux de décision

L'Univers 5 propose cinq niveaux de décision, du plus participatif au plus concentré. Chaque type de sujet est rattaché à un niveau par défaut, configurable par la famille.

| Niveau | Description | Votants | Quorum par défaut | Majorité par défaut |
|---|---|---|---|---|
| Consultation | Sondage non contraignant pour mesurer l'opinion | Tous les membres adultes | Aucun | Non contraignant |
| Vote simple | Décision prise par l'ensemble des membres | Tous les membres adultes | 50 % des votants | Majorité simple |
| Vote des responsables | Décision prise par les chefs de branche | Chefs de branche (+ suppléants) | 2/3 des chefs | Majorité simple |
| Vote du conseil | Décision prise par le conseil familial | Membres du conseil | 2/3 du conseil | Majorité qualifiée 2/3 |
| Décision du patriarche | Décision unilatérale du patriarche | Patriarche seul | — | — |

### 4.1.3 Paramètres d'un vote

Chaque vote est défini par les paramètres suivants :

- **Type** — consultation, vote simple, vote des responsables, vote du conseil.
- **Sujet** — formulation claire de la question.
- **Options** — liste des réponses possibles (oui/non, choix multiples, libre).
- **Périmètre** — membres concernés (toute la famille, une branche, un comité).
- **Durée** — date d'ouverture et date de clôture.
- **Quorum** — minimum de participation requis.
- **Majorité** — majorité simple, qualifiée (2/3), ou absolue.
- **Anonymat** — vote anonyme, nominatif, ou semi-anonyme (visible par le conseil).
- **Validateur** — autorité qui ouvre et clôture le vote (chef de branche, conseil, patriarche).

### 4.1.4 Déroulement d'un vote

Le déroulement suit quatre étapes :

1. **Ouverture** — un membre autorisé crée le vote, avec ses paramètres. Le système notifie les votants concernés.
2. **Expression** — chaque votant exprime son choix dans l'application, avec authentification à deux facteurs pour les votes contraignants. Les votes sont chiffrés jusqu'à la clôture.
3. **Clôture** — à la date prévue, ou manuellement par le validateur. Le système agrège les résultats, vérifie le quorum, et détermine si la majorité est atteinte.
4. **Publication** — les résultats sont publiés à tous les votants, avec mention de la légitimité (quorum atteint, majorité atteinte) et de la décision qui en découle.

### 4.1.5 Traçabilité et anonymat

Pour garantir à la fois la transparence et la liberté d'expression, le système applique les règles suivantes :

- **Anonymat du bulletin** — dans un vote anonyme, le choix d'un votant n'est jamais visible, même par le conseil. Seul le fait d'avoir voté est enregistré.
- **Vérifiabilité** — chaque votant reçoit un reçu de son vote, avec un identifiant unique. En cas de contestation, il peut prouver qu'il a voté, sans révéler son choix.
- **Journal d'audit** — le journal des ouvertures, clôtures, et publications est consultable par le conseil, mais jamais les contenus des bulletins individuels.
- **Anonymat semi-nominatif** — pour les votes sensibles (élections, destitutions), le vote est nominatif et visible uniquement par le conseil et le patriarche. Ce mode est utilisé avec parcimonie.

### 4.1.6 Cas limite — égalité

En cas d'égalité dans un vote simple ou un vote des responsables, la procédure par défaut est :

- Nouveau vote dans un délai de 7 jours, avec incitation à la discussion préalable.
- En cas de nouvelle égalité, le patriarche tranche (ou le conseil, selon la configuration familiale).

Cette règle, configurable, évite les blocages tout en respectant l'autorité traditionnelle.

---

## 5. Module 4.2 — Comités et conseils

### 5.1 Description

Les grandes familles africaines fonctionnent traditionnellement avec des comités spécialisés : comité financier, comité social, comité événementiel, comité jeunesse, comité femmes, comité diaspora, comité communication, comité médiation, comité culturel, comité exécutif. L'Univers 5 propose un module dédié à la gestion structurée de ces comités, qui sont à la fois des instances de décision, des espaces de travail, et des relais de l'autorité familiale.

### 5.2 Les dix types de comités

| Type | Description | Composition typique |
|---|---|---|
| Comité exécutif (ou Conseil familial) | Instance suprême de décision entre deux congrès | Patriarche, chefs de branche, sages cooptés |
| Comité financier | Gestion budgétaire et comptable | Trésorier, trésoriers de branche, contrôleur |
| Comité social | Solidarité, aides sociales, suivi des situations | Référents solidarité, comité médiation |
| Comité événementiel | Organisation des congrès et grands rassemblements | Référents événements, coordinateurs logistiques |
| Comité jeunesse | Animation, formation, intégration des jeunes | Membres 18-35 ans, représentants par branche |
| Comité femmes | Questionnement féminin, veuves, mamans | Déléguées femmes par branche |
| Comité diaspora | Coordination des membres à l'étranger | Référents diaspora par pays |
| Comité communication | Information, journal familial, site web | Rédacteurs, photographes, community managers |
| Comité médiation | Arbitrage des conflits, dossiers sensibles | 3 à 5 membres reconnus pour sagesse et discrétion |
| Comité culturel et traditionnel | Cérémonies traditionnelles, mémoire des coutumes | Anciens, gardiens des traditions |

### 5.3 Composition et mandat

Chaque comité possède :

- **Un président** — désigné selon les traditions (souvent par le patriarche ou le conseil).
- **Des membres** — 3 à 15 selon le type, avec un équilibre entre branches et générations.
- **Un secrétaire** — chargé des comptes-rendus.
- **Un mandat** — généralement 2 à 4 ans, renouvelable, avec rotation.
- **Un suppléant** — pour assurer la continuité en cas d'indisponibilité.

La composition est publique dans l'application : chaque membre peut voir qui est dans quel comité, et comment les contacter. Cette transparence est essentielle pour la légitimité.

### 5.4 Espace de travail

Chaque comité dispose d'un espace de travail dédié dans l'application, avec :

- **Un fil de discussion** — réservé aux membres du comité, pour les échanges quotidiens.
- **Un agenda** — réunions, échéances, livrables.
- **Une bibliothèque de documents** — comptes-rendus, notes, références.
- **Un suivi des décisions** — motions adoptées, actions en cours.
- **Un lien avec les votes** — consultations et votes internes au comité.

Cet espace remplace avantageusement les groupes WhatsApp dédiés aux comités, qui manquent de structure et de traçabilité.

### 5.5 Comptes-rendus

Chaque réunion de comité donne lieu à un compte-rendu, structuré en :

- Date, lieu, présence.
- Ordre du jour.
- Délibérations (résumé des discussions).
- Décisions adoptées (motions).
- Actions assignées (qui, quoi, quand).
- Prochaine réunion.

Le compte-rendu est validé par le président et le secrétaire, puis archivé dans l'application. Il est consultable par les membres du comité et, pour les décisions publiques, par l'ensemble de la famille.

### 5.6 Cas limite — comité inactif

Si un comité n'a tenu aucune réunion pendant 6 mois, le système signale l'inactivité au conseil. Le conseil peut :

- Relancer le comité, avec un nouveau président si nécessaire.
- Fusionner le comité avec un autre (par exemple, comité jeunesse et comité femmes fusionnés en comité vivant).
- Dissoudre le comité, si son objet n'est plus pertinent.

Cette surveillance prévient l'enlisement des instances, qui est l'une des causes principales de perte de légitimité des gouvernances familiales.

---

## 6. Module 4.3 — Élections et mandats

### 6.1 Description

Les élections sont les moments sensibles de la gouvernance familiale. L'élection du trésorier, du chef de branche, ou la transition du patriarche, peuvent être source de tensions profondes, voire de scissions. L'Univers 5 propose un processus formel, traçable et légitime, qui ne supprime pas les enjeux mais les encadre.

### 6.2 Types d'élections

| Type | Description | Éligibilité | Votants | Mandat |
|---|---|---|---|---|
| Trésorier | Responsable des finances familiales | Membre adulte, reconnu pour intégrité | Conseil familial | 2-4 ans, renouvelable |
| Trésorier adjoint | Suppléant du trésorier | Membre adulte | Conseil familial | Identique au trésorier |
| Chef de branche | Responsable d'une branche principale | Membre de la branche, génération en exercice | Membres adultes de la branche | À vie ou jusqu'à destitution |
| Patriarche | Autorité suprême de la famille | Désigné par tradition (aîné de la génération régnante) | Non élu, transmis | À vie |
| Membres du conseil | Représentants au conseil | Membres adultes | Selon configuration familiale | 2-4 ans, renouvelable |
| Membres de comités | Selon type de comité | Membres adultes | Selon type | 2-4 ans, renouvelable |

### 6.3 Processus électoral

Une élection suit cinq étapes :

1. **Annonce** — le conseil (ou le patriarche) annonce l'élection, avec la date, le poste, les modalités.
2. **Candidatures** — les candidats se déclarent dans un délai défini (par défaut 14 jours). Chaque candidature comprend un profil, un programme court, et des soutiens.
3. **Campagne** — période d'expression des candidats (par défaut 14 jours), avec publication des programmes, questions des votants, débats si possible.
4. **Scrutin** — vote à bulletin secret, sur une période courte (par défaut 7 jours), avec authentification à deux facteurs.
5. **Proclamation** — résultats publiés, avec mention de la légitimité (quorum, majorité), et validation par le patriarche ou le conseil. Le mandat commence à la date prévue.

### 6.4 Gestion des mandats

Chaque mandat est enregistré dans l'application, avec :

- Le titulaire (membre U1).
- Le poste (trésorier, chef de branche, etc.).
- La date de début et la date de fin prévue.
- Le validateur (patriarche, conseil, assemblée).
- Le journal des actions marquantes (décisions validées, absences, délégations).
- Le cas échéant, le motif de fin anticipée (démission, destitution, décès).

Cette traçabilité est essentielle pour prévenir les contestations et assurer la continuité institutionnelle.

### 6.5 Renouvellement et destitution

Le renouvellement d'un mandat suit le même processus qu'une élection initiale, avec une possibilité de réélection si le titulaire se représente.

La destitution est exceptionnelle et suit une procédure dédiée :

- Saisine du conseil par au moins 10 % des membres adultes, ou par le patriarche.
- Enquête du comité médiation.
- Vote du conseil à la majorité qualifiée (2/3).
- Le cas échéant, validation par le patriarche.
- Notification au destinataire, avec motivation et droit de recours.

La destitution est gravissime : elle doit être réservée aux manquements sérieux (fraude avérée, indélicatesse répétée, incapacité permanente). Elle est consignée au journal d'audit et archive le mandat dans l'Univers 6.

### 6.6 Transition du patriarche

La transition du patriarche est le moment le plus sensible de la gouvernance familiale. Elle suit généralement la tradition (aîné de la génération régnante), mais peut être contestée. Le système prévoit :

- L'enregistrement formel de la désignation (par le conseil sortant, ou par le patriarche défunt si désignation anticipée).
- La validation par le conseil et par les chefs de branche.
- L'annonce officielle à la famille, avec cérémonie protocolaire.
- Le transfert des accès et des prérogatives dans l'application.

En cas de contestation, le comité médiation est saisi. La procédure est longue et sensible, mais sa traçabilité prévient les conflits ouverts.

---

## 7. Module 4.4 — Règlement intérieur et statuts

### 7.1 Description

Le règlement intérieur est le texte fondamental de la famille. Il définit les règles de fonctionnement, les prérogatives de chaque instance, les modalités de décision, les droits et devoirs des membres. Sans règlement intérieur consultable et amendable, la gouvernance reste implicite et contestable. L'Univers 5 propose un module dédié à la gestion structurée de ce document.

### 7.2 Structure du règlement intérieur

Le règlement intérieur type comprend les sections suivantes (configurables) :

1. **Dispositions générales** — nom de la famille, objet, siège, durée.
2. **Membres** — définition, droits, devoirs, admission, démission, exclusion.
3. **Branches** — composition, chefs de branche, prérogatives.
4. **Instances** — patriarche, conseil, comités, assemblée générale, congrès.
5. **Décisions** — types de votes, quorum, majorité, périmètre.
6. **Finances** — cotisations, caisse, budget, contrôle.
7. **Solidarité** — aides, exonérations, médiation.
8. **Événements** — congrès, assemblées, funérailles, mariages.
9. **Mémoire et patrimoine** — archives, documents familiaux, traditions.
10. **Modifications du règlement** — procédure d'amendement.

### 7.3 Consultation et recherche

Le règlement est consultable dans l'application, avec :

- **Une table des matières** cliquable.
- **Une recherche plein texte** sur les articles.
- **Un glossaire** des termes techniques et des coutumes familiales.
- **Des renvois** entre articles connexes.

Chaque membre peut consulter le règlement à tout moment, ce qui prévient les interprétations divergentes et les contournements.

### 7.4 Amendements

Le règlement est amendable, selon une procédure formelle :

- **Proposition** — par le patriarche, le conseil, ou au moins 10 % des membres adultes.
- **Examen** — par le comité exécutif, qui rédige la version amendée.
- **Vote** — par le conseil à la majorité qualifiée (2/3), ou par l'assemblée générale selon les dispositions du règlement lui-même.
- **Publication** — la nouvelle version est publiée à tous les membres, avec mention des modifications.

Chaque version est archivée, ce qui permet de consulter l'historique des évolutions du règlement.

### 7.5 Conformité des décisions

Le système propose un outil de vérification de conformité : pour chaque décision (vote, motion, élection), le rattachement à un article du règlement est enregistré. En cas de doute, le conseil ou le comité médiation peut vérifier que la décision respecte le règlement. En cas de non-conformité, la décision peut être suspendue, et une procédure de régularisation est ouverte.

### 7.6 Cas limite — conflit entre tradition et règlement

Dans certaines familles, la tradition orale peut entrer en conflit avec le règlement intérieur écrit. Par exemple, le règlement prévoit l'élection du trésorier, mais la tradition veut que ce soit l'aîné de la branche concernée. Le système gère ce cas en :

- Permettant l'inscription des traditions dans une section dédiée du règlement (avec le même statut que les articles écrits).
- Prévoyant une procédure d'arbitrage par le patriarche en cas de conflit.
- Archivant la décision d'arbitrage, pour faire jurisprudence.

Cette approche respecte l'hybridité des familles africaines, sans renoncer à la rigueur du règlement écrit.

---

## 8. Module 4.5 — Procès-verbaux et archives de décisions

### 8.1 Description

Les procès-verbaux (PV) sont la mémoire des décisions. Sans PV, une décision reste orale, contestable, et oublieuse. L'Univers 5 propose un module dédié à la rédaction, la validation, et l'archivage des PV de toutes les instances de la famille.

### 8.2 Types de PV

| Type | Instance | Rédacteur | Validation |
|---|---|---|---|
| PV de réunion de comité | Comité | Secrétaire du comité | Président du comité |
| PV de réunion de branche | Branche | Secrétaire de branche | Chef de branche |
| PV de conseil | Conseil familial | Secrétaire du conseil | Patriarche |
| PV d'assemblée générale | Assemblée générale | Secrétaire général | Patriarche |
| PV de congrès | Congrès familial | Secrétaire général | Patriarche + conseil |

### 8.3 Structure d'un PV

Un PV type comprend :

- **En-tête** — instance, date, lieu, présence (membres présents, excusés, absents).
- **Ordre du jour** — liste des points à traiter.
- **Déroulé** — résumé des discussions, par point de l'ordre du jour.
- **Décisions** — motions adoptées, votes, résultats.
- **Actions** — actions assignées, responsables, échéances.
- **Clôture** — date et lieu de la prochaine réunion, signatures (numériques).

### 8.4 Validation et publication

Le PV suit un cycle de validation :

1. **Brouillon** — rédigé par le secrétaire, dans un délai court (par défaut 7 jours après la réunion).
2. **Relecture** — par le président de l'instance, qui peut demander des ajustements.
3. **Validation** — signature numérique du président et du secrétaire.
4. **Publication** — à l'instance concernée (membres du comité, conseil, ou toute la famille selon le type).

Une fois validé, le PV est immutable : toute correction se fait par avenant, avec mention du motif et validation par les mêmes autorités. Cette immuabilité est essentielle pour la valeur juridique et historique des PV.

### 8.5 Recherche et consultation

Les PV archivés sont consultables par les membres autorisés, avec :

- **Recherche plein texte** sur le contenu.
- **Filtres** par instance, date, type de décision, mots-clés.
- **Renvois** entre PV connexes (par exemple, un PV de congrès qui adopte une motion référençant un PV de conseil précédent).
- **Exports** PDF pour diffusion ou archivage externe.

Cette recherche permet, en cas de contestation ou de simple curiosité, de retrouver rapidement une décision et son contexte.

### 8.6 Lien avec l'Univers 6

Les PV validés sont archivés dans l'Univers 6 (Mémoire), avec les autres documents familiaux. Ils restent consultables indéfiniment, et constituent la trace officielle des décisions de la famille. Dans 50 ans, les descendants pourront voir comment leur famille a décidé, délibéré, et tranché.

---

## 9. Module 4.6 — Assemblées et congrès

### 9.1 Description

Les assemblées générales et les congrès sont les moments forts de la gouvernance familiale. Ils rassemblent l'ensemble des membres (ou leurs représentants), votent les décisions importantes, et valident les orientations de la famille. L'Univers 5 propose un module dédié à l'organisation de ces rassemblements, en lien étroit avec l'Univers 2 (événements) et l'Univers 4 (budgets).

### 9.2 Cycle d'une assemblée

Une assemblée générale ou un congrès suit un cycle structuré :

1. **Convocation** — par le patriarche ou le conseil, avec un préavis minimum (par défaut 30 jours pour une AG, 90 jours pour un congrès).
2. **Ordre du jour** — publié avec la convocation, il liste les points à traiter. Les motions des membres peuvent y être ajoutées dans un délai défini.
3. **Documents préparatoires** — rapports du trésorier, du conseil, des comités, transmis aux membres avant l'assemblée.
4. **Déroulé** — ouverture par le patriarche, présentation des rapports, débats, votes, motions, clôture.
5. **Procès-verbal** — rédigé par le secrétaire, validé, publié.
6. **Archivage** — dans l'Univers 6.

### 9.3 Votes en session

Pendant l'assemblée, les votes se déroulent en session, avec des modalités spécifiques :

- **Vote à main levée** — pour les motions peu contestées, compté par le secrétaire.
- **Vote à bulletins secrets** — pour les décisions sensibles, avec urne physique ou vote électronique.
- **Vote électronique** — pour les membres diaspora ou absents, via l'application, avec une fenêtre de vote synchronisée.

Le système gère les trois modes, avec un rapprochement automatique des résultats. Les votes en session sont plus courts que les votes asynchrones (par défaut 24 heures maximum), mais suivent les mêmes règles de quorum et de majorité.

### 9.4 Motions

Une motion est une proposition formelle soumise au vote. Elle comprend :

- Un intitulé.
- Un exposé des motifs.
- Une proposition résolutive (ce qui est décidé si la motion est adoptée).
- Un porteur (membre ou comité qui la propose).

Les motions peuvent être déposées avant l'assemblée (avec un délai de pré-publication) ou pendant l'assemblée (sur autorisation du patriarche). Les motions adoptées deviennent des décisions officielles, rattachées au règlement intérieur et consignées au PV.

### 9.5 Lien avec l'Univers 2

L'assemblée ou le congrès est un événement de l'Univers 2 (type I3 ou I4). Le dossier d'événement U2 contient les aspects logistiques (inscriptions, hébergement, repas), tandis que le module U5 gère les aspects délibératifs (ordre du jour, motions, votes, PV). Les deux modules sont liés par un identifiant partagé, et se complètent sans redondance.

### 9.6 Assemblée hybride (présentiel + diaspora)

Pour les congrès où la diaspora ne peut pas se déplacer, le système gère un format hybride :

- Inscriptions en présentiel ou en visioconférence.
- Diffusion en direct des débats, avec traduction si nécessaire.
- Votes synchronisés pour les deux populations.
- Quorum global (présentiel + visio), avec règle de pondération si nécessaire.

Ce format hybride est essentiel pour la légitimité : une décision prise sans la diaspora serait contestée. Le système garantit que tous les membres adultes ont leur voix, où qu'ils soient.

---

## 10. Module 4.7 — Médiation et recours

### 10.1 Description

Aucune gouvernance n'est parfaite, et aucune décision ne fait l'unanimité. L'Univers 5 prévoit un module dédié à la médiation et aux recours, qui complète le comité médiation de l'Univers 3. Ce module gère les contestations de décisions, les recours auprès des instances supérieures, et la résolution des conflits liés à la gouvernance.

### 10.2 Types de recours

| Type | Description | Destinataire | Délai |
|---|---|---|---|
| Contestation d'une décision | Un membre conteste une décision prise par un comité ou un vote | Comité médiation | 30 jours après la décision |
| Recours contre un chef de branche | Un membre conteste une décision de son chef de branche | Conseil familial | 30 jours |
| Recours contre le trésorier | Soupçon de malversation ou décision abusive | Conseil + comité médiation | Immédiat |
| Recours contre le patriarche | Contestation d'une décision du patriarche | Conseil familial élargi | Exceptionnel |
| Recours électoral | Contestation du déroulement ou du résultat d'une élection | Comité médiation + conseil | 7 jours après proclamation |

### 10.3 Procédure de recours

La procédure standard comprend cinq étapes :

1. **Dépôt** — le membre dépose un formulaire de recours, avec motif, pièces éventuelles, et décision contestée.
2. **Examen de recevabilité** — par le comité médiation, dans un délai de 7 jours. Si le recours est irrecevable (hors délai, hors périmètre), il est rejeté avec motivation.
3. **Instruction** — audition des parties, examen des pièces, consultation éventuelle d'experts.
4. **Décision** — par le comité médiation, dans un délai de 14 jours. La décision est motivée, transmise aux parties et au conseil.
5. **Appel** — en cas de désaccord, le recours peut être porté devant le conseil, puis devant le patriarche en dernier ressort.

### 10.4 Journal des recours

Tous les recours sont journalisés, avec leur statut (en cours, tranché, en appel), leur décisions, et leurs motifs. Ce journal est consultable par le conseil et le comité médiation. Il permet de suivre les patterns de contestation (par exemple, une branche qui conteste systématiquement) et d'identifier les améliorations possibles de la gouvernance.

### 10.5 Confidentialité

Les recours sont confidentiels par défaut. Seules les parties concernées, le comité médiation, et le conseil y ont accès. La publication d'un recours à d'autres membres est interdite, sauf décision contraire du patriarche. Cette confidentialité protège les membres qui contestent des représailles, et préserve la dignité des personnes mises en cause.

### 10.6 Recours contre le patriarche

Le recours contre le patriarche est exceptionnel et délicat. Il est ouvert dans deux cas :

- Décision manifestement contraire au règlement intérieur.
- Manquement grave à l'éthique familiale (détournement, abus, inaptitude).

La procédure est :

- Saisine du conseil par au moins 20 % des membres adultes, ou par le comité médiation.
- Concertation élargie avec les chefs de branche et les sages.
- Décision du conseil élargi, à la majorité qualifiée des 2/3.
- Le cas échéant, désignation d'un patriarche intérimaire, et ouverture d'une procédure de transition.

Cette procédure est rarissime, mais sa simple existence prévient les dérives et rappelle que le patriarche, bien qu'autorité suprême, n'est pas au-dessus du règlement.

### 10.7 Lien avec l'Univers 3

Le comité médiation de l'Univers 3 (Solidarité) et celui de l'Univers 5 (Gouvernance) sont les mêmes personnes, mais leurs champs d'intervention diffèrent :

- En U3, le comité traite des conflits liés à la solidarité (contestation de dépense, demande d'aide confidentielle, exonération).
- En U5, le comité traite des conflits liés à la gouvernance (contestation de décision, recours électoral, recours contre une instance).

Cette unicité du comité évite l'éclatement des instances de médiation et garantit une cohérence dans l'approche. Les dossiers sont néanmoins distincts, avec leurs propres journaux et leurs propres procédures.

---

## 11. Modèle de données conceptuel

Le modèle de données de l'Univers 5 s'articule autour de sept entités principales.

| Entité | Description | Attributs clés |
|---|---|---|
| Vote | Une consultation ou un scrutin | Type, sujet, options, périmètre, durée, quorum, majorité, statut |
| Comité | Une instance de la famille | Type, président, membres, mandat, secrétaire |
| Élection | Un processus électoral | Poste, candidats, votants, scrutin, proclamation, validateur |
| Mandat | La tenure d'un membre à un poste | Titulaire, poste, début, fin, validateur, statut |
| RèglementIntérieur | Le texte fondamental de la famille | Version, articles, historique, validateur |
| ProcèsVerbal | Le PV d'une instance | Instance, date, ordre du jour, décisions, validateur |
| Recours | Une contestation formelle | Type, auteur, décision contestée, statut, décideur |

### 11.1 Relations principales

- Un **Vote** est rattaché à un **Comité** ou à une instance (assemblée, congrès, conseil).
- Un **Comité** possède plusieurs membres (Membres U1) et génère plusieurs **ProcèsVerbaux**.
- Une **Élection** génère un **Mandat** pour le candidat élu.
- Un **Mandat** est détenu par un **Membre** (lien U1) pour un poste donné.
- Le **RèglementIntérieur** est référencé par les décisions (Vote, Motion) pour vérifier leur conformité.
- Un **Recours** cible une décision (Vote, Élection, Mandat, motion d'un PV).
- Un **ProcèsVerbal** est rattaché à une instance (Comité, assemblée, congrès) et archive les décisions.

### 11.2 Règles d'intégrité

- Un vote ne peut être clôturé sans vérification du quorum.
- Une élection ne peut être proclamée sans validation du validateur (patriarche ou conseil).
- Un mandat ne peut être détenu simultanément par deux membres pour le même poste (sauf suppléance explicitement déclarée).
- Un PV validé ne peut être modifié ; toute correction se fait par avenant.
- Un recours ne peut être déposé hors délai (sauf exception motivée).
- Toute suppression est interdite ; les décisions et PV sont archivés, jamais effacés.

---

## 12. Règles de gestion essentielles

Les règles ci-dessous s'imposent à tous les modules de l'Univers 5. Elles sont configurables par chaque famille.

| # | Règle | Justification |
|---|---|---|
| R1 | Chaque vote est rattaché à un type (consultation, vote simple, vote des responsables, vote du conseil) avec ses règles de quorum et de majorité | Garantit la légitimité |
| R2 | Les votes contraignants requièrent authentification à deux facteurs | Prévient les fraudes |
| R3 | Les bulletins anonymes sont chiffrés jusqu'à la clôture | Protège la liberté d'expression |
| R4 | Aucun vote ne peut être clôturé sans vérification du quorum | Garantit la représentativité |
| R5 | Les PV validés sont immuables ; toute correction se fait par avenant | Préserve la valeur juridique |
| R6 | Tout mandat est tracé avec début, fin, validateur, et journal des actions | Prévient les contestations |
| R7 | Les recours sont confidentiels, sauf décision contraire du patriarche | Protège les parties |
| R8 | Le règlement intérieur est consultable par tous les membres | Garantit la transparence |
| R9 | Les amendements au règlement sont votés à la majorité qualifiée (2/3) | Préserve la stabilité |
| R10 | Les comités inactifs pendant 6 mois sont signalés au conseil | Prévient l'enlisement |
| R11 | Les élections suivent un processus formel (annonce, candidatures, campagne, scrutin, proclamation) | Garantit la légitimité |
| R12 | La destitution d'un mandat requiert un vote du conseil à la majorité qualifiée | Protège contre les abus |
| R13 | Les congrès et assemblées générales font l'objet d'un PV archivé dans l'Univers 6 | Préserve la mémoire institutionnelle |
| R14 | Le recours contre le patriarche est exceptionnel et nécessite 20 % des membres adultes | Prévient les abus tout en protégeant l'autorité |
| R15 | Toute décision est rattachée à un article du règlement intérieur pour vérification de conformité | Garantit la cohérence |

---

## 13. Cas limites et situations sensibles

### 13.1 Transition de pouvoir contestée

La transition du patriarche peut être contestée, notamment dans les familles où la règle de l'aînesse n'est pas claire ou où plusieurs prétendants existent. Le système gère ce cas par :

- L'enregistrement de toutes les prétentions, avec leurs motifs.
- La consultation du conseil et des chefs de branche.
- L'arbitrage par le comité médiation élargi aux sages.
- Le cas échéant, un vote du conseil à la majorité qualifiée.

Cette procédure est longue et sensible, mais sa traçabilité prévient les conflits ouverts. En cas de blocage persistant, une médiation externe (par un chef traditionnel ou une autorité religieuse) peut être sollicitée.

### 13.2 Vote serré ou égalité

En cas d'égalité dans un vote, la procédure par défaut (nouveau vote, puis arbitrage du patriarche) évite le blocage. Le système gère aussi les cas de vote serré (écart inférieur à 5 %) en proposant :

- Une vérification automatique des bulletins (recomptage).
- Une période de contestation de 7 jours, ouverte à tout votant.
- Le cas échéant, un nouveau vote.

Ces précautions renforcent la légitimité des décisions serrées, qui sont les plus susceptibles d'être contestées.

### 13.3 Fraude électorale

La fraude électorale (double vote, vote par procuration non autorisée, manipulation des résultats) est rare mais grave. Le système prévoit :

- Authentification à deux facteurs pour tous les votes contraignants.
- Vérification automatique des doublons (même membre, même vote).
- Journal d'audit consultable par le conseil.
- Procédure de contestation dans les 7 jours suivant la proclamation.
- En cas de fraude avérée, annulation du vote, sanction des fraudeurs, et nouveau scrutin.

### 13.4 Recours contre le patriarche

Le recours contre le patriarche est exceptionnel. Il est ouvert dans deux cas seulement : décision manifestement contraire au règlement, et manquement grave à l'éthique. La procédure (saisine par 20 % des membres, décision du conseil élargi) est lourde, ce qui dissuade les recours abusifs. En cas de recevabilité, le patriarche est auditionné par le conseil élargi, qui rend une décision motivée. Le recours reste confidentiel jusqu'à la décision finale.

### 13.5 Scission familiale

Dans les cas extrêmes, une branche peut décider de faire sécession et de quitter la famille. Le système gère ce cas par :

- L'enregistrement formel de la décision de sécession (vote de la branche concernée).
- La médiation du comité et du patriarche pour tenter d'éviter la rupture.
- Le cas échéant, la négociation des conditions de sécession (partage des biens, conservation des archives, statut des membres).
- L'archivage de la scission dans l'Univers 6, pour la mémoire.

La scission est toujours un échec, mais sa gestion traçable préserve la dignité de tous et la mémoire pour les générations futures.

### 13.6 Abstention massive

Si une consultation ou un vote reçoit un taux d'abstention supérieur à 50 %, le système signale l'alerte au conseil. Une abstention massive peut indiquer un désintérêt, une incompréhension du sujet, ou un désaccord profond avec la procédure. Le conseil peut :

- Reporter le vote, avec une campagne d'information renforcée.
- Reformuler la question, pour la rendre plus claire.
- Tenir des réunions d'explication, en présentiel ou en visio.
- Le cas échéant, modifier le règlement pour ajuster le quorum.

L'abstention n'est pas une simple absence de participation : c'est un signal politique qu'il faut savoir entendre.

### 13.7 Mineur revendiquant une voix

Un membre de moins de 18 ans peut revendiquer une voix dans une consultation, notamment s'il est marié ou émancipé selon la tradition. Le système prévoit :

- Un statut de « membre junior émancipé », attribué sur décision du chef de branche.
- Le droit de vote pour les consultations non contraignantes.
- Le droit de vote pour les votes contraignants, sur autorisation du patriarche.

Cette flexibilité respecte les traditions où l'âge civil n'est pas le seul critère de maturité.

### 13.8 Tradition vs démocratie

Dans certaines familles, la tradition veut que l'aîné de la branche aînée décide seul des sujets importants, sans consultation. D'autres familles ont adopté des règles plus démocratiques. Le système gère cette diversité en permettant à chaque famille de configurer ses propres règles, par type de sujet. Un même système peut ainsi fonctionner selon la tradition pour la désignation du patriarche, et de manière démocratique pour l'élection du trésorier. Cette hybridité est l'une des forces de l'application.

---

## 14. Wireframes textuels des écrans clés

Cette section décrit en pseudo-maquettes les cinq écrans les plus importants de l'Univers 5.

### 14.1 Consultation en cours

```
┌────────────────────────────────────────────────────────────┐
│  VOTE-2026-008  🗳️ CONSULTATION                            │
├────────────────────────────────────────────────────────────┤
│  Sujet : Lieu du congrès familial 2027                    │
│  Type : Consultation (non contraignante)                  │
│  Périmètre : Tous les membres adultes (220 votants)       │
│  Échéance : 15 octobre 2026 (J-7)                         │
│                                                            │
│  ─── OPTIONS ────────────────────────────                  │
│  ○ Yaoundé                                                │
│  ○ Douala                                                 │
│  ○ Bafoussam (village familial)                           │
│  ○ Autre (préciser)                                       │
│                                                            │
│  ─── MON VOTE ─────────────────────────                    │
│  Statut : ⏳ À exprimer                                   │
│                                                            │
│  [Exprimer mon vote]                                      │
│                                                            │
│  ─── PARTICIPATION ────────────────────                    │
│  Votants : 134 / 220 (61%)                                │
│  Quorum atteint : ✓ (50% requis)                         │
│                                                            │
│  ─── RÉSULTATS (visibles après clôture) ──                 │
│  Disponibles le 15 octobre 2026 à 23h59                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.2 Comité de travail

```
┌────────────────────────────────────────────────────────────┐
│  COMITÉ FINANCIER                                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ─── COMPOSITION ────────────────────                      │
│  Président : Bernard NDONGO (trésorier)                   │
│  Secrétaire : Hélène NDONGO                               │
│  Membres : 7 (dont 1 par branche)                         │
│  Mandat : 2025-2027                                        │
│                                                            │
│  ─── PROCHAINE RÉUNION ────────────────                    │
│  15 octobre 2026 — 17h — En visio                         │
│  Ordre du jour : Budget 2027, audit T3                   │
│                                                            │
│  ─── DERNIERS COMPTES-RENDUS ─────────                     │
│  • PV-2026-014 — Réunion du 12/09/2026                   │
│    Décisions : 3 — Actions : 5                            │
│  • PV-2026-013 — Réunion du 09/08/2026                   │
│    Décisions : 2 — Actions : 4                            │
│                                                            │
│  ─── ACTIONS EN COURS ────────────────                     │
│  • Préparer budget 2027 — Bernard — 30/10                │
│  • Rapprocher banque T3 — Hélène — 15/10                 │
│  • Préparer rapport congrès — Paul — 01/12               │
│                                                            │
│  [Ouvrir l'espace de travail]                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.3 Élection trésorier

```
┌────────────────────────────────────────────────────────────┐
│  ÉLECTION TRÉSORIER 2027                                  │
├────────────────────────────────────────────────────────────┤
│  Statut : CAMPAGNE (J-3 avant scrutin)                    │
│  Votants : Conseil familial (12 membres)                  │
│  Scrutin : 20-25 octobre 2026 (bulletin secret)          │
│  Quorum : 2/3 du conseil (8 votants)                     │
│  Majorité : Absolue (50 % + 1)                            │
│                                                            │
│  ─── CANDIDATS ───────────────────────────                 │
│                                                            │
│  1. Bernard NDONGO (sortant)                              │
│     Branche Nord — 52 ans — Expert-comptable             │
│     Programme : Continuité, modernisation, audit annuel  │
│     Soutiens : 4 chefs de branche                         │
│     [Voir le programme complet]                           │
│                                                            │
│  2. Paul BIYA                                              │
│     Branche Sud — 45 ans — Banquier                       │
│     Programme : Transparence renforcée, Mobile Money     │
│     Soutiens : 3 chefs de branche                         │
│     [Voir le programme complet]                           │
│                                                            │
│  ─── MON VOTE ─────────────────────────                    │
│  Statut : ⏳ À exprimer (du 20 au 25 oct.)               │
│  Authentification 2FA requise                             │
│                                                            │
│  [Je vais voter]                                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.4 Règlement intérieur

```
┌────────────────────────────────────────────────────────────┐
│  RÈGLEMENT INTÉRIEUR — Famille NDONGO                     │
├────────────────────────────────────────────────────────────┤
│  Version : 3.2 (adoptée au congrès de décembre 2025)     │
│  Recherche : [_______________________]                    │
│                                                            │
│  ─── TABLE DES MATIÈRES ────────────────                   │
│  1. Dispositions générales                                │
│  2. Membres                                               │
│  3. Branches                                              │
│  4. Instances                                             │
│  5. Décisions                                             │
│  6. Finances                                              │
│  7. Solidarité                                            │
│  8. Événements                                            │
│  9. Mémoire et patrimoine                                 │
│  10. Modifications du règlement                           │
│                                                            │
│  ─── ARTICLE 5.3 — VOTES DES RESPONSABLES ────            │
│                                                            │
│  « Les décisions concernant l'organisation des            │
│  congrès et des grandes cérémonies traditionnelles        │
│  sont prises par le vote des chefs de branche, à la       │
│  majorité simple, avec un quorum de 2/3.                  │
│                                                            │
│  En cas d'égalité, le patriarche tranche. »              │
│                                                            │
│  Historique :                                             │
│  • Version 3.2 (12/2025) — Modification quorum 50%→2/3  │
│  • Version 3.1 (12/2023) — Ajout paragraphe 2            │
│  • Version 3.0 (12/2021) — Réécriture complète          │
│                                                            │
│  [Proposer un amendement]                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.5 PV de congrès (extrait)

```
┌────────────────────────────────────────────────────────────┐
│  PV-2026-003 — PROCÈS-VERBAL DU CONGRÈS 2026              │
├────────────────────────────────────────────────────────────┤
│  Instance : Congrès familial NDONGO                       │
│  Date : 26-28 décembre 2026                               │
│  Lieu : Village Bafoussam                                 │
│  Présents : 198 / 247 (présentiel + visio)               │
│  Président de séance : Papa Jean NDONGO (patriarche)     │
│  Secrétaire : Hélène NDONGO                               │
│                                                            │
│  ─── ORDRE DU JOUR ────────────────────                    │
│  1. Rapport moral du patriarche                           │
│  2. Rapport financier 2026                                │
│  3. Budget 2027                                           │
│  4. Élection du trésorier                                 │
│  5. motions diverses                                      │
│                                                            │
│  ─── DÉCISIONS ADOPTÉES ────────────────                   │
│                                                            │
│  Motion 1 : Adoption du budget 2027                       │
│  - Pour : 168 — Contre : 12 — Abstentions : 18           │
│  - Lien règlement : Article 6.4                           │
│  - Validé par : Patriarche                                │
│                                                            │
│  Motion 2 : Élection de Bernard NDONGO comme trésorier   │
│  - Pour : 9 — Contre : 3 (conseil familial)              │
│  - Lien règlement : Article 4.7                           │
│  - Mandat : 2027-2030                                     │
│                                                            │
│  Motion 3 : Achat d'un terrain familial à Bafoussam     │
│  - Pour : 142 — Contre : 38 — Abstentions : 18           │
│  - Lien règlement : Article 9.2                           │
│  - Budget : 8 000 000 FCFA (caisse investissement)       │
│                                                            │
│  ─── ACTIONS ───────────────────────────                   │
│  • Trésorier : Ouvrir la cotisation exceptionnelle        │
│    terrain — 15/01/2027                                   │
│  • Comité culturel : Organiser la cérémonie d'achat       │
│    coutumier — 15/02/2027                                 │
│                                                            │
│  ─── VALIDATION ────────────────────────                   │
│  Validé le : 28/12/2026                                   │
│  Signatures numériques : Papa Jean, Hélène               │
│  Statut : Immutable — Archivé U6                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Roadmap MVP et séquençage

L'Univers 5 est séquencé en trois phases pour permettre une adoption progressive.

### 15.1 Phase 1 — MVP (mois 6 à 10)

| Périmètre | Détail |
|---|---|
| Votes simples | Consultation + vote simple, périmètre familial |
| Comités | Création des 10 types, composition, espace de travail |
| PV de réunions | Rédaction, validation, archivage |
| Règlement intérieur | Consultation, sans amendement en ligne |
| Authentification 2FA | Pour les votes contraignants |

**Critères de sortie** : taux de participation aux votes ≥ 50 %, 100 % des PV archivés, taux de comités actifs ≥ 70 %.

### 15.2 Phase 2 — Enrichissement (mois 11 à 15)

| Périmètre | Détail |
|---|---|
| Votes des responsables | Vote des chefs de branche |
| Votes du conseil | Vote du conseil familial, majorité qualifiée |
| Élections | Processus complet (annonce, candidatures, scrutin, proclamation) |
| Mandats | Gestion, traçabilité, renouvellement |
| Amendements | Procédure d'amendement du règlement en ligne |
| Recours | Procédure de contestation, comité médiation U5 |
| Assemblées hybrides | Présentiel + diaspora en visioconférence |

**Critères de sortie** : taux de participation ≥ 60 %, délai de décision ≤ 14 jours, satisfaction sur la légitimité ≥ 4/5.

### 15.3 Phase 3 — Maturité (mois 16 à 22)

| Périmètre | Détail |
|---|---|
| IA participation | Suggestions d'ajustement des quorum selon les taux |
| Votes hybrides diaspora | Optimisation multi-fuseaux |
| Conformité automatique | Vérification des décisions contre le règlement |
| Médiation assistée | Outils d'aide à la décision pour le comité |
| Notifications vocales | Appels automatiques pour rappeler les votes aux aînés |
| Gouvernance multi-famille | Coordination avec familles alliées |

**Critères de sortie** : taux d'abstention ≤ 20 %, taux de décisions contestées ≤ 5 %, adoption du règlement intérieur ≥ 90 %.

---

## 16. Risques et points d'attention

### 16.1 Abstention

L'abstention est le risque principal. Si les membres ne participent pas aux consultations et aux votes, la légitimité des décisions s'effrite. La mitigation repose sur :

- La simplicité de l'expression (un tap pour voter).
- Les rappels automatiques (J-7, J-1, jour même).
- La publication des résultats et de l'impact des votes, pour montrer que la participation compte.
- Le cas échéant, l'obligation de justifier une abstention pour les votes contraignants.

### 16.2 Contestation de légitimité

Une décision peut être contestée sur sa légitimité (quorum non atteint, majorité non respectée, périmètre de votants erroné). La mitigation repose sur la traçabilité (chaque vote est enregistré avec ses paramètres), la procédure de recours (module 4.7), et la publication des résultats avec mention de la légitimité.

### 16.3 Conflits de pouvoir

Les élections et les transitions de pouvoir peuvent générer des conflits ouverts. La mitigation repose sur la procédure formelle (annonce, campagne, scrutin, proclamation), la confidentialité des bulletins, et le rôle du comité médiation en cas de contestation. Le patriarche joue un rôle d'arbitre ultime, ce qui prévient les blocages.

### 16.4 Traditionalisme

Certains membres peuvent considérer que la gouvernance numérique est une intrusion dans les traditions. La mitigation repose sur :

- La configurabilité : chaque famille adapte ses règles.
- L'hybridité : tradition et démocratie coexistent.
- L'accompagnement : formations, explications, présence d'un référent.
- Le respect de l'autorité du patriarche, qui reste l'arbitre ultime.

### 16.5 Fraude électorale

La fraude électorale est rare mais grave. La mitigation repose sur l'authentification 2FA, le chiffrement des bulletins, le journal d'audit, et la procédure de contestation dans les 7 jours. En cas de fraude avérée, sanction exemplaire et nouveau scrutin.

### 16.6 Confidentialité des recours

Les recours et les contestations sont sensibles. Une fuite (par exemple, divulgation du fait qu'un membre a contesté une décision) peut causer des représailles. La mitigation repose sur la restriction d'accès (comité médiation + conseil uniquement), le journal des consultations, et la formation des membres du comité au secret.

### 16.7 Dérive technocratique

L'application peut donner l'impression que la gouvernance devient technique, réservée à ceux qui maîtrisent l'outil. La mitigation repose sur :

- La simplicité de l'interface (un tap pour voter).
- Les notifications vocales pour les aînés.
- L'accompagnement humain d'un référent pour les membres en difficulté.
- Le maintien des cérémonies protocolaires (le patriarche ouvre et clôture les congrès, les motions sont lues à voix haute).

---

## 17. Indicateurs de succès

| Indicateur | Définition | Cible | Fréquence |
|---|---|---|---|
| Taux de participation aux votes | Votants / membres concernés | ≥ 60 % | Par vote |
| Délai de décision | Lancement → clôture d'une consultation | ≤ 14 jours | Par vote |
| Taux de décisions contestées | Décisions faisant l'objet d'un recours | ≤ 5 % | Mensuel |
| Délai de traitement des recours | Dépôt → décision du comité médiation | ≤ 14 jours | Par recours |
| Couverture des PV | Assemblées et congrès avec PV archivé | 100 % | Par instance |
| Taux de comités actifs | Comités ayant réuni dans le trimestre | ≥ 80 % | Trimestriel |
| Satisfaction sur la légitimité | Note moyenne des membres | ≥ 4/5 | Annuel |
| Traçabilité des mandats | Mandats avec début, fin, validateur | 100 % | Permanent |
| Adoption du règlement | Familles avec règlement voté dans l'app | ≥ 90 % | Annuel |
| Taux d'abstention | Abstentions sur les votes | ≤ 20 % | Par vote |

---

## 18. Conclusion

L'Univers 5 est le pilier invisible de l'application. Sans lui, aucune décision n'est véritablement légitime, aucune élection n'est incontestable, aucun règlement n'est opposable. La gouvernance est ce qui transforme une somme d'individus en institution capable de décider ensemble et de respecter ses décisions. C'est un module moins visible que les autres — pas de cotisations, pas de funérailles, pas d'albums photos — mais il est la condition de la pérennité de tout le reste.

La proposition centrale de l'Univers 5 est simple : remplacer les décisions implicites et orales d'aujourd'hui par des processus tracés, configurables et légitimes. Chaque type de décision — consultation, vote simple, vote des responsables, vote du conseil, décision du patriarche — possède son propre protocole, ses règles, et sa trace. Les comités disposent d'espaces de travail. Les élections suivent des processus formels. Le règlement intérieur est consultable et amendable. Les PV sont archivés. En cas de contestation, une procédure de recours est ouverte.

L'Univers 5 ne se substitue pas à l'autorité traditionnelle : il la respecte et la renforce. Le patriarche reste l'arbitre ultime, les chefs de branche conservent leurs prérogatives, les traditions continuent d'être honorées. Mais l'application apporte la transparence, la traçabilité, et la participation, qui sont les conditions de la légitimité moderne. Une famille qui décide ensemble, qui respecte ses décisions, et qui archive sa mémoire institutionnelle est une famille qui dure.

Les prochaines étapes recommandées sont les suivantes :

1. **Validation de cette spécification** par le comité de pilotage et par au moins deux familles pilotes, avec un accent particulier sur la configuration des cinq niveaux de décision et sur la procédure de recours.
2. **Production des maquettes interactives** des cinq écrans clés (consultation, comité, élection, règlement, PV de congrès).
3. **Définition des interfaces avec l'Univers 4** (votes budgétaires) et l'Univers 2** (assemblées et congrès).
4. **Construction du MVP Phase 1** avec un périmètre strictement limité aux votes simples, aux comités, et aux PV de réunions.
5. **Onboarding de la première famille pilote** dans un délai de dix mois après le démarrage du développement, avec un accompagnement particulier du conseil familial et des chefs de branche.

L'Univers 5, s'il est bien conçu et bien livré, deviendra l'architecture du pouvoir familial : un lieu où chaque décision trouve sa légitimité, chaque instance sa trace, et chaque membre sa voix. Il transformera la gouvernance d'un sujet d'opacité en une discipline partagée, sans déraciner les traditions qui font la valeur et la singularité des grandes familles africaines.
