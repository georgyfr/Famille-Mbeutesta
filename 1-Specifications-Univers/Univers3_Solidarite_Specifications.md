# Univers 3 — La Solidarité

**Le cœur battant de la grande famille africaine**

| Document | Spécifications fonctionnelles — Univers 3 |
|---|---|
| Version | 1.0 |
| Date | Septembre 2026 |
| Statut | Pour validation |
| Audience | Chefs de famille, comité de pilotage, équipe produit, équipe développement |
| Prérequis | Spécifications Univers 1 — La Famille, Univers 2 — La Vie familiale |

---

## Synthèse exécutive

L'Univers 3, intitulé **« La Solidarité »**, est sans doute le plus sensible de tous les univers de l'application. C'est ici que la famille prouve concrètement ce qu'elle dit être : une communauté qui se soutient dans l'épreuve. Lorsqu'un décès survient, lorsqu'une maladie grave frappe, lorsqu'un sinistre détruit un foyer, c'est la capacité de la famille à se mobiliser — financièrement, humainement, organisationnellement — qui est mise à l'épreuve. Et c'est aussi là que naissent les tensions les plus profondes : qui a donné, qui n'a pas donné, combien a été collecté, où est passé l'argent, pourquoi telle branche cotise moins, pourquoi tel membre n'a rien reçu alors qu'il en avait besoin.

La proposition centrale de l'Univers 3 est de remplacer la solidarité réactive et opaque d'aujourd'hui par un **protocole transparent, traçable et équitable**. Chaque situation difficile donne lieu à l'ouverture d'un dossier de solidarité, qui déclenche une collecte ciblée, un suivi structuré, une répartition visible et une clôture auditée. Le système garantit que chaque contribution est tracée, chaque dépense justifiée, chaque bénéficiaire désigné légitimement, et chaque membre peut consulter l'état des solidarités en cours.

Le présent document définit le rôle, les objectifs, l'architecture en sept modules, le modèle de données, les règles de gestion, les cas limites et la roadmap de l'Univers 3. Il s'appuie sur l'Univers 1 (registre des membres, branches, rôles) pour le ciblage et la légitimité, sur l'Univers 2 (événements, workflows) pour le déclenchement automatique des dossiers, et sur l'Univers 4 (caisse, Mobile Money) pour les flux financiers. L'Univers 3 est conçu pour transformer un sujet explosif en une discipline partagée, sans perdre la dimension émotionnelle et humaine qui fait la valeur de la solidarité familiale.

---

## 1. Rôle et finalité de l'Univers 3

### 1.1 Rôle stratégique

L'Univers 3 joue quatre rôles stratégiques imbriqués qui en font le cœur battant de l'application.

**Premièrement, il est le déclencheur automatique des solidarités.** Lorsqu'un décès, une maladie grave, un accident ou un sinistre est saisi dans l'Univers 2 (La Vie familiale), l'Univers 3 ouvre automatiquement un dossier de solidarité, avec un protocole adapté à la situation. La famille n'attend plus qu'un membre prenne l'initiative d'organiser la collecte : le système propose, le comité valide, la solidarité se met en route. C'est la fin des retards humiliants où un membre dans le besoin attendait des jours avant qu'une cagnotte ne se mette en place.

**Deuxièmement, il est le garant de la transparence financière.** L'argent de la solidarité est le sujet le plus sensible des grandes familles. Les soupçons de détournement, les rumeurs sur les sommes réellement collectées, les frustrations sur les répartitions : tout cela déchire les familles plus souvent qu'on ne le pense. L'Univers 3 impose une discipline simple mais radicale : chaque contribution est enregistrée avec son auteur et son montant, chaque dépense est justifiée par une pièce jointe, chaque clôture est accompagnée d'un bilan transmis à toute la famille. La transparence devient la règle par défaut, pas l'exception.

**Troisièmement, il est le gardien de l'équité.** Une grande famille est composée de branches inégales — certaines nombreuses et prospères, d'autres plus modestes. Sans règle explicite, la solidarité reproduit ces inégalités : les branches riches donnent plus, les branches modestes reçoivent moins, et le ressentiment s'installe. L'Univers 3 propose des barèmes de contribution configurables (par branche, par génération, par situation), des mécanismes d'exonération pour les membres en précarité, et une vue agrégée permettant au conseil de surveiller les déséquilibres. L'équité n'est pas l'égalité : c'est la prise en compte explicite des situations.

**Quatrièmement, il est la mémoire des solidarités passées.** Chaque dossier de solidarité clôturé est archivé dans l'Univers 6 (Mémoire), avec son bilan financier, ses justificatifs, ses témoignages. Cette mémoire est précieuse à court terme (pour les remerciements, les bilans annuels, les contestations éventuelles) et à long terme (pour la transmission aux générations futures, qui pourront voir comment leur famille a soutenu ses membres dans l'épreuve). Elle est aussi un facteur d'apprentissage : en analysant les dossiers passés, le conseil peut améliorer ses protocoles.

### 1.2 Finalité opérationnelle

Sur le plan opérationnel, l'Univers 3 poursuit une finalité claire : **qu'à tout moment, tout membre autorisé puisse répondre à cinq questions fondamentales** :

1. Quelles sont les solidarités en cours dans la famille, et qui en bénéficie ?
2. Combien a été collecté pour chaque situation, et combien reste-t-il à collecter ?
3. Ai-je contribué aux solidarités en cours, et pour quel montant ?
4. Quelles dépenses ont été effectuées sur les fonds collectés, et avec quels justificatifs ?
5. En cas de besoin personnel, à qui m'adresser, et quel est le processus ?

Si ces cinq questions trouvent une réponse immédiate et fiable, l'Univers 3 remplit sa mission. La solidarité cesse d'être un sujet d'inquiétude ou de rumeur pour devenir un fonctionnement partagé.

### 1.3 Trois dimensions de la solidarité

L'Univers 3 distinguera systématiquement trois dimensions de la solidarité, qui appellent des réponses différentes :

- **La dimension émotionnelle** — présence, témoignages, condoléances, visites, accompagnement. Elle est portée par l'Univers 2 (album, messages) et enrichie par l'Univers 3 (suivi des situations).
- **La dimension financière** — collecte ciblée, contribution, dépenses, bilan. Elle est le cœur opérationnel de l'Univers 3, en lien étroit avec l'Univers 4 (caisse, Mobile Money).
- **La dimension organisationnelle** — comité de soutien, coordination logistique, répartition des tâches. Elle est portée par l'Univers 2 (dossier d'événement, workflow) et complétée par l'Univers 3 (répartition, équité).

Cette distinction structure tout l'Univers 3 : chaque situation difficile est traitée simultanément sur ces trois dimensions, sans qu'aucune ne soit négligée.

---

## 2. Objectifs mesurables

L'Univers 3 doit être évalué sur des indicateurs concrets. Les objectifs ci-dessous sont proposés pour la première année d'exploitation, sur une famille pilote de 150 à 300 membres.

| Objectif | Indicateur | Cible année 1 |
|---|---|---|
| Délai de déclenchement | Délai moyen entre un événement (décès, maladie) et l'ouverture du dossier de solidarité | ≤ 4 heures |
| Taux de participation | Pourcentage de membres adultes contribuant à une collecte de solidarité | ≥ 70 % |
| Délai de collecte | Délai moyen pour atteindre 80 % de la cible financière | ≤ 7 jours |
| Transparence | Pourcentage de dépenses justifiées par une pièce jointe | 100 % |
| Délai de clôture | Délai moyen entre la fin d'une situation et la clôture du dossier | ≤ 30 jours |
| Satisfaction bénéficiaires | Note moyenne donnée par les bénéficiaires (anonyme) | ≥ 4/5 |
| Satisfaction contributeurs | Note moyenne donnée par les contributeurs | ≥ 4/5 |
| Taux de contestation | Nombre de contestations formelles par an | ≤ 2/an |
| Aide sociale récurrente | Pourcentage d'aides sociales versées à temps | ≥ 95 % |
| Confidentialité | Nombre de fuites d'informations sensibles | 0 |

Ces cibles sont indicatives ; elles devront être ajustées avec les familles pilotes. Elles traduisent l'ambition : une solidarité rapide, massive, transparente et respectueuse des personnes.

---

## 3. Architecture fonctionnelle

L'Univers 3 est composé de **sept modules fonctionnels** qui s'articulent autour d'un cœur commun : le dossier de solidarité. La collecte, le suivi, l'aide sociale, la répartition, la transparence et la médiation sont autant de dimensions du dossier.

### Vue d'ensemble des modules

```
┌─────────────────────────────────────────────────────────────┐
│              UNIVERS 3 — LA SOLIDARITÉ                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CŒUR : Dossier de solidarité (lié à un événement U2)   │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐  │
│   ▼          ▼          ▼          ▼          ▼          ▼  │
│  Collecte   Suivi      Aide       Répartition Transparence │
│  ciblée     des        sociale    & équité    & audit      │
│  (lien U4)  situations & prêts                             │
│                                                        ↓    │
│                                                  Médiation  │
│                                                  & confi-   │
│                                                  dentialité│
└─────────────────────────────────────────────────────────────┘
```

L'organisation de l'application reflète cette architecture : un tableau de bord de la solidarité affiche les dossiers en cours, les collectes actives, et les aides sociales récurrentes. Le clic sur un dossier ouvre sa fiche complète, avec ses métadonnées, son suivi, sa collecte et son audit.

### Navigation principale

La navigation de l'Univers 3 s'organise autour de quatre entrées principales :

1. **Solidarités en cours** — liste des dossiers ouverts (collecte active, suivi en cours).
2. **Aides sociales** — gestion des aides récurrentes (bourses, soutien aux veuves, etc.).
3. **Bilan de solidarité** — vue agrégée annuelle (collecté, dépensé, par branche, par type).
4. **Nouvelle solidarité** — ouverture manuelle d'un dossier (en complément du déclenchement automatique).

Le tableau de bord familial (Univers 1) affiche par ailleurs une synthèse des solidarités en cours, avec un lien direct vers les dossiers correspondants.

---

## 4. Module 4.1 — Le dossier de solidarité

### 4.1.1 Description

Le dossier de solidarité est l'unité atomique de l'Univers 3. Il est créé automatiquement lorsqu'un événement de nature malheureuse est saisi dans l'Univers 2 (décès, maladie grave, accident, hospitalisation, sinistre, difficultés particulières), ou manuellement par un membre autorisé (chef de branche, conseil, comité médiation). Il regroupe toutes les informations, actions et traces liés à une situation de solidarité.

### 4.1.2 Déclenchement automatique

Le déclenchement automatique est la règle, le déclenchement manuel l'exception. Le tableau ci-dessous précise les règles de déclenchement par type d'événement :

| Type d'événement (U2) | Déclenchement automatique d'un dossier U3 ? | Niveau de confidentialité |
|---|---|---|
| Décès (M1) | Oui, immédiat | Public familial |
| Maladie grave (M2) | Oui, sur validation du chef de branche | Restreint (branche + conseil) |
| Accident (M3) | Oui, sur validation du chef de branche | Restreint (branche + conseil) |
| Hospitalisation (M4) | Oui, si durée > 7 jours | Restreint (branche + conseil) |
| Sinistre (M5) | Oui, immédiat | Public familial |
| Difficultés particulières (M6) | Non, manuel uniquement | Confidentiel (médiation + conseil) |

### 4.1.3 Anatomie d'un dossier

Un dossier de solidarité comporte sept sections principales :

```
┌────────────────────────────────────────────────────────────┐
│  DOSSIER DE SOLIDARITÉ                                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. MÉTADONNÉES                                            │
│     Bénéficiaire, nature, gravité, branche, dates          │
│                                                            │
│  2. COMITÉ DE SOUTIEN                                      │
│     Référent, membres, validateur (chef de branche)        │
│                                                            │
│  3. COLLECTE                                               │
│     Cible, contributions, dépenses, solde (lien U4)        │
│                                                            │
│  4. SUIVI                                                  │
│     Étapes, jalons, visites, messages                      │
│                                                            │
│  5. RÉPARTITION                                            │
│     Bénéficiaires finaux, montants, modalités              │
│                                                            │
│  6. JUSTIFICATIFS                                          │
│     Factures, reçus, photos, documents                     │
│                                                            │
│  7. CLÔTURE                                                │
│     Bilan, remerciements, archivage (lien U6)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4.1.4 Cycle de vie d'un dossier

Chaque dossier suit un cycle de vie à cinq états :

1. **Ouvert** — le dossier est créé, le comité est en place, la collecte est ouverte.
2. **Collecte en cours** — les contributions affluent, le suivi est actif.
3. **Utilisation** — les fonds sont dépensés selon les besoins, justificatifs joints.
4. **Clôture proposée** — le référent propose la clôture, bilan transmis au conseil.
5. **Clôturé** — le conseil valide, le dossier est archivé dans l'Univers 6.

La transition entre états est soumise à des règles de validation : un dossier ne peut être clôturé sans bilan financier complet et without justificatifs pour toutes les dépenses. Ces règles garantissent la rigueur et préviennent les contestations.

### 4.1.5 Lien avec l'Univers 2

Le dossier de solidarité est lié à un événement de l'Univers 2 par un identifiant partagé. Lorsqu'un événement U2 est clôturé, le dossier U3 associé peut rester ouvert (par exemple, un suivi de maladie longue), ou être clôturé en même temps. La coordination entre U2 et U3 est gérée automatiquement par le système, sans intervention manuelle.

---

## 5. Module 4.2 — La collecte de solidarité

### 5.1 Description

La collecte est le cœur opérationnel de l'Univers 3. Elle transforme la solidarité intentionnelle en solidarité effective. Sa qualité conditionne directement la rapidité et l'ampleur de la réponse familiale. C'est aussi le module le plus exposé aux tensions : c'est ici que se manifestent les inégalités de contribution, les retards, les oublis, et parfois les soupçons.

### 5.2 Ouverture d'une collecte

L'ouverture d'une collecte est déclenchée par la création du dossier de solidarité. Elle comporte :

- **Une cible financière**, définie par le comité de soutien sur la base des besoins estimés (frais funéraires, factures hospitalières, reconstruction, etc.).
- **Un périmètre de contributeurs**, défini par défaut comme l'ensemble des membres adultes vivants, mais ajustable (par exemple, collecte limitée à la branche concernée pour une situation mineure).
- **Une échéance**, généralement liée à la date de l'événement (inhumation, sortie d'hôpital).
- **Un mode de répartition**, qui peut être « montant libre » (chacun donne selon ses moyens) ou « barème défini » (selon les règles de l'Univers 3, module 4.5).

### 5.3 Canaux de contribution

Les contributions se font via les canaux suivants, intégrés à l'Univers 4 (Caisse) :

- **Mobile Money** (MTN MoMo, Orange Money) — canal par défaut au Cameroun et en zone CEMAC.
- **Virement bancaire** — pour les membres diaspora ou les montants importants.
- **Espèces** — pour les membres sans accès aux canaux numériques, avec saisie manuelle par le trésorier ou le référent.
- **Carte bancaire** — pour les membres diaspora dans les pays non couverts par les canaux locaux.

Chaque contribution est automatiquement rattachée au compte du membre contributeur dans l'Univers 1, ce qui permet un suivi individuel et un rappel en cas d'oubli.

### 5.4 Suivi en temps réel

Le suivi de la collecte est visible en temps réel par tous les membres du périmètre. L'écran de collecte affiche :

- La cible financière.
- Le montant collecté et le pourcentage atteint.
- Le nombre de contributeurs et le pourcentage de participation.
- Le montant moyen et la médiane.
- La liste des contributeurs (avec leur accord explicite — sinon anonymisée).
- La liste des membres n'ayant pas encore contribué, avec option de relance individuelle.

Cette transparence est essentielle, mais elle doit être équilibrée avec la dignité des membres : un membre en précarité ne doit pas être exposé publiquement comme « non contributeur ». Le système gère donc des statuts d'exonération (voir module 4.5) qui masquent le membre des listes de relance.

### 5.5 Relances automatiques

Les relances sont automatiques mais mesurées :

- À J+3 (pour une collecte urgente de décès) ou J+7 (pour les autres), un rappel poli est envoyé aux membres n'ayant pas contribué.
- À J+7 ou J+14, une seconde relance, plus explicite sur l'échéance.
- Au-delà, plus de relance automatique : le référent peut décider d'une relance personnelle, au cas par cas.

Les relances respectent les fuseaux horaires (un membre en diaspora n'est pas relancé à 3 heures du matin) et les préférences de canal. Un membre exonéré ne reçoit aucune relance.

### 5.6 Clôture de la collecte

La clôture intervient lorsque :

- La cible est atteinte et l'événement est passé.
- L'échéance est dépassée et le comité décide de clôturer.
- Le bénéficiaire demande la clôture (par exemple, il a reçu suffisamment).

À la clôture, le bilan est transmis automatiquement à tous les contributeurs et au conseil familial. Les fonds éventuellement excédentaires sont affectés selon les règles configurées par la famille : report sur la caisse familiale, transfert à un autre dossier de solidarité, ou restitution aux contributeurs (rare).

---

## 6. Module 4.3 — Suivi des situations

### 6.1 Description

Certaines situations ne se règlent pas en une collecte unique : une maladie grave peut durer des mois, un deuil nécessite un suivi sur un an (avec la levée de deuil), des difficultés financières peuvent s'inscrire dans la durée. Le module Suivi des situations gère ces cas longs, en structurant l'accompagnement de la famille au-delà de la collecte initiale.

### 6.2 Suivi de maladie grave

Le suivi de maladie grave comporte :

- **Un journal d'évolution** — mises à jour régulières par le référent ou le bénéficiaire lui-même (état de santé, traitements, hospitalisations, sorties).
- **Un planning de visites** — organisation des visites au malade ou à sa famille, pour éviter la surcharge d'un côté et l'abandon de l'autre.
- **Des jalons financiers** — besoins complémentaires (transfert à l'étranger, traitement expérimental), qui peuvent déclencher des collectes complémentaires.
- **Une clôture** — lorsque la maladie est guérie, stabilisée, ou, dans le pire des cas, lorsqu'elle aboutit à un décès (qui déclenche alors un nouveau dossier U3).

### 6.3 Suivi de deuil

Le deuil ne s'arrête pas aux funérailles. Le module propose un suivi sur un an :

- **Visites de condoléances** — coordonnées dans les semaines qui suivent le décès.
- **Messe d'anniversaire de décès** — rappel automatique un an après, proposition de collecte pour l'organisation.
- **Levée de deuil** — cérémonie marquant la fin du deuil, à date configurable (par exemple, 6 mois, 1 an, 2 ans selon les traditions).
- **Suivi des orphelins** — si le défunt laisse des enfants mineurs, le système propose un suivi spécifique avec aide scolaire et visite périodique.

### 6.4 Suivi de difficultés financières

Pour les membres en difficulté financière (perte d'emploi, faillite, situation de précarité), le suivi est confidentiel et géré par le comité médiation. Il comporte :

- **Un plan d'accompagnement** — aide financière récurrente (lien U4), orientation vers les membres pouvant aider (emploi, formation).
- **Des jalons d'évaluation** — tous les 3 ou 6 mois, pour mesurer la progression.
- **Une clôture** — lorsque la situation est rétablie, ou transformée en aide sociale récurrente si la précarité s'installe durablement.

### 6.5 Suivi de rétablissement

Pour les situations qui s'améliorent (sortie d'hôpital, fin de traitement, retour à l'emploi), le système propose un suivi de rétablissement court (1 à 3 mois), avec un message de clôture positif transmis à la famille. Ce suivi valorise le soutien apporté et clôt l'épisode sur une note d'espoir.

---

## 7. Module 4.4 — Aide sociale et prêts familiaux

### 7.1 Description

Au-delà des solidarités ponctuelles liées à un événement, les grandes familles gèrent souvent des aides sociales récurrentes : bourses scolaires pour les enfants orphelins ou en difficulté, soutien aux veuves, aide aux membres handicapés, prise en charge de soins chroniques. L'Univers 3 propose un module dédié à la gestion structurée de ces aides.

### 7.2 Types d'aides sociales récurrentes

| Type | Description | Fréquence |
|---|---|---|
| Bourse scolaire | Aide annuelle pour la scolarité d'un enfant orphelin ou en difficulté | Annuelle |
| Soutien aux veuves | Aide mensuelle ou trimestrielle à une veuve en précarité | Mensuelle ou trimestrielle |
| Aide médicale chronique | Prise en charge partielle de soins continus | Mensuelle |
| Aide aux membres handicapés | Soutien mensuel pour un membre en situation de handicap | Mensuelle |
| Aide d'urgence | Aide ponctuelle pour un besoin immédiat (nourriture, loyer) | Ponctuelle |
| Aide à l'insertion | Soutien temporaire pour un membre en reconversion | Trimestrielle |

### 7.3 Critères d'éligibilité

Les critères d'éligibilité sont définis par le conseil familial et configurables. Ils incluent typiquement :

- Le statut du bénéficiaire (orphelin, veuve, handicapé, en précarité avérée).
- Le niveau de besoin (évalué par le comité médiation sur dossier confidentiel).
- Les ressources du bénéficiaire (revenus, patrimoine, soutiens extérieurs).
- Le rattachement familial (membre direct, allié, enfant d'allié).

Les dossiers d'éligibilité sont confidentiels, examinés par le comité médiation et validés par le conseil. Les bénéficiaires ne sont pas publiquement désignés dans l'application : seuls le comité et le conseil connaissent la liste.

### 7.4 Versements

Les versements sont effectués via l'Univers 4 (Caisse), aux dates prévues. Le système génère automatiquement les ordres de virement et notifie le trésorier. En cas de solde insuffisant sur la caisse de solidarité, le système alerte le conseil, qui décide d'un transfert depuis la caisse principale ou d'un report.

### 7.5 Révision et clôture

Chaque aide sociale est révisée périodiquement (annuellement pour les bourses, semestriellement pour les soutiens continus). La révision permet :

- De vérifier que les conditions d'éligibilité sont toujours remplies.
- D'ajuster le montant (en hausse ou en baisse).
- De clôturer l'aide si la situation s'est améliorée.

La clôture d'une aide sociale est sensible : elle doit être annoncée au bénéficiaire avec un préavis suffisant (par exemple, 3 mois), et accompagnée d'un plan de transition si nécessaire.

### 7.6 Prêts familiaux

Certaines familles pratiquent des prêts familiaux à conditions préférentielles (taux zéro, remboursement étalé). L'Univers 3 gère ces prêts via :

- Un dossier de prêt (emprunteur, montant, taux, échéancier).
- Un suivi des remboursements (échéances, retards, rappels).
- Une clôture à la fin du remboursement.

Les prêts familiaux sont sensibles et peuvent créer des tensions : le système impose donc une validation par le conseil, une traçabilité complète, et un bilan annuel présenté au conseil. Les prêts non remboursés sont traités par le comité médiation, qui peut proposer des solutions (étalement, remise partielle, conversion en don).

---

## 8. Module 4.5 — Répartition et équité

### 8.1 Description

La répartition des contributions est l'un des sujets les plus sensibles de la solidarité. Sans règle explicite, les membres contribuent selon leur bonne volonté, ce qui crée des déséquilibres : les mêmes donnent toujours, d'autres ne donnent jamais, les branches riches sur-contribuent et s'en plaignent, les branches modestes sont stigmatisées. Le module Répartition et équité propose un cadre structuré, configurable et transparent.

### 8.2 Barèmes de contribution

Le système propose trois modes de contribution, configurables par type de solidarité :

- **Montant libre** — chacun contribue selon ses moyens, sans barème. C'est le mode par défaut pour les solidarités ponctuelles (décès, sinistre).
- **Barème fixe** — un montant défini par membre adulte, identique pour tous. Adapté aux cotisations régulières (caisse familiale mensuelle).
- **Barème gradué** — un montant variable selon la situation du membre (branche, génération, revenu déclaré, situation diaspora). Adapté aux grandes collectes exceptionnelles.

### 8.3 Barème gradué — Facteurs d'ajustement

Le barème gradué prend en compte plusieurs facteurs, configurables :

| Facteur | Ajustement par défaut |
|---|---|
| Branche | Toutes branches à contribution égale, ajustable par le conseil |
| Génération | Génération active × 1,0 ; jeunes actifs × 0,7 ; retraités × 0,5 |
| Diaspora | Membres diaspora × 1,5 (soutien renforcé) |
| Revenu déclaré | Tranches : faible × 0,5, moyen × 1,0, élevé × 1,5 (sur déclaration volontaire) |
| Statut | Membre direct × 1,0 ; allié × 0,7 (selon tradition) |

### 8.4 Exonérations

Les membres en situation de précarité peuvent être exonérés, totalement ou partiellement, par décision du comité médiation. Les motifs d'exonération incluent :

- Maladie grave en cours.
- Perte d'emploi récente.
- Situation de précarité avérée.
- Handicap lourd.
- Étudiant sans revenu.

Les exonérations sont confidentielles : le membre exonéré n'apparaît pas dans les listes de relance, et son statut n'est pas visible par les autres membres. Seuls le comité médiation et le conseil connaissent la liste des exonérés.

### 8.5 Vue agrégée d'équité

Le module fournit une vue agrégée permettant au conseil de surveiller les équilibres :

- Contribution moyenne par branche (absolue et relative au nombre de membres).
- Taux de participation par branche.
- Évolution des contributions dans le temps (par branche, par génération).
- Identification des branches ou membres systématiquement en retard.

Cette vue n'est pas publique ; elle est réservée au conseil et au comité médiation, pour des décisions d'ajustement des barèmes ou de médiation.

### 8.6 Cas limite — branche systématiquement déficitaire

Si une branche est systématiquement en retard ou sous-contributive, le système signale la situation au conseil, qui peut :

- Engager une médiation avec le chef de branche.
- Ajuster le barème de la branche à la baisse (si la situation est structurelle).
- Proposer un plan de rattrapage étalé.
- Exonérer temporairement certains membres de la branche.

L'objectif n'est jamais la stigmatisation, mais la prise en compte explicite des situations pour préserver la cohésion.

---

## 9. Module 4.6 — Transparence et audit

### 9.1 Description

La transparence est la condition sine qua non de l'adoption de l'Univers 3. Si les membres ont le moindre doute sur l'intégrité du système, ils cesseront de contribuer et l'application sera discréditée. Le module Transparence et audit impose donc une discipline radicale : tout est tracé, tout est justifié, tout est consultable.

### 9.2 Journal immutable des transactions

Chaque transaction (contribution ou dépense) est enregistrée dans un journal immutable, c'est-à-dire non modifiable après création. Toute correction se fait par écriture compensatoire, jamais par effacement. Ce journal est consultable par :

- Le conseil familial (vue complète).
- Le comité médiation (vue complète).
- Le trésorier (vue complète).
- Les chefs de branche (vue de leur branche).
- Les membres (vue de leurs propres contributions et des bilans agrégés).

### 9.3 Justificatifs obligatoires

Toute dépense supérieure à un seuil configurable (par défaut 10 000 FCFA) doit être justifiée par une pièce jointe : facture, reçu, photo, contrat. Les justificatifs sont téléversés dans le dossier et visibles par le conseil et le comité médiation. En l'absence de justificatif, la dépense est signalée et doit être régularisée ou remboursée.

### 9.4 Double validation des dépenses

Aucune dépense ne peut être validée par son auteur seul. Le système impose une double validation :

- Le référent du dossier propose la dépense (montant, bénéficiaire, motif, justificatif).
- Le trésorier ou un membre du conseil valide la dépense.
- Le virement est alors effectué via l'Univers 4.

Cette double validation protège à la fois contre les erreurs et contre les détournements. En cas de désaccord, le comité médiation arbitre.

### 9.5 Rapport automatique mensuel

Chaque mois, le système génère automatiquement un rapport de solidarité transmis à tous les membres. Ce rapport comprend :

- Le bilan du mois (collecté, dépensé, solde).
- La liste des dossiers ouverts et clôturés.
- Le détail des contributions par branche (agrégat, pas nominatif).
- Les aides sociales versées.
- Les éventuelles alertes (dépenses non justifiées, retards de validation).

Ce rapport mensuel est un acte de transparence fort. Il montre que le système est vivant, surveillé, et tenu à jour.

### 9.6 Mode audit

Sur demande du conseil ou à l'occasion d'un changement de trésorier, le système génère un export complet d'audit :

- Toutes les transactions sur une période donnée.
- Tous les justificatifs.
- Tous les bilans de dossiers.
- Les journaux d'audit (qui a consulté quoi, quand).

Cet export est destiné à un comptable externe ou à un commissaire aux comptes, pour une vérification indépendante. Cette capacité d'audit est un gage de sérieux qui distingue l'application d'une simple cagnotte informelle.

---

## 10. Module 4.7 — Médiation et confidentialité

### 10.1 Description

La solidarité est par nature un sujet à fort potentiel de conflit : conflits sur les montants, sur les bénéficiaires, sur les priorités, sur les exclusions. Sans instance de médiation, ces conflits s'enveniment et peuvent déchirer la famille. L'Univers 3 intègre donc un module Médiation et confidentialité, articulé autour du comité médiation déjà évoqué dans l'Univers 1.

### 10.2 Le comité médiation

Le comité médiation est un organe désigné par le conseil familial, composé de 3 à 5 membres reconnus pour leur sagesse, leur impartialité et leur discrétion. Il intervient dans plusieurs cas :

- **Contestation d'une dépense** — un membre soupçonne une dépense injustifiée ou détournée.
- **Demande d'aide sociale confidentielle** — un membre en précarité demande un soutien sans exposure publique.
- **Conflit entre membres lié à la solidarité** — par exemple, désaccord sur la répartition d'une collecte entre plusieurs bénéficiaires.
- **Exonération de contribution** — un membre demande à être exonéré pour des raisons confidentielles.

Le comité médiation a accès à toutes les informations, y compris les plus sensibles (santé, précarité, conflits). Il est soumis à une obligation de confidentialité stricte.

### 10.3 Dossiers sensibles

Certains dossiers de solidarité sont confidentiels par nature : maladie mentale, addiction, problème judiciaire, conflit familial grave. Ces dossiers sont marqués « confidentiel » et ne sont visibles que par :

- Le bénéficiaire.
- Le référent désigné.
- Le comité médiation.
- Le patriarche (sur demande justifiée).

Les autres membres n'en voient même pas l'existence. Cette confidentialité est essentielle pour préserver la dignité des membres dans des situations déjà difficiles.

### 10.4 Journal des consultations

Comme dans l'Univers 1, l'Univers 3 tient un journal des consultations des dossiers sensibles. Chaque consultation est enregistrée (qui, quoi, quand), et ce journal est consultable par le membre concerné et par le comité médiation. Cette transparence dissuade les consultations abusives et renforce la confiance.

### 10.5 Procédure de contestation

Tout membre peut contester une décision de solidarité (dépense, exclusion, répartition) en adressant une contestation formelle au comité médiation. La procédure est :

1. **Dépôt de la contestation** — via un formulaire dédié, avec motif et pièces éventuelles.
2. **Examen par le comité** — dans un délai de 14 jours.
3. **Audition des parties** — si nécessaire, le comité auditionne le contestataire et les personnes concernées.
4. **Décision motivée** — le comité rend une décision motivée, transmise aux parties et au conseil.
5. **Recours** — en cas de désaccord, le contestataire peut faire appel au patriarche ou au conseil.

Cette procédure structurée prévient les rumeurs et les règlements de comptes privés. Elle donne à chaque membre un recours légitime.

### 10.6 Confidentialité médicale

Les informations de santé sont particulièrement sensibles. Le système applique les principes suivants :

- Un membre peut déclarer un problème de santé sans préciser sa nature (par exemple, « maladie grave » sans diagnostic).
- Les détails médicaux ne sont accessibles qu'au comité médiation et au référent, sur accord explicite du membre.
- En cas de décès, les informations médicales sont purgées après un délai configurable (par défaut, 2 ans).

---

## 11. Modèle de données conceptuel

Le modèle de données de l'Univers 3 s'articule autour de sept entités principales.

| Entité | Description | Attributs clés |
|---|---|---|
| DossierSolidarité | L'unité atomique, liée à un événement U2 | Identifiant, type, bénéficiaire, branche, gravité, dates, statut |
| Collecte | La collecte financière associée à un dossier | Dossier, cible, périmètre, contributions, dépenses, solde |
| Contribution | Une contribution d'un membre à une collecte | Membre, collecte, montant, date, canal (lien U4) |
| SituationSuivie | Une situation longue (maladie, deuil, précarité) | Dossier, type, jalons, référent, clôture prévue |
| AideSociale | Une aide sociale récurrente | Bénéficiaire, type, montant, fréquence, dates, statut |
| Justificatif | Une pièce justificative d'une dépense | Dossier, dépense, type, URL, validateur |
| Audit | Journal d'une action sensible | Auteur, action, cible, date, justification |

### 11.1 Relations principales

- Un **DossierSolidarité** possède une **Collecte**, éventuellement une **SituationSuivie**, et plusieurs **Justificatifs**.
- Une **Collecte** possède plusieurs **Contributions** et plusieurs dépenses (enregistrées comme transactions négatives).
- Une **AideSociale** est rattachée à un bénéficiaire (Membre U1) et génère des versements périodiques (lien U4).
- Un **DossierSolidarité** est lié à un événement de l'Univers 2 (identifiant partagé).
- Un **Audit** est généré à chaque action sensible (création, modification, clôture, consultation de dossier confidentiel).

### 11.2 Règles d'intégrité

- Un dossier ne peut être clôturé sans bilan financier complet et justificatifs pour toutes les dépenses > seuil.
- Une dépense ne peut être validée sans double validation.
- Un membre ne peut être à la fois bénéficiaire et validateur de la même dépense.
- Une aide sociale ne peut être ouverte sans validation du conseil.
- Toute suppression est interdite ; les dossiers sont clôturés et archivés, jamais effacés.

---

## 12. Règles de gestion essentielles

Les règles ci-dessous s'imposent à tous les modules de l'Univers 3. Elles sont configurables par chaque famille.

| # | Règle | Justification |
|---|---|---|
| R1 | Tout dossier de solidarité est validé par le chef de branche concerné avant ouverture de la collecte. | Garantit la légitimité du bénéficiaire. |
| R2 | La collecte pour un décès est ouverte dans les 4 heures suivant l'annonce. | Respecte l'urgence de la situation. |
| R3 | Toute dépense supérieure au seuil configurable (10 000 FCFA par défaut) est justifiée par pièce jointe. | Garantit la transparence. |
| R4 | Toute dépense est soumise à double validation (référent + trésorier ou conseil). | Prévient les erreurs et les détournements. |
| R5 | Aucun dossier ne peut être clôturé sans bilan transmis à tous les contributeurs. | Garantit la traçabilité. |
| R6 | Les dossiers sensibles (maladie, conflit, précarité) sont confidentiels et accessibles uniquement au comité médiation et au référent. | Protège la dignité des membres. |
| R7 | Les exonérations de contribution sont confidentielles et validées par le comité médiation. | Évite la stigmatisation des membres en précarité. |
| R8 | Le journal des transactions est immutable ; toute correction se fait par écriture compensatoire. | Garantit l'auditabilité. |
| R9 | Un rapport mensuel de solidarité est transmis automatiquement à tous les membres. | Renforce la transparence et la confiance. |
| R10 | Les contestations sont traitées par le comité médiation dans un délai de 14 jours. | Prévient les rumeurs et les conflits. |
| R11 | Les aides sociales sont révisées périodiquement (annuel ou semestriel). | Adapte le soutien aux situations évolutives. |
| R12 | Les prêts familiaux sont soumis à validation du conseil et à échéancier formel. | Évite les abus et les malentendus. |
| R13 | Toute consultation d'un dossier sensible est journalisée et consultable par le membre concerné. | Dissuade les consultations abusives. |
| R14 | Le mode audit est activable sur décision du conseil, avec export complet des transactions et justificatifs. | Permet les vérifications indépendantes. |

---

## 13. Cas limites et situations sensibles

### 13.1 Décès dans la précarité

Lorsqu'un membre décède dans une situation de précarité (pas de famille proche, pas de ressources), la solidarité doit couvrir non seulement les funérailles mais aussi d'éventuelles dettes laissées et la prise en charge des orphelins. Le système gère ce cas par un dossier complexe, combinant collecte funéraire, apurement des dettes (sur validation du conseil) et ouverture d'une aide sociale récurrente pour les orphelins.

### 13.2 Maladie longue durée

Une maladie longue (cancer, dialyse, VIH) peut nécessiter des soutiens réguliers sur des mois ou des années. Le système gère ce cas par une situation suivie longue, avec des collectes complémentaires périodiques, un suivi médical (sur accord du membre), et une possible transition vers une aide sociale récurrente si les ressources du foyer sont épuisées.

### 13.3 Conflit bénéficiaire / comité

Le bénéficiaire d'une solidarité peut contester les décisions du comité (par exemple, refuser une dépense prévue, exiger un versement direct plutôt que l'achat d'un bien). Le système prévoit une procédure de médiation : le comité médiation auditionne les parties et rend une décision. En cas de blocage persistant, le patriarche tranche.

### 13.4 Solidarité qui épuise

Si les solidarités se multiplient dans une période courte (plusieurs décès, plusieurs maladies), la capacité de contribution des membres peut être saturée. Le système détecte cette saturation (taux de participation en baisse, montants moyens en baisse) et alerte le conseil. Le conseil peut alors décider de prioriser, d'étaler les collectes, ou de mobiliser la caisse familiale pour compléter.

### 13.5 Fraude potentielle

Un membre peut tenter de déclarer une fausse situation pour bénéficier d'une solidarité. Le système prévoit plusieurs garde-fous :

- Validation par le chef de branche, qui connaît la situation réelle.
- Demande de justificatifs (certificat de décès, certificat médical, factures).
- Audit aléatoire par le comité médiation sur un pourcentage des dossiers.
- Signalement anonyme possible par tout membre.

En cas de fraude avérée, le dossier est clôturé, les fonds sont restitués, et le membre est signalé au conseil pour sanction.

### 13.6 Demande refusée

Toutes les demandes de solidarité ne peuvent être acceptées (par exemple, demande répétée d'un même membre, demande hors critères, demande manifestement excessive). Le refus est notifié au demandeur avec un motif, par le comité médiation. Le demandeur peut contester la décision auprès du conseil.

### 13.7 Solidarité transfrontalière (diaspora)

Un membre diaspora en difficulté (perte d'emploi, maladie à l'étranger, problème juridique) peut nécessiter une solidarité spécifique. Le système gère ce cas par :

- Une collecte en devise locale (euro, dollar) pour les membres diaspora.
- Une conversion automatique vers le FCFA pour la partie camerounaise.
- Une coordination avec les relais diaspora désignés dans chaque pays.

### 13.8 Décès d'un membre diaspora

Le décès d'un membre diaspora pose des questions spécifiques : rapatriement du corps, organisation des funérailles dans le pays d'origine ou au village, gestion des biens à l'étranger. Le système propose un workflow dédié, coordonné entre le référent local et le référent diaspora, avec une collecte souvent plus importante (frais de rapatriement élevés).

---

## 14. Wireframes textuels des écrans clés

Cette section décrit en pseudo-maquettes les cinq écrans les plus importants de l'Univers 3.

### 14.1 Tableau de bord de la solidarité

```
┌────────────────────────────────────────────────────────────┐
│  SOLIDARITÉ — Tableau de bord                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ❤️ SOLIDARITÉS EN COURS                                   │
│  • Décès Maman Rosine — Collecte 3 200 000 / 4 000 000    │
│    (80%) — 87 contributeurs / 124                          │
│    [Ouvrir le dossier]                                     │
│                                                            │
│  • Maladie de Paul (Branche Sud) — Suivi J+45              │
│    Confidentiel — Comité médiation                         │
│    [Ouvrir le dossier]                                     │
│                                                            │
│  • Sinistre Bernard (incendie) — Collecte 850 000 / 1M    │
│    (85%) — 64 contributeurs / 88                           │
│    [Ouvrir le dossier]                                     │
│                                                            │
│  💰 AIDES SOCIALES RÉCURRENTES                             │
│  • Bourses scolaires — 12 bénéficiaires                   │
│  • Soutien veuves — 4 bénéficiaires                       │
│  • Aide médicale — 2 bénéficiaires                        │
│  Total versé ce mois : 850 000 FCFA                       │
│                                                            │
│  📊 BILAN ANNUEL 2026                                      │
│  Collecté : 18 500 000 FCFA                               │
│  Dépensé : 17 200 000 FCFA                                │
│  Dossiers clôturés : 14                                   │
│  Taux de participation moyen : 73 %                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.2 Dossier solidarité décès

```
┌────────────────────────────────────────────────────────────┐
│  SOL-2026-007  ❤️ DÉCÈS — Maman Rosine NDONGO             │
├────────────────────────────────────────────────────────────┤
│  Statut : COLLECTE EN COURS                               │
│  Branche : Nord — Référent : Bernard NDONGO               │
│  Lié à l'événement : EVT-2026-014                         │
│                                                            │
│  ─── BÉNÉFICIAIRE ────────────────────                     │
│  Maman Rosine NDONGO (décédée le 25/09/2026)              │
│  Conjoint : Paul NDONGO (veuf)                            │
│  Enfants orphelins : 3 (scolarisés)                       │
│                                                            │
│  ─── COLLECTE ──────────────────────────                   │
│  Cible : 4 000 000 FCFA                                   │
│  Collecté : 3 200 000 FCFA (80%)                          │
│  Contributeurs : 87 / 124 (70%)                           │
│  Montant moyen : 36 700 FCFA                              │
│                                                            │
│  ─── COMITÉ ────────────────────────────                   │
│  Référent : Bernard NDONGO                                │
│  Membres : 5 — Validateur : Papa Jean (patriarche)        │
│                                                            │
│  ─── DÉPENSES PRÉVUES ──────────────────                   │
│  • Cercueil : 800 000 FCFA                                │
│  • Transport corps : 450 000 FCFA                         │
│  • Repas funéraires : 1 200 000 FCFA                      │
│  • Habits de deuil : 350 000 FCFA                         │
│  • Frais divers : 200 000 FCFA                            │
│  Total prévu : 3 000 000 FCFA                             │
│                                                            │
│  ─── DÉPENSES EFFECTUÉES ───────────────                   │
│  (à ce jour) — 0 FCFA — Aucune dépense                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.3 Suivi de maladie

```
┌────────────────────────────────────────────────────────────┐
│  SOL-2026-005  ❤️ MALADIE — Paul (Branche Sud)            │
├────────────────────────────────────────────────────────────┤
│  Statut : SUIVI EN COURS — J+45                           │
│  Confidentiel — Comité médiation + référent               │
│                                                            │
│  ─── SITUATION ───────────────────────                     │
│  Pathologie : (non précisée)                              │
│  Hospitalisation : 12/08/2026 — Hôpital Central Yaoundé   │
│  Pronostic : traitement en cours, 6 mois estimés          │
│                                                            │
│  ─── JALONS ───────────────────────────                    │
│  ✓ 12/08 — Hospitalisation                                │
│  ✓ 15/08 — Collecte initiale (1 200 000 FCFA)             │
│  ✓ 30/08 — Première visite du comité                      │
│  ✓ 15/09 — Sortie d'hôpital                               │
│  ⏳ 30/10 — Bilan à 2 mois (à planifier)                  │
│  ○ 15/02 — Bilan à 6 mois                                │
│                                                            │
│  ─── SUIVI FINANCIER ───────────────────                   │
│  Collecté : 1 200 000 FCFA                                │
│  Dépensé : 980 000 FCFA (factures hospitalières)         │
│  Solde : 220 000 FCFA                                     │
│  Besoin complémentaire : à évaluer au prochain bilan      │
│                                                            │
│  ─── VISITES ───────────────────────────                   │
│  • 30/09 — Visite de Hélène (référente)                   │
│  • 14/10 — Visite du comité médiation                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.4 Collecte en cours (vue contributeur)

```
┌────────────────────────────────────────────────────────────┐
│  Collecte SOL-2026-007 — Décès Maman Rosine               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Cible : 4 000 000 FCFA                                   │
│  Progression : ████████████████░░░░ 80%                  │
│  Collecté : 3 200 000 FCFA                                │
│  Contributeurs : 87 / 124 (70%)                           │
│                                                            │
│  ─── MA CONTRIBUTION ─────────────────                     │
│  Statut : ✓ Payé — 25 000 FCFA le 26/09/2026              │
│  Canal : Orange Money                                     │
│  Reçu : merci-cli-789456.pdf                              │
│                                                            │
│  ─── CONTRIBUTIONS RÉCENTES ─────────────                  │
│  (anonymisées sauf accord explicite)                      │
│  • 28/09 — 50 000 FCFA — Membre diaspora                  │
│  • 28/09 — 25 000 FCFA                                   │
│  • 27/09 — 100 000 FCFA — Branche Nord                    │
│  • 27/09 — 15 000 FCFA                                   │
│  ...                                                      │
│                                                            │
│  ─── BILAN PRÉVISIONNEL ───────────────                    │
│  (sera transmis à tous les contributeurs à la clôture)    │
│                                                            │
│  [Contribuer à nouveau]  [Partager]                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.5 Aide sociale récurrente (vue gestion)

```
┌────────────────────────────────────────────────────────────┐
│  AIDES SOCIALES RÉCURRENTES                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📚 BOURSES SCOLAIRES (12 bénéficiaires)                  │
│  Total annuel : 3 600 000 FCFA                            │
│  Versé en 2026 : 1 800 000 FCFA (50%)                     │
│  Prochain versement : 05/10/2026 (Rentrée scolaire T2)    │
│  [Voir détail]                                             │
│                                                            │
│  👩 VEUVES (4 bénéficiaires)                              │
│  Total mensuel : 200 000 FCFA                             │
│  Versé en 2026 : 1 800 000 FCFA                           │
│  Prochain versement : 05/10/2026                          │
│  [Voir détail]                                             │
│                                                            │
│  ⚕️ AIDE MÉDICALE (2 bénéficiaires)                       │
│  Total mensuel : 350 000 FCFA                             │
│  Versé en 2026 : 3 150 000 FCFA                           │
│  Prochain versement : 05/10/2026                          │
│  [Voir détail]                                             │
│                                                            │
│  ─── RÉVISIONS À VENIR ────────────────                    │
│  • 15/10 — Révision semestrielle (3 dossiers)             │
│  • 30/11 — Révision annuelle bourses (12 dossiers)        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Roadmap MVP et séquençage

L'Univers 3 est séquencé en trois phases pour permettre une adoption progressive.

### 15.1 Phase 1 — MVP (mois 5 à 9)

| Périmètre | Détail |
|---|---|
| Dossier de solidarité | Métadonnées, comité, bénéficiaire, statut |
| Collecte ciblée | Mobile Money (MTN MoMo, Orange Money), suivi temps réel |
| Déclenchement automatique | Pour décès et sinistre uniquement |
| Double validation | Des dépenses, avec justificatifs photo |
| Rapport mensuel | Automatique, transmis à tous les membres |
| Barème libre | Montant libre par défaut |

**Critères de sortie** : délai de déclenchement d'une collecte de décès ≤ 4 heures, taux de participation ≥ 60 %, transparence 100 % (toutes les dépenses justifiées).

### 15.2 Phase 2 — Enrichissement (mois 10 à 14)

| Périmètre | Détail |
|---|---|
| Suivi des situations | Maladie longue, deuil, précarité |
| Aides sociales récurrentes | Bourses, veuves, médical |
| Barème gradué | Par branche, génération, diaspora |
| Exonérations | Confidentielles, par le comité médiation |
| Mode audit | Export complet pour comptable externe |
| Prêts familiaux | Avec échéancier et suivi des remboursements |
| Journal immutable | Toute transaction non modifiable |

**Critères de sortie** : 90 % des dépenses justifiées, satisfaction bénéficiaires ≥ 4/5, taux de contestation ≤ 2/an.

### 15.3 Phase 3 — Maturité (mois 15 à 20)

| Périmètre | Détail |
|---|---|
| IA équité | Détection des déséquilibres, suggestions d'ajustement |
| Prédiction de saturation | Alerte quand la capacité de contribution s'épuise |
| Solidarité transfrontalière | Multi-devises pour diaspora |
| Bilan annuel intelligent | Comparaison inter-annuelles, recommandations |
| Médiation assistée | Outils d'aide à la décision pour le comité |
| Notifications vocales | Appels automatiques pour les membres âgés |

**Critères de sortie** : 70 % des membres contribuant à chaque solidarité, 95 % des aides sociales versées à temps, 0 fuite d'information sensible.

---

## 16. Risques et points d'attention

### 16.1 Conflits liés à l'argent

L'argent est le sujet le plus explosif des grandes familles. La transparence elle-même peut nourrir des tensions (un membre voyant que tel autre a donné moins, par exemple). La mitigation repose sur la confidentialité des montants individuels (sauf accord explicite), la médiation systématique en cas de contestation, et l'éducation des membres à la culture de la solidarité plutôt qu'à la comparaison.

### 16.2 Fraude

Une fausse déclaration de solidarité ou une dépense fictive peut gravement nuire à la confiance. La mitigation repose sur la validation par le chef de branche, la demande de justificatifs, l'audit aléatoire, et le signalement anonyme. En cas de fraude avérée, une sanction exemplaire est appliquée (exclusion temporaire, restitution) et communiquée, pour dissuader les récidives.

### 16.3 Épuisement des contributeurs

Si les solidarités se multiplient, les membres peuvent se lasser de contribuer, surtout s'ils ont le sentiment que « c'est toujours les mêmes qui donnent ». La mitigation repose sur la détection de la saturation (alertes au conseil), la priorisation des collectes, la rotation des référents, et la valorisation des contributeurs réguliers (mention publique, statut dans le profil).

### 16.4 Confidentialité médicale

Les informations de santé sont particulièrement sensibles. Une fuite (par exemple, divulgation involontaire de la pathologie d'un membre) peut causer des dommages considérables. La mitigation repose sur la restriction d'accès (comité médiation uniquement), le journal des consultations, la purge automatique après un délai, et la formation des référents au secret médical.

### 16.5 Jalousie entre branches

Si une branche reçoit régulièrement des solidarités et qu'une autre ne reçoit jamais, la jalousie peut s'installer. La mitigation repose sur la vue agrégée d'équité (réservée au conseil), la médiation préventive, et l'ajustement des barèmes si le déséquilibre est structurel. L'objectif n'est pas l'égalité des distributions, mais la visibilité des situations et la légitimité des décisions.

### 16.6 Dépendance à l'égard des outils numériques

Les membres les plus âgés ou les moins à l'aise avec le numérique peuvent se sentir exclus du système de solidarité. La mitigation repose sur la possibilité de contribuer en espèces (saisie manuelle par le trésorier), les notifications vocales pour les annonces critiques, et l'accompagnement humain d'un référent pour les membres en difficulté avec l'application.

### 16.7 Pression sur le comité médiation

Le comité médiation peut se retrouver sous pression, surtout dans les familles où les conflits sont fréquents. La mitigation repose sur la rotation des membres du comité (tous les 2 ou 3 ans), la formation à la médiation, le soutien du patriarche, et la possibilité de faire appel à un médiateur externe en cas de besoin.

---

## 17. Indicateurs de succès

| Indicateur | Définition | Cible | Fréquence |
|---|---|---|---|
| Délai de déclenchement | Délai événement → ouverture dossier | ≤ 4 heures | Par dossier |
| Taux de participation | Membres contribuant à une collecte | ≥ 70 % | Par collecte |
| Délai de collecte | Délai pour atteindre 80% de la cible | ≤ 7 jours | Par collecte |
| Taux de justificatifs | Dépenses justifiées par pièce jointe | 100 % | Mensuel |
| Délai de clôture | Fin de situation → clôture | ≤ 30 jours | Par dossier |
| Satisfaction bénéficiaires | Note anonyme des bénéficiaires | ≥ 4/5 | Par clôture |
| Satisfaction contributeurs | Note anonyme des contributeurs | ≥ 4/5 | Mensuel |
| Taux de contestation | Contestations formelles par an | ≤ 2/an | Annuel |
| Aides sociales à temps | Versements effectués à la date prévue | ≥ 95 % | Mensuel |
| Fuites d'information | Nombre de fuites d'informations sensibles | 0 | Annuel |

---

## 18. Conclusion

L'Univers 3 est l'épreuve de vérité de l'application. Toute la sophistication technique des autres univers ne sert à rien si la solidarité échoue : c'est par elle que la famille mesure concrètement la valeur de l'outil, et c'est par elle que se construit (ou se défait) la confiance. C'est pourquoi ce module a été conçu avec une exigence particulière de transparence, d'équité et de respect des personnes.

La proposition centrale de l'Univers 3 est simple : remplacer la solidarité réactive et opaque par un protocole transparent et équitable. Chaque situation difficile déclenche automatiquement un dossier structuré, une collecte ciblée, un suivi organisé et une clôture auditée. Chaque contribution est tracée, chaque dépense justifiée, chaque bénéficiaire désigné légitimement. La solidarité cesse d'être un sujet de rumeur ou de soupçon pour devenir un fonctionnement partagé.

L'Univers 3 ne se substitue pas à l'émotion : il la protège. En prenant en charge la logistique financière et organisationnelle, il laisse aux membres la disponibilité pour l'essentiel — la présence, le témoignage, l'accompagnement. C'est sa véritable valeur, au-delà de l'efficacité opérationnelle : préserver la dimension humaine de la solidarité en la libérant des tâches qui l'épuisent.

Les prochaines étapes recommandées sont les suivantes :

1. **Validation de cette spécification** par le comité de pilotage et par au moins deux familles pilotes, avec un accent particulier sur les barèmes de contribution et les procédures de médiation.
2. **Production des maquettes interactives** des cinq écrans clés (tableau de bord, dossier décès, suivi maladie, vue contributeur, aide sociale).
3. **Définition des interfaces avec l'Univers 4** (caisse, Mobile Money, virements) et l'Univers 2 (événements, workflows).
4. **Construction du MVP Phase 1** avec un périmètre strictement limité aux dossiers de décès et de sinistre, à la collecte Mobile Money et à la double validation des dépenses.
5. **Onboarding de la première famille pilote** dans un délai de huit mois après le démarrage du développement, avec un accompagnement particulier du comité médiation.

L'Univers 3, s'il est bien conçu et bien livré, deviendra le cœur battant de la famille : un lieu où chaque épreuve trouve une réponse, chaque membre un soutien, et chaque contribution une trace. Il transformera la solidarité en institution, sans la réduire à une procédure froide.
