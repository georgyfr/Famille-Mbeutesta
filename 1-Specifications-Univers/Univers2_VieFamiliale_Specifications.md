# Univers 2 — La Vie familiale

**Le moteur événementiel des grandes familles africaines**

| Document | Spécifications fonctionnelles — Univers 2 |
|---|---|
| Version | 1.0 |
| Date | Septembre 2026 |
| Statut | Pour validation |
| Audience | Chefs de famille, comité de pilotage, équipe produit, équipe développement |
| Prérequis | Spécifications Univers 1 — La Famille |

---

## Synthèse exécutive

L'Univers 2, intitulé **« La Vie familiale »**, est le théâtre quotidien de ce qui fait la substance d'une grande famille africaine : les naissances, les mariages, les décès, les congrès, les réunions de branche, les réussites scolaires, les maladies graves. Ces événements ne sont pas des anecdotes : ils sont les moments où la famille se prouve à elle-même sa cohésion, sa solidarité, sa hiérarchie et sa mémoire. Aujourd'hui, leur gestion repose sur une accumulation de groupes WhatsApp, d'appels téléphoniques et de cahiers, ce qui conduit inévitablement à des pertes d'information, des confusions, des retards et parfois des conflits.

La proposition centrale de l'Univers 2 est de remplacer cette gestion chaotique par un **moteur événementiel automatisé**. Concrètement, lorsqu'un événement est déclaré dans l'application (naissance, décès, congrès, etc.), le système crée automatiquement un dossier structuré et déclenche un workflow adapté : annonce ciblée, comité d'organisation, collecte de solidarité, programme, logistique, album photo, témoignages, clôture. Chaque type d'événement possède son propre scénario, configurable selon les traditions de chaque famille. La famille ne bricole plus : elle exécute un protocole.

Le présent document définit le rôle, les objectifs, l'architecture en sept modules, le modèle de données, les règles de gestion, les cas limites et la roadmap de l'Univers 2. Il s'appuie sur l'Univers 1 (La Famille), qui fournit le registre des membres, les branches et les rôles nécessaires au ciblage et à la gouvernance événementielle. L'Univers 2 est conçu pour transformer un sujet émotionnellement chargé et chronophage en une discipline maîtrisée, sans perdre la chaleur humaine qui fait la valeur de la vie familiale.

---

## 1. Rôle et finalité de l'Univers 2

### 1.1 Rôle stratégique

L'Univers 2 joue quatre rôles stratégiques imbriqués qui justifient sa position centrale dans l'architecture de l'application.

**Premièrement, il est le réceptacle unique de tous les événements familiaux.** Une grande famille camerounaise vit en moyenne plusieurs dizaines d'événements par an : naissances, baptêmes, dots, mariages, anniversaires, réussites scolaires, promotions, hospitalisations, décès, funérailles, réunions mensuelles de branche, assemblées générales, congrès biennal, journées familiales, cérémonies traditionnelles. Aujourd'hui, ces événements se dispersent dans des dizaines de groupes WhatsApp, des SMS, des appels. L'Univers 2 les centralise dans un calendrier familial unifié, accessible à tous les membres, et les conserve dans une mémoire consultable. C'est la fin de la phrase trop entendue : « je n'ai pas été informé ».

**Deuxièmement, il est le déclencheur automatique des solidarités.** Lorsqu'un décès survient, la famille n'a pas à se demander « que doit-on faire ? » : le système déclenche le workflow de deuil, qui prévoit l'annonce ciblée, la constitution d'un comité d'organisation, l'ouverture d'une collecte de solidarité, la planification du programme funéraire, la coordination logistique et la clôture avec bilan transmis à tous. Il en va de même pour une naissance, une maladie grave, un mariage. La solidarité n'attend plus l'initiative d'un membre particulier : elle est inscrite dans le système.

**Troisièmement, il est la mémoire datée de la famille.** Chaque événement laisse une trace : date, lieu, participants, photos, témoignages, décisions, contributions financières. Cette mémoire est précieuse à court terme (pour les remerciements, les bilans, les comptes) et à long terme (pour la transmission aux générations futures). L'Univers 2 alimente directement l'Univers 6 (Mémoire) en archivant chaque événement clôturé dans la bibliothèque familiale, avec ses photos et ses récits.

**Quatrièmement, il est l'infrastructure de coordination des congrès et réunions.** Les grands rassemblements familiaux (congrès biennal, assemblée générale, journée familiale) sont des opérations complexes qui nécessitent une logistique rigoureuse : choix du lieu, fixation des dates, inscription des participants, hébergement, transport, restauration, ordre du jour, votes, compte-rendu. L'Univers 2 fournit les outils dédiés à cette coordination, qui dépassent largement ce que WhatsApp peut offrir.

### 1.2 Finalité opérationnelle

Sur le plan opérationnel, l'Univers 2 poursuit une finalité claire : **qu'à tout moment, tout membre autorisé puisse répondre à cinq questions fondamentales** :

1. Quels sont les événements familiaux à venir dans les 30 prochains jours, et lesquels me concernent directement ?
2. Quel est le programme précis du prochain congrès, et comment puis-je m'y inscrire ?
3. Quelles contributions financières sont attendues de moi pour les événements en cours ?
4. Quels événements ont marqué la famille ce trimestre, et où trouver les photos et témoignages ?
5. En cas de deuil ou de maladie grave, qui a été informé, qui coordonne, et combien a été collecté ?

Si ces cinq questions trouvent une réponse immédiate et fiable, l'Univers 2 remplit sa mission. Tout le reste relève de l'enrichissement progressif.

### 1.3 Trois familles d'événements

L'Univers 2 distinguera systématiquement trois familles d'événements, qui obéissent à des logiques différentes :

- **Les événements heureux** — naissance, mariage, baptême, dot, anniversaire, réussite scolaire, promotion professionnelle, retraite, création d'entreprise. Ils appellent la félicitation, le témoignage, le cadeau collectif, l'album de souvenirs.
- **Les événements malheureux** — décès, maladie grave, accident, hospitalisation, sinistre, difficultés particulières. Ils appellent la solidarité immédiate, la coordination logistique, la collecte financière, le suivi.
- **Les événements institutionnels** — réunion mensuelle ou trimestrielle, assemblée générale, congrès familial, journée familiale, cérémonie traditionnelle. Ils appellent la préparation, l'inscription, l'ordre du jour, le compte-rendu, l'archivage.

Cette distinction structure tout l'Univers 2 : chaque famille possède ses types d'événements, ses workflows types, ses rôles organisationnels et ses rituels de clôture.

---

## 2. Objectifs mesurables

L'Univers 2 doit être évalué sur des indicateurs concrets. Les objectifs ci-dessous sont proposés pour la première année d'exploitation, sur une famille pilote de 150 à 300 membres.

| Objectif | Indicateur | Cible année 1 |
|---|---|---|
| Couverture du calendrier | Taux d'événements familiaux saisis dans l'app dans les 7 jours | ≥ 85 % |
| Délai d'annonce de décès | Délai moyen entre un décès et l'annonce à la famille via l'app | ≤ 30 minutes |
| Taux de présence aux congrès | Pourcentage de membres inscrits vs présents effectifs | ≥ 90 % |
| Délai de clôture des dossiers | Délai moyen entre la fin d'un événement et sa clôture formelle | ≤ 14 jours |
| Adoption du calendrier | Taux de membres consultant le calendrier par semaine | ≥ 50 % |
| Taux d'événements avec album | Pourcentage d'événements clôturés disposant d'un album photo | ≥ 70 % |
| Satisfaction des organisateurs | Note moyenne donnée par les organisateurs de congrès et funérailles | ≥ 4/5 |
| Réduction des doublons d'annonce | Nombre d'événements annoncés deux fois par erreur | ≤ 2/an |
| Taux de participation aux votes | Pourcentage de membres participant aux sondages liés aux événements | ≥ 60 % |

Ces cibles sont indicatives ; elles devront être ajustées avec les familles pilotes. Elles traduisent l'ambition : un outil qui devient le réflexe unique pour tout événement familial, du décès à la naissance.

---

## 3. Architecture fonctionnelle

L'Univers 2 est composé de **sept modules fonctionnels** qui s'articulent autour d'un cœur commun : le dossier d'événement. Le calendrier, le catalogue des types, le moteur de workflows, les présences, l'album et les notifications sont autant de vues ou d'extensions de ce dossier.

### Vue d'ensemble des modules

```
┌─────────────────────────────────────────────────────────────┐
│              UNIVERS 2 — LA VIE FAMILIALE                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CŒUR : Dossier d'événement (unité atomique)            │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐  │
│   ▼          ▼          ▼          ▼          ▼          ▼  │
│  Calendrier Catalogue  Moteur    Présences Album &   Notifi- │
│  intelligent des types  workflow  &         témoignages  cations │
│                       automatisé logistique              &     │
│                                                       ciblage │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

L'organisation de l'application reflète cette architecture : un calendrier partagé sert d'écran d'entrée, listant les événements à venir et passés. Le clic sur un événement ouvre son dossier, qui contient toutes les métadonnées, le workflow en cours, les participants, les contributions et l'album. Le moteur événementiel fonctionne en arrière-plan et agit automatiquement sur le dossier selon le type d'événement.

### Navigation principale

La navigation de l'Univers 2 s'organise autour de quatre entrées principales :

1. **Calendrier** — vue mensuelle, hebdomadaire ou annuelle, filtrable par branche, type, lieu.
2. **Événements** — liste des dossiers d'événements ouverts (en cours) et récemment clôturés.
3. **Nouvel événement** — assistant de création guidé par type.
4. **Albums** — accès à la mémoire des événements passés.

Le tableau de bord familial (décrit dans l'Univers 1) affiche par ailleurs une synthèse des prochains événements et des solidarités en cours, avec des liens directs vers les dossiers correspondants.

---

## 4. Module 4.1 — Le calendrier intelligent

### 4.1.1 Description

Le calendrier est l'écran d'entrée de l'Univers 2. Il présente, dans une vue unique, tous les événements familiaux à venir et passés, avec leurs métadonnées essentielles. Sa fonction première est de permettre à chaque membre de savoir en un coup d'œil ce qui se passe dans la famille, ce qui le concerne, et ce qui nécessite son attention.

### 4.1.2 Vues proposées

Le calendrier offre trois vues principales, sélectionnables par l'utilisateur :

- **Vue mensuelle** — grille classique mois par mois, avec pastilles colorées par type d'événement (vert pour heureux, gris pour malheureux, doré pour institutionnel).
- **Vue hebdomadaire** — liste détaillée des événements de la semaine, avec horaires, lieux, statut de présence du membre.
- **Vue annuelle** — vue d'ensemble compacte permettant de visualiser la répartition des événements sur l'année, et d'identifier les périodes de concentration (souvent décembre pour les congrès, juillet-août pour les funérailles).

### 4.1.3 Filtres

Le calendrier peut être filtré selon plusieurs dimensions :

- **Par branche** — voir uniquement les événements de sa branche.
- **Par type** — voir uniquement les mariages, ou uniquement les décès, ou uniquement les congrès.
- **Par lieu** — voir uniquement les événements d'une ville ou d'un pays.
- **Par statut** — événements confirmés, en préparation, à confirmer.
- **Par implication personnelle** — événements où je suis convié, où je dois contribuer, où je suis organisateur.

### 4.1.4 Rappels automatiques

Le calendrier envoie automatiquement des rappels aux membres concernés :

- 7 jours avant un événement institutionnel (congrès, assemblée).
- 3 jours avant un événement heureux (mariage, baptême).
- 1 jour avant pour rappel de présence.
- Le jour même, le matin, pour les événements où la présence est attendue.

Les rappels tiennent compte du fuseau horaire de chaque membre (un membre en diaspora ne reçoit pas un rappel à 3 heures du matin). Ils empruntent le canal préféré du membre : notification push, SMS, ou appel vocal pour les aînés.

### 4.1.5 Synchronisation avec calendriers externes

Le calendrier familial peut être synchronisé avec les calendriers externes des membres (Google Calendar, Apple Calendar, Outlook). Cette synchronisation est unidirectionnelle par défaut (les événements familiaux apparaissent dans le calendrier personnel du membre, sans modification possible depuis l'extérieur). Une synchronisation bidirectionnelle est possible pour les organisateurs, qui peuvent ainsi bloquer des créneaux sans quitter leur agenda habituel.

### 4.1.6 Gestion des conflits de dates

Lorsqu'un nouvel événement est créé, le système détecte automatiquement les conflits avec des événements existants. Un avertissement est affiché à l'organisateur, qui peut choisir de maintenir la date, de la déplacer, ou de demander une consultation. Cette fonction prévient les situations embarrassantes où deux événements familiaux concurrents se retrouvent le même jour, forçant les membres à choisir.

---

## 5. Module 4.2 — Le catalogue des types d'événements

### 5.1 Description

Le catalogue des types d'événements est la référence qui structure tout l'Univers 2. Il définit, pour chaque type d'événement, ses métadonnées obligatoires, son workflow type, ses rôles organisationnels et son rituel de clôture. Sans ce catalogue, chaque événement serait géré de façon ad hoc, ce qui recréerait le chaos que l'application vise à éliminer.

### 5.2 Les trois familles et leurs types

Le tableau ci-dessous présente le catalogue complet des types d'événements, organisé en trois familles. Chaque type est identifié par un code court, qui sert de référence dans le reste du système.

| Famille | Code | Type | Workflow type |
|---|---|---|---|
| Heureux | H1 | Naissance | Annonce → Félicitations → Cadeau collectif → Album |
| Heureux | H2 | Baptême | Annonce → Date/lieu → Inscriptions → Album |
| Heureux | H3 | Dot | Annonce → Programme → Témoins → Album |
| Heureux | H4 | Mariage | Annonce → Comité → Budget → Invités → Logistique → Album → Remerciements |
| Heureux | H5 | Anniversaire | Annonce automatique → Félicitations → (Cadeau optionnel) |
| Heureux | H6 | Réussite scolaire | Annonce → Félicitations → (Récompense familiale optionnelle) |
| Heureux | H7 | Promotion / Nomination | Annonce → Félicitations → Témoignages |
| Heureux | H8 | Retraite | Annonce → Témoignages → Cérémonie → Album |
| Heureux | H9 | Expatriation | Annonce → Adieux → Coordination accueil diaspora |
| Heureux | H10 | Création d'entreprise | Annonce → Félicitations → (Soutien réseau familial) |
| Malheureux | M1 | Décès | Annonce → Comité → Collecte → Programme → Logistique → Album → Clôture |
| Malheureux | M2 | Maladie grave | Annonce restreinte → Suivi → Soutien → Visites |
| Malheureux | M3 | Accident | Annonce restreinte → Suivi → Soutien |
| Malheureux | M4 | Hospitalisation | Annonce restreinte → Suivi → Visites → Sortie |
| Malheureux | M5 | Sinistre (incendie, inondation) | Annonce → Évaluation → Collecte → Rétablissement |
| Malheureux | M6 | Difficultés particulières | Annonce restreinte → Médiation → Soutien |
| Institutionnel | I1 | Réunion mensuelle de branche | Convocation → Ordre du jour → Déroulé → Compte-rendu |
| Institutionnel | I2 | Réunion trimestrielle | Convocation → Ordre du jour → Déroulé → Compte-rendu |
| Institutionnel | I3 | Assemblée générale annuelle | Convocation → Rapports → Votes → Décisions → PV |
| Institutionnel | I4 | Congrès familial | Annonce → Comité → Inscriptions → Logistique → Programme → Votes → Album → Compte-rendu |
| Institutionnel | I5 | Journée familiale | Annonce → Inscriptions → Programme → Album |
| Institutionnel | I6 | Cérémonie traditionnelle | Annonce → Programme → Participants → Album |
| Institutionnel | I7 | Réunion de comité | Convocation → Ordre du jour → Déroulé → Compte-rendu |

### 5.3 Configurabilité par famille

Chaque famille pilote peut configurer le catalogue selon ses traditions :

- Ajouter des types spécifiques (par exemple, « levée de deuil » au bout d'un an, cérémonie de purification).
- Supprimer des types non pertinents.
- Adapter les workflows types (par exemple, ajouter une étape « choix du village-hôte » pour le congrès).
- Définir des rituels de clôture spécifiques (par exemple, lecture d'un message du patriarche).

Cette configurabilité est essentielle pour que l'application s'adapte à la diversité des traditions familiales camerounaises et africaines, plutôt que d'imposer un modèle unique.

---

## 6. Module 4.3 — Le dossier d'événement

### 6.1 Description

Le dossier d'événement est l'unité atomique de l'Univers 2. Tout événement, qu'il s'agisse d'un mariage ou d'une réunion mensuelle, donne lieu à l'ouverture d'un dossier qui rassemble toutes les informations, actions, participants et traces liés à cet événement. Le dossier reste ouvert pendant toute la durée de l'événement, puis est clôturé et archivé dans la mémoire familiale (Univers 6).

### 6.2 Anatomie d'un dossier

Un dossier d'événement comporte huit sections principales :

```
┌────────────────────────────────────────────────────────────┐
│  DOSSIER D'ÉVÉNEMENT                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. MÉTADONNÉES                                            │
│     Type, statut, date(s), lieu, branche(s) concernée(s)   │
│                                                            │
│  2. RESPONSABLES                                           │
│     Organisateur, comité, validateur (chef de branche)     │
│                                                            │
│  3. PROGRAMME                                              │
│     Étapes, horaires, lieux, intervenants                  │
│                                                            │
│  4. PARTICIPANTS                                           │
│     Invités, présents confirmés, absents, excusés          │
│                                                            │
│  5. CONTRIBUTIONS                                          │
│     Collecte, dépenses, solde, justificatifs (lien U4)     │
│                                                            │
│  6. LOGISTIQUE                                             │
│     Hébergement, transport, restauration, tâches assignées │
│                                                            │
│  7. MÉMOIRE                                                │
│     Photos, vidéos, témoignages, documents                 │
│                                                            │
│  8. COMMUNICATION                                          │
│     Annonces, messages, condoléances / félicitations       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 6.3 Cycle de vie d'un dossier

Chaque dossier suit un cycle de vie à quatre états :

1. **Brouillon** — le dossier est créé, mais non annoncé. Seul l'organisateur et le chef de branche y ont accès.
2. **Annoncé** — le dossier est visible par les membres concernés, le workflow est lancé.
3. **En cours** — l'événement a commencé, les actions logistiques se déploient.
4. **Clôturé** — l'événement est terminé, le bilan est transmis, le dossier est archivé dans l'Univers 6.

La transition entre états est soumise à des règles de validation : un dossier ne peut être annoncé sans validation du chef de branche ; un dossier ne peut être clôturé sans bilan transmis. Ces règles garantissent la rigueur et la traçabilité.

### 6.4 Numérotation et traçabilité

Chaque dossier reçoit un identifiant unique (par exemple `EVT-2026-014`), incrémenté automatiquement, qui sert de référence dans toute communication. Cet identifiant apparaît dans les notifications, les exports, et les journaux d'audit. Il facilite le suivi dans le temps, notamment lorsque plusieurs événements se succèdent (par exemple, un décès suivi d'un hommage un an plus tard).

---

## 7. Module 4.4 — Le moteur événementiel automatisé

### 7.1 Description

Le moteur événementiel est **le différenciateur clé de l'Univers 2**. C'est lui qui transforme l'application d'un simple calendrier en système de gouvernance événementielle. Concrètement, lorsqu'un événement est créé, le moteur déclenche automatiquement un workflow configurable, qui crée les étapes, assigne les rôles, ouvre les collectes, programme les rappels et génère les annonces. La famille ne bricole plus : elle exécute un protocole.

### 7.2 Principe du workflow

Un workflow est une séquence ordonnée d'étapes, liées à un type d'événement. Chaque étape possède :

- Un nom et une description.
- Un déclencheur (immédiat, à J+N, à la clôture d'une autre étape, etc.).
- Un responsable par défaut (organisateur, chef de branche, comité, etc.).
- Une action attendue (annonce, création de collecte, convocation, etc.).
- Un critère de complétion (annonce envoyée, collecte atteinte, etc.).

Le moteur exécute les étapes automatiquement, en notifiant les responsables, en surveillant les critères de complétion, et en passant à l'étape suivante une fois les critères remplis. Les retards sont signalés, et les responsables peuvent être relancés automatiquement.

### 7.3 Exemple détaillé — Workflow décès (M1)

Le workflow de décès est le plus structuré, car c'est le scénario où la famille a le plus besoin d'un protocole. Voici sa séquence type :

| Étape | Déclencheur | Responsable | Action | Critère de complétion |
|---|---|---|---|---|
| 1. Annonce | Création du dossier | Chef de branche | Validation de l'annonce | Annonce envoyée à tous les membres de la branche + conseil |
| 2. Comité d'organisation | J+1 (ou immédiat) | Chef de branche + patriarche | Désignation du comité (3 à 7 membres) | Comité formellement désigné |
| 3. Collecte de solidarité | J+1 | Trésorier | Ouverture d'une collecte ciblée | Collecte ouverte, cible définie |
| 4. Programme funéraire | J+2 à J+5 | Comité | Définition du programme (veillée, messe, inhumation, repas) | Programme validé par le patriarche |
| 5. Logistique | J+3 à J+7 | Comité | Coordination hébergement, transport, restauration | Tâches assignées et confirmées |
| 6. Déroulé | Jours de la cérémonie | Comité | Suivi en temps réel | Étapes effectuées |
| 7. Album et témoignages | J+1 à J+15 | Comité | Collecte photos, condoléances | Album publié |
| 8. Bilan et clôture | J+15 à J+30 | Trésorier + comité | Bilan financier, remerciements, archivage | Bilan transmis à la famille |

Ce workflow est configurable : certaines familles ajouteront une étape « levée de deuil » à un an, d'autres une étape « messe d'anniversaire de décès », d'autres une étape « recueil des témoignages des anciens ».

### 7.4 Exemple — Workflow mariage (H4)

| Étape | Déclencheur | Responsable | Action | Critère de complétion |
|---|---|---|---|---|
| 1. Annonce officielle | Création du dossier | Chef de branche | Validation de l'annonce | Annonce envoyée à toute la famille |
| 2. Comité de soutien | J+7 | Chef de branche | Désignation du comité | Comité désigné |
| 3. Budget et contributions | J+15 | Trésorier + mariés | Définition du budget familial | Budget validé |
| 4. Inscriptions | J+30 | Comité | Ouverture des inscriptions | Liste des présents |
| 5. Logistique | J+60 | Comité | Hébergement, transport | Tâches assignées |
| 6. Programme détaillé | J+15 avant | Comité | Programme final | Programme validé |
| 7. Déroulé | Jour J | Comité | Coordination | Étapes effectuées |
| 8. Album | J+1 à J+30 | Comité | Photos, témoignages | Album publié |
| 9. Remerciements | J+15 à J+30 | Mariés + comité | Cartes, messages | Remerciements envoyés |

### 7.5 Exemple — Workflow congrès familial (I4)

| Étape | Déclencheur | Responsable | Action | Critère de complétion |
|---|---|---|---|---|
| 1. Annonce préliminaire | 12 mois avant | Conseil familial | Date et lieu annoncés | Annonce envoyée |
| 2. Comité d'organisation | 10 mois avant | Chef de famille | Comité désigné | Comité en place |
| 3. Sondage lieu et thème | 9 mois avant | Comité | Consultation famille | Sondage clôturé |
| 4. Budget prévisionnel | 8 mois avant | Trésorier | Budget validé | Budget approuvé |
| 5. Inscriptions | 6 mois avant | Comité | Ouverture des inscriptions | Liste des inscrits |
| 6. Logistique | 4 mois avant | Comité | Hébergement, transport, repas | Logistique confirmée |
| 7. Ordre du jour | 2 mois avant | Conseil | Ordre du jour validé | ODJ publié |
| 8. Déroulé et votes | Jours du congrès | Conseil | Votes, motions | PV en cours |
| 9. Compte-rendu | J+30 | Secrétaire | PV finalisé | PV transmis |
| 10. Album et archives | J+45 | Comité | Photos, vidéos, documents | Archives complètes |

### 7.6 Configurabilité des workflows

Chaque famille peut configurer ses workflows selon ses traditions. La configuration est accessible aux administrateurs (patriarche, conseil), via une interface graphique permettant :

- D'ajouter, supprimer ou réordonner des étapes.
- De modifier les déclencheurs (J+N, événement déclencheur).
- De changer les responsables par défaut.
- De définir des critères de complétion personnalisés.

Cette configurabilité est essentielle. Une famille ne fonctionne pas comme une autre ; le système doit s'adapter, pas imposer.

---

## 8. Module 4.5 — Présences, inscriptions, logistique

### 8.1 Description

La gestion des présences et de la logistique est l'un des points de faiblesse les plus visibles de WhatsApp. Pour un congrès de 200 personnes, les inscriptions par WhatsApp sont chaotiques : messages qui se perdent, confirmations impossibles à compiler, doublons, oubliés. L'Univers 2 propose un module dédié qui transforme cette gestion en procédure fluide.

### 8.2 Inscriptions en ligne

Pour chaque événement institutionnel (congrès, assemblée, journée familiale) et pour les événements heureux ouverts (mariages, baptêmes), le système ouvre une inscription en ligne. Chaque membre reçoit une notification avec un lien personnel, et peut :

- Confirmer sa présence.
- Indiquer le nombre d'accompagnants (conjoints, enfants).
- Préciser ses contraintes (régime alimentaire, mobilité réduite).
- Demander un hébergement (selon l'événement).
- S'inscrire à des activités optionnelles.

La liste des inscrits est mise à jour en temps réel, et visible par les organisateurs. Les relances automatiques sont envoyées aux membres qui n'ont pas répondu, à J-30, J-15 et J-7.

### 8.3 Gestion des présences

Le jour de l'événement, le système fournit aux organisateurs un outil de pointage, sur tablette ou smartphone. Chaque membre est identifié par son identifiant familial, et sa présence est enregistrée en un tap. Les absents sont signalés automatiquement, et les excuses reçues à l'avance sont visibles.

### 8.4 Logistique

Le module logistique couvre quatre domaines :

- **Hébergement** — qui loge chez qui, dans quel village, avec quelles contraintes. Le système propose automatiquement des affectations en fonction de la capacité d'accueil déclarée par chaque membre hôte.
- **Transport** — coordonnées des véhicules, conducteurs, horaires de départ, points de rendez-vous. Car-partage organisé pour les longues distances.
- **Restauration** — nombre de repas à préparer par service, contraintes alimentaires, affectation des cuisines.
- **Tâches** — liste des tâches à effectuer (décoration, accueil, sécurité, photos, animation), avec assignation nominative et suivi de complétion.

### 8.5 Cas limite — événement hybride

Pour les congrès où une partie de la diaspora ne peut pas se déplacer, le module gère un format hybride : inscription en présentiel ou en visioconférence, avec lien de connexion envoyé aux inscrits à distance, et intégration des votes à distance (voir Univers 5 — Gouvernance).

---

## 9. Module 4.6 — Album, témoignages et mémoire d'événement

### 9.1 Description

Chaque événement mérite une mémoire. L'album d'événement est l'endroit où se déposent les photos, vidéos, témoignages et documents liés à un événement clôturé. Il alimente directement l'Univers 6 (Mémoire) et constitue la trace durable de la vie familiale.

### 9.2 Album photo collaboratif

L'album est collaboratif : tous les membres présents peuvent y contribuer en téléversant leurs photos. Le système détecte automatiquement les visages connus (à partir du registre de l'Univers 1) et propose des tags, ce qui permet de retrouver facilement toutes les photos d'un membre donné. Les photos sont organisées par moment de l'événement (arrivée, cérémonie, repas, etc.), défini par l'organisateur.

### 9.3 Témoignages et messages

Pour les événements heureux, l'album accueille les témoignages et félicitations. Pour les événements malheureux, il accueille les condoléances. Ces messages sont conservés durablement et accessibles aux descendants, ce qui crée une mémoire affective précieuse.

### 9.4 Bilan de clôture

À la clôture du dossier, un bilan est généré automatiquement et transmis à toute la famille. Il comprend :

- Un résumé de l'événement (type, dates, lieu, participants).
- Le bilan financier (collecte, dépenses, solde).
- Le lien vers l'album.
- Un mot de l'organisateur ou du patriarche.
- Les éventuelles motions ou décisions (pour les événements institutionnels).

Ce bilan est archivé dans l'Univers 6 et reste consultable.

### 9.5 Archivage

Une fois clôturé, le dossier bascule dans un statut d'archive. Il reste consultable (en lecture seule) par tous les membres autorisés, mais ne peut plus être modifié, sauf demande exceptionnelle au conseil familial. L'archive est conservée indéfiniment, dans le respect des règles de confidentialité (par exemple, masquage des éléments sensibles d'un dossier de maladie après un certain délai).

---

## 10. Module 4.7 — Notifications et ciblage

### 10.1 Description

La qualité des notifications est ce qui distingue une application utile d'une application oppressante. Trop de notifications tuent l'attention ; trop peu laissent les membres dans l'ignorance. L'Univers 2 propose un système de notifications ciblées, hiérarchisées et respectueuses des fuseaux horaires.

### 10.2 Ciblage automatique

Chaque notification est ciblée en fonction de la nature de l'événement :

- **Décès** — annonce immédiate à toute la famille, avec priorité absolue.
- **Maladie grave** — annonce restreinte à la branche concernée et au conseil.
- **Mariage, baptême** — annonce à toute la famille.
- **Réunion de branche** — annonce à la branche concernée uniquement.
- **Congrès, assemblée générale** — annonce à toute la famille, avec relances.
- **Anniversaire** — félicitations automatiques du système, sans annonce formelle.

Le ciblage s'appuie sur le registre de l'Univers 1 (branches, rôles, localisation) et garantit que chaque membre reçoit les informations qui le concernent, ni plus, ni moins.

### 10.3 Canaux de notification

Trois canaux sont utilisés, selon l'urgence et les préférences du membre :

- **Notification push** — pour les annonces standard, les rappels, les mises à jour.
- **SMS** — pour les annonces critiques (décès, maladie grave) et pour les membres sans smartphone.
- **Appel vocal automatique** — pour les patriarches et les aînés qui ne consultent pas l'application, sur les annonces critiques uniquement.

Le canal préféré est défini par le membre dans son profil (Univers 1). Les annonces critiques court-circuitent ce choix pour garantir l'information.

### 10.4 Respect des fuseaux horaires

Les notifications tiennent compte du fuseau horaire de chaque membre (fourni par l'Univers 1 via le module Diaspora). Un membre en diaspora ne reçoit pas de notification push à 3 heures du matin ; elle est différée à une heure raisonnable. Les annonces critiques (décès) font exception et sont délivrées immédiatement, quel que soit l'heure.

### 10.5 Anti-saturation

Le système anti-saturation limite le nombre de notifications par membre et par jour. Au-delà d'un seuil (par défaut 5 notifications par jour), les notifications non critiques sont regroupées en un digest quotidien. Ce mécanisme prévient la fatigue notificationnelle, qui est l'une des principales causes de désengagement.

---

## 11. Modèle de données conceptuel

Le modèle de données de l'Univers 2 s'articule autour de sept entités principales.

| Entité | Description | Attributs clés |
|---|---|---|
| Événement | L'unité atomique, correspondant à un dossier | Identifiant, type, statut, dates, lieu, branche(s), organisateur |
| Étape | Une étape d'un workflow lié à un événement | Événement, ordre, nom, déclencheur, responsable, statut |
| Participant | Un membre lié à un événement | Membre, événement, statut (invité, confirmé, présent, absent, excusé) |
| Contribution | Une contribution financière liée à un événement | Membre, événement, montant, date, statut (lien Univers 4) |
| Document | Un fichier lié à un événement (photo, vidéo, PDF) | Événement, type, auteur, date, URL de stockage |
| Message | Un témoignage, condoléance ou félicitation | Événement, auteur, contenu, date |
| Audit | Journal d'une action sur le dossier | Événement, auteur, action, date, justification |

### Relations principales

- Un **Événement** possède plusieurs **Étapes**, plusieurs **Participants**, plusieurs **Contributions**, plusieurs **Documents** et plusieurs **Messages**.
- Un **Participant** est un **Membre** (lien Univers 1) engagé dans un **Événement**.
- Une **Contribution** est rattachée à un **Événement** et trace la **Caisse** (lien Univers 4).
- Une **Étape** peut dépendre d'autres **Étapes** (déclencheur conditionnel).
- Un **Événement** peut être lié à un autre **Événement** (par exemple, levée de deuil liée au décès initial).

### Règles d'intégrité

- Un événement ne peut exister sans type défini dans le catalogue.
- Un événement ne peut être clôturé sans bilan transmis.
- Une étape ne peut être marquée comme complétée sans validation de son critère de complétion.
- Un participant ne peut être à la fois « présent » et « absent » pour le même événement.
- Toute suppression d'événement est interdite ; les dossiers sont archivés, jamais effacés.

---

## 12. Règles de gestion essentielles

Les règles ci-dessous s'imposent à tous les modules de l'Univers 2. Elles sont configurables par chaque famille.

| # | Règle | Justification |
|---|---|---|
| R1 | Tout événement est créé par un membre autorisé et validé par le chef de branche concerné avant annonce. | Garantit la légitimité de l'annonce. |
| R2 | L'annonce d'un décès est soumise à double validation (chef de branche + patriarche ou conseil). | Prévient les fausses annonces, particulièrement destructrices. |
| R3 | Le délai entre la création d'un dossier et son annonce ne peut excéder 24 heures pour un décès. | Respecte l'urgence de l'information. |
| R4 | Aucun événement ne peut être clôturé sans bilan financier (si collecte) et bilan narratif. | Garantit la transparence et la traçabilité. |
| R5 | Tout dossier clôturé est archivé en lecture seule dans l'Univers 6, sans délai. | Préserve la mémoire familiale. |
| R6 | Les annonces de maladie grave sont restreintes à la branche et au conseil, sauf demande explicite du membre concerné. | Protège la vie privée sur un sujet sensible. |
| R7 | Le ciblage des notifications est automatique et ne peut être contourné par l'organisateur. | Évite l'envoi massif d'annonces non ciblées. |
| R8 | Les notifications critiques (décès) court-circuitent les préférences de canal. | Garantit l'information en cas d'urgence. |
| R9 | Le journal d'audit est consultable par le conseil familial, jamais modifiable. | Garantit la traçabilité. |
| R10 | Aucune photo ou témoignage n'est publié dans un album sans accord du membre y figurant. | Respecte le droit à l'image et la vie privée. |
| R11 | Un événement annulé reste archivé avec son statut, pour la mémoire. | Préserve la cohérence historique. |
| R12 | Les workflows sont configurables par le conseil familial, avec journalisation des modifications. | Permet l'adaptation aux traditions de chaque famille. |

---

## 13. Cas limites et situations sensibles

### 13.1 Décès simultanés

Si deux décès surviennent à quelques jours d'intervalle dans la même famille, le système gère les deux dossiers en parallèle, avec des comités distincts si possible. Le patriarche peut décider de coordonner les annonces si les circonstances le justifient (par exemple, un hommage commun). Les collectes restent séparées pour la clarté comptable.

### 13.2 Événement annulé

L'annulation d'un événement (mariage reporté, congrès suspendu pour cause de crise) est gérée par un statut spécifique « annulé ». Les contributions déjà versées sont remboursées ou transférées sur la caisse familiale, selon la décision du conseil. Le dossier reste archivé avec mention de l'annulation, du motif et de la décision.

### 13.3 Conflit de dates

Deux événements importants peuvent se retrouver le même jour (un mariage prévu depuis un an et un décès soudain). Le système signale le conflit et propose des options : reporter l'événement heureux, scinder les présences, organiser un hommage commun. La décision revient au patriarche ou au conseil.

### 13.4 Événement hybride (présentiel + diaspora)

Pour les congrès où une partie de la diaspora ne peut pas se déplacer, l'événement est organisé en mode hybride : présentiel pour ceux qui peuvent venir, visioconférence pour les autres. Les votes (voir Univers 5) sont ouverts aux deux populations, avec des règles de quorum adaptées.

### 13.5 Deuil qui éclipse un mariage

Si un décès survient peu avant un mariage prévu dans la même famille, la tradition peut exiger un report ou un ajustement du mariage (par exemple, cérémonie plus sobre). Le système signale la situation au patriarche, qui décide. Les deux dossiers restent distincts, mais le système propose un suivi coordonné.

### 13.6 Événement sensible (maladie, conflit)

Certains événements sont sensibles par nature : maladie mentale, addiction, conflit familial grave, problème judiciaire. Leur annonce est restreinte au strict nécessaire (comité médiation, patriarche), et le dossier est marqué « confidentiel ». Les membres non autorisés ne voient même pas l'existence du dossier.

### 13.7 Événement non reconnu par la tradition

Certaines situations (divorce, séparation, conversion religieuse) peuvent ne pas être reconnues comme des événements familiaux par la tradition. Le système permet de les enregistrer avec un statut « privé », visible uniquement par le membre concerné et le conseil, sans annonce à la famille.

### 13.8 Cérémonie traditionnelle secrète

Certaines cérémonies traditionnelles (initiations, rituels réservés aux aînés) ne doivent pas être annoncées à toute la famille. Le système prévoit un statut « traditionnel restreint », avec un périmètre d'annonce défini par le patriarche.

---

## 14. Wireframes textuels des écrans clés

Cette section décrit en pseudo-maquettes les cinq écrans les plus importants de l'Univers 2.

### 14.1 Calendrier mensuel

```
┌────────────────────────────────────────────────────────────┐
│  ← Septembre 2026 →                    [+ Événement]      │
│  [Mois] [Semaine] [Année]              Filtres ▾          │
├────────────────────────────────────────────────────────────┤
│  L    M    M    J    V    S    D                          │
│  ─    ─    1    2    3    4    5                          │
│                            💍   ⚱️                         │
│  6    7    8    9   10   11   12                          │
│  🎂  🏛️                              🎓                   │
│ 13   14   15   16   17   18   19                          │
│                                💍                          │
│ 20   21   22   23   24   25   26                          │
│ 🏛️                                          🎂            │
│ 27   28   29   30                                         │
│                                                           │
│  Légende : 💍 Mariage · ⚱️ Funérailles · 🎂 Anniversaire  │
│            🎓 Réussite · 🏛️ Institutionnel               │
└────────────────────────────────────────────────────────────┘
[Calendrier] [Événements] [+ Nouveau] [Albums]
```

### 14.2 Dossier décès

```
┌────────────────────────────────────────────────────────────┐
│  EVT-2026-014  ⚱️ DÉCÈS                                   │
│  Maman Rosine NDONGO — Branche Nord                       │
├────────────────────────────────────────────────────────────┤
│  Statut : EN COURS — Workflow étape 4/8                   │
│                                                            │
│  ─── MÉTADONNÉES ─────────────────────                     │
│  Décès : 25 septembre 2026 — Yaoundé                       │
│  Inhumation : 8 octobre 2026 — Village Bafoussam          │
│  Branche concernée : Nord (principale)                    │
│                                                            │
│  ─── COMITÉ ────────────────────────────                   │
│  Président : Papa Jean NDONGO                              │
│  Membres : 5 (Bernard, Hélène, Joseph, Lucie, Paul)       │
│                                                            │
│  ─── COLLECTE ──────────────────────────                   │
│  Cible : 4 000 000 FCFA                                   │
│  Collecté : 3 200 000 FCFA (80%)                          │
│  Contributeurs : 87 / 124                                  │
│  [Voir le détail]                                          │
│                                                            │
│  ─── WORKFLOW ───────────────────────────                  │
│  ✓ 1. Annonce (J0)                                         │
│  ✓ 2. Comité (J+1)                                         │
│  ✓ 3. Collecte (J+1)                                       │
│  ✓ 4. Programme funéraire (J+5)                            │
│  ⏳ 5. Logistique (en cours)                               │
│  ○ 6. Déroulé                                              │
│  ○ 7. Album et témoignages                                 │
│  ○ 8. Bilan et clôture                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.3 Dossier mariage

```
┌────────────────────────────────────────────────────────────┐
│  EVT-2026-008  💍 MARIAGE                                  │
│  Marie NDONGO × Paul BIYA — 12 octobre 2026               │
├────────────────────────────────────────────────────────────┤
│  Statut : EN COURS — Workflow étape 6/9                   │
│                                                            │
│  ─── PROGRAMME ────────────────────────                    │
│  • 14h00 — Cérémonie religieuse, Cathédrale Yaoundé       │
│  • 17h00 — Vin d'honneur, Palais des Congrès              │
│  • 19h30 — Dîner, Palais des Congrès                      │
│  • 22h00 — Soirée dansante                                │
│                                                            │
│  ─── INSCRIPTIONS ─────────────────────                    │
│  Invités : 247   Confirmés : 198 (80%)                    │
│  [Voir la liste]                                           │
│                                                            │
│  ─── BUDGET FAMILIAL ──────────────────                    │
│  Prévu : 6 000 000 FCFA                                   │
│  Collecté : 5 200 000 FCFA                                │
│  Dépensé : 4 800 000 FCFA                                 │
│                                                            │
│  ─── LOGISTIQUE ───────────────────────                    │
│  Hébergement : 32 membres diaspora à loger                │
│  Transport : 3 bus depuis Douala, 1 depuis Bafoussam      │
│  Tâches : 18 assignées / 18 confirmées                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.4 Dossier congrès

```
┌────────────────────────────────────────────────────────────┐
│  EVT-2026-003  🏛️ CONGRÈS FAMILIAL                        │
│  Congrès NDONGO 2026 — Village Bafoussam                  │
├────────────────────────────────────────────────────────────┤
│  Statut : EN PRÉPARATION — Workflow étape 6/10            │
│  Dates : 26-28 décembre 2026                               │
│  Thème : « Transmettre notre mémoire »                    │
│                                                            │
│  ─── INSCRIPTIONS ─────────────────────                    │
│  Présentiel : 167 inscrits (cible 200)                    │
│  Visio (diaspora) : 41 inscrits                           │
│  Total : 208 / 247                                         │
│                                                            │
│  ─── ORDRE DU JOUR ────────────────────                    │
│  J1 (26/12) — Accueil, cérémonie d'ouverture, repas       │
│  J2 (27/12) — Rapports, ateliers, votes                   │
│  J3 (28/12) — Décisions, clôture, messe                   │
│                                                            │
│  ─── LOGISTIQUE ───────────────────────                    │
│  Hébergement : 167 lits répartis chez 28 membres          │
│  Restauration : 6 repas × 200 personnes                   │
│  Transport : 7 bus depuis Yaoundé, Douala, Bafoussam      │
│                                                            │
│  ─── VOTES EN COURS ───────────────────                    │
│  • Lieu du congrès 2027 — 134 / 286 (clôture J3)          │
│  • Cotisation annuelle 2027 — 156 / 286                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.5 Vue workflow en cours

```
┌────────────────────────────────────────────────────────────┐
│  Événements en cours — Workflow                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ⚱️  EVT-2026-014  Décès Maman Rosine                     │
│      Étape 5/8 — Logistique                                │
│      Comité : 5 — Collecte : 80%                           │
│      [Ouvrir le dossier]                                   │
│                                                            │
│  💍  EVT-2026-008  Mariage Marie × Paul                   │
│      Étape 6/9 — Logistique                                │
│      Inscriptions : 198/247 — Budget : 87%                │
│      [Ouvrir le dossier]                                   │
│                                                            │
│  🏛️  EVT-2026-003  Congrès NDONGO 2026                   │
│      Étape 6/10 — Inscriptions                             │
│      Inscrits : 208/247                                    │
│      [Ouvrir le dossier]                                   │
│                                                            │
│  🎂  EVT-2026-013  Anniversaire Papa Jean (85 ans)        │
│      Étape 2/4 — Félicitations                             │
│      47 messages reçus                                     │
│      [Ouvrir le dossier]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Roadmap MVP et séquençage

L'Univers 2 est séquencé en trois phases pour permettre une adoption progressive.

### 15.1 Phase 1 — MVP (mois 3 à 7)

| Périmètre | Détail |
|---|---|
| Catalogue des types | 8 types essentiels (décès, mariage, naissance, anniversaire, congrès, AG, réunion mensuelle, funérailles) |
| Calendrier | Vue mensuelle, filtres de base, rappels automatiques |
| Dossier d'événement | Métadonnées, responsables, programme, communication |
| Annonces ciblées | Notifications push + SMS pour les annonces critiques |
| Album minimal | Photos uniquement, sans tag automatique |
| Workflow statique | Un seul workflow figé : décès, le plus critique |

**Critères de sortie** : 80 % des événements familiaux saisis dans l'app, délai d'annonce de décès ≤ 30 minutes.

### 15.2 Phase 2 — Enrichissement (mois 8 à 12)

| Périmètre | Détail |
|---|---|
| Catalogue complet | 23 types d'événements |
| Workflows configurables | Éditeur graphique pour le conseil |
| Inscriptions en ligne | Pour congrès, AG, mariages |
| Logistique | Hébergement, transport, restauration, tâches |
| Album avancé | Tags automatiques, témoignages, bilan de clôture |
| Notifications intelligentes | Anti-saturation, respect fuseaux |
| Synchronisation calendriers externes | Google, Apple, Outlook |

**Critères de sortie** : 90 % des événements saisis, satisfaction organisateurs ≥ 4/5, taux de présence aux congrès ≥ 90 %.

### 15.3 Phase 3 — Maturité (mois 13 à 18)

| Périmètre | Détail |
|---|---|
| IA planning | Suggestions de dates, anticipation des conflits |
| Mode hybride | Présentiel + visioconférence pour congrès |
| Multi-famille | Événements conjoints avec familles alliées |
| Archive intelligente | Recherche full-text dans les archives |
| Notifications vocales | Appels automatiques pour patriarches |
| Récapitulatif annuel | Bilan familial envoyé en fin d'année |

**Critères de sortie** : 50 % des membres consultant le calendrier hebdomadairement, 70 % des événements avec album.

---

## 16. Risques et points d'attention

### 16.1 Fausses annonces de décès

Le risque le plus grave est la diffusion d'une fausse annonce de décès, qui peut causer des dommages considérables. La mitigation repose sur la double validation (chef de branche + patriarche ou conseil) obligatoire pour tout décès, et sur un délai court mais incompressible entre la saisie et l'annonce. En cas de fausse annonce avérée, un système de rétractation immédiate est prévu, avec message clarificateur à toute la famille.

### 16.2 Surcharge de notifications

Si le système notifie chaque événement à toute la famille, les membres se désengagent rapidement. La mitigation repose sur le ciblage automatique (seuls les concernés sont notifiés), l'anti-saturation (digest quotidien au-delà d'un seuil), et le respect strict des préférences de canal.

### 16.3 Conflits d'organisation

L'organisation d'un événement peut être contestée (par exemple, deux membres revendiquant la présidence du comité). La mitigation repose sur la désignation formelle par le chef de branche ou le patriarche, avec traçabilité dans le journal d'audit. Les contestations sont traitées par le conseil familial.

### 16.4 Confidentialité des événements sensibles

Les dossiers de maladie, de conflit ou de problème judiciaire sont particulièrement sensibles. La mitigation repose sur un statut « confidentiel » qui masque l'existence même du dossier aux membres non autorisés, et sur la restriction d'annonce à un cercle défini par le patriarche. Le journal des consultations est consultable par le membre concerné.

### 16.5 Photos et droit à l'image

La publication de photos dans les albums pose la question du droit à l'image. La mitigation repose sur la demande d'accord explicite avant publication d'une photo où un membre est clairement identifiable, et sur la possibilité pour chaque membre de demander le retrait d'une photo le concernant.

### 16.6 Dépendance à l'Univers 1

L'Univers 2 dépend entièrement de l'Univers 1 pour le registre des membres, les branches et les rôles. Si l'Univers 1 est incomplet ou erroné, l'Univers 2 hérite de ces défauts (annonces mal ciblées, doublons, omissions). La mitigation repose sur la séquence : ne pas déployer l'Univers 2 tant que l'Univers 1 n'a pas atteint ses propres critères de sortie.

### 16.7 Surcharge des organisateurs

Les membres qui acceptent d'organiser des événements peuvent se retrouver surchargés, surtout dans les familles où ce sont toujours les mêmes qui s'investissent. La mitigation repose sur la rotation des comités (proposition automatique de nouveaux membres), la reconnaissance (mention publique, statut d'organisateur dans le profil), et la délégation assistée par le système.

---

## 17. Indicateurs de succès

| Indicateur | Définition | Cible | Fréquence |
|---|---|---|---|
| Couverture du calendrier | Événements saisis dans les 7 jours | ≥ 85 % | Mensuel |
| Délai d'annonce de décès | Délai moyen décès → annonce | ≤ 30 min | Par événement |
| Taux de présence aux congrès | Inscrits vs présents | ≥ 90 % | Par congrès |
| Délai de clôture des dossiers | Fin d'événement → clôture | ≤ 14 jours | Mensuel |
| Adoption du calendrier | Membres consultant par semaine | ≥ 50 % | Hebdo |
| Taux d'événements avec album | Dossiers clôturés avec album | ≥ 70 % | Trimestriel |
| Satisfaction organisateurs | Note moyenne des organisateurs | ≥ 4/5 | Trimestriel |
| Doublons d'annonce | Événements annoncés deux fois | ≤ 2/an | Annuel |
| Taux de participation aux votes | Membres votant aux sondages | ≥ 60 % | Par vote |
| Notifications par membre/jour | Nombre moyen de notifications | ≤ 3 | Hebdo |

---

## 18. Conclusion

L'Univers 2 transforme le chaos événementiel en protocole maîtrisé. Là où WhatsApp noie l'information dans des dizaines de groupes et où les cahiers se perdent, l'application propose un calendrier unique, des dossiers structurés, des workflows automatisés et une mémoire durable. Elle ne supprime pas l'humain : elle le libère des tâches répétitives et source d'erreurs, pour qu'il se concentre sur l'essentiel — la présence, la solidarité, la transmission.

Le moteur événementiel automatisé est le cœur de cette transformation. En déclenchant automatiquement les étapes d'un protocole éprouvé, il garantit que rien n'est oublié : ni l'annonce d'un décès, ni la collecte de solidarité, ni le remerciement aux contributeurs, ni l'archivage de l'album. Il transforme une famille réactive en une famille institutionnelle, capable de répondre à toute situation avec sérénité et rigueur.

L'Univers 2 ne se substitue pas à l'émotion : il la protège. En prenant en charge la logistique, il laisse aux membres la disponibilité pour pleurer, célébrer, témoigner, transmettre. C'est sa véritable valeur, au-delà de l'efficacité opérationnelle.

Les prochaines étapes recommandées sont les suivantes :

1. **Validation de cette spécification** par le comité de pilotage et par au moins deux familles pilotes, avec un accent particulier sur la configurabilité des workflows.
2. **Production des maquettes interactives** des cinq écrans clés (calendrier, dossier décès, dossier mariage, dossier congrès, vue workflow).
3. **Définition du modèle de données physique** et des interfaces avec l'Univers 1 (membres, branches, rôles) et l'Univers 4 (caisse, contributions).
4. **Construction du MVP Phase 1** avec un périmètre strictement limité au catalogue essentiel, au calendrier, au dossier simple et au workflow décès.
5. **Onboarding de la première famille pilote** dans un délai de six mois après le démarrage du développement.

L'Univers 2, s'il est bien conçu et bien livré, deviendra le théâtre numérique de la vie familiale : un lieu où chaque événement trouve sa place, chaque membre son rôle, et chaque mémoire son archive.
