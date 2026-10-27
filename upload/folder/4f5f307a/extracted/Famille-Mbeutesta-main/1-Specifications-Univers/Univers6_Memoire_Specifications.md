# Univers 6 — La Mémoire

**Les archives, les ancêtres et la transmission familiale**

| Document | Spécifications fonctionnelles — Univers 6 |
|---|---|
| Version | 1.0 |
| Date | Septembre 2026 |
| Statut | Pour validation |
| Audience | Chefs de famille, comité culturel, comité de pilotage, équipe produit, équipe développement |
| Prérequis | Spécifications Univers 1 à 5 |

---

## Synthèse exécutive

L'Univers 6, intitulé **« La Mémoire »**, est le gardien du patrimoine immatériel de la famille. C'est le réceptacle de tout ce que les autres univers produisent et qui mérite d'être conservé : les procès-verbaux des congrès, les dossiers de solidarité clôturés, les albums de mariages et de funérailles, les bilans financiers annuels, les décisions du conseil, les témoignages recueillis lors des événements. C'est aussi le lieu de la mémoire vive : les interviews des anciens, les récits des origines, les traditions, les chansons, les recettes, les proverbes. Sans cet univers, la famille vit dans le présent éphémère ; avec lui, elle se transmet de génération en génération.

La proposition centrale de l'Univers 6 est de remplacer la mémoire fragile — celle qui se perd quand un ancien disparaît, quand un album photo se détériore, quand un règlement intérieur est égaré — par un **patrimoine numérique durable, structuré et consultable**. Chaque document, chaque photo, chaque témoignage, chaque tradition est archivé, indexé, et rattaché à son contexte (membre, branche, événement, époque). Les descendants peuvent, dans vingt ou cinquante ans, retrouver l'intégralité de la mémoire de leur famille, écouter la voix d'un arrière-grand-père qu'ils n'ont pas connu, voir les photos du congrès de 2025, lire les motifs d'une décision prise en 2030.

Le présent document définit le rôle, les objectifs, l'architecture en sept modules, le modèle de données, les règles de gestion, les cas limites et la roadmap de l'Univers 6. Il s'appuie sur l'Univers 1 (membres, branches, arbre généalogique) pour identifier les personnes et leurs liens, et reçoit les archives de l'Univers 2 (événements clôturés), de l'Univers 3 (dossiers de solidarité clôturés), de l'Univers 4 (bilans financiers annuels), et de l'Univers 5 (PV, décisions, règlement). L'Univers 6 est conçu pour transformer une mémoire qui se perd en un patrimoine qui se transmet, sans réduire les traditions vivantes à de simples objets numériques.

---

## 1. Rôle et finalité de l'Univers 6

### 1.1 Rôle stratégique

L'Univers 6 joue quatre rôles stratégiques imbriqués qui en font le gardien du patrimoine familial.

**Premièrement, il est le réceptacle unique des archives des autres univers.** Chaque fois qu'un événement est clôturé dans l'Univers 2, qu'un dossier de solidarité est clôturé dans l'Univers 3, qu'un exercice annuel est clôturé dans l'Univers 4, ou qu'un PV est validé dans l'Univers 5, le système archive automatiquement l'ensemble du dossier dans l'Univers 6. Cette archivage automatique garantit que rien ne se perd : même si un membre supprime par erreur un élément dans l'application courante, l'archive reste intacte et consultable. C'est la sécurité ultime contre la perte d'information.

**Deuxièmement, il est le gardien de la mémoire des ancêtres.** Dans les grandes familles africaines, la mémoire orale est portée par les anciens. Quand un ancien disparaît, c'est une partie de l'histoire familiale qui s'efface : les récits des origines, les anecdotes des aïeux, les leçons de vie, les traditions orales. L'Univers 6 propose de capter cette mémoire avant qu'elle ne disparaisse, par des interviews audio et vidéo, des biographies rédigées, des récits collectés. C'est un travail urgent, car les anciens de la génération régnante actuelle sont les derniers à avoir connu les fondateurs. Dans dix ou vingt ans, il sera trop tard.

**Troisièmement, il est le conservatoire du patrimoine immatériel.** Une famille, c'est aussi des traditions : des chansons, des recettes, des proverbes, des rites de passage, des cérémonies traditionnelles, des lieux symboliques. Ce patrimoine immatériel se transmet oralement, et il est menacé par l'urbanisation, la diaspora, et l'uniformisation culturelle. L'Univers 6 propose de le documenter, de l'organiser, et de le rendre accessible aux jeunes générations, qui pourront ainsi se reconnecter à leurs racines même en vivant à l'étranger.

**Quatrièmement, il est l'infrastructure de la transmission intergénérationnelle.** Une famille qui dure, c'est une famille qui se raconte. Les descendants doivent pouvoir comprendre d'où ils viennent, quels ont été les choix de leurs aïeux, quelles valeurs les ont animés, quelles épreuves ils ont traversées. L'Univers 6 propose une narration structurée : frise chronologique, récits fondateurs, portraits d'ancêtres, événements marquants. Cette narration est essentielle pour que les jeunes générations s'identifient à la famille et acceptent d'y contribuer à leur tour.

### 1.2 Finalité opérationnelle

Sur le plan opérationnel, l'Univers 6 poursuit une finalité claire : **qu'à tout moment, tout membre autorisé puisse répondre à cinq questions fondamentales** :

1. Où trouver les archives d'un événement passé (mariage, congrès, funérailles), avec ses photos, ses témoignages, et son bilan ?
2. Quels sont les récits et interviews des anciens de la famille, et comment y accéder ?
3. Où trouver le règlement intérieur, les PV des dernières assemblées, et les décisions historiques de la famille ?
4. Quelles sont les traditions, coutumes, et patrimoine immatériel de la famille ?
5. Comment contribuer à la mémoire (partager une photo, témoigner, enregistrer un ancien) ?

Si ces cinq questions trouvent une réponse immédiate et fiable, l'Univers 6 remplit sa mission. La mémoire cesse d'être un sujet de nostalgie inaccessible pour devenir un patrimoine vivant et partagé.

### 1.3 Quatre dimensions de la mémoire

L'Univers 6 distinguera systématiquement quatre dimensions de la mémoire, qui appellent des réponses différentes :

- **La dimension documentaire** — documents officiels, PV, contrats, statuts, actes notariés. Elle est portée par le module Bibliothèque documentaire et le module Archives d'événements.
- **La dimension visuelle** — photos, vidéos, albums d'événements. Elle est portée par le module Albums photo et vidéo.
- **La dimension orale** — interviews, récits, témoignages, biographies. Elle est portée par le module Mémoire des anciens.
- **La dimension patrimoniale** — traditions, coutumes, recettes, chansons, rites, lieux symboliques. Elle est portée par le module Patrimoine et traditions.

Cette distinction structure tout l'Univers 6 : chaque type de mémoire a ses propres modes de collecte, de conservation, et de consultation. Les confondre conduirait à traiter une interview d'ancien comme un document administratif, ou une tradition comme un album photo, ce qui en effacerait la singularité.

---

## 2. Objectifs mesurables

L'Univers 6 doit être évalué sur des indicateurs concrets. Les objectifs ci-dessous sont proposés pour la première année d'exploitation, sur une famille pilote de 150 à 300 membres.

| Objectif | Indicateur | Cible année 1 |
|---|---|---|
| Taux d'archivage automatique | Pourcentage de dossiers clôturés (U2/U3/U4/U5) automatiquement archivés | 100 % |
| Interviews des anciens | Nombre d'anciens (60+ ans) ayant au moins une interview enregistrée | ≥ 50 % |
| Couverture documentaire | Pourcentage de documents officiels (statuts, PV, contrats) archivés | ≥ 80 % |
| Albums enrichis | Pourcentage d'événements clôturés avec album ≥ 10 photos | ≥ 70 % |
| Fréquentation des archives | Taux de membres consultant les archives par mois | ≥ 30 % |
| Contributions collaboratives | Nombre de contributions (photos, témoignages) par mois | ≥ 20 |
| Satisfaction sur la transmission | Note moyenne des membres sur la qualité de la transmission | ≥ 4/5 |
| Traditions documentées | Nombre de traditions (recettes, rites, chansons) documentées | ≥ 30 |
| Disponibilité des archives | Taux de disponibilité du service archives | ≥ 99,5 % |
| Sauvegarde externe | Nombre de sauvegardes externes par an | ≥ 4 (trimestrielles) |

Ces cibles sont indicatives ; elles devront être ajustées avec les familles pilotes. Elles traduisent l'ambition : une mémoire complète, vivante, accessible, et durablement conservée.

---

## 3. Architecture fonctionnelle

L'Univers 6 est composé de **sept modules fonctionnels** qui s'articulent autour d'un cœur commun : l'archive. La bibliothèque, les albums, la mémoire des anciens, l'histoire, les archives d'événements, le patrimoine et la recherche sont autant de dimensions complémentaires de la mémoire familiale.

### Vue d'ensemble des modules

```
┌─────────────────────────────────────────────────────────────┐
│              UNIVERS 6 — LA MÉMOIRE                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CŒUR : L'archive (réceptacle des autres univers)       │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐  │
│   ▼          ▼          ▼          ▼          ▼          ▼  │
│  Bibliothèque Albums    Mémoire   Histoire   Archives   Patri- │
│  documentaire photo &   des       familiale  d'événements moine│
│              vidéo      anciens                         &     │
│                                                        trad. │
│                       ┌────────────────┐                     │
│                       │ Recherche &     │                     │
│                       │ exploration     │                     │
│                       └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

L'organisation de l'application reflète cette architecture : un tableau de bord de la mémoire affiche les dernières archives, les interviews récentes, les contributions des membres, et les suggestions de découverte. Les membres consultent, contribuent, et explorent.

### Navigation principale

La navigation de l'Univers 6 s'organise autour de cinq entrées principales :

1. **Bibliothèque** — documents officiels, PV, contrats, statuts, consultables et téléchargeables.
2. **Albums** — photos et vidéos d'événements, organisés par année et par type.
3. **Anciens** — interviews, biographies, récits des anciens de la famille.
4. **Histoire** — frise chronologique, faits marquants, récits fondateurs.
5. **Traditions** — coutumes, recettes, chansons, rites, patrimoine immatériel.

Une entrée **Recherche** accessible depuis tous les écrans permet de rechercher en plein texte dans l'ensemble des archives.

---

## 4. Module 4.1 — La bibliothèque documentaire

### 4.1.1 Description

La bibliothèque documentaire est le coffre-fort numérique de la famille. Elle conserve les documents officiels et structurés : statuts, règlement intérieur, PV des assemblées et congrès, contrats, actes notariés, testaments, rapports annuels, correspondances officielles. Ces documents ont une valeur juridique, historique, ou institutionnelle, et leur conservation doit être irréprochable.

### 4.1.2 Types de documents

| Type | Description | Source | Confidentialité |
|---|---|---|---|
| Statuts et règlement | Textes fondamentaux de la famille | U5 (Gouvernance) | Public familial |
| PV d'assemblées et congrès | Comptes-rendus officiels | U5 | Public familial |
| PV de conseil et de comités | Comptes-rendus internes | U5 | Restreint (conseil + comité) |
| Bilans financiers annuels | Compte de résultat, bilan, rapport d'audit | U4 | Public familial |
| Contrats et actes notariés | Actes de propriété, testaments, donations | Saisie manuelle | Restreint (conseil + ayants droit) |
| Correspondances officielles | Lettres de la famille à des tiers | Saisie manuelle | Restreint (conseil) |
| Rapports de comités | Rapports annuels des comités | U5 | Public familial |
| Documents d'identité familiale | Cartes de membre, certificats | U1 | Restreint (membre + conseil) |

### 4.1.3 Organisation et versioning

Chaque document est organisé selon une hiérarchie claire :

- **Type** — statuts, PV, contrat, etc.
- **Année** — pour faciliter la recherche chronologique.
- **Instance émettrice** — assemblée, congrès, conseil, comité.
- **Version** — pour les documents amendables (statuts, règlement), avec historique complet.

Le versioning est essentiel pour les statuts et le règlement intérieur : chaque version est conservée, avec sa date d'adoption, son motif, et la référence au PV qui l'a validée. Les membres peuvent comparer deux versions pour voir les évolutions.

### 4.1.4 Droits d'accès

Les droits d'accès varient selon le type de document et le rôle du membre :

- **Documents publics familiaux** (statuts, règlement, PV d'assemblée, bilans) — accessibles à tous les membres.
- **Documents restreints** (PV de conseil, contrats, testaments) — accessibles au conseil, au comité médiation, et aux ayants droit désignés.
- **Documents confidentiels** (testaments non ouverts, dossiers sensibles) — accessibles uniquement au patriarche et au comité médiation, avec journal des consultations.

Cette gradation protège à la fois la transparence (les membres ont accès aux décisions officielles) et la confidentialité (les documents sensibles ne sont pas exposés).

### 4.1.5 Conservation longue durée

Les documents officiels doivent être conservés indéfiniment. L'Univers 6 applique les règles suivantes :

- **Triple stockage** — chaque document est stocké sur trois supports indépendants (serveur principal, sauvegarde externalisée, archive froide).
- **Format durable** — les documents sont conservés en format PDF/A (norme ISO 19005) pour les textes, et JPEG/TIFF pour les images.
- **Migration périodique** — tous les 5 ans, les formats sont vérifiés et migrés si nécessaire pour prévenir l'obsolescence.
- **Horodatage** — chaque document est horodaté cryptographiquement, pour garantir son authenticité.

Ces précautions sont essentielles : un document perdu ou altéré ne peut pas être reconstitué.

### 4.1.6 Cas limite — document sensible

Certains documents (testaments, contrats de succession, dossiers judiciaires) sont particulièrement sensibles. Le système prévoit :

- Un statut « scellé », qui masque le document jusqu'à une date ou un événement défini (par exemple, décès du testateur).
- Un accès conditionnel, qui requiert la validation du patriarche et du comité médiation.
- Un journal des consultations, consultable par le membre concerné (s'il est vivant) ou par ses ayants droit.

Cette gestion prévient les indiscrétions tout en garantissant la conservation.

---

## 5. Module 4.2 — Albums photo et vidéo

### 5.1 Description

Les albums photo et vidéo sont la mémoire visuelle de la famille. Ils Captent les moments de joie (mariages, baptêmes, congrès, journées familiales) et de tristesse (funérailles, levées de deuil), les visages des membres à différentes époques, les lieux symboliques, les décors des événements. Sans conservation organisée, ces photos se perdent dans les smartphones, les disques durs, ou les albums papier qui se détériorent.

### 5.2 Albums d'événements

Chaque événement clôturé dans l'Univers 2 génère automatiquement un album dans l'Univers 6. L'album est lié à l'événement par un identifiant partagé, et hérite de ses métadonnées (date, lieu, branche concernée, participants). Les membres peuvent y contribuer en téléversant leurs propres photos, ce qui crée un album collaboratif et exhaustif.

### 5.3 Tagging automatique

Le système applique un tagging automatique aux photos téléversées :

- **Reconnaissance faciale** — détection des membres connus (à partir du registre U1), avec proposition de tags.
- **Détection de lieu** — à partir des métadonnées EXIF ou de la reconnaissance visuelle.
- **Détection de date** — à partir des métadonnées EXIF ou de l'événement rattaché.
- **Tags manuels** — ajoutés par le contributeur (moments clés, émotions, contextes).

Le tagging automatique permet de retrouver facilement toutes les photos d'un membre, d'un lieu, ou d'une période. Il facilite aussi la création d'albums thématiques (par exemple, « tous les patriarches », « les congrès à travers les années »).

### 5.4 Albums collaboratifs

Un album est collaboratif : tous les membres présents à l'événement peuvent y contribuer. Le système gère :

- **Modération** — par le référent de l'événement, qui peut retirer une photo inappropriée.
- **Droit à l'image** — un membre peut demander le retrait d'une photo où il apparaît, sans avoir à justifier.
- **Témoignages** — chaque photo peut être accompagnée d'un témoignage ou d'un commentaire.
- **Sélection** — le référent peut désigner des « photos emblématiques » qui apparaissent en tête d'album.

### 5.5 Narration et récits

Un album n'est pas qu'une collection de photos : c'est une histoire. L'Univers 6 permet d'ajouter une narration à chaque album :

- **Texte d'introduction** — rédigé par le référent, qui présente l'événement et son contexte.
- **Légendes** — pour les photos emblématiques.
- **Témoignages** — recueillis auprès des participants.
- **Bilan** — pour les événements avec bilan financier ou narratif (lien U2/U3/U4).

Cette narration transforme l'album en récit, consultable et transmissible.

### 5.6 Préservation numérique

Les photos et vidéos sont conservées selon les règles suivantes :

- **Format original** — conservation du format d'origine pour préserver la qualité.
- **Format de consultation** — génération automatique de versions compressées pour la consultation rapide.
- **Triple stockage** — comme pour les documents, sur trois supports indépendants.
- **Migration périodique** — tous les 5 ans, vérification et migration des formats.

La préservation numérique est un défi technique : les formats évoluent, les supports se dégradent. L'Univers 6 applique les meilleures pratiques professionnelles pour garantir que les photos d'aujourd'hui seront encore visibles dans 50 ans.

### 5.7 Cas limite — photo offensante ou blessante

Une photo peut être offensante (par exemple, photo d'un membre dans une situation compromettante) ou blessante (photo d'un deuil diffusée sans autorisation). Le système prévoit :

- Un signalement par tout membre, qui déclenche un retrait temporaire immédiat.
- Un examen par le référent de l'événement et le comité médiation.
- Une décision définitive (retrait, conservation avec restriction, ou conservation publique).
- Un journal des signalements et décisions, pour la traçabilité.

Cette procédure protège la dignité des membres tout en préservant la liberté de contribution.

---

## 6. Module 4.3 — La mémoire des anciens

### 6.1 Description

La mémoire des anciens est le patrimoine le plus précieux et le plus menacé de la famille. Chaque ancien porte en lui des décennies d'histoire familiale, des récits des origines, des anecdotes des aïeux, des leçons de vie, des traditions orales. Quand un ancien disparaît, c'est une bibliothèque qui brûle. L'Univers 6 propose de capter cette mémoire avant qu'il ne soit trop tard, par des interviews audio et vidéo, des biographies rédigées, et des récits collectés.

### 6.2 Le caractère urgent

Le travail de collecte de la mémoire des anciens est urgent. Les anciens de la génération régnante actuelle (70 à 90 ans) sont les derniers à avoir connu personnellement les fondateurs de la famille. Ils ont entendu leurs récits, assisté à leurs décisions, observé leurs coutumes. Quand ils disparaîtront, ces liens directs avec les origines seront rompus. L'Univers 6 propose donc une priorité aux interviews des anciens les plus âgés, avec un objectif de couverture de 50 % la première année, et 90 % dans les trois ans.

### 6.3 Interviews audio et vidéo

Les interviews sont le format principal de la collecte. Le système propose :

- **Un guide d'entretien** — structuré en thèmes (origines, enfance, vie adulte, mariage, enfants, carrière, leçons de vie, message aux jeunes générations).
- **Un enregistrement audio et vidéo** — via l'application mobile, avec qualité suffisante pour une conservation longue durée.
- **Une transcription automatique** — par reconnaissance vocale, avec correction manuelle.
- **Une indexation** — par thèmes, noms cités, lieux évoqués, pour faciliter la recherche.
- **Des chapitres** — découpage de l'interview en séquences thématiques, navigables.

Chaque interview est rattachée au membre interviewé (lien U1), à sa branche, et à sa génération. Elle est consultable par tous les membres, sauf restriction demandée par l'ancien.

### 6.4 Biographies

En complément des interviews, le système propose des biographies rédigées, structurées en :

- **Fiche d'identité** — nom, dates, lieu de naissance, filiation, profession, famille.
- **Parcours de vie** — éducation, carrière, mariages, enfants, lieux de résidence.
- **Contributions à la famille** — rôles exercés, décisions marquantes, actions menées.
- **Anecdotes et souvenirs** — récits personnels, moments forts.
- **Message aux générations futures** — rédigé par l'ancien lui-même, ou recueilli par un proche.

Les biographies peuvent être rédigées par l'ancien lui-même, par un membre de sa famille, ou par le comité culturel. Elles sont validées par l'ancien (s'il est vivant) avant publication.

### 6.5 Récits collectés

Au-delà des interviews structurées, le système collecte des récits plus libres :

- **Récits des origines** — mythes fondateurs, histoire des ancêtres, migration.
- **Récits d'événements marquants** — grands congrès, conflits résolus, réussites collectives.
- **Récits de traditions** — cérémonies, rites, coutumes, leur sens et leur histoire.
- **Proverbes et sagesses** — recueillis et expliqués.

Ces récits sont collectés par le comité culturel, qui organise des sessions de collecte lors des congrès et des réunions de branche. Ils sont indexés par thèmes et par auteurs.

### 6.6 Conservation et accès

Les interviews, biographies, et récits sont conservés selon les règles suivantes :

- **Triple stockage** — comme pour les autres documents.
- **Format durable** — MP3/WAV pour l'audio, MP4/MOV pour la vidéo, PDF/A pour les textes.
- **Accès public familial** — par défaut, sauf restriction.
- **Restriction temporaire** — un ancien peut demander qu'un témoignage ne soit diffusé qu'après son décès, ou après un délai défini.

### 6.7 Cas limite — ancien qui décède avant l'interview

Le risque majeur est qu'un ancien décède avant d'avoir pu enregistrer son témoignage. Le système prévoit :

- **Une priorisation** — les anciens les plus âgés ou en mauvaise santé sont interviewés en priorité.
- **Une collecte posthume** — en cas de décès, le comité culturel collecte les témoignages des proches, des enfants, des amis, pour reconstituer la mémoire de l'ancien.
- **Un hommage** — une page mémoire est créée, avec photos, témoignages, biographie, et le récit de son vivant.

Cette collecte posthume ne remplace pas l'interview directe, mais elle évite la perte totale de la mémoire.

---

## 7. Module 4.4 — L'histoire familiale

### 7.1 Description

L'histoire familiale est la narration structurée du passé collectif. Elle transforme une collection de documents, de photos, et de témoignages en un récit cohérent, accessible aux jeunes générations. Sans cette narration, la mémoire reste éclatée et difficile à appréhender ; avec elle, la famille se raconte et se transmet.

### 7.2 La frise chronologique

La frise chronologique est l'épine dorsale de l'histoire familiale. Elle présente les événements marquants de la famille dans leur ordre temporel, des origines à aujourd'hui. Chaque événement est rattaché à :

- Une date (exacte ou approximative).
- Un lieu.
- Une description courte.
- Un type (naissance, décès, mariage, congrès, achat de terrain, migration, réussite, épreuve).
- Un lien vers les archives détaillées (album, PV, témoignage).

La frise est navigable, filtrable par type, par branche, ou par période. Elle permet à un membre de visualiser d'un coup d'œil les grands moments de la famille.

### 7.3 Les récits fondateurs

Les récits fondateurs sont les histoires qui structurent l'identité familiale : l'origine du nom, la migration des ancêtres, l'installation au village, la fondation de la famille, les premières grandes décisions. Ces récits sont collectés auprès des anciens, validés par le comité culturel, et publiés dans une section dédiée. Ils peuvent évoluer au fil du temps, à mesure que de nouvelles informations sont découvertes ou que de nouveaux témoignages sont recueillis.

### 7.4 La lignée des patriarches

La lignée des patriarches est une section spécifique qui retrace la succession des autorités familiales depuis le fondateur. Chaque patriarche fait l'objet d'une fiche détaillée :

- Dates de naissance et de décès.
- Durée du patriarcat.
- Décisions marquantes prises sous son autorité.
- Événements majeurs de son époque.
- Portrait et témoignages.
- Lien vers le PV de son intronisation (si disponible).

Cette lignée est essentielle pour la continuité institutionnelle : elle rappelle que la famille dépasse les individus et s'inscrit dans une chaîne de générations.

### 7.5 Les grandes dates

Le système propose une section « grandes dates » qui liste les événements les plus marquants, classés par ordre d'importance (et non chronologique) :

- Fondation de la famille.
- Première acquisition de terrain.
- Premier congrès familial.
- Première diaspora (premier membre parti à l'étranger).
- Première femme diplômée de l'université.
- Première célébration d'un centenaire.
- Étc.

Ces grandes dates sont des repères qui aident les jeunes générations à situer leur famille dans le temps long.

### 7.6 Cartes et lieux symboliques

L'histoire familiale est aussi géographique. Le système propose une carte interactive qui localise :

- Le village d'origine.
- Les lieux de résidence historiques des membres.
- Les terrains et propriétés familiales.
- Les lieux des grands événements (congrès, mariages, funérailles).
- Les lieux de sépulture des ancêtres.

Cette carte permet de visualiser la dispersion géographique de la famille et de situer les événements dans leur contexte spatial.

### 7.7 Cas limite — mémoire conflictuelle

L'histoire familiale peut être conflictuelle : tel événement est raconté différemment selon les branches, tel ancêtre est contesté, telle décision est contestée. Le système gère ce cas en :

- Permettant l'enregistrement de plusieurs versions d'un même récit, avec mention de leurs sources.
- Proposant une version officielle validée par le comité culturel, mais en conservant les versions alternatives.
- Invitant le comité médiation à arbitrer en cas de conflit ouvert.

Cette approche évite l'imposition d'une version unique qui serait contestée, tout en proposant une narration officielle pour la transmission.

---

## 8. Module 4.5 — Les archives d'événements et de décisions

### 8.1 Description

Les archives d'événements et de décisions sont le réceptacle automatique des dossiers clôturés des autres univers. Chaque fois qu'un événement U2, un dossier U3, un exercice U4, ou un PV U5 est clôturé, il est automatiquement archivé dans l'Univers 6, avec l'ensemble de ses métadonnées, de ses documents, et de ses liens.

### 8.2 Archivage automatique

L'archivage est automatique, déclenché par la clôture dans l'univers source. Le tableau ci-dessous précise les règles :

| Source | Élément archivé | Contenu de l'archive |
|---|---|---|
| U2 (Événements) | Dossier d'événement clôturé | Métadonnées, programme, participants, contributions, album, bilan |
| U3 (Solidarité) | Dossier de solidarité clôturé | Métadonnées, collecte, dépenses, justificatifs, suivi, bilan |
| U4 (Finances) | Exercice annuel clôturé | Bilan, compte de résultat, balance, rapports d'audit |
| U5 (Gouvernance) | PV validé, décision adoptée | PV, motions, votes, résultats, signatures |

L'archivage est immédiat : dès la clôture, l'archive est créée et consultable. Le système garantit qu'aucun dossier clôturé n'échappe à l'archivage.

### 8.3 Cross-références

Les archives sont cross-référencées entre elles. Par exemple :

- L'archive d'un congrès U2 est liée au PV du congrès U5, au bilan financier de l'exercice U4, et aux éventuels dossiers de solidarité U3 ouverts à l'occasion.
- L'archive d'un décès U2 est liée au dossier de solidarité U3, à l'album photo U6, et à la biographie du membre U6.

Ces cross-références permettent de naviguer d'une archive à l'autre, et de reconstituer le contexte complet d'un événement ou d'une décision.

### 8.4 Conservation à long terme

Les archives sont conservées indéfiniment. Le système applique les règles de conservation longue durée déjà décrites :

- Triple stockage.
- Format durable.
- Migration périodique.
- Horodatage cryptographique.

Aucune archive n'est jamais supprimée, sauf décision exceptionnelle du conseil (par exemple, effacement d'un contenu diffamatoire sur décision de justice).

### 8.5 Recherche dans les archives

Les archives sont consultables via le module Recherche et exploration (4.7), qui propose :

- **Recherche plein texte** dans l'ensemble des archives.
- **Filtres** par univers source, par type, par date, par branche.
- **Navigation temporelle** — frise chronologique des archives.
- **Suggestions** — archives connexes, archives susceptibles d'intéresser le membre.

Cette recherche permet de retrouver rapidement n'importe quel élément archivé, même des années après sa clôture.

### 8.6 Cas limite — modification d'une archive

Une archive est immutable par défaut : une fois créée, elle ne peut plus être modifiée. Toutefois, le système prévoit une procédure exceptionnelle d'amendement, pour corriger une erreur factuelle ou ajouter une information complémentaire :

- Proposition d'amendement par un membre autorisé.
- Validation par le conseil.
- Avenant ajouté à l'archive, avec mention du motif et du validateur.
- L'archive originale n'est pas modifiée ; l'avenant est consultable à côté.

Cette procédure préserve l'intégrité de l'archive tout en permettant les corrections nécessaires.

---

## 9. Module 4.6 — Patrimoine et traditions

### 9.1 Description

Le patrimoine et les traditions sont la dimension culturelle de la mémoire familiale. Une famille, ce n'est pas que des individus et des événements : c'est aussi un ensemble de coutumes, de rites, de chansons, de recettes, de proverbes, de lieux symboliques, qui font sa singularité et sa richesse. L'Univers 6 propose de documenter, d'organiser, et de transmettre ce patrimoine immatériel, menacé par l'urbanisation, la diaspora, et l'uniformisation culturelle.

### 9.2 Types de patrimoine

| Type | Description | Exemples |
|---|---|---|
| Coutumes et rites | Cérémonies traditionnelles, rites de passage | Dot, levée de deuil, cérémonie de purification, rites funéraires |
| Recettes | Cuisine familiale, plats traditionnels | Ndolé de la famille, sauce gombo, poisson braisé, plats de fête |
| Chansons et musiques | Chants familiaux, musiques traditionnelles | Chant de bienvenue, chants funéraires, musique de danse |
| Proverbes et sagesses | Proverbes familiaux, paroles des anciens | Proverbes en langue locale, leçons de vie |
| Lieux symboliques | Lieux chargés d'histoire familiale | Village d'origine, arbre à palabres, case des ancêtres, sources sacrées |
| Patrimoine linguistique | Langues et dialectes familiaux | Mots spécifiques, expressions, comptines |
| Savoir-faire | Techniques artisanales, métiers familiaux | Poterie, vannerie, médecine traditionnelle, agriculture |

### 9.3 Documentation

Chaque élément du patrimoine est documenté de manière structurée :

- **Description** — texte explicatif, avec contexte et sens.
- **Origine** — d'où vient la coutume, qui l'a introduite, depuis quand.
- **Règles et déroulement** — pour les rites et cérémonies.
- **Ingrédients et recette** — pour les plats.
- **Paroles et mélodie** — pour les chansons.
- **Photos et vidéos** — illustrations et démonstrations.
- **Témoignages** — recueillis auprès des gardiens des traditions.
- **Lien avec les événements** — quand cette coutume est-elle pratiquée ?

Cette documentation est collectée par le comité culturel, qui organise des sessions de collecte lors des congrès et des réunions de branche.

### 9.4 Transmission

La transmission est l'objectif ultime du module Patrimoine. Le système propose :

- **Des fiches pédagogiques** — pour expliquer les traditions aux jeunes générations, dans un langage accessible.
- **Des vidéos tutorielles** — pour les rites et les recettes, permettant aux jeunes de les reproduire.
- **Des sessions de transmission** — organisées lors des congrès, où les anciens transmettent les traditions aux jeunes.
- **Des quiz et jeux** — pour tester la connaissance des traditions de manière ludique.

Cette transmission est essentielle pour que les traditions ne deviennent pas de simples objets de musée, mais restent vivantes et pratiquées.

### 9.5 Cas limite — tradition secrète

Certaines traditions (rites initiatiques, cérémonies réservées aux aînés, savoirs sacrés) ne doivent pas être exposées publiquement. Le système prévoit :

- Un statut « tradition restreinte », avec un périmètre de consultation défini par le patriarche.
- Une documentation allégée pour les non-initiés (description générale sans détails).
- Une documentation complète pour les initiés, accessible uniquement avec autorisation.

Cette gradation respecte le caractère sacré de certaines traditions tout en préservant leur mémoire pour les générations futures.

### 9.6 Cas limite — tradition en voie de disparition

Certaines traditions ne sont plus pratiquées, faute de gardiens ou de contexte. Le système prévoit :

- Un statut « tradition éteinte », pour les traditions qui ne sont plus pratiquées mais dont la mémoire est conservée.
- Une documentation aussi complète que possible, à partir des souvenirs des anciens.
- Le cas échéant, une proposition de relance, si le contexte le permet.

La conservation de la mémoire des traditions éteintes est essentielle : elle témoigne de l'évolution de la famille et préserve la possibilité d'un retour.

---

## 10. Module 4.7 — Recherche et exploration

### 10.1 Description

La recherche et l'exploration sont les portes d'entrée de l'Univers 6. Sans elles, les archives seraient un cimetière numérique : riches mais inaccessibles. Le module Recherche propose plusieurs modes d'accès complémentaires, adaptés aux différents besoins des membres.

### 10.2 Moteur de recherche plein texte

Le moteur de recherche plein texte permet de chercher un mot, une phrase, un nom dans l'ensemble des archives (documents, albums, témoignages, traditions). Il propose :

- **Recherche simple** — saisie libre, avec autocomplétion.
- **Recherche avancée** — filtres par type, par date, par branche, par auteur, par lieu.
- **Recherche par membre** — toutes les archives mentionnant un membre donné.
- **Recherche par événement** — toutes les archives liées à un événement donné.
- **Suggestions** — archives connexes, recherches populaires.

Les résultats sont triés par pertinence, avec des extraits mis en évidence. Cette recherche est l'outil quotidien des membres qui cherchent une information précise.

### 10.3 Navigation temporelle

La navigation temporelle permet de parcourir les archives par période :

- **Frise chronologique** — vue d'ensemble des archives par décennie.
- **Sélection par année** — toutes les archives d'une année donnée.
- **Comparaison de périodes** — par exemple, les congrès des années 2000 vs 2020.

Cette navigation est adaptée à l'exploration sans but précis, ou à la recherche de contexte historique.

### 10.4 Cartes et graphes

Le module propose des visualisations cartographiques et relationnelles :

- **Carte des lieux** — localisation des événements, des résidences, des lieux symboliques.
- **Graphe des relations** — visualisation des liens entre membres, événements, et archives.
- **Carte de la diaspora** — évolution de la dispersion géographique dans le temps.

Ces visualisations offrent une compréhension globale de la famille qui ne ressort pas de la consultation individuelle des archives.

### 10.5 Suggestions personnalisées

Le système propose des suggestions personnalisées à chaque membre, en fonction de :

- **Sa branche** — archives de sa branche mises en avant.
- **Ses ancêtres** — archives mentionnant ses parents, grands-parents, arrière-grands-parents.
- **Ses contributions** — archives auxquelles il a contribué.
- **Ses recherches précédentes** — archives similaires à celles qu'il a consultées.

Ces suggestions favorisent la découverte et l'engagement.

### 10.6 Cas limite — recherche infructueuse

Si une recherche ne retourne aucun résultat, le système propose :

- Des recherches alternatives (synonymes, orthographes proches).
- Une demande de contribution (« cette information n'est pas encore dans les archives, voulez-vous la partager ? »).
- Un contact avec le comité culturel, qui peut orienter ou enrichir les archives.

Cette gestion prévient la frustration et transforme une recherche infructueuse en opportunité de contribution.

---

## 11. Modèle de données conceptuel

Le modèle de données de l'Univers 6 s'articule autour de sept entités principales.

| Entité | Description | Attributs clés |
|---|---|---|
| Document | Un document officiel archivé | Type, titre, version, date, auteur, URL, droits d'accès |
| Album | Un album photo/vidéo lié à un événement | Événement, contributeurs, photos, narration, statut |
| Témoignage | Une interview, biographie, ou récit | Membre, type, format, transcription, thèmes, durée |
| ÉvénementHistorique | Un événement marquant de la famille | Date, lieu, type, description, liens vers archives |
| Archive | Un dossier clôturé d'un autre univers | Univers source, identifiant source, date de clôture, contenu |
| Tradition | Un élément du patrimoine immatériel | Type, description, origine, gardiens, statut |
| Index | Un index de recherche (membre, lieu, thème) | Type, valeur, références vers archives |

### 11.1 Relations principales

- Un **Document** est rattaché à un univers source (U1-U5) et à une instance émettrice.
- Un **Album** est lié à un événement U2 et contient plusieurs photos/vidéos.
- Un **Témoignage** est rattaché à un membre U1 et indexé par thèmes.
- Un **ÉvénementHistorique** est cross-référencé avec des archives et des témoignages.
- Une **Archive** provient d'un univers source et peut être cross-référencée avec d'autres archives.
- Une **Tradition** est rattachée à des gardiens (membres U1) et à des événements où elle est pratiquée.
- Un **Index** relie les éléments entre eux (par exemple, toutes les archives mentionnant un membre donné).

### 11.2 Règles d'intégrité

- Aucune archive n'est jamais supprimée ; les amendements se font par avenant.
- Un document scellé ne peut être consulté sans autorisation explicite.
- Une tradition restreinte n'est visible que par les membres autorisés.
- Un témoignage restreint n'est diffusé qu'après le délai défini par l'ancien.
- Toute consultation d'un document sensible est journalisée.

---

## 12. Règles de gestion essentielles

Les règles ci-dessous s'imposent à tous les modules de l'Univers 6. Elles sont configurables par chaque famille.

| # | Règle | Justification |
|---|---|---|
| R1 | Tout dossier clôturé dans U2, U3, U4, U5 est automatiquement archivé dans U6 | Garantit la complétude de la mémoire |
| R2 | Aucune archive n'est jamais supprimée ; les amendements se font par avenant | Préserve l'intégrité historique |
| R3 | Les documents officiels sont conservés en triple stockage sur supports indépendants | Prévient la perte de données |
| R4 | Les formats de conservation sont durables (PDF/A, JPEG, MP3, MP4) | Prévient l'obsolescence |
| R5 | Une migration périodique des formats est effectuée tous les 5 ans | Préserve la lisibilité dans le temps |
| R6 | Chaque document est horodaté cryptographiquement | Garantit l'authenticité |
| R7 | Les droits d'accès varient par type de document et par rôle du membre | Protège la confidentialité |
| R8 | Tout membre peut demander le retrait d'une photo où il apparaît | Respecte le droit à l'image |
| R9 | Les interviews des anciens sont priorisées par âge et état de santé | Prévient la perte de mémoire |
| R10 | Un témoignage peut être restreint à diffusion posthume | Respecte la volonté de l'ancien |
| R11 | Les traditions restreintes ne sont visibles que par les membres autorisés | Protège le caractère sacré |
| R12 | Le journal des consultations des documents sensibles est consultable par le membre concerné | Dissuade les consultations abusives |
| R13 | Une sauvegarde externe est effectuée trimestriellement | Prévient la perte en cas de sinistre |
| R14 | Le comité culturel est responsable de la collecte de la mémoire et des traditions | Garantit la qualité et la légitimité |
| R15 | Toute modification d'une archive est tracée avec auteur, motif, et validateur | Préserve l'auditabilité |

---

## 13. Cas limites et situations sensibles

### 13.1 Ancien qui décède avant l'interview

Le risque majeur est qu'un ancien décède avant d'avoir pu enregistrer son témoignage. Le système prévoit :

- Une priorisation des anciens les plus âgés ou en mauvaise santé.
- Une collecte posthume auprès des proches, des enfants, des amis.
- Une page mémoire dédiée, avec photos, témoignages, biographie.
- Un hommage lors du congrès suivant.

Cette collecte posthume ne remplace pas l'interview directe, mais elle évite la perte totale de la mémoire.

### 13.2 Document sensible (testament, conflit)

Certains documents sont sensibles par nature : testaments non ouverts, dossiers de conflit familial, actes judiciaires, correspondances privées. Le système prévoit :

- Un statut « scellé », qui masque le document jusqu'à une date ou un événement défini.
- Un accès conditionnel, requérant la validation du patriarche et du comité médiation.
- Un journal des consultations, consultable par le membre concerné ou ses ayants droit.

Cette gestion prévient les indiscrétions tout en garantissant la conservation.

### 13.3 Tradition secrète

Certaines traditions (rites initiatiques, cérémonies réservées aux aînés, savoirs sacrés) ne doivent pas être exposées publiquement. Le système prévoit :

- Un statut « tradition restreinte », avec un périmètre de consultation défini par le patriarche.
- Une documentation allégée pour les non-initiés (description générale sans détails).
- Une documentation complète pour les initiés, accessible uniquement avec autorisation.

Cette gradation respecte le caractère sacré de certaines traditions tout en préservant leur mémoire.

### 13.4 Contenu offensant ou blessant

Une photo, un témoignage, ou un récit peut être offensant (par exemple, propos tenus il y a longtemps et jugés inacceptables aujourd'hui) ou blessant (photo d'un deuil diffusée sans autorisation). Le système prévoit :

- Un signalement par tout membre, qui déclenche un retrait temporaire immédiat.
- Un examen par le comité culturel et le comité médiation.
- Une décision définitive (retrait, conservation avec restriction, ou conservation publique avec avertissement de contexte).
- Un journal des signalements et décisions, pour la traçabilité.

Cette procédure protège la dignité des membres tout en préservant la liberté de contribution.

### 13.5 Droit à l'oubli

Un membre peut demander que certaines informations le concernant soient retirées des archives (par exemple, un événement pénible qu'il souhaite oublier). Le système prévoit :

- Une procédure de demande de retrait, examinée par le comité médiation.
- Le retrait effectif des informations nominatives, tout en conservant l'archive anonymisée.
- Un journal des demandes et décisions.

Le droit à l'oubli est équilibré avec le droit à la mémoire : l'histoire de la famille ne peut pas être effacée, mais la dignité d'un membre peut être protégée.

### 13.6 Mémoire conflictuelle

L'histoire familiale peut être conflictuelle : tel événement est raconté différemment selon les branches, tel ancêtre est contesté, telle décision est contestée. Le système gère ce cas en :

- Permettant l'enregistrement de plusieurs versions d'un même récit, avec mention de leurs sources.
- Proposant une version officielle validée par le comité culturel, mais en conservant les versions alternatives.
- Invitant le comité médiation à arbitrer en cas de conflit ouvert.

Cette approche évite l'imposition d'une version unique qui serait contestée, tout en proposant une narration officielle pour la transmission.

### 13.7 Patrimoine linguistique en voie de disparition

Les langues locales (medumba, fe'fe', ghomala', etc.) sont menacées par l'uniformisation linguistique. Le système prévoit :

- Un enregistrement des chants, proverbes, et récits en langue locale, avec traduction.
- Un glossaire des mots et expressions familiaux.
- Des vidéos pédagogiques pour transmettre la langue aux jeunes générations.
- Le cas échéant, un partenariat avec des institutions linguistiques pour la conservation.

Cette conservation est un acte culturel fort, qui dépasse le cadre de la famille et contribue à la sauvegarde du patrimoine linguistique africain.

### 13.8 Perte de données

En cas de perte de données (panne serveur, cyberattaque, sinistre), le système prévoit :

- Une restauration automatique depuis les sauvegardes externes trimestrielles.
- Un audit pour évaluer l'étendue de la perte.
- Une communication transparente aux membres.
- Un plan de prévention pour éviter la récurrence.

La triple sauvegarde et la sauvegarde externe trimestrielle garantissent que la perte de données reste limitée, même en cas de sinistre majeur.

---

## 14. Wireframes textuels des écrans clés

Cette section décrit en pseudo-maquettes les cinq écrans les plus importants de l'Univers 6.

### 14.1 Bibliothèque documentaire

```
┌────────────────────────────────────────────────────────────┐
│  BIBLIOTHÈQUE DOCUMENTAIRE                                 │
├────────────────────────────────────────────────────────────┤
│  Recherche : [_______________________]                    │
│  Filtres : [Type ▾] [Année ▾] [Instance ▾]                │
│                                                            │
│  ─── STATUTS ET RÈGLEMENT ────────────                     │
│  • Règlement intérieur v3.2 (déc. 2025) — PDF/A          │
│  • Règlement intérieur v3.1 (déc. 2023) — PDF/A          │
│  • Statuts de la famille (1985, version originale)        │
│                                                            │
│  ─── PROCÈS-VERBAUX ────────────────────                   │
│  • PV du congrès 2025 (PV-2025-003) — 45 pages           │
│  • PV de l'AG 2025 (PV-2025-002) — 22 pages              │
│  • PV du conseil de mars 2026 (PV-2026-001) — 12 pages   │
│                                                            │
│  ─── BILANS FINANCIERS ────────────────                    │
│  • Bilan 2025 (exercice clôturé) — PDF + Excel           │
│  • Bilan 2024 (exercice clôturé) — PDF + Excel           │
│  • Rapport d'audit 2025 — Commissaire aux comptes         │
│                                                            │
│  ─── CONTRATS ET ACTES ────────────────                    │
│  • Acte de propriété terrain Bafoussam (1998)            │
│  • Testament de Papa Jean (scellé)                        │
│  • Contrat de construction case de passage (2023)        │
│                                                            │
│  [Téléverser un document]                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.2 Album d'événement

```
┌────────────────────────────────────────────────────────────┐
│  ALBUM — Mariage Marie × Paul (12 octobre 2026)           │
├────────────────────────────────────────────────────────────┤
│  Événement : EVT-2026-008 — Branche Nord                  │
│  Contributeurs : 23 membres — 187 photos — 12 vidéos      │
│                                                            │
│  ─── NARRATION ────────────────────────────                │
│  « Ce 12 octobre 2026, la famille NDONGO s'est réunie    │
│  pour le mariage de Marie, fille aînée de la branche     │
│  Nord, avec Paul BIYA. La cérémonie religieuse s'est     │
│  tenue à la Cathédrale de Yaoundé... »                    │
│                                       — Hélène, témoin    │
│                                                            │
│  ─── PHOTOS EMBLÉMATIQUES ────────────────                 │
│  ┌─────┐ ┌─────┐ ┌─────┐                                  │
│  │ P1  │ │ P2  │ │ P3  │                                  │
│  └─────┘ └─────┘ └─────┘                                  │
│  • Échange des alliances                                   │
│  • Sortie de l'église                                      │
│  • Première danse                                          │
│                                                            │
│  ─── TÉMOIGNAGES ────────────────────────                  │
│  • « Une journée de bonheur pur » — Maman Rosine          │
│  • « Je me souviendrai toujours de ce moment » — Paul    │
│                                                            │
│  ─── BILAN ────────────────────────────                    │
│  Budget : 6 000 000 FCFA — 198 invités présents          │
│  [Voir le dossier complet]                                │
│                                                            │
│  [Ajouter des photos]  [Ajouter un témoignage]            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.3 Interview d'ancien

```
┌────────────────────────────────────────────────────────────┐
│  TÉMOIGNAGE — Papa Jean NDONGO (85 ans)                    │
├────────────────────────────────────────────────────────────┤
│  Branche : Nord — Génération 3 — Patriarche               │
│  Interview : 15 août 2026 — Durée : 2h47                  │
│  Intervieweur : Hélène NDONGO (comité culturel)           │
│                                                            │
│  ─── CHAPITRES ────────────────────────────                │
│  1. Enfance au village Bafoussam (00:00 - 18:32)         │
│  2. Mon père et ses frères (18:32 - 35:14)               │
│  3. Mes études à Yaoundé (35:14 - 52:08)                 │
│  4. Mon mariage avec Marguerite (52:08 - 1:08:45)        │
│  5. La guerre d'indépendance (1:08:45 - 1:32:20)         │
│  6. Mon parcours professionnel (1:32:20 - 1:55:10)       │
│  7. Le patriarcat et mes décisions (1:55:10 - 2:25:40)   │
│  8. Leçons de vie (2:25:40 - 2:40:15)                    │
│  9. Message aux jeunes générations (2:40:15 - 2:47:00)   │
│                                                            │
│  [▶ Écouter l'interview complète]                         │
│  [📄 Lire la transcription]                                │
│                                                            │
│  ─── INDEX ────────────────────────────                    │
│  Personnes citées : Paul (père), Marguerite (épouse),    │
│  Bernard, Hélène, Joseph (enfants)                       │
│  Lieux évoqués : Bafoussam, Yaoundé, Douala              │
│  Thèmes : enfance, mariage, indépendance, patriarcat     │
│                                                            │
│  ─── BIOGRAPHIE ────────────────────────                   │
│  [Voir la biographie complète de Papa Jean]              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.4 Frise historique

```
┌────────────────────────────────────────────────────────────┐
│  HISTOIRE FAMILIALE — Frise chronologique                 │
├────────────────────────────────────────────────────────────┤
│  Filtres : [Tous types ▾] [Toutes branches ▾]            │
│                                                            │
│  1920  ────●────  Fondation de la famille par NDONGO      │
│             │       Installation au village Bafoussam     │
│             │                                              │
│  1945  ────●────  Naissance de Papa Jean (patriarche)    │
│             │                                              │
│  1960  ────●────  Indépendance du Cameroun                │
│             │       Migration vers Yaoundé                 │
│             │                                              │
│  1972  ────●────  Mariage de Papa Jean avec Marguerite   │
│             │                                              │
│  1985  ────●────  Premier congrès familial                 │
│             │       Adoption des statuts                   │
│             │                                              │
│  1998  ────●────  Achat du terrain familial                │
│             │                                              │
│  2010  ────●────  Première diaspora (Paul en France)      │
│             │                                              │
│  2020  ────●────  Décès de Maman Marguerite               │
│             │       Levée de deuil en 2021                 │
│             │                                              │
│  2026  ────●────  Congrès de décembre 2026 (à venir)      │
│                                                            │
│  [Proposer un événement à ajouter]                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.5 Moteur de recherche

```
┌────────────────────────────────────────────────────────────┐
│  RECHERCHE DANS LES ARCHIVES                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [_____________________________________]                  │
│                                                            │
│  Filtres : [Type ▾] [Période ▾] [Branche ▾] [Lieu ▾]    │
│                                                            │
│  ─── RÉSULTATS (47 trouvés) ────────────                   │
│                                                            │
│  📄 PV du congrès 2025                                     │
│     « ...adoption du budget 2026 à hauteur de... »        │
│     Type : PV — Date : 28/12/2025 — Instance : Congrès   │
│                                                            │
│  📷 Album du mariage de Marie (2026)                      │
│     « ...cérémonie religieuse à la Cathédrale... »        │
│     Type : Album — Date : 12/10/2026 — 187 photos        │
│                                                            │
│  🎤 Interview de Papa Jean (2026)                         │
│     « ...je me souviens du jour où mon père nous a       │
│     réunis pour... »                                       │
│     Type : Témoignage — Date : 15/08/2026 — 2h47         │
│                                                            │
│  📜 Tradition : Dot NDONGO                                │
│     « ...la dot chez les NDONGO se compose de... »        │
│     Type : Tradition — Origine : avant 1920              │
│                                                            │
│  [Voir tous les résultats]                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Roadmap MVP et séquençage

L'Univers 6 est séquencé en trois phases pour permettre une adoption progressive.

### 15.1 Phase 1 — MVP (mois 8 à 12)

| Périmètre | Détail |
|---|---|
| Bibliothèque documentaire | Documents officiels, PV, statuts, avec versioning |
| Albums photo | Albums d'événements, tagging manuel, contributions |
| Archivage automatique | Des dossiers U2/U3/U4/U5 clôturés |
| Recherche plein texte | Sur l'ensemble des archives |
| Triple stockage | Serveur + sauvegarde + archive froide |

**Critères de sortie** : 100 % des dossiers clôturés automatiquement archivés, taux d'archivage documentaire ≥ 80 %, 70 % des événements avec album.

### 15.2 Phase 2 — Enrichissement (mois 13 à 17)

| Périmètre | Détail |
|---|---|
| Mémoire des anciens | Interviews audio/vidéo, transcription, indexation |
| Histoire familiale | Frise chronologique, récits fondateurs, lignée des patriarches |
| Patrimoine et traditions | Documentation des coutumes, recettes, chansons |
| Cartes et lieux | Carte interactive des lieux symboliques |
| Tagging automatique | Reconnaissance faciale, détection de lieu |
| Cross-références | Entre archives des différents univers |

**Critères de sortie** : ≥ 50 % des anciens avec interview, ≥ 30 traditions documentées, satisfaction transmission ≥ 4/5.

### 15.3 Phase 3 — Maturité (mois 18 à 24)

| Périmètre | Détail |
|---|---|
| IA transcription | Reconnaissance vocale multilingue (français, langues locales) |
| Exploration visuelle | Graphes de relations, navigation temporelle avancée |
| Suggestions personnalisées | Basées sur le profil et l'historique de consultation |
| Vidéos pédagogiques | Pour la transmission des traditions |
| Partage familial élargi | Avec familles alliées, sur autorisation |
| Conservation longue durée | Migration des formats, partenariats institutionnels |

**Critères de sortie** : ≥ 90 % des anciens avec interview, fréquentation mensuelle ≥ 30 %, ≥ 20 contributions collaboratives par mois.

---

## 16. Risques et points d'attention

### 16.1 Perte de données

La perte de données est le risque ultime. Un serveur peut tomber, un cyberattaquant peut chiffrer les archives, un sinistre peut détruire le datacenter. La mitigation repose sur :

- Triple stockage sur supports indépendants.
- Sauvegarde externe trimestrielle, dans un lieu géographiquement distant.
- Tests de restauration réguliers (au moins une fois par an).
- Plan de continuité d'activité documenté et testé.
- Assurance cyber-risque pour les familles qui le souhaitent.

### 16.2 Obsolescence numérique

Les formats numériques évoluent, et un format courant aujourd'hui peut devenir illisible dans 20 ou 30 ans. La mitigation repose sur :

- Utilisation de formats durables (PDF/A, JPEG, MP3, MP4).
- Migration périodique des formats (tous les 5 ans).
- Veille technologique sur l'évolution des standards.
- Documentation des formats utilisés, pour permettre une migration future.

### 16.3 Confidentialité

Certaines archives sont sensibles (testaments, dossiers médicaux, conflits familiaux). Une fuite peut causer des dommages considérables. La mitigation repose sur :

- Gradation des droits d'accès par type de document et par rôle.
- Statut « scellé » pour les documents ultra-sensibles.
- Journal des consultations, consultable par le membre concerné.
- Formation des membres au respect de la confidentialité.

### 16.4 Coût du stockage

La conservation de volumes importants de photos, vidéos, et témoignages a un coût, qui croît avec le temps. La mitigation repose sur :

- Compression des formats de consultation (les formats originaux sont conservés en archive froide).
- Politique de rétention configurable (par exemple, suppression des versions intermédiaires après 5 ans).
- Modèle économique intégré à l'abonnement familial (voir Univers 4).
- Partage des coûts entre familles utilisatrices, pour mutualiser l'infrastructure.

### 16.5 Manipulation de l'histoire

L'histoire familiale peut être manipulée, consciemment ou non, par ceux qui la rédigent. Une version officielle peut occulter des événements défavorables, glorifier certains ancêtres au détriment d'autres, imposer une narration partisane. La mitigation repose sur :

- La pluralité des sources (interviews multiples, récits croisés).
- La conservation des versions alternatives, même contestées.
- La validation par le comité culturel, composé de membres de branches différentes.
- Le droit de contestation, ouvert à tout membre.

### 16.6 Conflits d'interprétation

Un même événement peut être interprété différemment selon les membres et les branches. Le système gère ce cas en :

- Permettant l'enregistrement de plusieurs interprétations.
- Proposant une version officielle validée, mais en conservant les alternatives.
- Invitant le comité médiation à arbitrer en cas de conflit ouvert.

### 16.7 Excès de nostalgie

La mémoire peut devenir un objet de nostalgie stérile, tournée vers le passé au détriment du présent. La mitigation repose sur :

- Une articulation entre mémoire et projet (l'histoire n'est pas un cimetière, elle éclaire les décisions futures).
- Des sessions de transmission active, où les anciens transmettent aux jeunes.
- Des invitations à contribuer (la mémoire se construit aussi aujourd'hui).

---

## 17. Indicateurs de succès

| Indicateur | Définition | Cible | Fréquence |
|---|---|---|---|
| Taux d'archivage automatique | Dossiers clôturés archivés | 100 % | Mensuel |
| Interviews des anciens | Anciens 60+ avec interview | ≥ 50 % | Trimestriel |
| Couverture documentaire | Documents officiels archivés | ≥ 80 % | Trimestriel |
| Albums enrichis | Événements clôturés avec album ≥ 10 photos | ≥ 70 % | Par événement |
| Fréquentation des archives | Membres consultant par mois | ≥ 30 % | Mensuel |
| Contributions collaboratives | Photos, témoignages par mois | ≥ 20 | Mensuel |
| Satisfaction transmission | Note moyenne des membres | ≥ 4/5 | Annuel |
| Traditions documentées | Nombre de traditions documentées | ≥ 30 | Annuel |
| Disponibilité des archives | Taux de disponibilité du service | ≥ 99,5 % | Mensuel |
| Sauvegardes externes | Sauvegardes par an | ≥ 4 | Trimestriel |

---

## 18. Conclusion

L'Univers 6 est la condition de la pérennité de la famille. Sans mémoire, il n'y a pas de transmission, et sans transmission, il n'y a pas de durée. Les autres univers gèrent le présent : les membres vivants, les événements en cours, les solidarités actives, les finances de l'année, les décisions du moment. L'Univers 6 gère le long terme : il capte, organise, conserve, et transmet ce qui mérite de durer.

La proposition centrale de l'Univers 6 est simple : remplacer la mémoire fragile — celle qui se perd quand un ancien disparaît, quand un album se détériore, quand un document s'égare — par un patrimoine numérique durable, structuré et consultable. Chaque document, chaque photo, chaque témoignage, chaque tradition est archivé, indexé, et rattaché à son contexte. Les descendants peuvent, dans vingt ou cinquante ans, retrouver l'intégralité de la mémoire de leur famille, écouter la voix d'un arrière-grand-père qu'ils n'ont pas connu, voir les photos du congrès de 2025, lire les motifs d'une décision prise en 2030.

L'Univers 6 ne se substitue pas à la transmission orale : il la complète et la sécurise. Les anciens restent les gardiens de la mémoire vive, les traditions continuent d'être pratiquées et transmises de vive voix. Mais l'application capte, conserve, et rend accessible ce qui, sans elle, se perdrait. C'est sa véritable valeur, au-delà de la technique : préserver ce qui mérite de durer, et le transmettre à ceux qui viendront.

Les prochaines étapes recommandées sont les suivantes :

1. **Validation de cette spécification** par le comité de pilotage et par au moins deux familles pilotes, avec un accent particulier sur les règles de conservation longue durée et sur la priorisation des interviews d'anciens.
2. **Production des maquettes interactives** des cinq écrans clés (bibliothèque, album, interview d'ancien, frise historique, recherche).
3. **Définition de la stratégie de stockage** (triple stockage, sauvegarde externe, formats durables) et des partenariats techniques éventuels.
4. **Construction du MVP Phase 1** avec un périmètre strictement limité à la bibliothèque documentaire, aux albums photo, à l'archivage automatique, et à la recherche plein texte.
5. **Lancement immédiat de la collecte des interviews d'anciens**, dès la Phase 2, car le temps est la contrainte la plus dure : chaque ancien qui disparaît emporte avec lui une part de la mémoire.

L'Univers 6, s'il est bien conçu et bien livré, deviendra le trésor de la famille : un lieu où chaque document trouve sa place, chaque photo son contexte, chaque ancien sa voix, et chaque tradition sa trace. Il transformera la mémoire d'un patrimoine fragile en un héritage durable, transmissible aux générations futures, qui pourront y puiser la fierté de leurs racines et la sagesse de leurs aïeux.
