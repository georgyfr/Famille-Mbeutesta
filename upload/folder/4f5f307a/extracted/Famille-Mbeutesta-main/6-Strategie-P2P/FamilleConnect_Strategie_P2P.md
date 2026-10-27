# FamilleConnect — Stratégie de Stockage et Transfert P2P

**Architecture peer-to-peer : l'application comme relais, pas comme stockage**

| Document | Stratégie de stockage et transfert de fichiers |
|---|---|
| Version | 1.0 |
| Date | Octobre 2026 |
| Statut | Pour validation — Changement architectural majeur |
| Audience | Équipe technique, CTO, comité de pilotage, investisseurs |
| Prérequis | Architecture technique appliquée, Schéma PostgreSQL |

---

## Synthèse exécutive

FamilleConnect adopte une architecture de transfert de fichiers **peer-to-peer (P2P)** inspirée du modèle WhatsApp : l'application est un **relais entre téléphones**, pas un fournisseur de stockage. Les fichiers média (photos, vidéos, audio, voice notes) partagés par un utilisateur ne sont **jamais stockés sur nos serveurs**. Ils restent sur le téléphone de l'expéditeur et sont téléchargés à la demande par les destinataires, directement depuis le téléphone de l'expéditeur.

Si l'expéditeur supprime le fichier de son téléphone, il n'est plus disponible pour de nouveaux téléchargements. Mais si un destinataire l'a déjà téléchargé, il le conserve localement et peut le consulter indéfiniment, même après suppression par l'expéditeur.

Seules les données nécessitant un **rappel permanent ou programmé** sont stockées dans le cloud (Cloudflare ou équivalent) : événements du calendrier, notifications, enregistrements comptables, votes, PV, registre des membres. Ces données sont légères (texte structuré, quelques kilo-octets par entrée) et leur coût de stockage est négligeable.

Cette stratégie réduit drastiquement les coûts d'infrastructure (pas de stockage S3 pour les média, pas de bande passante pour le transfert de fichiers), améliore la confidentialité (les fichiers ne quittent jamais le contrôle de leur propriétaire), et s'aligne sur le modèle mental des utilisateurs habitués à WhatsApp.

---

## 1. Principes fondamentaux

### 1.1 Le principe : relais, pas stockage

FamilleConnect est un **relais** entre les téléphones des membres, pas un dépôt central. Le rôle de l'application est de :

- **Faciliter la mise en relation** entre l'expéditeur et le destinataire d'un fichier.
- **Transférer le fichier** directement du téléphone de l'expéditeur vers le téléphone du destinataire (P2P via WebRTC).
- **Mettre en cache localement** le fichier sur le téléphone du destinataire après téléchargement.
- **Informer les destinataires** qu'un fichier est disponible (notification avec manifeste, pas avec le fichier lui-même).

L'application ne stocke **jamais** le contenu des fichiers média. Elle ne stocke que des **manifestes** (métadonnées : nom, type, taille, checksum, expéditeur, date, statut de disponibilité).

### 1.2 Ce qui reste sur le téléphone de l'expéditeur

| Type de contenu | Stockage | Justification |
|---|---|---|
| Photos partagées | Téléphone de l'expéditeur | L'expéditeur est propriétaire, contrôle la disponibilité |
| Vidéos partagées | Téléphone de l'expéditeur | Volume important, pas de coût serveur |
| Audio / voice notes | Téléphone de l'expéditeur | L'expéditeur contrôle la suppression |
| Documents (PDF, Word) | Téléphone de l'expéditeur | Sauf documents officiels archivés en U6 (voir §3) |
| Messages de chat | Téléphone de l'expéditeur | Livré au destinataire quand les deux sont en ligne |

### 1.3 Ce qui est stocké dans le cloud

| Type de contenu | Stockage | Justification |
|---|---|---|
| Registre des membres (U1) | Cloud | Données structurées, consultables hors-ligne, recherchables |
| Événements et calendrier (U2) | Cloud | Rappels programmés, notifications temporisées |
| Dossiers de solidarité (U3) | Cloud | Suivi permanent, collectes, immutabilité |
| Écritures comptables (U4) | Cloud | Immutabilité, audit, rapprochement |
| Votes et PV (U5) | Cloud | Immutabilité, traçabilité, légitimité |
| Manifestes de fichiers | Cloud | Métadonnées uniquement (nom, type, taille, expéditeur, statut) — jamais le contenu |
| Notifications | Cloud | Historique, anti-saturation, préférences |
| Règlement intérieur | Cloud | Consultable à tout moment, versionné |

### 1.4 Le cycle de vie d'un fichier partagé

```
┌──────────────────────────────────────────────────────────────┐
│  1. EXPÉDITEUR partage un fichier                            │
│     • Le fichier reste sur son téléphone                     │
│     • Un MANIFESTE est créé dans le cloud                    │
│     • Les destinataires reçoivent une NOTIFICATION           │
│        (avec manifeste, sans le fichier)                     │
├──────────────────────────────────────────────────────────────┤
│  2. DESTINATAIRE veut voir le fichier                        │
│     • L'app demande le fichier au téléphone de l'expéditeur  │
│     • Transfert P2P via WebRTC (ou TURN si NAT)              │
│     • Le fichier est mis en CACHE LOCAL sur le destinataire  │
├──────────────────────────────────────────────────────────────┤
│  3. EXPÉDITEUR supprime le fichier de son téléphone          │
│     • Le manifeste est marqué "indisponible"                 │
│     • Les nouveaux destinataires ne peuvent plus télécharger │
│     • Les destinataires qui ont déjà téléchargé conservent   │
│       leur copie locale (visible indéfiniment)               │
├──────────────────────────────────────────────────────────────┤
│  4. EXPÉDITEUR hors-ligne                                    │
│     • Le fichier n'est pas téléchargeable temporairement     │
│     • Le manifeste affiche "Expéditeur hors-ligne"           │
│     • Le destinataire peut demander une notification         │
│       "Préviens-moi quand le fichier est disponible"         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture technique P2P

### 2.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│                   ARCHITECTURE P2P FAMILLECONNECT             │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐                              ┌──────────┐       │
│  │ Téléphone │                              │ Téléphone │       │
│  │  Alice    │                              │   Bob     │       │
│  │           │     ┌───────────────┐       │           │       │
│  │  Fichier  │────▶│  Serveur de    │─────▶│  Fichier  │       │
│  │  (local)  │     │  signalisation │      │  (cache)  │       │
│  │           │     │  (léger)       │      │           │       │
│  └──────────┘     └───────────────┘       └──────────┘       │
│       │                   │                      │             │
│       │           ┌───────┴────────┐             │             │
│       │           │  Cloud (léger)  │             │             │
│       │           │  • Manifestes   │             │             │
│       │           │  • Événements   │             │             │
│       │           │  • Comptabilité │             │             │
│       │           │  • Votes / PV   │             │             │
│       │           │  • Notifications│             │             │
│       │           └────────────────┘             │             │
│       │                                           │             │
│       │         ┌─────────────────┐              │             │
│       └────────▶│  Serveur TURN    │◀─────────────┘             │
│                 │  (relay si P2P   │                            │
│                 │   impossible)    │                            │
│                 └─────────────────┘                            │
│                                                                │
│  Transfert direct P2P (WebRTC) quand possible                  │
│  Transfert via TURN (relay temporaire) si NAT bloquant         │
│  AUCUN stockage de fichiers sur les serveurs                   │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Composants techniques

#### Serveur de signalisation (cloud, léger)

Le serveur de signalisation est le seul composant cloud nécessaire pour le P2P. Il est **extrêmement léger** (quelques kilo-octets par connexion) et sert uniquement à :

- **Établir la connexion WebRTC** entre les deux téléphones (échange d'offres SDP, candidats ICE).
- **Maintenir la présence** (qui est en ligne, qui est hors-ligne).
- **Relayer les manifestes** de fichiers (métadonnées, pas le contenu).
- **Gérer les files d'attente** (demandes de téléchargement en attente).

Technologie recommandée : **Node.js + Socket.io** (déjà dans la stack), hébergé sur Cloudflare Workers ou un petit serveur.

#### WebRTC — transfert P2P direct

WebRTC (Web Real-Time Communication) est la technologie standard pour le transfert direct entre navigateurs et applications mobiles, sans passage par un serveur intermédiaire.

- **DataChannel** : canal de données bidirectionnel pour le transfert de fichiers (binaire).
- **STUN** : aide à la traversée de NAT (gratuit, Google fournit des serveurs STUN publics).
- **TURN** : relay quand le P2P direct échoue (NAT symétrique, pare-feu d'entreprise).

Le transfert WebRTC est **chiffré par défaut** (DTLS/SRTP), ce qui garantit la confidentialité du fichier en transit.

#### Serveur TURN (relay temporaire)

Quand le P2P direct échoue (environ 10-20 % des cas selon les réseaux), le serveur TURN relaye temporairement le fichier entre les deux téléphones. **Le fichier n'est jamais stocké sur le serveur TURN** — il transite uniquement, comme un tuyau.

Technologie recommandée : **coturn** (open-source), hébergé sur un petit serveur (2 vCPU, 4 Go RAM). Coût : ~20 000 FCFA/mois.

#### Cache local (téléphone du destinataire)

Une fois le fichier téléchargé, il est stocké dans le **cache local** de l'application sur le téléphone du destinataire :

- **Emplacement** : répertoire privé de l'application (inaccessible aux autres apps).
- **Chiffrement** : SQLCipher ou chiffrement natif iOS/Android.
- **Gestion** : nettoyage automatique si l'espace est insuffisant (les fichiers les plus anciens sont supprimés en premier, sauf ceux marqués "Conserver").
- **Marquage manuel** : le destinataire peut marquer un fichier "Conserver" pour empêcher le nettoyage automatique.

### 2.3 Gestion de la présence (en ligne / hors-ligne)

Le serveur de signalisation maintient un **registre de présence** en temps réel :

```
Présence = { member_id, device_id, status: 'online' | 'offline', last_seen_at }
```

Quand un destinataire veut télécharger un fichier :
1. L'app vérifie si l'expéditeur est en ligne.
2. Si **en ligne** : transfert P2P immédiat via WebRTC.
3. Si **hors-ligne** : le manifeste affiche "Expéditeur hors-ligne — fichier temporairement indisponible". Le destinataire peut activer une alerte "Préviens-moi quand disponible".
4. Quand l'expéditeur revient en ligne, les alertes sont déclenchées.

### 2.4 Gestion des fichiers multiples destinataires

Un fichier peut être partagé avec plusieurs destinataires (par exemple, une photo d'un événement familial partagée avec toute la branche). Dans ce cas :

- **L'expéditeur est la source unique** : tous les destinataires téléchargent depuis son téléphone.
- **Mise en cache distribuée** : après qu'un destinataire a téléchargé le fichier, il peut (optionnellement) servir de source secondaire pour les autres destinataires (modèle torrent-like). Cela réduit la charge sur l'expéditeur et accélère les téléchargements si l'expéditeur a une connexion limitée.
- **Configuration** : cette option est activable par l'expéditeur ("Autoriser le partage en cascade") ou par défaut, selon les retours des familles pilotes.

---

## 3. Ce qui est stocké dans le cloud vs sur le téléphone

### 3.1 Matrice de stockage par type de contenu

| Type de contenu | Cloud (métadonnées) | Téléphone expéditeur (fichier) | Téléphone destinataire (cache) | Justification |
|---|---|---|---|---|
| Photos d'album | Manifeste uniquement | ✓ Original | ✓ Cache après téléchargement | P2P, pas de stockage serveur |
| Vidéos d'événement | Manifeste uniquement | ✓ Original | ✓ Cache après téléchargement | P2P, pas de stockage serveur |
| Audio / voice notes | Manifeste uniquement | ✓ Original | ✓ Cache après téléchargement | P2P, pas de stockage serveur |
| Documents (PDF, Word) | Manifeste uniquement | ✓ Original | ✓ Cache après téléchargement | P2P, sauf documents officiels (voir §3.2) |
| Messages de chat | ✓ Stockés (léger) | ✓ Local aussi | ✓ Livré au destinataire | Texte = quelques octets, nécessaire pour livraison différée |
| Événements / calendrier | ✓ Stockés | — | — | Rappels programmés, notifications |
| Cotisations / paiements | ✓ Stockés | — | — | Immutabilité, audit, rapprochement |
| Votes / PV | ✓ Stockés | — | — | Immutabilité, traçabilité |
| Registre des membres | ✓ Stockés | — | — | Recherche, consultation hors-ligne |
| Notifications | ✓ Stockés | — | — | Anti-saturation, historique |
| Justificatifs financiers | Manifeste + option cloud | ✓ Original | ✓ Cache | P2P par défaut, mais le trésorier peut "épingler" un justificatif pour archivage cloud (U6) |
| Interviews d'anciens (U6) | Manifeste + option cloud | ✓ Original | ✓ Cache | P2P par défaut, mais le comité culturel peut "archiver" une interview pour conservation permanente (cloud) |

### 3.2 Exceptions — archivage cloud optionnel

Certains fichiers ont une valeur patrimoniale qui justifie un archivage cloud permanent. Ces fichiers sont **explicitement archivés** par un administrateur (comité culturel, trésorier, patriarche) et ne suivent pas le modèle P2P standard :

| Fichier | Qui archive | Justification |
|---|---|---|
| Interviews d'anciens (U6) | Comité culturel | Patrimoine familial permanent, l'ancien peut décéder |
| Justificatifs de dépenses > 500 000 FCFA | Trésorier | Audit, immutabilité comptable |
| Actes notariés, testaments | Patriarche / conseil | Conservation légale, consultation posthume |
| PV de congrès (version PDF signée) | Secrétaire | Trace officielle immuable |
| Photos emblématiques d'événements | Référent de l'événement | Mémoire familiale, l'expéditeur peut supprimer |

L'archivage cloud est **explicite et délibéré** : un utilisateur ne peut pas archiver par accident. L'action d'archivage génère une notification au propriétaire du fichier et une trace dans le journal d'audit.

### 3.3 Tailles estimées

| Type | Taille moyenne | Par famille/an | Cloud ? |
|---|---|---|---|
| Photo d'album | 2-5 Mo | 500 photos = 1-2,5 Go | Non — P2P |
| Vidéo d'événement | 50-200 Mo | 50 vidéos = 2,5-10 Go | Non — P2P |
| Voice note | 0,5-2 Mo | 200 voice notes = 0,1-0,4 Go | Non — P2P |
| Message de chat | 0,2 Ko | 50 000 messages = 10 Mo | Oui — négligeable |
| Événement (structuré) | 1 Ko | 200 événements = 200 Ko | Oui — négligeable |
| Écriture comptable | 0,5 Ko | 2 000 écritures = 1 Mo | Oui — négligeable |
| Manifeste de fichier | 0,3 Ko | 1 000 manifestes = 300 Ko | Oui — négligeable |

**Économie de stockage cloud** : sans P2P, une famille de 247 membres générerait 5-15 Go de média par an. Avec 1 000 familles en Phase 3, cela représenterait 5-15 To/an, soit un coût de 5-15 millions FCFA/an en stockage S3. **Avec le P2P, ce coût tombe à quasiment zéro** (seuls les manifestes et les données structurées sont stockés, soit moins de 1 Go par famille par an).

---

## 4. Schéma de données mis à jour

### 4.1 Table `commun.file_manifest` (remplace `commun.file`)

La table `commun.file` du schéma PostgreSQL initial est remplacée par `commun.file_manifest`, qui ne stocke que les métadonnées, pas le fichier lui-même.

```sql
CREATE TABLE commun.file_manifest (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id           UUID NOT NULL REFERENCES commun.family(id),
    
    -- Métadonnées du fichier (pas le contenu)
    original_name       VARCHAR(500) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    size_bytes          BIGINT NOT NULL,
    checksum_sha256     VARCHAR(64) NOT NULL,
    
    -- Expéditeur (source P2P)
    sender_member_id    UUID NOT NULL REFERENCES famille.member(id),
    sender_device_id    UUID NOT NULL REFERENCES commun.device(id),
    
    -- Disponibilité
    availability_status manifest_availability NOT NULL DEFAULT 'available',
    -- 'available' = expéditeur en ligne ou fichier en cache
    -- 'offline' = expéditeur hors-ligne
    -- 'deleted' = expéditeur a supprimé le fichier
    -- 'archived' = archivé dans le cloud (exception)
    
    -- Archivage cloud optionnel
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at         TIMESTAMPTZ,
    archived_by         UUID REFERENCES commun.user(id),
    s3_bucket           VARCHAR(255),  -- null sauf si is_archived = true
    s3_key              VARCHAR(500),
    
    -- Partage en cascade (torrent-like)
    cascade_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Métadonnées complémentaires
    metadata            JSONB NOT NULL DEFAULT '{}',
    
    -- Champs communs
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES commun.user(id),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    version             INTEGER NOT NULL DEFAULT 1
);

CREATE TYPE manifest_availability AS ENUM ('available', 'offline', 'deleted', 'archived');

CREATE INDEX idx_manifest_family ON commun.file_manifest(family_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_manifest_sender ON commun.file_manifest(sender_member_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_manifest_availability ON commun.file_manifest(availability_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_manifest_archived ON commun.file_manifest(is_archived) WHERE is_archived = TRUE;
```

### 4.2 Table `commun.file_download` (cache des destinataires)

Suit les fichiers téléchargés par chaque destinataire (cache local).

```sql
CREATE TABLE commun.file_download (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_manifest_id    UUID NOT NULL REFERENCES commun.file_manifest(id),
    recipient_member_id UUID NOT NULL REFERENCES famille.member(id),
    recipient_device_id UUID NOT NULL REFERENCES commun.device(id),
    download_status     download_status NOT NULL DEFAULT 'pending',
    -- 'pending' = demandé, en attente
    -- 'downloading' = en cours de transfert P2P
    -- 'completed' = téléchargé et mis en cache
    -- 'failed' = échec (expéditeur hors-ligne, fichier supprimé)
    -- 'expired' = cache nettoyé automatiquement
    
    download_started_at TIMESTAMPTZ,
    download_completed_at TIMESTAMPTZ,
    local_path          VARCHAR(500),  -- chemin sur le téléphone (chiffré)
    local_size_bytes    BIGINT,
    is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,  -- conservé manuellement
    
    -- Source du téléchargement
    source_type         download_source NOT NULL DEFAULT 'sender',
    -- 'sender' = téléchargé depuis le téléphone de l'expéditeur
    -- 'cascade' = téléchargé depuis un autre destinataire (partage en cascade)
    -- 'cloud' = téléchargé depuis l'archive cloud (si is_archived)
    source_member_id    UUID REFERENCES famille.member(id),  -- si cascade
    
    -- Champs communs
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version             INTEGER NOT NULL DEFAULT 1
);

CREATE TYPE download_status AS ENUM ('pending', 'downloading', 'completed', 'failed', 'expired');
CREATE TYPE download_source AS ENUM ('sender', 'cascade', 'cloud');

CREATE INDEX idx_download_manifest ON commun.file_download(file_manifest_id);
CREATE INDEX idx_download_recipient ON commun.file_download(recipient_member_id, download_status);
CREATE UNIQUE INDEX idx_download_unique ON commun.file_download(file_manifest_id, recipient_member_id, recipient_device_id);
CREATE INDEX idx_download_pinned ON commun.file_download(is_pinned) WHERE is_pinned = TRUE;
```

### 4.3 Table `commun.presence` (statut en ligne)

Registre de présence en temps réel pour le P2P.

```sql
CREATE TABLE commun.presence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       UUID NOT NULL REFERENCES famille.member(id),
    device_id       UUID NOT NULL REFERENCES commun.device(id),
    status          presence_status NOT NULL DEFAULT 'offline',
    last_online_at  TIMESTAMPTZ,
    last_ip         INET,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE presence_status AS ENUM ('online', 'away', 'offline');

CREATE UNIQUE INDEX idx_presence_device ON commun.presence(device_id);
CREATE INDEX idx_presence_member ON commun.presence(member_id, status);
CREATE INDEX idx_presence_online ON commun.presence(status) WHERE status = 'online';
```

---

## 5. Impact sur chaque univers

### 5.1 U1 — La Famille

- **Photo de profil** : stockée sur le téléphone du membre, téléchargée P2P par les autres membres qui consultent la fiche. Si le membre supprime sa photo, elle n'est plus disponible (mais ceux qui l'ont mise en cache la voient encore).
- **Documents d'identité** : P2P, sauf archivage explicite par le conseil.
- **Registre, branches, rôles** : cloud (données structurées, pas des fichiers).

### 5.2 U2 — La Vie familiale

- **Albums photo** : chaque photo est un manifeste P2P. L'expéditeur (ou les contributeurs) sont les sources. Les destinataires téléchargent à la demande. Le référent peut "épingler" des photos emblématiques pour archivage cloud.
- **Programme d'événement (PDF)** : P2P, sauf si l'événement nécessite un rappel (alors archivé cloud).
- **Vidéos d'événement** : P2P uniquement (volume trop important pour le cloud).
- **Événements (métadonnées)** : cloud (rappels, calendrier, notifications).

### 5.3 U3 — La Solidarité

- **Justificatifs de dépenses** : P2P par défaut. Pour les dépenses > 500 000 FCFA, le trésorier peut "épingler" le justificatif pour archivage cloud (audit, immutabilité).
- **Dossier, collecte, suivi** : cloud (données structurées, immutabilité).

### 5.4 U4 — Les Finances

- **Reçus PDF** : générés localement sur le téléphone du membre (pas de stockage cloud).
- **Relevés bancaires** : P2P, téléversés par le trésorier.
- **Écritures comptables, cotisations, paiements** : cloud (immutabilité, audit, rapprochement).

### 5.5 U5 — La Gouvernance

- **PV en PDF** : P2P pour la version brouillon. Une fois validé, le PV est archivé cloud (immutabilité, trace officielle).
- **Règlement intérieur** : cloud (consultable à tout moment, versionné).
- **Votes, élections, recours** : cloud (immutabilité, traçabilité).

### 5.6 U6 — La Mémoire

- **Interviews audio/vidéo** : P2P par défaut. Le comité culturel peut "archiver" une interview pour conservation permanente (cloud), car l'ancien peut décéder et le fichier serait perdu.
- **Albums photo historiques** : P2P, avec archivage cloud optionnel pour les photos emblématiques.
- **Documents officiels** : archivage cloud (actes notariés, testaments, statuts).
- **Traditions (texte, recettes)** : cloud (léger, consultable, recherchable).

### 5.7 U7 — Le Réseau

- **Portfolios, CV** : P2P (le membre est la source).
- **Messages de chat** : cloud (texte léger, livraison différée nécessaire).
- **Pièces jointes de messagerie** : P2P (photos, documents partagés en chat).
- **Compétences, opportunités, mentorat** : cloud (données structurées).

---

## 6. Gestion des messages texte

### 6.1 Le modèle hybride

Les messages texte de chat (U7 messagerie) sont stockés dans le cloud, car :

- **Taille négligeable** : un message texte = 0,2 Ko en moyenne. 50 000 messages par an = 10 Mo, soit un coût cloud insignifiant.
- **Livraison différée** : le destinataire peut être hors-ligne. Le message doit attendre dans le cloud jusqu'à ce que le destinataire se connecte.
- **Recherche** : les messages doivent être recherchables (Elasticsearch).
- **Historique** : les membres consultent l'historique de leurs conversations.

### 6.2 Comportement type WhatsApp

- **Envoi** : le message est stocké dans le cloud + sur le téléphone de l'expéditeur.
- **Livraison** : quand le destinataire se connecte, le message est livré (push + stockage local).
- **Confirmation** : l'expéditeur reçoit une confirmation de livraison (✓✓).
- **Suppression** : l'expéditeur peut supprimer le message pour lui (local) ou pour tous (cloud + local de tous les destinataires, dans un délai de 1 heure).
- ** conservation** : les messages sont conservés dans le cloud pendant 90 jours, puis archivés en archive froide.

### 6.3 Exception : les annonces critiques

Les annonces critiques (décès, maladie grave) sont stockées dans le cloud de manière permanente, car elles déclenchent des workflows (U2) et des dossiers de solidarité (U3) qui nécessitent une trace durable.

---

## 7. Gestion de l'espace local sur le téléphone

### 7.1 Stratégie de cache

L'application gère intelligemment l'espace de stockage local sur le téléphone du destinataire :

| Priorité | Comportement |
|---|---|
| Fichiers épinglés ("Conserver") | Jamais supprimés automatiquement |
| Fichiers récents (< 30 jours) | Conservés en priorité |
| Fichiers consultés fréquemment | Conservés en priorité |
| Fichiers anciens (> 90 jours) non consultés | Supprimés en premier si espace insuffisant |
| Fichiers jamais consultés | Supprimés en premier |

### 7.2 Nettoyage automatique

- **Seuil d'alerte** : quand le cache atteint 80 % de la limite configurable (par défaut 2 Go), l'app alerte le membre.
- **Nettoyage automatique** : quand le cache atteint 95 %, les fichiers les moins prioritaires sont supprimés.
- **Nettoyage manuel** : le membre peut nettoyer manuellement, avec un aperçu des fichiers par taille et par ancienneté.

### 7.3 Paramétrage

Le membre peut configurer :
- **Limite de cache** : 500 Mo, 1 Go, 2 Go, 5 Go, ou "Illimité".
- **Nettoyage automatique** : activé/désactivé.
- **Durée de conservation** : 30, 60, 90 jours, ou "Illimité".

---

## 8. Sécurité du transfert P2P

### 8.1 Chiffrement en transit

Le transfert WebRTC est chiffré par défaut avec **DTLS** (Datagram Transport Layer Security) pour le DataChannel. Le fichier est donc chiffré entre le téléphone de l'expéditeur et le téléphone du destinataire, sans possibilité d'interception par le serveur de signalisation ou le serveur TURN.

### 8.2 Chiffrement local

- **Expéditeur** : le fichier reste dans son emplacement d'origine (galerie photo, répertoire de fichiers). L'application n'a pas besoin de le chiffrer (il est déjà sur le téléphone du propriétaire).
- **Destinataire** : le fichier téléchargé est stocké dans le **répertoire privé chiffré** de l'application (SQLCipher ou chiffrement natif iOS/Android). Il n'est pas accessible depuis la galerie du téléphone, sauf si le destinataire choisit de l'"Exporter vers la galerie".

### 8.3 Authentification des pairs

Avant le transfert P2P, les deux téléphones s'authentifient mutuellement via le serveur de signalisation :

1. Le destinataire envoie une demande de téléchargement au serveur de signalisation.
2. Le serveur vérifie que le destinataire a le droit d'accéder au fichier (permissions RBAC).
3. Le serveur facilite l'échange de certificats entre les deux téléphones.
4. Le transfert WebRTC commence, chiffré de bout en bout.

### 8.4 Validation du checksum

Après le téléchargement, le destinataire vérifie le **checksum SHA-256** du fichier reçu contre le manifeste. Si les checksums ne correspondent pas, le fichier est rejeté et le téléchargement est relancé.

---

## 9. Gestion des cas limites

### 9.1 Expéditeur hors-ligne

Si l'expéditeur est hors-ligne quand le destinataire veut télécharger :
- Le manifeste affiche "Expéditeur hors-ligne — fichier temporairement indisponible".
- Le destinataire peut activer une alerte "Préviens-moi quand disponible".
- Quand l'expéditeur revient en ligne, le serveur de signalisation notifie le destinataire.
- Le téléchargement peut alors commencer.

**Alternative** : si le partage en cascade est activé et qu'un autre destinataire a déjà le fichier en cache, le téléchargement peut se faire depuis ce destinataire (source secondaire).

### 9.2 Expéditeur supprime le fichier

Si l'expéditeur supprime le fichier de son téléphone :
- L'application met à jour le manifeste : `availability_status = 'deleted'`.
- Les nouveaux destinataires voient "Fichier supprimé par l'expéditeur".
- Les destinataires qui ont déjà téléchargé conservent leur copie locale (cache).
- Le fichier n'est plus disponible pour de nouveaux téléchargements, sauf si :
  - Le partage en cascade est activé et d'autres destinataires ont le fichier en cache.
  - Le fichier a été archivé dans le cloud (is_archived = true).

### 9.3 Expéditeur perd son téléphone

Si l'expéditeur perd son téléphone :
- Tous ses fichiers deviennent "indisponibles" (expéditeur hors-ligne permanent).
- Les destinataires qui ont déjà téléchargé conservent leur copie locale.
- Si le partage en cascade est activé, les fichiers restent disponibles via les autres destinataires.
- Le support peut marquer les manifestes comme "perdus" et faciliter la récupération depuis les caches des destinataires.

### 9.4 Fichier volumineux (vidéo > 200 Mo)

Pour les fichiers volumineux :
- Le transfert P2P peut prendre plusieurs minutes selon la connexion.
- L'affichage montre une barre de progression en temps réel.
- Le téléchargement peut être mis en pause et repris (transfert par chunks).
- Si la connexion est interrompue, le téléchargement reprend là où il s'est arrêté (checksum par chunk).

### 9.5 Congrès en zone rurale (réseau local)

Pour les congrès en zone rurale sans connexion Internet :
- L'application peut fonctionner en **réseau local (LAN)** via Wi-Fi direct ou Bluetooth.
- Le transfert P2P se fait en局域, sans passer par le serveur de signalisation cloud.
- Les manifestes sont synchronisés au retour de la connexion Internet.
- Ce mode "LAN" est particulièrement utile pour le partage de photos de congrès entre les participants présents.

### 9.6 Archivage d'une interview d'ancien (cas critique)

Une interview d'ancien (U6) est initialement partagée en P2P depuis le téléphone de l'intervieweur. Mais l'ancien peut décéder, et l'intervieweur peut perdre son téléphone. Pour éviter la perte de ce patrimoine :

1. Le comité culturel **archive explicitement** l'interview dans le cloud (is_archived = true).
2. Le fichier est téléversé vers S3 (ou équivalent) depuis le téléphone de l'intervieweur.
3. Le manifeste est mis à jour avec `s3_bucket` et `s3_key`.
4. Les destinataires peuvent désormais télécharger l'interview depuis le cloud (source_type = 'cloud'), indépendamment de la disponibilité de l'intervieweur.
5. L'interview est conservée de manière permanente (triple stockage, voir U6).

---

## 10. Impact sur les coûts d'infrastructure

### 10.1 Comparaison avant/après

| Poste | Sans P2P (architecture initiale) | Avec P2P (architecture révisée) | Économie |
|---|---|---|---|
| Stockage S3 (média) | 5-15 To/an (Phase 3) | ~50 Go/an (archives uniquement) | **99 % d'économie** |
| Bande passante (téléchargement média) | 10-30 To/mois (Phase 3) | ~100 Go/mois (signalisation + TURN) | **95 % d'économie** |
| Serveur de signalisation | — | 1 petit serveur (20K FCFA/mois) | +20K FCFA/mois |
| Serveur TURN | — | 1 petit serveur (20K FCFA/mois) | +20K FCFA/mois |
| **Total Phase 3** | 12-42M FCFA/mois | **10-38M FCFA/mois** | **2-4M FCFA/mois d'économie** |

### 10.2 Nouvelle estimation des coûts (Phase 3 révisée)

| Poste | Coût mensuel (FCFA) |
|---|---|
| Compute (ECS auto-scaling) | 2 – 4 millions |
| Base de données (RDS + read replicas) | 2 – 4 millions |
| Cache (Redis cluster) | 500 000 – 1 million |
| Elasticsearch (cluster) | 1 – 2 millions |
| **Stockage S3 (archives uniquement)** | **50 000 – 200 000** (vs 500K-2M avant) |
| **CDN (signalisation + assets, pas de média)** | **200 000 – 500 000** (vs 500K-2M avant) |
| **Serveur de signalisation P2P** | **100 000 – 200 000** (nouveau) |
| **Serveur TURN (relay)** | **100 000 – 200 000** (nouveau) |
| SMS (100 000-500 000 SMS) | 5 – 25 millions |
| E-mail | 100 000 – 300 000 |
| Monitoring | 500 000 – 1 million |
| Divers | 300 000 – 700 000 |
| **Total Phase 3 révisé** | **11,8 – 39,3 millions FCFA/mois** |

**Économie nette** : 200 000 à 2,7 millions FCFA/mois en Phase 3, selon le volume d'archives. L'économie croît avec le nombre de familles (plus de familles = plus de média = plus d'économie relative).

---

## 11. Mise à jour du schéma de données PostgreSQL

### 11.1 Tables modifiées

Les tables suivantes du schéma PostgreSQL sont modifiées pour refléter la stratégie P2P :

| Table | Modification |
|---|---|
| `commun.file` | **Remplacée** par `commun.file_manifest` (métadonnées uniquement) |
| `commun.file_download` | **Nouvelle table** (cache des destinataires) |
| `commun.presence` | **Nouvelle table** (statut en ligne) |
| `vie_familiale.photo` | `file_id` → `file_manifest_id` (FK vers manifeste) |
| `vie_familiale.album` | `cover_photo_id` → `cover_manifest_id` |
| `solidarite.solidarity_expense` | `justification_file_id` → `justification_manifest_id` |
| `finances.payment` | `receipt_file_id` → `receipt_manifest_id` |
| `finances.accounting_entry` | `justification_file_id` → `justification_manifest_id` |
| `memoire.testimony` | `audio_file_id` → `audio_manifest_id`, etc. |
| `memoire.document` | `file_id` → `file_manifest_id` |
| `reseau.opportunity` | Pas de changement (pas de fichier) |

### 11.2 Nouvelles tables

```sql
-- Voir §4 pour le DDL complet de :
-- commun.file_manifest
-- commun.file_download
-- commun.presence
```

---

## 12. Mise à jour du plan de test

Les scénarios de test suivants sont ajoutés au plan de test :

| ID | Scénario | Priorité | Critère d'acceptation |
|---|---|---|---|
| P2P-01 | Transfert P2P direct (WebRTC) | Critique | Le fichier est transféré de l'expéditeur au destinataire en moins de 30 secondes pour un fichier de 5 Mo |
| P2P-02 | Transfert via TURN (NAT bloquant) | Critique | Le fichier est transféré via le relay TURN, sans stockage sur le serveur |
| P2P-03 | Expéditeur hors-ligne | Élevée | Le manifeste affiche "hors-ligne", le destinataire peut activer une alerte |
| P2P-04 | Expéditeur supprime le fichier | Critique | Le manifeste passe en "deleted", les nouveaux téléchargements sont bloqués, les caches existants sont conservés |
| P2P-05 | Partage en cascade | Élevée | Un destinataire ayant le fichier en cache peut servir de source pour un autre destinataire |
| P2P-06 | Checksum validation | Critique | Le checksum du fichier reçu correspond au manifeste, sinon rejet |
| P2P-07 | Nettoyage automatique du cache | Moyenne | Les fichiers les moins prioritaires sont supprimés quand le cache atteint 95 % |
| P2P-08 | Archivage cloud explicite | Élevée | Le comité culturel peut archiver une interview, le fichier est téléversé vers S3, disponible indépendamment de l'expéditeur |
| P2P-09 | Mode LAN (congrès rural) | Moyenne | Le transfert P2P fonctionne en réseau local sans connexion Internet |
| P2P-10 | Reprene de téléchargement (chunks) | Élevée | Un téléchargement interrompu reprend là où il s'est arrêté |
| P2P-11 | Chiffrement en transit | Critique | Le transfert WebRTC est chiffré (DTLS), le serveur de signalisation ne voit pas le contenu |
| P2P-12 | Fichier volumineux (200 Mo vidéo) | Moyenne | Le téléchargement d'une vidéo de 200 Mo complète en moins de 5 minutes avec progression |

---

## 13. Conclusion

La stratégie P2P transforme FamilleConnect d'une plateforme de stockage en une plateforme de **relais**. Les fichiers média (photos, vidéos, audio) ne sont jamais stockés sur nos serveurs : ils transitent directement entre les téléphones des membres, via WebRTC. L'application est un facilitateur, pas un dépôt.

Cette stratégie offre trois avantages majeurs :

1. **Coût drastiquement réduit** — pas de stockage S3 pour les média, pas de bande passante pour le transfert de fichiers. Économie estimée à 2-4 millions FCFA/mois en Phase 3.
2. **Confidentialité renforcée** — les fichiers ne quittent jamais le contrôle de leur propriétaire. L'expéditeur peut révoquer l'accès à tout moment en supprimant le fichier de son téléphone.
3. **Alignement avec le modèle mental des utilisateurs** — les membres sont habitués à WhatsApp, où les fichiers sont téléchargés à la demande. FamilleConnect reproduit ce comportement, en l'étendant à tous les types de partage.

Les exceptions (archivage cloud explicite pour les interviews d'anciens, justificatifs de dépenses importantes, PV validés, documents officiels) sont délibérées et maîtrisées : elles concernent uniquement les fichiers à valeur patrimoniale ou légale, et nécessitent une action explicite d'un administrateur.

Le compromis principal est la **disponibilité conditionnelle** : un fichier n'est téléchargeable que si l'expéditeur (ou un destinataire en cache, via le partage en cascade) est en ligne. Ce compromis est accepté, car il correspond au modèle WhatsApp et parce que les fichiers les plus importants (interviews d'anciens, PV, justificatifs) sont archivés explicitement dans le cloud.

Les prochaines étapes consistent à mettre à jour l'architecture technique, le schéma PostgreSQL, et le plan de test avec cette stratégie P2P, puis à implémenter le serveur de signalisation et le serveur TURN en Phase 1.
