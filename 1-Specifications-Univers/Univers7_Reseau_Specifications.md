# Univers 7 — Le Réseau

**Compétences, entraide et opportunités au sein de la famille**

| Document | Spécifications fonctionnelles — Univers 7 |
|---|---|
| Version | 1.0 |
| Date | Septembre 2026 |
| Statut | Pour validation |
| Audience | Chefs de famille, comité jeunesse, comité diaspora, comité de pilotage, équipe produit, équipe développement |
| Prérequis | Spécifications Univers 1 à 6 |

---

## Synthèse exécutive

L'Univers 7, intitulé **« Le Réseau »**, est le septième et dernier univers de l'application. Il transforme la famille en un réseau d'opportunités professionnelles et personnelles : un lieu où chaque membre peut trouver une compétence, une aide, un mentor, une opportunité d'affaires, ou un relais dans la diaspora. Trop souvent, les grandes familles africaines ignorent les ressources qu'elles portent en elles : tel cousin expert-comptable qui aurait pu conseiller un jeune entrepreneur, tel oncle médecin qui aurait pu orienter une étudiante vers une spécialisation, tel membre diaspora qui aurait pu accueillir un nouveau arrivant à Bruxelles ou à Montréal. Ces opportunités se perdent faute d'un répertoire structuré et d'une culture de la mise en relation.

La proposition centrale de l'Univers 7 est de remplacer les opportunités implicites et fortuites d'aujourd'hui par un **réseau explicite, structuré et respectueux**. Chaque membre peut publier un profil de compétences, proposer des services d'entraide, s'engager comme mentor, partager des opportunités professionnelles, ou se déclarer relais diaspora. Le système facilite les mises en relation, tout en préservant la confidentialité, le consentement, et la protection contre l'exploitation. La famille devient un réseau, sans devenir un marché : l'entraide y reste un devoir familial, pas une transaction commerciale.

Le présent document définit le rôle, les objectifs, l'architecture en sept modules, le modèle de données, les règles de gestion, les cas limites et la roadmap de l'Univers 7. Il s'appuie sur l'Univers 1 (membres, branches, diaspora) pour identifier les ressources, sur l'Univers 6 (mémoire) pour les biographies et parcours, et complète les six autres univers en apportant la dimension économique et professionnelle de la vie familiale. L'Univers 7 est conçu pour transformer la famille en ressource durable, sans dénaturer les relations de parenté qui en font la valeur.

---

## 1. Rôle et finalité de l'Univers 7

### 1.1 Rôle stratégique

L'Univers 7 joue quatre rôles stratégiques imbriqués qui en font le septième pilier de l'application.

**Premièrement, il est le répertoire des ressources familiales.** Une grande famille camerounaise de 200 à 300 membres compte nécessairement une diversité remarquable de compétences : médecins, avocats, ingénieurs, enseignants, entrepreneurs, artisans, commerçants, agriculteurs, artistes. Elle compte aussi une diaspora répartie dans plusieurs pays, des réseaux professionnels variés, des expériences de vie riches. Sans répertoire structuré, ces ressources restent invisibles : un membre ne sait pas qu'un cousin est expert dans un domaine qui l'intéresse, et il cherche ailleurs ce qu'il aurait pu trouver dans sa propre famille. L'Univers 7 rend ces ressources visibles, searchables, et accessibles, dans le respect du consentement de chacun.

**Deuxièmement, il est l'infrastructure de l'entraide.** L'entraide est une valeur centrale des grandes familles africaines. Aujourd'hui, elle se pratique de manière implicite : on appelle untel pour un hébergement, on demande conseil à tel oncle, on sollicite tel cousin pour un transport. Cette pratique fonctionne à petite échelle, mais elle atteint ses limites avec la dispersion géographique et la taille des familles. L'Univers 7 structure l'entraide : chaque membre peut proposer des services (hébergement temporaire, transport, conseil, garde d'enfants, soutien administratif), et chaque membre peut solliciter ces services. Le système gère les demandes, les mises en relation, et la prévention de l'épuisement des membres les plus sollicités.

**Troisièmement, il est le cadre du mentorat intergénérationnel.** La transmission des savoirs et des expériences des anciens vers les jeunes est une fonction essentielle de la famille. Sans cadre, elle se fait au hasard des rencontres et des affinités, et beaucoup de jeunes n'en bénéficient pas. L'Univers 7 propose un système de mentorat formel : les membres expérimentés s'engagent comme mentors, les jeunes membres demandent un mentorat, le système facilite les appariements et suit la relation. Cette transmission structurée est l'un des facteurs clés de la réussite des jeunes générations.

**Quatrièmement, il est la porte d'entrée du réseau diaspora.** La diaspora est une richesse pour la famille, mais elle est aussi une source de vulnérabilité pour les membres qui s'expatrient. Un jeune qui arrive à Paris pour ses études a besoin d'être accueilli, orienté, conseillé. Un membre qui perd son emploi à Bruxelles a besoin de soutiens et de relais. L'Univers 7 structure le réseau diaspora : relais par pays, accueil des nouveaux arrivants, informations pratiques, entraide administrative. Ce réseau est la continuation naturelle de la solidarité familiale, adaptée aux réalités de l'expatriation.

### 1.2 Finalité opérationnelle

Sur le plan opérationnel, l'Univers 7 poursuit une finalité claire : **qu'à tout moment, tout membre autorisé puisse répondre à cinq questions fondamentales** :

1. Quelles sont les compétences disponibles dans ma famille, et comment contacter un membre expert dans un domaine précis ?
2. Comment proposer mon aide ou solliciter l'aide d'un autre membre (hébergement, conseil, service) ?
3. Comment trouver un mentor pour m'accompagner, ou comment devenir mentor ?
4. Quelles opportunités professionnelles (emploi, stage, projet) sont partagées dans la famille ?
5. Si je m'installe à l'étranger, qui sont les relais diaspora, et comment les contacter ?

Si ces cinq questions trouvent une réponse immédiate et fiable, l'Univers 7 remplit sa mission. La famille cesse d'être une somme d'individus isolés pour devenir un réseau d'opportunités partagées.

### 1.3 Quatre dimensions du réseau

L'Univers 7 distinguera systématiquement quatre dimensions du réseau, qui appellent des réponses différentes :

- **La dimension compétences** — métiers, expertises, savoir-faire. Elle est portée par le module Répertoire des compétences.
- **La dimension entraide** — services, conseils, soutien pratique. Elle est portée par le module Entraide et services.
- **La dimension transmission** — mentorat, accompagnement, parcours. Elle est portée par le module Mentorat intergénérationnel.
- **La dimension opportunités** — emploi, affaires, projets, diaspora. Elle est portée par le module Opportunités professionnelles et le module Réseau diaspora.

Cette distinction structure tout l'Univers 7 : chaque dimension a ses propres règles, ses propres risques, et sa propre éthique. Les confondre conduirait à traiter un mentorat comme une transaction commerciale, ou une opportunité d'affaires comme un service d'entraide gratuit, ce qui dénaturerait les relations familiales.

---

## 2. Objectifs mesurables

L'Univers 7 doit être évalué sur des indicateurs concrets. Les objectifs ci-dessous sont proposés pour la première année d'exploitation, sur une famille pilote de 150 à 300 membres.

| Objectif | Indicateur | Cible année 1 |
|---|---|---|
| Taux de profil compétences | Pourcentage de membres adultes avec profil de compétences publié | ≥ 60 % |
| Mises en relation | Nombre de mises en relation par mois | ≥ 10 |
| Mentorats actifs | Nombre de binômes mentor-mentoré actifs | ≥ 15 |
| Opportunités partagées | Nombre d'opportunités (emploi, stage, projet) partagées par an | ≥ 30 |
| Satisfaction entraide | Note moyenne des membres ayant sollicité ou proposé une entraide | ≥ 4/5 |
| Satisfaction mentorat | Note moyenne des mentorés et mentors | ≥ 4/5 |
| Relais diaspora | Nombre de relais diaspora déclarés par pays | ≥ 1 par pays |
| Nouveaux arrivants accueillis | Pourcentage de membres diaspora accueillis dans les 30 jours | ≥ 80 % |
| Taux de résolution | Pourcentage de demandes d'aide aboutissant à une solution | ≥ 70 % |
| Prévention des abus | Nombre de signalements pour exploitation ou harcèlement | ≤ 2/an |

Ces cibles sont indicatives ; elles devront être ajustées avec les familles pilotes. Elles traduisent l'ambition : un réseau actif, utile, respectueux, et protecteur de ses membres.

---

## 3. Architecture fonctionnelle

L'Univers 7 est composé de **sept modules fonctionnels** qui s'articulent autour d'un cœur commun : la mise en relation. Le répertoire, l'entraide, le mentorat, les opportunités, la diaspora, les recommandations et la messagerie sont autant de dimensions complémentaires du réseau familial.

### Vue d'ensemble des modules

```
┌─────────────────────────────────────────────────────────────┐
│              UNIVERS 7 — LE RÉSEAU                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CŒUR : La mise en relation (consentement + respect)    │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐  │
│   ▼          ▼          ▼          ▼          ▼          ▼  │
│  Répertoire Entraide   Mentorat  Opportu-   Réseau    Recom- │
│  des        & services  inter-   nités      diaspora  man-  │
│  compétences           généra-  profession-           dations│
│                        tionnel  nelles & affaires            │
│                       ┌────────────────┐                     │
│                       │ Messagerie &   │                     │
│                       │ mises en       │                     │
│                       │ relation       │                     │
│                       └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

L'organisation de l'application reflète cette architecture : un tableau de bord du réseau affiche les compétences disponibles, les opportunités du moment, les mentorats en cours, et les relais diaspora. Les membres publient, consultent, et se mettent en relation.

### Navigation principale

La navigation de l'Univers 7 s'organise autour de cinq entrées principales :

1. **Compétences** — répertoire des compétences, recherche par domaine.
2. **Entraide** — propositions et demandes de services.
3. **Mentorat** — mentors disponibles, mentorats en cours.
4. **Opportunités** — offres d'emploi, stages, projets, affaires.
5. **Diaspora** — relais par pays, informations pratiques.

Une entrée **Messagerie** accessible depuis tous les écrans permet d'initier et de suivre les conversations avec les autres membres.

---

## 4. Module 4.1 — Le répertoire des compétences

### 4.1.1 Description

Le répertoire des compétences est la fondation de l'Univers 7. Il répertorie les métiers, expertises, et savoir-faire des membres, dans une structure searchable et accessible. Sans ce répertoire, les autres modules (entraide, mentorat, opportunités) ne peuvent pas fonctionner, car ils dépendent tous de la capacité à identifier la bonne personne pour un besoin donné.

### 4.1.2 Catégories de compétences

Les compétences sont organisées en catégories, configurables par la famille :

| Catégorie | Sous-catégories typiques |
|---|---|
| Santé | Médecine, pharmacie, infirmerie, soins infirmiers, psychologie |
| Droit | Avocat, notaire, juriste d'entreprise, magistrat |
| Finance | Expert-comptable, banquier, assureur, contrôleur de gestion |
| Ingénierie | Génie civil, informatique, électronique, mécanique, agriculture |
| Éducation | Enseignant, professeur universitaire, formateur, chercheur |
| Commerce | Commerçant, distributeur, import-export, marketing |
| Artisanat | Menuiserie, maçonnerie, couture, cuisine, poterie |
| Administration | Fonction publique, gestion RH, secrétariat, logistique |
| Communication | Journalisme, relations publiques, design, audiovisuel |
| Social | Travail social, accompagnement, médiation |
| Art | Musique, danse, théâtre, arts plastiques |
| Agriculture | Cultures, élevage, agroforesterie, transformation |

### 4.1.3 Profil de compétences

Chaque membre peut publier un profil de compétences, structuré en :

- **Métier principal** — la profession actuelle ou la plus représentative.
- **Expertises** — les domaines de spécialisation (par exemple, « droit des affaires », « cardiologie », « développeur React »).
- **Expérience** — années d'expérience, parcours marquants.
- **Formation** — diplômes, certifications, formations continues.
- **Disponibilités** — type d'aide envisageable (conseil ponctuel, mentorat, mission rémunérée).
- **Visibilité** — public familial, restreint (réseau de confiance), ou privé.

Le profil est validé par le membre lui-même, qui choisit ce qu'il publie. La validation par le chef de branche n'est pas requise, mais une mention « profil vérifié » est apposée si le chef de branche confirme l'expertise.

### 4.1.4 Recherche de compétences

Le système propose une recherche avancée :

- **Par mot-clé** — saisie libre, avec autocomplétion.
- **Par catégorie** — navigation dans l'arbre des catégories.
- **Par branche** — compétences disponibles dans une branche donnée.
- **Par localisation** — compétences disponibles dans une ville ou un pays.
- **Par disponibilité** — membres disponibles pour un conseil, une mission, un mentorat.

Les résultats sont triés par pertinence, avec mise en avant des membres « profil vérifié » et des membres les plus actifs dans le réseau.

### 4.1.5 Demande d'aide

Un membre peut formuler une demande d'aide, qui est diffusée aux membres ayant les compétences correspondantes :

- **Description du besoin** — claire et précise.
- **Domaine de compétence** — catégorie et sous-catégorie.
- **Urgence** — immédiate, à court terme, à moyen terme.
- **Modalité** — conseil ponctuel, accompagnement, mission.
- **Rémunération** — bénévole, frais remboursés, ou rémunérée.

Les membres sollicités peuvent accepter, refuser, ou demander des précisions. Le système gère les réponses et facilite la mise en relation.

### 4.1.6 Cas limite — fausse expertise

Un membre peut déclarer une expertise qu'il n'a pas réellement, par désir de reconnaissance ou par méconnaissance de ses limites. Le système prévoit :

- La mention « profil vérifié » par le chef de branche, qui distingue les profils confirmés.
- Le système de recommandations (module 4.6), qui permet aux membres ayant bénéficié d'une expertise de la confirmer.
- Un signalement possible en cas de fausse déclaration, examiné par le comité médiation.
- En cas de fausse expertise avérée, retrait du profil et mention au membre concerné.

Cette procédure prévient les déclarations abusives sans décourager la publication des profils.

---

## 5. Module 4.2 — Entraide et services

### 5.1 Description

L'entraide est la dimension la plus quotidienne du réseau familial. Elle couvre tous les services non professionnels qu'un membre peut rendre à un autre : hébergement temporaire, transport, conseil pratique, garde d'enfants, soutien administratif, accompagnement à une démarche. L'Univers 7 structure cette entraide pour la rendre plus efficace et plus équitable.

### 5.2 Types de services

| Type | Description | Exemples |
|---|---|---|
| Hébergement | Mise à disposition d'un logement pour une durée limitée | Nuitée à Yaoundé pour un membre de passage, séjour d'un mois pour un membre diaspora en vacances |
| Transport | Accompagnement, prêt de véhicule, course | Trajet aéroport, déplacement pour un événement familial |
| Conseil pratique | Aide sur une démarche ou un sujet précis | Constitution de dossier, choix d'école, démarche administrative |
| Soutien administratif | Assistance pour des formalités | Remise de documents, traduction, légalisation |
| Garde d'enfants | Accueil ponctuel d'enfants | Garde pendant un événement familial, accueil pendant les vacances |
| Accompagnement | Présence physique à un événement ou une démarche | Accompagnement médical, présence à un rendez-vous |
| Logistique | Aide matérielle pour un événement ou un déménagement | Prêt de matériel, transport de meubles |
| Soutien émotionnel | Écoute et présence en période difficile | Accompagnement de deuil, soutien en période de stress |

### 5.3 Propositions d'entraide

Chaque membre peut publier des propositions d'entraide, qui décrivent :

- Le type de service proposé.
- Les conditions (durée, fréquence, limites).
- La zone géographique.
- La disponibilité (calendrier).
- Les éventuelles restrictions (par exemple, « pas d'enfants en bas âge »).

Les propositions sont consultables par tous les membres, mais la mise en relation se fait sur consentement du proposant.

### 5.4 Demandes d'entraide

Un membre peut formuler une demande d'entraide, qui est :

- Diffusée aux membres susceptibles de répondre (par localisation, par type de service).
- Visible dans le tableau de bord du réseau.
- Suivie jusqu'à résolution (demande satisfaite, annulée, ou expirée).

Les demandes peuvent être urgentes (par exemple, « hébergement pour cette nuit à Douala ») ou à planifier (par exemple, « garde d'enfants pendant le congrès de décembre »).

### 5.5 Suivi et évaluation

Chaque entraide fait l'objet d'un suivi :

- **Mise en relation** — la messagerie interne facilite les échanges.
- **Confirmation** — les deux parties confirment l'entraide (date, lieu, conditions).
- **Réalisation** — l'entraide est effectuée.
- **Évaluation** — les deux parties s'évaluent mutuellement (satisfaction, qualité).
- **Archivage** — l'entraide est archivée dans l'historique du réseau.

Ce suivi permet de mesurer l'activité du réseau et de valoriser les membres les plus actifs.

### 5.6 Prévention de l'épuisement

Certains membres (souvent les plus disponibles et les plus serviables) peuvent se retrouver sur-sollicités, ce qui conduit à l'épuisement. Le système prévoit :

- Un plafond configurable de demandes par mois (par défaut 5).
- Un suivi du nombre de demandes reçues et acceptées.
- Une alerte au membre si son taux d'acceptation est très élevé (signe de sur-sollicitation).
- La possibilité de mettre en pause ses propositions (« indisponible pour 1 mois »).

Cette prévention préserve la qualité de l'entraide et la disponibilité des membres sur le long terme.

### 5.7 Cas limite — exploitation

Un membre peut exploiter l'entraide en sollicitant systématiquement les mêmes personnes sans jamais rendre la pareille. Le système prévoit :

- Un suivi du ratio demandes/rendus par membre.
- Une alerte au comité médiation en cas de déséquilibre significatif.
- Une médiation si le déséquilibre persiste.

L'objectif n'est pas de comptabiliser chaque service, mais de prévenir les abus manifestes qui dénaturent l'esprit de l'entraide.

---

## 6. Module 4.3 — Mentorat intergénérationnel

### 6.1 Description

Le mentorat est l'une des fonctions les plus puissantes du réseau familial. Il permet aux membres expérimentés de transmettre leur savoir, leur expérience, et leur réseau aux jeunes générations. Sans cadre, cette transmission se fait au hasard ; avec un système structuré, elle devient systématique et équitable.

### 6.2 Mentors et mentorés

**Le mentor** est un membre reconnu pour son expertise et son expérience, qui s'engage à accompagner un ou plusieurs mentorés. Il publie un profil de mentor, indiquant :

- Son domaine d'expertise.
- Le type de mentorat qu'il propose (carrière, études, entrepreneuriat, vie personnelle).
- Sa disponibilité (nombre de mentorés, fréquence des rencontres).
- Ses préférences (par exemple, « mentoré de ma branche », « mentoré féminin »).

**Le mentoré** est un membre (souvent jeune, mais pas uniquement) qui sollicite un accompagnement. Il publie une demande de mentorat, indiquant :

- Son besoin (orientation, progression, projet).
- Son domaine d'activité ou d'études.
- Ses préférences (par exemple, « mentor de ma branche », « mentor diaspora »).
- Son engagement (disponibilité, sérieux).

### 6.3 Programmes de mentorat

Le système propose plusieurs types de programmes :

| Programme | Durée | Fréquence | Objectif |
|---|---|---|---|
| Mentorat court | 3 mois | 1 rencontre/mois | Conseil sur un projet précis |
| Mentorat annuel | 12 mois | 1 rencontre/mois | Accompagnement de carrière ou d'études |
| Mentorat de vie | Non défini | Au cas par cas | Transmission de sagesse et d'expérience |
| Mentorat de projet | Durée du projet | Variable | Accompagnement d'un projet entrepreneurial ou personnel |
| Mentorat diaspora | 6 mois | 1 rencontre/mois | Accompagnement d'un membre en expatriation |

### 6.4 Appariement

Le système facilite l'appariement entre mentors et mentorés :

- **Recommandations automatiques** — le système propose des binômes en fonction des domaines, des branches, des préférences.
- **Demande manuelle** — un mentoré peut solliciter un mentor précis.
- **Validation du mentor** — le mentor accepte ou refuse, avec motif.
- **Validation du chef de branche** — pour les mentorés mineurs, validation du chef de branche.

L'appariement est un acte délicat : un mauvais binôme peut être contre-productif. Le système privilégie la qualité à la quantité.

### 6.5 Suivi et évaluation

Chaque mentorat fait l'objet d'un suivi :

- **Plan de mentorat** — objectifs, jalons, fréquence des rencontres.
- **Compte-rendus** — le mentor rédige un court compte-rendu après chaque rencontre (visible par le mentoré).
- **Évaluation à mi-parcours** — à 3 mois, le mentoré évalue le mentorat, et le mentor évalue le mentoré.
- **Évaluation finale** — à la fin du programme, évaluation croisée et bilan.
- **Archivage** — le mentorat est archivé dans l'Univers 6, pour la mémoire.

Ce suivi garantit la qualité du mentorat et permet d'ajuster les appariements futurs.

### 6.6 Transmission des anciens

Le mentorat est aussi un mode de transmission des anciens vers les jeunes. Les membres les plus âgés (60+ ans) sont particulièrement précieux comme mentors de vie, car ils portent la sagesse et l'expérience de plusieurs générations. Le système prévoit :

- Une valorisation spécifique des mentors anciens (mention, reconnaissance publique).
- Un accompagnement pour la prise de rendez-vous (les anciens ne maîtrisent pas toujours les outils numériques).
- Un lien avec les interviews de l'Univers 6, qui peuvent enrichir le mentorat.

### 6.7 Cas limite — épuisement du mentor

Un mentor peut se retrouver surchargé s'il accepte trop de mentorés ou si les mentorés sont trop exigeants. Le système prévoit :

- Un plafond de mentorés par mentor (par défaut 3 simultanés).
- Un suivi du temps consacré, avec alerte en cas de dépassement.
- La possibilité de mettre en pause le mentorat (« plus disponible pour 6 mois »).
- Une médiation du comité médiation en cas de conflit mentor-mentoré.

---

## 7. Module 4.4 — Opportunités professionnelles et d'affaires

### 7.1 Description

Les opportunités professionnelles sont la dimension économique du réseau familial. Emplois, stages, projets, coentreprises, investissements : autant d'opportunités qui circulent dans la famille, souvent de bouche à oreille, et qui se perdent faute de canal structuré. L'Univers 7 propose un module dédié à leur partage et à leur mise en relation.

### 7.2 Types d'opportunités

| Type | Description | Exemples |
|---|---|---|
| Offre d'emploi | Poste à pourvoir dans l'entreprise d'un membre ou de son réseau | « Mon entreprise recrute un comptable » |
| Offre de stage | Stage pour un étudiant ou jeune diplômé | « Stage de 3 mois en marketing digital » |
| Opportunité d'affaires | Projet entrepreneurial, partenariat, marché | « Cherche associé pour ouvrir une agence à Douala » |
| Appel d'offres | Marché public ou privé accessible | « Appel d'offres pour la construction d'une école » |
| Projet familial | Projet porté par la famille (terrain, construction, événement) | « Coordination de la construction de la case de passage » |
| Investissement | Opportunité d'investissement partagée | « Club d'investissement pour acheter un immeuble » |
| Formation | Formation, certification, programme d'accompagnement | « Programme d'accélération pour startups » |
| Mission | Mission ponctuelle rémunérée | « Mission de conseil de 2 semaines » |

### 7.3 Publication d'une opportunité

Un membre peut publier une opportunité, en indiquant :

- Le type.
- L'intitulé et la description.
- Les compétences requises.
- La localisation (présentiel, distanciel, hybride).
- La rémunération (pour les emplois et missions).
- L'échéance (date limite de candidature).
- Le contact (interne ou externe).
- La confidentialité (par exemple, « ne pas diffuser hors de la famille »).

Le système valide la publication (pas de contenu frauduleux, pas de discriminations) et la diffuse aux membres concernés.

### 7.4 Candidature et mise en relation

Un membre intéressé par une opportunité peut :

- **Postuler** — sa candidature est transmise au publiant, qui décide.
- **Demander des informations** — via la messagerie interne.
- **Recommander un autre membre** — s'il connaît un membre particulièrement adapté.

Le système gère les candidatures, les réponses, et le suivi jusqu'à l'issue (embauche, refus, abandon).

### 7.5 Coentreprises et projets familiaux

Le module gère aussi les projets collectifs portés par plusieurs membres de la famille :

- **Coentreprise** — création d'une société par plusieurs membres, avec répartition du capital et des responsabilités.
- **Projet immobilier** — achat d'un bien en indivision familiale.
- **Projet événementiel** — organisation d'un événement à vocation économique (par exemple, un séminaire familial ouvert à des externes).
- **Investissement collectif** — club d'investissement pour soutenir des projets.

Ces projets sont sensibles (ils mêlent famille et argent) et nécessitent un cadre clair : accord écrit, répartition des gains et des pertes, sortie possible. Le système fournit des modèles d'accord et un suivi structuré.

### 7.6 Cas limite — opportunité frauduleuse

Une opportunité peut être frauduleuse (par exemple, fausse offre d'emploi demandant un paiement préalable). Le système prévoit :

- Une modération a priori des publications, par le comité communication.
- Un signalement par tout membre, qui déclenche un retrait temporaire.
- Une enquête du comité médiation en cas de doute.
- En cas de fraude avérée, retrait définitif, sanction du membre publiant, et communication à la famille.

Cette modération préserve la confiance dans le réseau.

### 7.7 Cas limite — conflit d'intérêts

Un membre peut être sollicité pour une opportunité qui crée un conflit d'intérêts (par exemple, recruter son neveu alors qu'il y a d'autres candidats plus qualifiés). Le système prévoit :

- Une transparence sur les liens familiaux (le publiant et les candidats sont identifiés).
- Une recommandation de transparence (le publiant déclare ses liens familiaux avec les candidats).
- Une médiation du comité médiation en cas de contestation.

L'objectif n'est pas d'interdire les opportunités intra-familiales, mais de prévenir les abus et les ressentiments.

---

## 8. Module 4.5 — Le réseau diaspora

### 8.1 Description

La diaspora est à la fois une richesse et un défi pour les grandes familles africaines. Richesse, parce qu'elle ouvre des opportunités (études, carrière, investissements) et qu'elle constitue un réseau de relais à l'étranger. Défi, parce que l'expatriation expose les membres à la solitude, aux difficultés administratives, et à la déracination. L'Univers 7 propose un module dédié au réseau diaspora, qui structure l'accueil, l'entraide, et la coordination des membres à l'étranger.

### 8.2 Relais diaspora par pays

Pour chaque pays où réside au moins un membre de la famille, le système désigne un **relais diaspora**, qui est le point de contact pour les membres arrivant ou résidant dans ce pays. Le relais diaspora :

- Accueille les nouveaux arrivants (contact dans les 30 jours suivant l'installation).
- diffuse les informations pratiques (logement, santé, école, administration).
- Facilite les rencontres entre membres résidant dans le pays.
- Remonte au conseil les besoins spécifiques de la diaspora.
- Coordonne les actions solidaires (par exemple, soutien à un membre en difficulté).

Le relais diaspora est désigné par le conseil, sur proposition du comité diaspora. Il s'engage pour un mandat de 2 à 4 ans, renouvelable.

### 8.3 Accueil des nouveaux arrivants

Quand un membre s'installe à l'étranger (pour études, travail, ou autre raison), il signale son arrivée dans l'application. Le système :

- Notifie le relais diaspora du pays concerné.
- Met en relation le nouvel arrivant et le relais.
- Fournit un guide d'accueil (informations pratiques, contacts utiles).
- Planifie une rencontre (présentiel ou visio) dans les 30 jours.

Cet accueil prévient l'isolement et facilite l'intégration.

### 8.4 Informations pratiques par pays

Pour chaque pays, le système propose une fiche d'informations pratiques, alimentée par le relais diaspora et par les membres :

- **Logement** — types de logement, prix, bons quartiers, pièges à éviter.
- **Santé** — système de santé, assurances, médecins francophones ou anglophones.
- **École** — système éducatif, inscriptions, écoles recommandées.
- **Administration** — démarches (titre de séjour, travail, fiscalité).
- **Transports** — moyens de transport, coût, conseils.
- **Vie pratique** — banques, shopping, culture, culte.
- **Retour au pays** — préparation du retour, transfert de fonds, réinstallation.

Ces fiches sont évolutives, mises à jour par les membres et le relais diaspora.

### 8.5 Entraide administrative

Les démarches administratives à l'étranger sont souvent complexes (titres de séjour, naturalisation, équivalence de diplômes, fiscalité). Le réseau diaspora propose une entraide :

- **Conseils** — partages d'expérience entre membres ayant passé les mêmes démarches.
- **Accompagnement** — présence physique pour des rendez-vous sensibles.
- **Traduction** — aide pour les documents dans la langue du pays.
- **Légalisation** — coordination pour les légalisations et authentifications.

Cette entraide est précieuse, notamment pour les primo-arrivants.

### 8.6 Retour au pays

Certains membres diaspora reviennent au pays après une période d'expatriation. Le système prévoit un accompagnement au retour :

- **Préparation** — conseils sur la réinstallation, le logement, l'emploi.
- **Réseau** — mise en relation avec les membres installés au Cameroun dans le domaine d'activité.
- **Suivi** — accompagnement dans les 6 mois suivant le retour.

Le retour au pays est un moment délicat (le « choc inverse » est bien documenté), et l'accompagnement familial est précieux.

### 8.7 Cas limite — membre diaspora en difficulté

Un membre diaspora peut se retrouver en difficulté (perte d'emploi, maladie, problème juridique, isolement). Le système prévoit :

- Un signalement au relais diaspora et au comité médiation.
- Une évaluation de la situation et des besoins.
- Une coordination avec l'Univers 3 (Solidarité) pour une aide financière éventuelle.
- Un suivi régulier jusqu'à résolution.

La diaspora est particulièrement vulnérable, car elle est loin du soutien familial direct. Le réseau est essentiel dans ces moments.

---

## 9. Module 4.6 — Recommandations et réputation

### 9.1 Description

Le système de recommandations est la garantie de la qualité du réseau. Sans retour sur les expériences, les membres ne peuvent pas distinguer un bon mentor d'un mentor médiocre, un service d'entraide fiable d'un service décevant, une opportunité sérieuse d'une opportunité douteuse. L'Univers 7 propose un système structuré de recommandations, qui valorise les membres actifs et fiables, et prévient les abus.

### 9.2 Types de recommandations

| Type | Description | Contexte |
|---|---|---|
| Recommandation d'expertise | Confirme la compétence d'un membre dans un domaine | Après un conseil, une mission, un mentorat |
| Recommandation de service | Évalue la qualité d'une entraide | Après un hébergement, un transport, un conseil pratique |
| Recommandation de mentorat | Évalue la qualité d'un mentorat | À la fin d'un programme de mentorat |
| Recommandation professionnelle | Recommande un membre pour une opportunité | Pour une embauche, une mission, un projet |
| Recommandation de relais | Évalue la qualité d'un relais diaspora | Pour l'accueil et le suivi |

### 9.3 Évaluation

Chaque recommandation comporte :

- Une note (de 1 à 5 étoiles).
- Un commentaire (optionnel, mais recommandé).
- Le contexte (type de relation, durée).
- L'auteur (qui doit avoir effectivement interagi avec le membre recommandé).

Les recommandations sont visibles par tous les membres, sauf demande de confidentialité de l'auteur. Elles sont cumulées sur le profil du membre recommandé, ce qui construit sa réputation dans le réseau.

### 9.4 Prévention des abus

Le système de recommandations peut être abusé :

- **Fausses recommandations** — un membre sollicite des recommandations de ses proches sans avoir réellement interagi.
- **Recommandations de complaisance** — un membre recommande un autre par amitié, sans évaluer réellement la qualité.
- **Recommandations négatives abusives** — un membre laisse une recommandation négative par vengeance.

Le système prévoit :

- Une vérification que l'auteur a effectivement interagi avec le recommandé (par exemple, mentorat enregistré, entraide réalisée).
- Un plafond de recommandations par membre et par mois (par défaut 5).
- Un signalement possible des recommandations abusives, examiné par le comité médiation.
- En cas d'abus avéré, retrait de la recommandation et sanction de l'auteur.

### 9.5 Valorisation des membres actifs

Les membres les plus actifs et les mieux recommandés sont valorisés :

- **Badges** — « Mentor actif », « Membre recommandé », « Relais diaspora », « Expert vérifié ».
- **Mise en avant** — dans les résultats de recherche et les suggestions.
- **Reconnaissance publique** — mention lors du congrès annuel, dans le rapport moral du patriarche.

Cette valorisation encourage l'engagement et récompense ceux qui contribuent au réseau.

### 9.6 Confidentialité

Les recommandations sont par défaut publiques, mais l'auteur peut demander la confidentialité de son identité (la recommandation est visible, mais pas son auteur). Cette option est utile pour les retours négatifs ou sensibles, où l'auteur craint des représailles.

### 9.7 Cas limite — refus de recommandation

Un membre peut refuser une recommandation qui lui est adressée (par exemple, parce qu'elle est inappropriée ou qu'il ne veut pas être associé à ce contexte). Le système prévoit :

- Un droit de refus, exercé dans les 7 jours suivant la publication.
- Une suppression de la recommandation, sans trace publique.
- Un journal des refus, consultable par le comité médiation.

Ce droit protège l'autonomie du membre recommandé.

---

## 10. Module 4.7 — Messagerie et mises en relation

### 10.1 Description

La messagerie interne est l'infrastructure de toutes les mises en relation de l'Univers 7. Sans elle, les membres ne pourraient pas concrétiser les opportunités identifiées (compétence, entraide, mentorat, opportunité professionnelle). La messagerie est conçue pour faciliter les échanges tout en respectant la vie privée et en prévenant le harcèlement.

### 10.2 Messagerie interne

La messagerie est interne à l'application, avec les caractéristiques suivantes :

- **Identité vérifiée** — les interlocuteurs sont identifiés par leur profil U1, pas de pseudonymat.
- **Confidentialité** — les conversations sont privées, chiffrées, non accessibles au conseil.
- **Historique** — les conversations sont conservées, consultables par les deux parties.
- **Notifications** — push, SMS, ou e-mail selon les préférences du membre.
- **Pièces jointes** — possibilité d'envoyer des documents (CV, portfolio, photos).

### 10.3 Demande de contact

Un membre peut solliciter un contact avec un autre membre (par exemple, un mentor potentiel, un expert). La demande comporte :

- Un motif (demande d'aide, mentorat, opportunité, autre).
- Un court message d'introduction.
- Le contexte (référence à une compétence, une opportunité).

Le destinataire peut accepter, refuser, ou ignorer la demande. En cas de refus, aucun message n'est envoyé à l'auteur (pour prévenir le harcèlement).

### 10.4 Modération

La messagerie est modérée a posteriori, sur signalement :

- Tout membre peut signaler un message qu'il juge inapproprié (harcèlement, insultes, sollicitations abusives).
- Le signalement déclenche un examen par le comité médiation.
- En cas de manquement avéré, le message est supprimé, et l'auteur est sanctionné (avertissement, suspension temporaire, exclusion du réseau).
- Un journal des signalements et sanctions est conservé.

Cette modération préserve la qualité des échanges et la sécurité des membres.

### 10.5 Respect de la vie privée

La messagerie respecte la vie privée des membres :

- Aucun membre n'est obligé de répondre à une demande de contact.
- Un membre peut bloquer un autre membre, ce qui empêche tout échange futur.
- Un membre peut masquer ses coordonnées (téléphone, e-mail) et n'accepter que la messagerie interne.
- Les conversations ne sont jamais accessibles au conseil, sauf en cas de signalement et d'enquête du comité médiation.

### 10.6 Anti-harcèlement

Le système prévoit des mesures anti-harcèlement :

- Un plafond de messages sans réponse (par défaut 3) avant blocage automatique.
- Un signalement automatique au comité médiation en cas de messages répétitifs sans réponse.
- Une formation des membres au respect des limites (charte du réseau).
- Des sanctions graduées en cas de harcèlement avéré.

Ces mesures sont essentielles pour que le réseau reste un espace sûr, notamment pour les femmes et les jeunes membres.

### 10.7 Cas limite — harcèlement

En cas de harcèlement avéré (messages insistants, sollicitations répétées, propos déplacés), la procédure est :

- Signalement par la victime au comité médiation.
- Examen immédiat (sous 48 heures).
- Mesures de protection immédiates (blocage de l'auteur par la victime, suspension temporaire de l'auteur).
- Enquête approfondie.
- Sanction définitive : avertissement, suspension, ou exclusion du réseau.
- Le cas échéant, dépôt de plainte auprès des autorités.

La tolérance zéro pour le harcèlement est essentielle à la confiance dans le réseau.

---

## 11. Modèle de données conceptuel

Le modèle de données de l'Univers 7 s'articule autour de sept entités principales.

| Entité | Description | Attributs clés |
|---|---|---|
| Compétence | Une compétence déclarée par un membre | Membre, catégorie, intitulé, expérience, visibilité |
| Service | Une proposition ou demande d'entraide | Type, proposant, demandeur, statut, évaluation |
| Mentorat | Une relation mentor-mentoré | Mentor, mentoré, programme, début, fin, statut |
| Opportunité | Une offre d'emploi, stage, projet, ou affaire | Type, intitulé, description, échéance, contact |
| RelaisDiaspora | Un relais désigné pour un pays | Pays, relais, mandat, membres dans le pays |
| Recommandation | Une évaluation d'un membre par un autre | Auteur, destinataire, type, note, commentaire |
| MiseEnRelation | Une demande de contact entre deux membres | Demandeur, destinataire, motif, statut |

### 11.1 Relations principales

- Une **Compétence** est rattachée à un membre U1 et à une catégorie.
- Un **Service** implique deux membres (proposant et demandeur) et peut donner lieu à une **Recommandation**.
- Un **Mentorat** lie un mentor et un mentoré, avec un programme et un suivi.
- Une **Opportunité** est publiée par un membre et peut concerner plusieurs candidats.
- Un **RelaisDiaspora** est désigné pour un pays et coordonne les membres de la diaspora.
- Une **Recommandation** est émise par un membre à destination d'un autre, dans un contexte donné.
- Une **MiseEnRelation** initie une conversation entre deux membres.

### 11.2 Règles d'intégrité

- Aucune compétence ne peut être publiée sans le consentement du membre.
- Un mentorat ne peut être établi sans l'accord du mentor et du mentoré.
- Une recommandation ne peut être publiée que par un membre ayant effectivement interagi avec le destinataire.
- Une opportunité ne peut être publiée sans modération a priori.
- Toute mise en relation peut être bloquée par le destinataire.
- Toute suppression de contenu est tracée, pour audit éventuel.

---

## 12. Règles de gestion essentielles

Les règles ci-dessous s'imposent à tous les modules de l'Univers 7. Elles sont configurables par chaque famille.

| # | Règle | Justification |
|---|---|---|
| R1 | Aucune compétence, service, ou opportunité n'est publié sans le consentement du membre | Respecte l'autonomie |
| R2 | Le profil de compétences est validé par le membre lui-même, avec mention « vérifié » par le chef de branche | Garantit la qualité |
| R3 | Un membre peut bloquer un autre membre à tout moment | Protège contre le harcèlement |
| R4 | Les conversations sont privées, sauf signalement et enquête du comité médiation | Respecte la vie privée |
| R5 | Les recommandations ne sont publiées que par des membres ayant effectivement interagi | Prévient les faux témoignages |
| R6 | Un plafond de recommandations par membre et par mois est fixé (par défaut 5) | Prévient les abus |
| R7 | Les opportunités sont modérées a priori par le comité communication | Prévient les fraudes |
| R8 | Les mentors ne peuvent pas avoir plus de 3 mentorés simultanés (configurable) | Prévient l'épuisement |
| R9 | Le relais diaspora est désigné par le conseil, sur proposition du comité diaspora | Garantit la légitimité |
| R10 | Tout signalement de harcèlement est examiné sous 48 heures | Protège les victimes |
| R11 | Un membre peut refuser une recommandation qui lui est adressée dans les 7 jours | Respecte l'autonomie |
| R12 | Le ratio demandes/rendus d'entraide est suivi, avec médiation en cas de déséquilibre | Prévient l'exploitation |
| R13 | Les profils, services, et opportunités sont archivés dans l'Univers 6 après suppression | Préserve la traçabilité |
| R14 | Une charte du réseau est signée par tout membre, qui s'engage au respect et à l'éthique | Cadre les comportements |
| R15 | Le comité médiation est saisi en cas de conflit lié au réseau | Garantit l'arbitrage |

---

## 13. Cas limites et situations sensibles

### 13.1 Membre exploité

Un membre peut être exploité (par exemple, un cousin qui sollicite systématiquement des services gratuits sans jamais rendre la pareille). Le système prévoit :

- Un suivi du ratio demandes/rendus.
- Une alerte au comité médiation en cas de déséquilibre significatif.
- Une médiation entre les parties.
- En cas de persistance, une restriction des possibilités de demande du membre exploiteur.

### 13.2 Harcèlement

Le harcèlement (messages insistants, sollicitations répétées, propos déplacés) est un risque sérieux, notamment pour les femmes et les jeunes membres. Le système prévoit :

- Un blocage immédiat par la victime.
- Un signalement au comité médiation.
- Une enquête sous 48 heures.
- Des sanctions graduées (avertissement, suspension, exclusion).
- Le cas échéant, dépôt de plainte.

La tolérance zéro est essentielle pour que le réseau reste un espace sûr.

### 13.3 Conflit d'intérêts

Un membre peut être sollicité pour une opportunité qui crée un conflit d'intérêts (par exemple, recruter son neveu). Le système prévoit :

- Une transparence sur les liens familiaux.
- Une déclaration du publiant en cas de lien avec un candidat.
- Une médiation du comité médiation en cas de contestation.

### 13.4 Fausse expertise

Un membre peut déclarer une expertise qu'il n'a pas réellement. Le système prévoit :

- La mention « profil vérifié » par le chef de branche.
- Le système de recommandations, qui permet de confirmer ou d'infirmer l'expertise.
- Un signalement possible en cas de fausse déclaration, examiné par le comité médiation.
- En cas de fausse expertise avérée, retrait du profil.

### 13.5 Opportunité frauduleuse

Une opportunité peut être frauduleuse (fausse offre d'emploi, arnaque financière). Le système prévoit :

- Une modération a priori par le comité communication.
- Un signalement par tout membre, qui déclenche un retrait temporaire.
- Une enquête du comité médiation.
- En cas de fraude avérée, retrait définitif, sanction du membre publiant, et communication à la famille.

### 13.6 Rivalité entre mentors

Deux mentors peuvent se retrouver en concurrence pour le même mentoré, ou pour la reconnaissance de leur expertise. Le système prévoit :

- Une transparence sur les domaines d'expertise (pas de chevauchement évitable).
- Une médiation du comité médiation en cas de conflit ouvert.
- Une valorisation de la diversité des mentors (pas de hiérarchie formelle).

### 13.7 Refus de recommandation

Un membre peut refuser une recommandation qui lui est adressée (par exemple, parce qu'elle est inappropriée). Le système prévoit :

- Un droit de refus, exercé dans les 7 jours.
- Une suppression de la recommandation, sans trace publique.
- Un journal des refus, consultable par le comité médiation.

### 13.8 Épuisement du mentor

Un mentor peut s'épuiser s'il accepte trop de mentorés ou si les mentorés sont trop exigeants. Le système prévoit :

- Un plafond de mentorés par mentor (par défaut 3 simultanés).
- Un suivi du temps consacré, avec alerte en cas de dépassement.
- La possibilité de mettre en pause le mentorat.
- Une médiation du comité médiation en cas de conflit mentor-mentoré.

---

## 14. Wireframes textuels des écrans clés

Cette section décrit en pseudo-maquettes les cinq écrans les plus importants de l'Univers 7.

### 14.1 Répertoire des compétences

```
┌────────────────────────────────────────────────────────────┐
│  RÉPERTOIRE DES COMPÉTENCES                                │
├────────────────────────────────────────────────────────────┤
│  Recherche : [_______________________]                    │
│  Filtres : [Catégorie ▾] [Branche ▾] [Pays ▾]            │
│                                                            │
│  ─── SANTÉ ────────────────────────────                     │
│  • Dr. Hélène NDONGO — Cardiologue (Paris) ✓ Vérifié    │
│    Disponible pour : Conseil, mentorat                    │
│  • Dr. Paul BIYA — Médecin généraliste (Yaoundé)          │
│    Disponible pour : Conseil                              │
│                                                            │
│  ─── DROIT ────────────────────────────                     │
│  • Me Jean NDONGO — Avocat affaires (Yaoundé) ✓         │
│    Disponible pour : Conseil, mission rémunérée           │
│  • Me Marie NDONGO — Notaire (Douala)                     │
│    Disponible pour : Conseil                              │
│                                                            │
│  ─── INGÉNIERIE ────────────────────────                    │
│  • Bernard NDONGO — Expert-comptable (Yaoundé) ✓         │
│    Disponible pour : Mentorat, mission                    │
│  • Joseph NDONGO — Développeur (Bruxelles)                │
│    Disponible pour : Conseil, mentorat                    │
│                                                            │
│  [Publier mon profil]  [Demander une aide]                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.2 Profil de membre (vue réseau)

```
┌────────────────────────────────────────────────────────────┐
│  Bernard NDONGO                                            │
├────────────────────────────────────────────────────────────┤
│  Branche : Nord — Génération 4 — Yaoundé, Cameroun         │
│  Badge : ✓ Expert vérifié · ⭐ Mentor actif · ⭐ 5/5     │
│                                                            │
│  ─── COMPÉTENCES ────────────────────                      │
│  Métier : Expert-comptable                                 │
│  Expertise : Audit, fiscalité, conseil PME                │
│  Expérience : 22 ans                                       │
│  Formation : DESCAF, DEC, MBA HEC Paris                   │
│                                                            │
│  ─── DISPONIBILITÉS ────────────────────                   │
│  ✓ Conseil ponctuel (bénévole pour la famille)            │
│  ✓ Mentorat (3 mentorés max)                              │
│  ✓ Mission rémunérée (selon disponibilité)                │
│  ✗ Service d'entraide (non disponible)                    │
│                                                            │
│  ─── RECOMMANDATIONS ────────────────────                  │
│  ⭐ 5/5 — « Bernard m'a conseillé sur la création       │
│    de mon entreprise. Excellent accompagnement. »         │
│    — Paul BIYA (sept. 2026)                               │
│  ⭐ 5/5 — « Mentor disponible et à l'écoute. »          │
│    — Lucie NDONGO (mars 2026)                             │
│  (12 recommandations au total)                             │
│                                                            │
│  [Contacter]  [Demander un mentorat]                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.3 Opportunité d'emploi

```
┌────────────────────────────────────────────────────────────┐
│  OPPORTUNITÉ — Comptable senior                           │
├────────────────────────────────────────────────────────────┤
│  Type : Offre d'emploi                                     │
│  Publiée par : Jean NDONGO (Branche Nord)                 │
│  Date : 28 septembre 2026 — 14 candidats                  │
│                                                            │
│  ─── DESCRIPTION ────────────────────                      │
│  « Mon cabinet recrute un comptable senior pour le        │
│  pôle audit. Poste basé à Yaoundé, avec déplacements      │
│  régionaux. Rémunération attractive. »                    │
│                                                            │
│  ─── PROFIL RECHERCHÉ ────────────────────                 │
│  • Expert-comptable diplômé                               │
│  • 5 ans d'expérience minimum                              │
│  • Maîtrise du SYSCOHADA                                  │
│  • Français + anglais souhaité                            │
│                                                            │
│  ─── DÉTAILS ────────────────────────────                  │
│  Localisation : Yaoundé, Cameroun (présentiel)            │
│  Rémunération : 800 000 - 1 200 000 FCFA / mois          │
│  Échéance : 31 octobre 2026                               │
│  Contact : Me Jean NDONGO (via messagerie)               │
│                                                            │
│  ─── CANDIDATURES ────────────────────────                 │
│  14 candidats — 3 short-listés                            │
│                                                            │
│  [Postuler]  [Demander des informations]                  │
│  [Recommander un membre]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.4 Mentorat en cours

```
┌────────────────────────────────────────────────────────────┐
│  MENTORAT — Bernard NDONGO (mentor) × Lucie (mentorée)   │
├────────────────────────────────────────────────────────────┤
│  Programme : Mentorat annuel                              │
│  Domaine : Carrière en finance                            │
│  Début : 1er mars 2026 — Fin : 28 février 2027           │
│  Statut : En cours (mois 7/12)                            │
│                                                            │
│  ─── OBJECTIFS ────────────────────────────                │
│  1. ✓ Orientation carrière (3 premiers mois)             │
│  2. ⏳ Préparation certification CFA (en cours)          │
│  3. ○ Réseau professionnel (à venir)                     │
│                                                            │
│  ─── RENCONTRES ────────────────────────────               │
│  • 15/03 — 1ère rencontre (cadrage)                       │
│  • 12/04 — Bilan orientation                              │
│  • 10/05 — Plan CFA                                        │
│  • 14/06 — Suivi CFA                                       │
│  • 12/07 — Réseau (annulé, conflit agenda)               │
│  • 16/08 — Reprise réseau                                  │
│  • 13/09 — Préparation examen CFA                         │
│                                                            │
│  ─── ÉVALUATION À MI-PARCOURS ────────                     │
│  Mentoré : « Excellent accompagnement, disponible. »     │
│  Mentor : « Lucie est sérieuse et investie. »            │
│                                                            │
│  ─── PROCHAINE RENCONTRE ────────────────                  │
│  18 octobre 2026 — 17h — Visio                            │
│  Ordre du jour : Examen CFA, réseau                       │
│                                                            │
│  [Programmer une rencontre]  [Rédiger un compte-rendu]    │
│  [Évaluer le mentorat]                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.5 Relais diaspora

```
┌────────────────────────────────────────────────────────────┐
│  RÉSEAU DIASPORA — France                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ─── RELAIS ────────────────────────────                   │
│  Joseph NDONGO — Paris                                     │
│  Mandat : 2025-2027                                        │
│  Contact : [Contacter]                                     │
│                                                            │
│  ─── MEMBRES EN FRANCE ────────────────                    │
│  28 membres — Paris (18), Lille (4), Lyon (3), autres (3) │
│                                                            │
│  ─── NOUVEAUX ARRIVANTS (30 jours) ────                    │
│  • Marc NDONGO — Arrivé le 5/09 — Accueilli ✓            │
│  • Sophie NDONGO — Arrivée le 12/09 — Accueillie ✓       │
│  • Paul BIYA — Arrivé le 25/09 — Accueil en cours       │
│                                                            │
│  ─── INFORMATIONS PRATIQUES ────────────                   │
│  • Logement : CROUS, particuliers, colocations            │
│  • Santé : Carte vitale, mutuelles                        │
│  • École : Inscriptions universitaires, équivalences      │
│  • Administration : Titre de séjour, OFII                 │
│  • Transports : Navigo, SNCF                               │
│  • Retour au pays : Préparation, transferts               │
│                                                            │
│  ─── PROCHAINE RENCONTRE ────────────────                  │
│  15 octobre 2026 — Paris — Réunion trimestrielle         │
│                                                            │
│  [Signaler mon arrivée]  [Demander de l'aide]             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Roadmap MVP et séquençage

L'Univers 7 est séquencé en trois phases pour permettre une adoption progressive.

### 15.1 Phase 1 — MVP (mois 10 à 14)

| Périmètre | Détail |
|---|---|
| Répertoire des compétences | Profils, catégories, recherche |
| Entraide et services | Propositions, demandes, suivi |
| Messagerie interne | Demandes de contact, conversations, blocage |
| Modération | Signalement, comité médiation |
| Charte du réseau | Signée par tout membre |

**Critères de sortie** : ≥ 60 % des membres adultes avec profil de compétences, ≥ 10 mises en relation par mois, satisfaction entraide ≥ 4/5.

### 15.2 Phase 2 — Enrichissement (mois 15 à 19)

| Périmètre | Détail |
|---|---|
| Mentorat intergénérationnel | Programmes, appariement, suivi |
| Opportunités professionnelles | Emploi, stages, projets, coentreprises |
| Réseau diaspora | Relais par pays, accueil, informations pratiques |
| Recommandations | Système d'évaluation, badges, valorisation |
| Prévention de l'épuisement | Plafonds, alertes, mise en pause |

**Critères de sortie** : ≥ 15 mentorats actifs, ≥ 30 opportunités partagées par an, ≥ 1 relais diaspora par pays, satisfaction mentorat ≥ 4/5.

### 15.3 Phase 3 — Maturité (mois 20 à 26)

| Périmètre | Détail |
|---|---|
| IA matching | Suggestions automatiques de mentors, d'opportunités, de services |
| Réputation avancée | Score de réputation, badges multiples |
| Coentreprises structurées | Modèles d'accord, suivi des projets |
| Réseau multi-famille | Coordination avec familles alliées |
| Mentorat de groupe | Un mentor pour plusieurs mentorés |
| Analyse du réseau | Cartographie, identification des hubs |

**Critères de sortie** : ≥ 80 % des membres diaspora accueillis dans les 30 jours, ≥ 70 % de résolution des demandes d'aide, ≤ 2 signalements d'abus par an.

---

## 16. Risques et points d'attention

### 16.1 Exploitation

L'exploitation (un membre sollicite sans jamais rendre la pareille) est un risque sérieux. La mitigation repose sur :

- Le suivi du ratio demandes/rendus.
- L'alerte au comité médiation en cas de déséquilibre.
- La médiation entre les parties.
- En cas de persistance, la restriction des possibilités de demande.

### 16.2 Harcèlement

Le harcèlement est un risque grave, notamment pour les femmes et les jeunes membres. La mitigation repose sur :

- Le blocage immédiat par la victime.
- Le signalement au comité médiation.
- L'enquête sous 48 heures.
- Les sanctions graduées (avertissement, suspension, exclusion).
- La tolérance zéro affichée dans la charte du réseau.

### 16.3 Confidentialité

Les profils, les conversations, et les recommandations sont sensibles. La mitigation repose sur :

- Le consentement explicite pour la publication de toute information.
- Le chiffrement des conversations.
- Le blocage possible par tout membre.
- L'accès restreint aux journaux de modération.

### 16.4 Conflits d'intérêts

Les opportunités professionnelles intra-familles peuvent créer des conflits d'intérêts. La mitigation repose sur :

- La transparence sur les liens familiaux.
- La déclaration du publiant en cas de lien avec un candidat.
- La médiation du comité médiation en cas de contestation.

### 16.5 Inégalités d'accès

Certains membres (les moins actifs, les moins visibles, les plus isolés) peuvent bénéficier moins du réseau. La mitigation repose sur :

- Des suggestions personnalisées pour chaque membre.
- Une valorisation de la diversité des profils (pas seulement les plus diplômés).
- Un accompagnement des membres les moins à l'aise avec le numérique.
- Une vigilance du comité médiation sur les membres isolés.

### 16.6 Dérive marchande

Le réseau peut dériver vers une logique marchande, où chaque service est facturé et où l'entraide disparaît. La mitigation repose sur :

- Une distinction claire entre entraide (bénévole) et mission rémunérée.
- Une charte du réseau qui valorise l'entraide gratuite.
- Une valorisation des membres les plus actifs dans l'entraide bénévole.
- Un plafond de missions rémunérées par membre et par an.

### 16.7 Rivalités

Les rivalités entre mentors, entre experts, ou entre candidats à une opportunité peuvent dégrader l'ambiance du réseau. La mitigation repose sur :

- La transparence sur les domaines d'expertise.
- La médiation du comité médiation en cas de conflit.
- La valorisation de la diversité (pas de hiérarchie formelle entre mentors).

---

## 17. Indicateurs de succès

| Indicateur | Définition | Cible | Fréquence |
|---|---|---|---|
| Taux de profil compétences | Membres adultes avec profil publié | ≥ 60 % | Trimestriel |
| Mises en relation | Nombre par mois | ≥ 10 | Mensuel |
| Mentorats actifs | Binômes mentor-mentoré actifs | ≥ 15 | Trimestriel |
| Opportunités partagées | Nombre par an | ≥ 30 | Annuel |
| Satisfaction entraide | Note moyenne des membres | ≥ 4/5 | Trimestriel |
| Satisfaction mentorat | Note moyenne des mentors et mentorés | ≥ 4/5 | Trimestriel |
| Relais diaspora | Relais déclarés par pays | ≥ 1 par pays | Annuel |
| Nouveaux arrivants accueillis | Membres diaspora accueillis dans 30 jours | ≥ 80 % | Mensuel |
| Taux de résolution | Demandes d'aide aboutissant à une solution | ≥ 70 % | Mensuel |
| Prévention des abus | Signalements pour exploitation ou harcèlement | ≤ 2/an | Annuel |

---

## 18. Conclusion

L'Univers 7 est le septième et dernier pilier de l'application. Il transforme la famille en réseau d'opportunités, sans dénaturer les relations de parenté qui en font la valeur. Les six autres univers gèrent l'identité, la vie, la solidarité, les finances, la gouvernance, et la mémoire. L'Univers 7 ajoute la dimension économique et professionnelle : il fait de la famille une ressource durable, où chaque membre peut trouver une compétence, une aide, un mentor, une opportunité, ou un relais dans la diaspora.

La proposition centrale de l'Univers 7 est simple : remplacer les opportunités implicites et fortuites d'aujourd'hui par un réseau explicite, structuré et respectueux. Chaque membre peut publier un profil de compétences, proposer des services d'entraide, s'engager comme mentor, partager des opportunités professionnelles, ou se déclarer relais diaspora. Le système facilite les mises en relation, tout en préservant la confidentialité, le consentement, et la protection contre l'exploitation. La famille devient un réseau, sans devenir un marché : l'entraide y reste un devoir familial, pas une transaction commerciale.

L'Univers 7 ne se substitue pas aux relations familiales : il les révèle et les active. Les cousins qui s'ignoraient découvrent qu'ils ont des compétences complémentaires. Les oncles qui n'avaient plus de contact avec leurs neveux redeviennent des mentors. Les membres diaspora se soutiennent mutuellement dans l'épreuve de l'expatriation. C'est la véritable valeur de cet univers : réactiver le capital social de la famille, qui était latent faute d'outil.

Les prochaines étapes recommandées sont les suivantes :

1. **Validation de cette spécification** par le comité de pilotage et par au moins deux familles pilotes, avec un accent particulier sur la charte du réseau et sur les procédures anti-harcèlement.
2. **Production des maquettes interactives** des cinq écrans clés (répertoire, profil, opportunité, mentorat, relais diaspora).
3. **Définition de la charte du réseau**, soumise au vote du conseil et signée par tout membre.
4. **Construction du MVP Phase 1** avec un périmètre strictement limité au répertoire des compétences, à l'entraide, et à la messagerie interne.
5. **Onboarding de la première famille pilote** dans un délai de quatorze mois après le démarrage du développement, avec un accompagnement particulier du comité jeunesse et du comité diaspora.

L'Univers 7, s'il est bien conçu et bien livré, deviendra le levier d'opportunités de la famille : un lieu où chaque compétence trouve son usage, chaque service sa reconnaissance, chaque mentorat sa transmission, et chaque opportunité son bénéficiaire. Il transformera la famille d'une communauté de solidarité en un réseau d'opportunités, sans jamais réduire les relations de parenté à de simples transactions.

---

## Clôture des 7 univers

Avec cet Univers 7, l'architecture complète de l'application de gouvernance des grandes familles africaines est désormais spécifiée :

| Univers | Rôle | Statut |
|---|---|---|
| U1 — La Famille | Socle identitaire, registre, arbre, branches, rôles | Spécifié |
| U2 — La Vie familiale | Calendrier, événements, moteur workflow automatisé | Spécifié |
| U3 — La Solidarité | Dossiers, collectes, suivi, équité, transparence | Spécifié |
| U4 — Les Finances | Caisse, cotisations, Mobile Money, comptabilité, audit | Spécifié |
| U5 — La Gouvernance | Votes, comités, élections, règlement, PV, recours | Spécifié |
| U6 — La Mémoire | Bibliothèque, albums, anciens, histoire, traditions | Spécifié |
| U7 — Le Réseau | Compétences, entraide, mentorat, opportunités, diaspora | Spécifié |

L'ensemble forme un système cohérent, où chaque univers s'appuie sur les autres et les enrichit. La famille y trouve son identité (U1), sa vie (U2), son cœur battant (U3), son poumon technique (U4), son pilier invisible (U5), sa mémoire (U6), et son levier d'opportunités (U7). C'est cette complétude qui distingue l'application d'un simple groupe WhatsApp : elle ne se contente pas de communiquer, elle institutionnalise la famille.

Les prochaines étapes, à l'échelle du projet, sont désormais :

1. **Validation globale** des 7 univers par le comité de pilotage et par les familles pilotes.
2. **Production des maquettes interactives** pour les écrans clés de chaque univers.
3. **Définition de l'architecture technique** globale, intégrant les 7 univers et leurs interfaces.
4. **Construction du MVP global**, en respectant le séquençage des phases de chaque univers (U1 et U4 prioritaires, puis U2 et U3, puis U5, U6, U7).
5. **Onboarding des premières familles pilotes**, avec un accompagnement humain renforcé.

L'aventure ne fait que commencer. Mais les fondations sont posées, et elles sont solides.
