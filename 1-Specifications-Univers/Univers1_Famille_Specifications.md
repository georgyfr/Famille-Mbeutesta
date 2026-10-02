# Univers 1 — La Famille

**Socle fondateur de l'application de gouvernance des grandes familles africaines**

| Document | Spécifications fonctionnelles — Univers 1 |
|---|---|
| Version | 1.0 |
| Date | Septembre 2026 |
| Statut | Pour validation |
| Audience | Chefs de famille, comité de pilotage, équipe produit, équipe développement |

---

## Synthèse exécutive

L'Univers 1, intitulé **« La Famille »**, constitue le socle fondateur de l'ensemble du système numérique dédié à la gouvernance des grandes familles africaines. Il ne s'agit pas d'un module parmi d'autres : il est la condition d'existence de tous les autres. Sans registre structuré des membres, sans arbre généalogique fiable, sans identification claire des branches et des rôles, aucune cotisation ne peut être correctement répartie, aucun décès ne peut être attribué à la bonne branche, aucun congrès ne peut être organisé de manière représentative, aucune solidarité ne peut être ciblée. L'Univers 1 est donc non négociable : il doit être conçu, livré et adopté en premier.

Le présent document définit son rôle, ses objectifs mesurables, son architecture fonctionnelle en sept modules, son modèle de données conceptuel, ses règles de gestion, ainsi que les cas limites propres aux réalités des grandes familles camerounaises et africaines (polygamie, adoption, diaspora, brouilles, héritage). Il propose enfin une roadmap séquencée, des wireframes textuels des écrans clés, et une grille d'indicateurs de succès permettant de mesurer l'adoption réelle par les membres.

La philosophie de conception est la suivante : l'Univers 1 n'est pas un annuaire, c'est une **institution numérique**. Il ne se contente pas d'enregistrer des informations ; il encode l'identité, la mémoire et l'autorité légitime de la famille. À ce titre, il doit être traité avec la rigueur d'un registre d'état civil, tout en restant accessible à des membres dont l'âge, la langue et la maîtrise du numérique varient considérablement.

---

## 1. Rôle et finalité de l'Univers 1

### 1.1 Rôle stratégique

L'Univers 1 joue quatre rôles stratégiques imbriqués qui justifient son caractère prioritaire.

**Premièrement, il est la source unique de vérité sur l'identité familiale.** Dans une grande famille camerounaise comptant typiquement entre 80 et 400 membres répartis sur plusieurs générations et plusieurs pays, la question « qui est membre de notre famille ? » n'a pas de réponse évidente. Les unions mixtes, les adoptions traditionnelles, les enfants élevés par des tantes, les cousins éloignés installés à l'étranger depuis trente ans : autant de situations qui rendent floue la frontière du « dedans » et du « dehors ». L'Univers 1 met fin à ce flou en proposant un référentiel partagé, validé par les autorités familiales légitimes, et constamment maintenu à jour. Il devient impossible, une fois l'Univers 1 en place, de contester l'appartenance d'un membre ou d'en ignorer un autre lors d'un événement.

**Deuxièmement, il est le socle de la mémoire familiale.** Les grandes familles africaines sont des institutions de longue durée, dont la mémoire orale remonte sur quatre à six générations. Or cette mémoire se perd : les aïeux disparaissent, leurs récits s'effacent, les branches se dispersent. En structurant l'arbre généalogique et en l'enrichissant progressivement de récits, de photos et de documents, l'Univers 1 transforme une mémoire fragile en un patrimoine consultable et transmissible. C'est une réponse directe à l'une des douleurs les plus profondes exprimées par les patriarches : « nos enfants ne savent plus d'où nous venons ».

**Troisièmement, il est le fondement de la gouvernance.** Aucune décision légitime ne peut être prise sans savoir qui a le droit de voter, qui doit être consulté, qui représente quelle branche, qui peut valider une dépense. L'Univers 1 porte les rôles, les responsabilités et les règles de succession de l'autorité familiale. Sans lui, le module Gouvernance ne sait pas à qui adresser un vote ; sans lui, le module Finances ne sait pas qui peut valider une dépense ; sans lui, le module Solidarité ne sait pas quelle branche est concernée par un deuil.

**Quatrièmement, il est l'infrastructure de ciblage de tous les autres univers.** Lorsqu'un décès survient dans la branche Nord, ce sont les membres de cette branche et leurs alliés qui doivent être alertés en priorité, pas l'ensemble de la famille. Lorsqu'une cotisation est lancée, c'est l'ensemble des membres adultes vivants qui sont redevables, à l'exclusion des mineurs et des décédés. Lorsqu'un congrès est organisé à Douala, ce sont les membres de la diaspora européenne qui doivent être informés suffisamment tôt pour réserver leurs billets. Toutes ces opérations supposent que le système connaisse précisément l'identité, le rattachement, la situation géographique et le statut de chaque membre.

### 1.2 Finalité opérationnelle

Sur le plan opérationnel, l'Univers 1 poursuit une finalité simple : **qu'à tout moment, tout membre autorisé puisse, en quelques secondes, répondre à six questions fondamentales** :

1. Qui sont les membres vivants de ma famille, et combien sont-ils ?
2. À quelle branche appartient telle personne, et quels sont ses liens de filiation ?
3. Où résident les membres de la famille, et combien vivent à l'étranger ?
4. Qui exerce l'autorité dans la famille, et quels sont mes interlocuteurs légitimes ?
5. Quels sont les membres décédés, et où sont-ils enterrés ?
6. Quels sont les anniversaires, fêtes et événements à venir concernant les membres ?

Si ces six questions trouvent une réponse immédiate et fiable, l'Univers 1 remplit sa mission. Toute autre fonctionnalité est accessoire ou relève des univers suivants.

---

## 2. Objectifs mesurables

L'Univers 1 doit être évalué sur des indicateurs concrets. Les objectifs ci-dessous sont proposés pour la première année d'exploitation, sur une famille pilote de 150 à 300 membres.

| Objectif | Indicateur | Cible année 1 |
|---|---|---|
| Couverture du registre | Taux de membres disposant d'une fiche complète (nom, filiation, contact, branche) | ≥ 90 % |
| Qualité de l'arbre | Taux de membres rattachés à un ancêtre commun documenté | ≥ 80 % |
| Exactitude des contacts | Taux de numéros de téléphone validés par SMS OTP | ≥ 70 % |
| Adoption par les aînés | Taux de membres de plus de 60 ans s'étant connectés au moins une fois par mois | ≥ 50 % |
| Maintien à jour | Délai moyen entre un changement familial (décès, naissance, mariage) et sa saisie dans l'app | ≤ 14 jours |
| Utilisation hebdomadaire | Taux de membres consultant le registre au moins une fois par semaine | ≥ 30 % |
| Satisfaction des autorités | Pourcentage des chefs de branche jugeant le registre « fiable » | ≥ 80 % |
| Réduction des doublons | Nombre de fiches en double détectées et fusionnées | ≥ 95 % des doublons résolus |

Ces cibles sont indicatives ; elles devront être ajustées avec les familles pilotes. Elles traduisent néanmoins l'ambition : un outil qui ne serait pas consulté, pas tenu à jour, ou pas jugé fiable par les autorités familiales serait un échec, même s'il est techniquement parfait.

---

## 3. Architecture fonctionnelle

L'Univers 1 est composé de **sept modules fonctionnels** qui s'articulent autour d'un cœur commun : le registre des membres. L'arbre généalogique, les branches, les rôles, la diaspora, la confidentialité et la recherche sont autant de vues ou d'extensions de ce registre, et non des modules indépendants.

### Vue d'ensemble des modules

```
┌─────────────────────────────────────────────────────────────┐
│              UNIVERS 1 — LA FAMILLE                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CŒUR : Registre des membres (fiches individuelles)    │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐  │
│   ▼          ▼          ▼          ▼          ▼          ▼  │
│ 4.1 Arbre  4.2 Bran-  4.3 Rôles  4.4 Dias-  4.5 Confi- 4.6 Re- │
│  généa-    ches &     & gou-     pora &    dentia-   cherche │
│  logique   sous-      vernance   cartogra-  lité &    & fil- │
│            branches   minimale   phie       visibilité tres  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

L'organisation de l'application reflète cette architecture : un écran d'accueil — le **tableau de bord familial** — présente les indicateurs synthétiques (nombre de membres, branches, pays, événements à venir) et donne accès aux six vues. Chaque vue est elle-même organisée en sous-écrans. Cette structure plate, sans profondeur de navigation excessive, est essentielle pour les utilisateurs âgés qui doivent pouvoir atteindre n'importe quelle information en deux ou trois taps maximum.

### Navigation principale

La navigation s'organise autour d'une barre inférieure à cinq entrées (sur mobile) ou d'une barre latérale (sur desktop) :

1. **Accueil** — tableau de bord
2. **Membres** — registre, recherche, fiche
3. **Arbre** — vue généalogique, branches
4. **Carte** — diaspora et localisations
5. **Profil** — ma fiche, mes paramètres, confidentialité

Les rôles de gouvernance (patriarche, conseil, chefs de branche) disposent en plus d'une entrée **Administration** accessible uniquement aux autorités. Cette séparation est essentielle pour éviter que les écrans de gouvernance ne perturbent l'expérience des membres ordinaires.

---

## 4. Module 4.1 — Le registre familial

### 4.1.1 Description

Le registre est le composant central. Il contient, pour chaque membre de la famille, une fiche structurée. La fiche est l'unité atomique du système : tout événement, toute cotisation, toute décision y est rattaché. Sa qualité conditionne donc la qualité de l'ensemble de l'application.

### 4.1.2 Champs de la fiche membre

La fiche membre est organisée en six blocs d'information, du plus public au plus privé. Cette structuration par blocs facilite le paramétrage de la confidentialité (voir module 4.6).

| Bloc | Champs | Visibilité par défaut |
|---|---|---|
| Identité | Nom, prénom, surnom, sexe, date et lieu de naissance | Publique familiale |
| Filiation | Père, mère, parents adoptifs éventuels | Publique familiale |
| Appartenance | Branche, sous-branche, génération | Publique familiale |
| Situation | État civil (célibataire, marié, veuf, divorcé), conjoint(s), enfants | Publique familiale |
| Contact | Téléphone, e-mail, ville, pays, adresse postale | Publique familiale (sauf adresse précise : restreinte) |
| Profession | Métier, employeur, compétences, disponibilités | Publique familiale (sauf détails : restreinte) |
| Santé | Groupe sanguin, allergies, contacts d'urgence, personne à prévenir | Restreinte (visible par comité médiation uniquement) |
| Préférences | Langue, fuseau horaire, canal de notification préféré | Privée |
| Mémoire | Photo, biographie courte, anecdotes | Publique familiale |

### 4.1.3 Cas particulier des membres décédés

Les membres décédés ne sont pas supprimés du registre ; ils sont marqués comme tels et conservent leur fiche. Les champs spécifiques sont : date du décès, lieu du décès, lieu d'inhumation, cause (optionnelle, restreinte), photo, biographie, éventuel message posthume. Cette conservation est essentielle pour la mémoire familiale et pour le calcul de la génération courante. Les descendants d'un membre décédé conservent leur rattachement à sa branche.

### 4.1.4 User stories

À titre d'illustration, les user stories suivantes structurent les écrans du module :

- **En tant que patriarche**, je veux valider l'ajout d'un nouveau membre (naissance, mariage entrant) afin de garantir que seules les personnes légitimes entrent au registre.
- **En tant que chef de branche**, je veux voir la liste des membres de ma branche afin de vérifier qu'aucun n'a été oublié.
- **En tant que membre**, je veux consulter la fiche d'un cousin que je ne connais pas afin de savoir qui il est et comment le contacter.
- **En tant que membre**, je veux mettre à jour mon propre numéro de téléphone afin que la famille puisse toujours me joindre.
- **En tant que membre diaspora**, je veux indiquer mon pays de résidence et mon fuseau horaire afin de ne pas être notifié la nuit.
- **En tant qu'administrateur**, je veux marquer un membre comme décédé afin que les notifications ne lui soient plus adressées et que sa fiche soit archivée dans la mémoire familiale.
- **En tant que membre**, je veux voir les anniversaires du mois afin de pouvoir souhaiter à temps.
- **En tant que chef de branche**, je veux rattacher un enfant à son père afin que l'arbre généalogique soit exact.

### 4.1.5 Cas limites spécifiques au registre

- **Adoption traditionnelle** : un enfant élevé par un oncle ou une tante doit pouvoir être rattaché à deux foyers (biologique et adoptif), avec un champ précisant la nature du lien.
- **Polygamie** : un père peut avoir plusieurs épouses, chacune avec ses enfants. La fiche du père doit lister toutes ses unions, et la fiche de chaque enfant doit identifier la mère biologique.
- **Enfants hors mariage** : ils ont pleinement leur place au registre, avec indication du parent biologique connu. Leur rattachement à une branche suit la règle de la filiation paternelle reconnue, ou maternelle à défaut.
- **Conjoints externes** : un conjoint qui épouse un membre de la famille est enregistré comme « allié », sans pour autant devenir membre de la branche. Son rattachement est explicite : « époux de X ».
- **Membres brouillés** : un membre peut être temporairement désactivé (sans suppression de sa fiche) sur décision du conseil familial. Il ne reçoit alors plus de notifications mais son rattachement et son historique sont conservés.

---

## 5. Module 4.2 — L'arbre généalogique interactif

### 5.1 Description

L'arbre généalogique est la vue la plus symbolique de l'Univers 1. Il transforme une liste de noms en une représentation visuelle des liens de filiation, permettant à chaque membre de se situer dans la chaîne des générations. C'est aussi l'un des outils les plus puissants pour susciter l'adoption : peu de membres restent indifférents devant la découverte de leur propre place dans un arbre de plusieurs centaines de personnes.

### 5.2 Représentation et navigation

L'arbre est présenté sous forme graphique, avec les ancêtres en haut et les descendants en bas. Chaque nœud représente un membre, et chaque lien représente soit une filiation (parent → enfant), soit une union (époux ↔ épouse, avec mention de la date du mariage et éventuellement de la dot). Les unions polygamiques sont représentées par plusieurs liens d'union partant du même nœud père.

La navigation permet trois mouvements principaux :

1. **Zoomer / dézoomer** — pour passer d'une vue d'ensemble de toute la famille à une vue détaillée d'une sous-branche.
2. **Cliquer sur un nœud** — pour ouvrir la fiche du membre correspondant.
3. **Suivre un lien** — pour naviguer d'un membre à son père, sa mère, ses enfants, ou son conjoint.

### 5.3 Affichage par branche

L'arbre peut être filtré par branche ou par sous-branche, ce qui permet de visualiser spécifiquement la descendance d'un ancêtre commun. Cette vue est particulièrement utile lors des congrès, où chaque branche présente son état actuel.

### 5.4 Gestion des unions multiples

La gestion des unions multiples (remariage après veuvage, polygamie) est l'un des points les plus délicats. L'arbre doit afficher clairement :

- Les unions successives, avec leurs dates et leur statut (en cours, dissoutes par veuvage, divorcées).
- Les enfants issus de chaque union, rattachés aux deux parents.
- Les enfants adoptifs ou élevés dans un foyer qui n'est pas strictement biologique.

L'application ne doit jamais imposer un modèle familial unique. Elle doit accepter toutes les configurations réelles des grandes familles africaines, y compris les plus complexes.

### 5.5 Cas limites de la filiation

- **Père inconnu** : l'enfant est rattaché à la mère et à sa branche, avec un champ « père biologique » laissé vide et une mention explicite.
- **Adoption plénière** : les liens biologiques peuvent être masqués dans la vue publique, mais conservés dans la base pour la mémoire.
- **Filiation par alliance** : un beau-père qui élève les enfants de son épouse doit pouvoir être désigné comme « tuteur » ou « parent d'élevage » sans pour autant apparaître comme père biologique.
- **Membres d'origine externe** : les conjoints externes apparaissent dans l'arbre, mais leur propre ascendance n'est pas développée (sauf si leur famille d'origine est également inscrite dans l'app, ce qui est rare).

---

## 6. Module 4.3 — Branches et sous-branches

### 6.1 Définition

Une branche familiale est l'ensemble des descendants d'un ancêtre commun identifié, généralement un fils ou une fille de l'ancêtre fondateur de la famille. Dans une grande famille camerounaise, il est fréquent de compter quatre à huit branches principales, chacune comptant plusieurs dizaines à plusieurs centaines de membres. Les sous-branches descendent des petits-enfants du fondateur.

### 6.2 Structure hiérarchique

L'application gère les branches selon une hiérarchie arborescente :

```
Famille (racine)
├── Branche principale A (descendance de l'aîné du fondateur)
│   ├── Sous-branche A1
│   ├── Sous-branche A2
│   └── Sous-branche A3
├── Branche principale B
│   ├── Sous-branche B1
│   └── Sous-branche B2
└── Branche principale C
```

Chaque membre est obligatoirement rattaché à une branche principale et, le cas échéant, à une sous-branche. Le rattachement suit la règle de la filiation paternelle par défaut, mais peut être ajusté par décision du conseil familial en cas d'adoption traditionnelle, de résidence chez la famille maternelle, ou d'autres circonstances culturelles.

### 6.3 Chefs de branche

Chaque branche principale désigne un **chef de branche**, généralement l'aîné des descendants masculins de la génération en exercice, mais ce principe varie selon les traditions familiales. Le chef de branche exerce plusieurs responsabilités dans l'application :

- Valide l'inscription des nouveaux membres de sa branche (naissances, mariages entrants).
- Représente sa branche au conseil familial.
- Peut être consulté pour les décisions le concernant.
- Reçoit les notifications critiques concernant sa branche (décès, maladie grave).

Le chef de branche peut désigner un suppléant, par exemple s'il est âgé ou vit à l'étranger. La désignation du chef de branche est formalisée dans l'application par le patriarche ou le conseil familial, et fait l'objet d'une trace (date, décision, validateur).

### 6.4 Cas limites des branches

- **Branche éteinte** : si une branche n'a plus de descendant vivant, elle est marquée comme éteinte mais conservée dans l'arbre pour la mémoire. Une branche éteinte peut faire l'objet d'un hommage lors des congrès.
- **Création d'une nouvelle branche** : exceptionnellement, le conseil familial peut décider de la création d'une nouvelle branche, par exemple pour reconnaître une lignée longtemps tenue à l'écart. Cette opération est sensible et doit être tracée.
- **Changement de branche** : en cas d'erreur de rattachement initial, un membre peut être reclassé dans une autre branche. Cette opération est rare et doit être validée par les deux chefs de branche concernés.

---

## 7. Module 4.4 — Rôles et gouvernance minimale

### 7.1 Hiérarchie des rôles

L'Univers 1 porte la hiérarchie minimale nécessaire à la gouvernance de la famille. Cinq niveaux de rôles sont définis :

| Rôle | Détention | Prérogatives principales |
|---|---|---|
| Patriarche / Matriarche | Désigné par tradition familiale, généralement l'aîné de la génération régnante | Arbitre final, valide les grandes décisions, représente la famille auprès des autorités externes |
| Conseil familial | Composé des chefs de branche et d'éventuels sages cooptés | Vote les décisions importantes, arbitre les conflits, valide le règlement intérieur |
| Chef de branche | Désigné selon la tradition de chaque branche | Valide l'inscription des membres de sa branche, la représente au conseil |
| Membre adulte | Tout membre âgé de 18 ans ou plus | Consulte le registre, participe aux votes ouverts, cotise, propose des événements |
| Membre junior | Tout membre de moins de 18 ans | Consulte le registre (version filtrée), ne vote pas, ne cotise pas |

### 7.2 Permissions

Chaque rôle ouvre des droits spécifiques dans l'application. Le tableau ci-dessous synthétise les permissions principales :

| Action | Patriarche | Conseil | Chef branche | Membre adulte | Membre junior |
|---|---|---|---|---|---|
| Consulter le registre complet | Oui | Oui | Sa branche + vue publique | Vue publique | Vue publique filtrée |
| Ajouter un membre | Non (valide seulement) | Non | Oui (sa branche) | Non | Non |
| Valider un ajout | Oui | Oui | Sa branche | Non | Non |
| Marquer un décès | Valide | Oui | Sa branche | Signale | Signale |
| Modifier sa propre fiche | Oui | Oui | Oui | Oui (champs personnels) | Oui (champs personnels) |
| Créer un vote | Oui | Oui | Sa branche | Non | Non |
| Participer à un vote | Oui | Oui | Oui | Oui (selon périmètre) | Non |
| Consulter la trésorerie | Oui | Oui | Sa branche (agrégat) | Vue agrégée | Non |

### 7.3 Transition des rôles

Les transitions de pouvoir sont des moments sensibles. L'application doit formaliser chaque transition avec :

- La date d'effet.
- L'identité du prédécesseur et du successeur.
- Le type de transition (décès, démission, destitution, désignation anticipée).
- Le validateur (patriarche, conseil familial, ou assemblée générale selon les cas).
- Un journal d'audit consultable.

Cette traçabilité est essentielle pour prévenir les contestations. Dans les familles où la succession du patriarche est source de tensions, l'absence de trace formelle est un facteur majeur de conflit.

### 7.4 Cas de destitution ou de démission

Un chef de branche ou un membre du conseil peut être destitué par vote du conseil familial, selon les règles propres à chaque famille. L'application doit permettre cette procédure tout en la rendant exceptionnelle : un workflow dédié impose une justification, un délai de réflexion, et un vote à la majorité qualifiée. La destitution est consignée au journal d'audit.

---

## 8. Module 4.5 — Cartographie de la diaspora

### 8.1 Description

Les grandes familles camerounaises et africaines sont par nature dispersées. Une même famille peut compter des membres à Yaoundé, Douala, Bafoussam, Paris, Bruxelles, Montréal, Atlanta, Libreville et Dakar. Cette dispersion n'est pas un défaut : c'est une richesse, mais elle complique la communication et l'organisation. Le module Diaspora cartographie cette répartition géographique et fournit des outils de ciblage par localisation.

### 8.2 Données enregistrées

Pour chaque membre, le module enregistre :

- Le pays de résidence (obligatoire).
- La ville de résidence (obligatoire).
- Le fuseau horaire (déduit du pays, ajustable).
- La langue principale (français, anglais, langue locale).
- Le statut de résidence (résident, expatrié temporaire, étudiant à l'étranger).
- La date d'installation dans le pays actuel.

### 8.3 Vues proposées

Le module offre trois vues principales :

1. **Vue carte mondiale** — avec des points colorés par branche, permettant de visualiser la dispersion d'un coup d'œil.
2. **Vue liste par pays** — classant les membres par pays, puis par ville, avec décomptes.
3. **Vue diaspora par branche** — montrant où se trouvent les membres de chaque branche.

### 8.4 Utilité opérationnelle

Le module Diaspora sert concrètement à :

- Adapter les canaux de communication (un membre en France ne sera pas notifié via Mobile Money camerounais).
- Planifier les congrès en choisissant un lieu accessible à la majorité.
- Identifier les relais locaux dans chaque pays (un membre diaspora peut accueillir un autre membre de passage).
- Cibler les collectes de fonds exceptionnelles (les membres diaspora contribuent souvent davantage).

### 8.5 Cas limites

- **Membres sans adresse fixe** : un membre en mobilité (étudiant, militaire, commerçant itinérant) peut indiquer une zone plutôt qu'une ville précise.
- **Double résidence** : un membre vivant entre deux pays peut enregistrer deux adresses, dont une principale.
- **Confidentialité de l'adresse** : la ville et le pays sont publics familiaux, mais l'adresse précise est restreinte et visible uniquement par le comité médiation et le bureau exécutif.

---

## 9. Module 4.6 — Confidentialité et visibilité

### 9.1 Principe directeur

La confidentialité est l'un des sujets les plus sensibles de l'Univers 1. Une grande famille est un espace de solidarité mais aussi de jugement, de comparaison et parfois de conflit. Si l'application expose sans filtre toutes les informations sur tous les membres, elle sera rejetée ou détournée. Le principe directeur est donc : **chaque membre contrôle ce qu'il partage, dans le cadre fixé par les règles familiales**.

### 9.2 Niveaux de visibilité

Trois niveaux de visibilité sont définis pour chaque champ de la fiche membre :

- **Public familial** — visible par tous les membres de la famille authentifiés.
- **Restreint** — visible par le chef de branche, le conseil familial et le comité médiation.
- **Privé** — visible par le membre uniquement et, le cas échéant, par le patriarche sur demande justifiée.

### 9.3 Champs particulièrement sensibles

Certains méritent une attention particulière :

- **Santé** — par défaut restreint, avec un niveau supplémentaire « comité médiation uniquement » pour les maladies graves, les hospitalisations en cours, les handicaps.
- **Adresse précise** — restreinte par défaut, publique familiale uniquement si le membre y consent.
- **Conflits familiaux** — un membre peut demander que son numéro de téléphone ne soit pas visible par certains membres, en cas de brouille. Cette demande est examinée par le comité médiation.
- **Informations financières personnelles** — non présentes dans l'Univers 1, mais si elles le sont (revenu, situation de précarité), elles doivent être strictement privées.

### 9.4 Cas limites de confidentialité

- **Membre mineur** — sa fiche est gérée par ses parents. Les champs de santé et d'adresse sont visibles par les parents et le chef de branche.
- **Membre sous tutelle** — un membre majeur placé sous tutelle (par exemple en cas de maladie mentale grave) voit sa fiche gérée par son tuteur désigné, avec validation du conseil familial.
- **Membre décédé** — sa fiche bascule en statut « mémoire » : les champs personnels sont verrouillés, mais la photo, la biographie et les informations généalogiques deviennent pleinement publiques familiales.
- **Membre ayant quitté la famille** — en cas de divorce, sa fiche est conservée avec un statut « allié ancien », mais les champs personnels sont purgés sur sa demande.

### 9.5 Journal des consultations

Pour renforcer la confiance, l'application tient un journal des consultations des fiches sensibles. Un membre peut voir qui a consulté sa fiche restreinte (par exemple son dossier médical). Ce journal n'est pas public, mais il est consultable par le membre concerné et par le comité médiation en cas de litige. Cette transparence dissuade les consultations abusives.

---

## 10. Module 4.7 — Recherche et filtres

### 10.1 Description

Avec plusieurs centaines de membres, la recherche est une fonction critique. Un membre doit pouvoir trouver n'importe quel autre membre en quelques secondes, et un chef de branche doit pouvoir extraire sa branche en un clic. Le module Recherche offre plusieurs modes complémentaires.

### 10.2 Modes de recherche

1. **Recherche par nom** — saisie libre, tolérante aux fautes de frappe et aux accents.
2. **Recherche par filtres combinés** — branche, génération, pays, profession, tranche d'âge.
3. **Recherche par lien de parenté** — « trouver les cousins de X », « trouver les descendants de Y ».
4. **Recherche par événement** — « qui a participé au congrès de 2023 ? », « qui a cotisé pour le décès de Z ? ».

### 10.3 Déduplication et fusion

L'enrichissement progressif du registre conduit inévitablement à des doublons : un membre enregistré une première fois par le chef de branche, puis une seconde fois par un autre responsable qui ne savait pas qu'il existait déjà. L'application propose :

- Une détection automatique des doublons (mêmes nom, prénom, date de naissance, ou même numéro de téléphone).
- Un workflow de fusion assistée : un chef de branche ou un administrateur compare les deux fiches, choisit les champs à conserver, et fusionne.
- Un journal des fusions, pour préserver la trace des opérations effectuées.

### 10.4 Export et impression

Le registre peut être exporté en PDF ou en Excel, sous trois formats :

1. **Annuaire complet** — toutes les fiches, format répertoire.
2. **Annuaire par branche** — un document par branche, distribué au chef de branche.
3. **Annuaire de poche** — format condensé pour impression, distribué lors des congrès.

Ces exports répondent à un besoin réel : de nombreuses familles souhaitent conserver un support physique, notamment pour les aînés qui n'utilisent pas l'application.

---

## 11. Modèle de données conceptuel

Le modèle de données de l'Univers 1 s'articule autour de sept entités principales. Cette section présente une vue conceptuelle, indépendante de toute implémentation technique.

### 11.1 Entités principales

| Entité | Description | Attributs clés |
|---|---|---|
| Famille | La famille dans son ensemble, racine de tout | Nom, village d'origine, région, patriarche courant, histoire |
| Branche | Branche principale ou sous-branche | Nom, ancêtre fondateur, branche parent (si sous-branche), chef de branche |
| Membre | Une personne, vivante ou décédée | Identité, filiation, contact, profession, santé, préférences |
| Lien | Relation entre deux membres | Type (parent-enfant, union, adoption, tutorat), date, statut |
| Rôle | Responsabilité exercée par un membre | Type (patriarche, conseil, chef de branche), date de début, date de fin, validateur |
| Adresse | Localisation d'un membre | Pays, ville, fuseau, statut (principale, secondaire), date |
| Audit | Journal d'une action sur le registre | Auteur, action, cible, date, justification |

### 11.2 Relations principales

- Une **Famille** possède plusieurs **Branches**.
- Une **Branche** possède plusieurs **Sous-branches** et plusieurs **Membres**.
- Un **Membre** est rattaché à une **Branche** (et une seule) et peut posséder plusieurs **Adresses**.
- Un **Lien** relie deux **Membres** (avec un type et des attributs spécifiques).
- Un **Rôle** est détenu par un **Membre** pour une période donnée.
- Un **Audit** est généré à chaque opération sensible (ajout, modification, suppression, fusion, transition de rôle).

### 11.3 Règles d'intégrité

- Un membre ne peut pas être son propre ancêtre (pas de cycle dans les liens de filiation).
- Un membre ne peut pas avoir plus de deux parents biologiques.
- Un membre ne peut pas être rattaché à plus d'une branche principale.
- Un rôle ne peut pas être détenu simultanément par deux membres pour la même branche et la même période (sauf suppléance explicitement déclarée).
- Toute suppression logique (membre décédé, branche éteinte) est conservée en base, jamais purgée.

---

## 12. Règles de gestion essentielles

Les règles de gestion ci-dessous s'imposent à tous les modules de l'Univers 1. Elles doivent être configurées au moment de l'onboarding de chaque famille, et peuvent être ajustées par le conseil familial.

| # | Règle | Justification |
|---|---|---|
| R1 | Tout membre est unique et identifié par un identifiant interne permanent. | Évite les doublons et permet le suivi historique. |
| R2 | Tout membre vivant est rattaché à exactement une branche principale. | Permet le ciblage et la représentation. |
| R3 | L'ajout d'un nouveau membre est validé par le chef de branche concerné. | Garantit la légitimité de l'entrée au registre. |
| R4 | Le décès d'un membre est marqué par le chef de branche et validé par le patriarche ou le conseil. | Évite les erreurs et les fausses annonces. |
| R5 | Un membre peut modifier librement ses propres champs personnels (téléphone, e-mail, photo). | Favorise la mise à jour continue. |
| R6 | La modification des champs de filiation (père, mère, branche) est soumise à validation du chef de branche. | Protège l'intégrité de l'arbre. |
| R7 | Les champs de santé sont restreints par défaut, visibles uniquement par le comité médiation. | Protège la vie privée sur un sujet sensible. |
| R8 | Le journal d'audit est consultable par le conseil familial, jamais modifiable. | Garantit la traçabilité. |
| R9 | Aucune fiche membre n'est jamais physiquement supprimée ; les membres décédés sont archivés. | Préserve la mémoire familiale. |
| R10 | Les membres brouillés peuvent être temporairement désactivés par décision du conseil, sans suppression. | Permet de gérer les conflits sans perte de mémoire. |
| R11 | Tout changement de rôle (patriarche, chef de branche) est tracé avec date, prédécesseur, successeur, validateur. | Prévient les contestations. |
| R12 | Les exports PDF et Excel sont générés à la demande et ne sont jamais conservés en ligne plus de 30 jours. | Limite les risques de fuite. |

---

## 13. Cas limites et situations sensibles

Cette section traite explicitement les situations qui distinguent une application familiale africaine d'un simple annuaire en ligne. Ignorer ces cas conduit à un outil inutilisable en contexte réel.

### 13.1 Polygamie

La polygamie, légale et courante dans de nombreuses familles camerounaises, doit être pleinement prise en charge. Un membre masculin peut avoir plusieurs épouses simultanées, chacune avec ses enfants. La fiche du père liste toutes ses unions, avec leurs dates et leur statut. La fiche de chaque enfant identifie sa mère biologique. L'arbre généalogique représente les unions multiples par autant de liens d'union. Les droits de chaque épouse et de ses enfants sont strictement équivalents, sans hiérarchie.

### 13.2 Adoption traditionnelle

L'adoption d'un enfant par un oncle, une tante ou un grand-parent est une pratique courante dans les familles africaines. L'application doit permettre à un enfant d'être rattaché à deux foyers : son foyer biologique et son foyer d'élevage. Un champ « nature du lien » précise pour chaque rattachement s'il s'agit d'une filiation biologique, d'une adoption plénière, ou d'un tutorat. Cette double appartenance est visible dans l'arbre et prise en compte dans les calculs de représentation.

### 13.3 Divorce et séparation

En cas de divorce, le conjoint externe perd son statut d'allié et bascule en statut « ancien allié ». Sa fiche est conservée mais ses champs personnels peuvent être purgés sur sa demande. Les enfants issus de l'union conservent leur rattachement aux deux branches parentales. Si le divorce est conflictuel, des restrictions de visibilité peuvent être appliquées (numéro de téléphone masqué, par exemple), sur décision du comité médiation.

### 13.4 Brouille familiale

Une brouille grave peut conduire à la désactivation temporaire d'un membre. Sa fiche est conservée mais il ne reçoit plus de notifications, ne participe plus aux votes, et n'apparaît plus dans les annuaires exportés. Cette mesure ne peut être prononcée que par le conseil familial, avec un motif et une durée. Le membre concerné est informé. Une procédure de réhabilitation est prévue.

### 13.5 Membres hors mariage

Les enfants nés hors mariage ont pleinement leur place au registre. Ils sont rattachés au parent biologique connu et à sa branche. Si les deux parents sont connus et appartiennent à la famille (cas rare), l'enfant est rattaché aux deux branches, avec une indication de branche principale. L'application ne porte aucun jugement et ne distingue pas les enfants selon le statut marital de leurs parents.

### 13.6 Famille recomposée

Un membre divorcé ou veuf qui se remarie intègre son nouveau conjoint comme allié. Les enfants du précédent lit et du nouveau lit sont tous rattachés au membre commun, avec leurs deux parents respectifs. L'arbre généalogique montre clairement la composition du foyer recomposé sans la hiérarchiser.

### 13.7 Patrimoine et héritage

L'Univers 1 ne gère pas directement les biens fonciers et les successions, qui relèvent de l'Univers Finances ou d'un module ultérieur. Toutefois, il porte la référence aux actes notariés importants : un membre peut attacher à sa fiche des documents (actes de propriété, testaments, donations) qui seront visibles uniquement par les ayants droit désignés et le conseil familial. Cette fonctionnalité est sensible et doit être traitée avec la plus grande prudence.

---

## 14. Wireframes textuels des écrans clés

Cette section décrit en pseudo-maquettes les cinq écrans les plus importants de l'Univers 1. Ils ne préjugent pas du design final, mais fixent la structure de l'information et la hiérarchie des contenus.

### 14.1 Tableau de bord familial

```
┌────────────────────────────────────────────────────────────┐
│  MA FAMILLE                            [Profil]  [🔔 3]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Famille NDONGO                                            │
│  ─────────────────                                         │
│  👥 247 membres    🌳 6 branches    🌍 9 pays             │
│                                                            │
│  📅 PROCHAINS ÉVÉNEMENTS                                   │
│  • 12 oct. — Mariage de Marie (Branche Nord)              │
│  • 18 oct. — Anniversaire de Papa Jean (85 ans)           │
│  • 25 oct. — Réunion mensuelle Branche Sud                │
│                                                            │
│  ❤️ SOLIDARITÉ EN COURS                                    │
│  • Décès de Maman Rosine — collecte 3 200 000 / 4 000 000 │
│    [Voir le dossier]                                       │
│                                                            │
│  💰 CAISSE FAMILIALE                                       │
│  Solde : 8 250 000 FCFA — Cotisation T3 : 78% à jour       │
│                                                            │
│  🗳️ DÉCISIONS EN COURS                                    │
│  • Lieu du congrès 2027 — 134 votes / 286 concernés       │
│                                                            │
│  🔔 À FAIRE                                                │
│  • Votre cotisation T3 est en attente                     │
│  • Confirmer votre présence au congrès                    │
│  • Souhaiter anniversaire à Paul                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
[Accueil] [Membres] [Arbre] [Carte] [Profil]
```

### 14.2 Fiche membre

```
┌────────────────────────────────────────────────────────────┐
│  ← Retour                              [⋯]  [Partager]    │
├────────────────────────────────────────────────────────────┤
│  ┌──────┐                                                  │
│  │      │  Jean NDONGO                                     │
│  │Photo │  Branche Nord — Génération 4                     │
│  └──────┘  Yaoundé, Cameroun                               │
│                                                            │
│  ─── IDENTITÉ ─────────────────────────────                │
│  Né le 14 mars 1972 à Yaoundé                              │
│  Profession : Avocat                                       │
│  État civil : Marié à Clarisse                             │
│                                                            │
│  ─── FILIATION ────────────────────────────                │
│  Père : Paul NDONGO (décédé, 2018)                         │
│  Mère : Marguerite NDONGO                                  │
│  Fratrie : 3 frères, 2 sœurs                               │
│  Conjoint : Clarisse BIYA (alliance)                       │
│  Enfants : 4                                               │
│                                                            │
│  ─── CONTACT ──────────────────────────────                │
│  📞 +237 6 99 12 34 56                                     │
│  ✉️ jean.ndongo@email.com                                  │
│                                                            │
│  ─── ACTIONS ──────────────────────────────                │
│  [Appeler]  [Message]  [Voir dans l'arbre]                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.3 Arbre généalogique

```
┌────────────────────────────────────────────────────────────┐
│  Arbre généalogique                                        │
│  [Vue famille] [Branche Nord ▾]      [+ Zoom] [- Zoom]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    ┌─────────────┐                         │
│                    │  Fondateur  │                         │
│                    └──────┬──────┘                         │
│            ┌─────────────┼─────────────┐                  │
│         ┌──┴──┐       ┌──┴──┐       ┌──┴──┐              │
│         │ Aîné│       │ Cadet│      │ Benjamin│            │
│         └──┬──┘       └──┬──┘       └──┬──┘              │
│        ┌───┴───┐     ┌───┴───┐         │                  │
│      ┌─┴─┐ ┌─┴─┐  ┌─┴─┐                │                  │
│      │   │ │   │  │   │                │                  │
│      ...                                              │
│                                                            │
│  Cliquez sur un membre pour ouvrir sa fiche                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.4 Vue branche

```
┌────────────────────────────────────────────────────────────┐
│  Branche Nord                                              │
│  Chef : Papa Jean NDONGO                                   │
│  Membres : 64 (52 vivants, 12 décédés)                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Sous-branches                                             │
│  • Nord-A : 28 membres — Chef : Bernard                    │
│  • Nord-B : 22 membres — Chef : Hélène                     │
│  • Nord-C : 14 membres — Chef : Joseph                     │
│                                                            │
│  Derniers événements                                       │
│  • Naissance — enfant de Lucie (10 août)                   │
│  • Décès — Maman Rosine (25 juillet)                       │
│                                                            │
│  Cotisation T3 2026 — Branche Nord                         │
│  Payé : 41 / 52 (78%)                                      │
│  Total : 1 025 000 FCFA                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.5 Vue diaspora / carte

```
┌────────────────────────────────────────────────────────────┐
│  Carte de la diaspora                                      │
│  [Carte] [Liste par pays] [Par branche]                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🌍 9 pays — 247 membres                                   │
│                                                            │
│  🇨🇲 Cameroun      178 membres  (Yaoundé 92, Douala 54)    │
│  🇫🇷 France         28 membres  (Paris 18, Lille 6)        │
│  🇧🇪 Belgique       14 membres  (Bruxelles 12)             │
│  🇨🇦 Canada         10 membres  (Montréal 8)               │
│  🇺🇸 États-Unis      8 membres  (Atlanta 5)                │
│  🇬🇦 Gabon           5 membres  (Libreville 5)             │
│  🇸🇳 Sénégal         2 membres  (Dakar 2)                  │
│  🇬🇧 Royaume-Uni     1 membre   (Londres)                  │
│  🇩🇪 Allemagne       1 membre   (Berlin)                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Roadmap MVP et séquençage

L'Univers 1 n'est pas livrable en une seule fois. Il est séquencé en trois phases pour permettre une adoption progressive et limiter les risques.

### 15.1 Phase 1 — MVP (mois 1 à 4)

| Périmètre | Détail |
|---|---|
| Registre des membres | Fiche membre avec blocs Identité, Filiation, Appartenance, Contact, Profession |
| Branches | Création de l'arbre des branches, rattachement des membres |
| Rôles minimaux | Patriarche, chef de branche, membre adulte, membre junior |
| Tableau de bord | Écran d'accueil avec indicateurs clés |
| Import initial | Outil d'import depuis Excel, avec déduplication assistée |
| Mobile + Web | Application mobile Android + interface web responsive |

**Critères de sortie** : 80 % des membres vivants saisis, 70 % des numéros validés par OTP, 60 % des membres connectés au moins une fois.

### 15.2 Phase 2 — Enrichissement (mois 5 à 8)

| Périmètre | Détail |
|---|---|
| Arbre généalogique | Vue graphique interactive, navigation, filtres |
| Gestion des unions | Polygamie, remariages, divorces |
| Diaspora | Carte, listes par pays, fuseaux horaires |
| Confidentialité | Niveaux de visibilité par champ, restrictions |
| Recherche avancée | Filtres combinés, recherche par lien de parenté |
| Audit | Journal complet des opérations sensibles |
| Cas limites | Adoption, brouille, famille recomposée |

**Critères de sortie** : 80 % des membres rattachés à un ancêtre commun documenté, satisfaction des chefs de branche ≥ 80 %.

### 15.3 Phase 3 — Maturité (mois 9 à 14)

| Périmètre | Détail |
|---|---|
| Mémoire des anciens | Interviews audio/vidéo, biographies enrichies |
| Patrimoine documentaire | Actes notariés, testaments, documents familiaux |
| IA familiale | Assistant en langage naturel pour interroger le registre |
| Mode hors-ligne | Consultation et édition sans connexion (zones rurales) |
| Intégrations | Sync with calendriers externes, exports avancés |
| Notifications vocales | Appels automatiques pour les patriarches (alertes critiques) |

**Critères de sortie** : adoption ≥ 50 % des membres de plus de 60 ans, taux de consultation hebdomadaire ≥ 30 %.

---

## 16. Risques et points d'attention

### 16.1 Adoption par les aînés

Le risque principal est la non-adoption par les patriarches et les membres âgés, qui sont pourtant les autorités légitimes. Sans leur validation, l'application ne sera pas reconnue comme référence familiale. Les mitigations sont :

- Interface en gros caractères, navigation simplifiée, peu de menus.
- Notifications vocales (appels automatiques) pour les annonces critiques.
- Accompagnement humain lors de l'onboarding (un référent formé aide chaque patriarche).
- Support téléphonique dédié.

### 16.2 Qualité des données initiales

L'import initial est critique. Si le registre est rempli de façon incomplète ou erronée, il sera difficile à corriger et nuira à la confiance. Les mitigations sont :

- Outil d'import avec validation automatique et déduplication.
- Atelier de saisie collective avec les chefs de branche (sur une demi-journée, en présence).
- Phase de revue par le patriarche avant activation officielle.
- Procédure de correction continue pendant les six premiers mois.

### 16.3 Conflits liés à l'arbre généalogique

L'arbre peut révéler des tensions familiales (enfants naturels non reconnus, exclusions traditionnelles, rattachements contestés). Les mitigations sont :

- Possibilité de marquer un rattachement comme « en cours de validation ».
- Comité médiation formé à la gestion de ces situations.
- Validation par le patriarche de tout rattachement sensible.
- Confidentialité renforcée sur les liens contestés.

### 16.4 Confidentialité et fuites

Une fuite du registre (export sauvage, capture d'écran, mot de passe partagé) peut causer des dommages considérables. Les mitigations sont :

- Authentification à deux facteurs obligatoire.
- Filigrane nominatif sur les exports PDF (nom du membre ayant généré l'export).
- Limitation du nombre d'exports par membre et par mois.
- Journal d'audit consultable.
- Sensibilisation des membres aux bonnes pratiques.

### 16.5 Modèle économique

L'Univers 1, comme le reste de l'application, a un coût (hébergement, maintenance, support). Si l'on fait payer les membres individuellement, on freine l'adoption. Le modèle recommandé est :

- Freemium jusqu'à 50 membres (gratuit, pour permettre aux petites familles de découvrir l'outil).
- Abonnement familial modique au-delà (10 000 FCFA par an pour 50 à 200 membres, 25 000 FCFA au-delà), prélevé sur la caisse familiale.
- Services d'onboarding payants (accompagnement humain à la saisie initiale).
- Aucune publicité, aucune revente de données.

### 16.6 Dépendance à un opérateur unique

Si l'application dépend d'un seul hébergeur ou d'un seul développeur, la famille est vulnérable en cas de défaillance. Les mitigations sont :

- Code source déposé en tiers de confiance.
- Hébergement multi-zones (avec réplication).
- Documentation complète permettant à une autre équipe de reprendre le système.
- Engagement de pérennité contractuel avec le prestataire initial.

---

## 17. Indicateurs de succès

Les indicateurs ci-dessous permettent de mesurer la santé de l'Univers 1 en exploitation. Ils sont consultables en temps réel par le conseil familial sur le tableau de bord d'administration.

| Indicateur | Définition | Cible | Fréquence |
|---|---|---|---|
| Taux de complétude | Pourcentage de fiches avec tous les blocs obligatoires remplis | ≥ 90 % | Hebdomadaire |
| Taux de validation OTP | Pourcentage de numéros validés par SMS | ≥ 70 % | Mensuel |
| Délai de mise à jour | Délai moyen entre un événement familial et sa saisie | ≤ 14 jours | Mensuel |
| Utilisation hebdomadaire | Pourcentage de membres actifs par semaine | ≥ 30 % | Hebdomadaire |
| Adoption des aînés | Pourcentage de membres 60+ connectés par mois | ≥ 50 % | Mensuel |
| Satisfaction chefs de branche | Note moyenne donnée par les chefs de branche | ≥ 4/5 | Trimestriel |
| Précision de l'arbre | Pourcentage de membres rattachés à un ancêtre commun | ≥ 80 % | Trimestriel |
| Doublons détectés | Nombre de doublons en attente de fusion | ≤ 5 | Mensuel |
| Demandes de support | Nombre de demandes d'assistance par membre et par mois | ≤ 0,2 | Mensuel |
| Indisponibilité | Temps d'indisponibilité cumulé par mois | ≤ 30 minutes | Mensuel |

---

## 18. Conclusion

L'Univers 1 n'est pas un module : c'est la fondation. Sans lui, aucun autre univers de l'application ne peut fonctionner correctement. La cotisation ne peut être répartie équitablement si l'on ignore qui est membre. La solidarité ne peut être ciblée si l'on ne sait pas à quelle branche appartient la personne touchée. La gouvernance ne peut être légitime si les rôles ne sont pas clairement attribués. La mémoire ne peut être préservée si l'arbre n'est pas tracé.

Concevoir l'Univers 1 avec rigueur, c'est garantir la pertinence de toute la plateforme. Le livrer en premier, c'est permettre aux familles pilotes de découvrir une valeur immédiate. L'enrichir progressivement, c'est accepter que la mémoire familiale ne se construit pas en un jour, mais sur plusieurs années.

Les choix présentés dans ce document — sept modules, modèle de données en sept entités, hiérarchie des rôles en cinq niveaux, gestion explicite des cas limites — sont proposés comme socle commun. Chaque famille pilote devra les adapter à ses propres traditions, à son propre règlement intérieur, à sa propre gouvernance. L'application ne doit jamais imposer un modèle familial unique : elle doit offrir un cadre suffisamment souple pour accueillir toutes les formes réelles des grandes familles africaines.

Les prochaines étapes recommandées sont les suivantes :

1. **Validation de cette spécification** par le comité de pilotage et par au moins deux familles pilotes.
2. **Production des maquettes interactives** des cinq écrans clés (tableau de bord, fiche membre, arbre, branche, diaspora).
3. **Définition du modèle de données physique** et choix de la stack technique.
4. **Construction du MVP Phase 1** avec un périmètre strictement limité au registre, aux branches, aux rôles minimaux et au tableau de bord.
5. **Onboarding de la première famille pilote** dans un délai de quatre mois après le démarrage du développement.

L'Univers 1, s'il est bien conçu et bien livré, deviendra rapidement un bien commun familial dont on ne saurait plus se passer. Il transformera une mémoire fragile en patrimoine durable, et une gouvernance implicite en institution transparente.
