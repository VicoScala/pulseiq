# FitIQ — Dashboard WHOOP + Réseau Social Fitness

Application full-stack connectée à l'API WHOOP v2 pour visualiser vos données de santé, suivre vos performances et partager votre progression avec vos amis.

🚀 **Démo live** : [https://pulseiq-production.up.railway.app](https://pulseiq-production.up.railway.app)

---

## ✨ Fonctionnalités

### 📊 Dashboard personnel
- Score de récupération du jour (gauge animée)
- HRV, fréquence cardiaque au repos, saturation O₂
- Tendances sur 7 / 30 / 90 jours (graphiques interactifs)
- Strain journalier et entraînements récents

### 😴 Sommeil
- Phases de sommeil (REM, léger, profond, éveillé)
- Performance et efficacité de sommeil
- Historique et tendances

### 🏋️ Entraînements
- Liste de tous les workouts avec sport, strain et distance
- Zones de fréquence cardiaque
- Filtre par période

### 📈 Insights
- Corrélations HRV / Sommeil / Strain
- Nuage de points interactif
- Score de régularité sommeil

### 👥 Fil d'actualité social (style Strava)
- Feed des performances de votre cercle
- Bordure colorée par type de post (activité, sommeil, streak, PR)
- Métriques Strava : strain coloré + km pour les activités
- Cercle de récupération pour les posts sommeil
- Badge sport avec emoji (🏃 running, 🚴 cycling, 🏋️ weightlifting…)
- **Reposts** avec attribution à l'auteur original

### ⚡ Réactions & Commentaires
- 5 réactions expressives : 👍 like · 🔥 fire · 💪 beast · 💀 rip · 👏 clap
- Commentaires avec réponses imbriquées
- **Système de @mention** : taguez vos amis dans les commentaires avec autocomplétion
- Notifications en temps réel pour toutes les interactions

### 🔔 Notifications
- Cloche en temps réel (WebSocket)
- Types : nouveau follower, réaction, commentaire, mention, coup de pouce, alerte streak, badge
- Bac de notifications non lues avec badge rouge

### 👤 Profil utilisateur
- Photo de profil personnalisée (upload JPG/PNG jusqu'à 3 Mo)
- Statistiques : followers, following, posts
- Badges gagnés + streaks
- Vue des posts d'un utilisateur

### 🏆 Classement
- Leaderboard de récupération, HRV, strain
- Suivi d'autres utilisateurs directement depuis le classement

---

## 🛠 Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js · Express · TypeScript |
| Base de données | SQLite (better-sqlite3) |
| Frontend | React 18 · TypeScript · Vite |
| Styles | Tailwind CSS |
| Graphiques | Recharts |
| Auth | OAuth 2.0 WHOOP (refresh automatique) |
| Temps réel | WebSocket natif |
| Upload | Multer (disk storage) |
| Déploiement | Railway (volume persistant `/data`) |

---

## 📁 Structure du projet

```
fitiq/
├── backend/
│   ├── src/
│   │   ├── config.ts               # Variables d'environnement
│   │   ├── index.ts                # Express app + cron + WebSocket
│   │   ├── db/
│   │   │   └── database.ts         # SQLite schema, migrations, queries
│   │   ├── services/
│   │   │   ├── whoop.ts            # Client API WHOOP v2 + pagination
│   │   │   └── sync.ts             # Synchronisation complète des données
│   │   ├── routes/
│   │   │   ├── auth.ts             # OAuth flow + session
│   │   │   ├── api.ts              # Dashboard, sleep, workouts, insights
│   │   │   ├── social.ts           # Feed, posts, réactions, commentaires, notifs
│   │   │   └── upload.ts           # Upload photo de profil (multer)
│   │   └── middleware/
│   │       └── session.ts
│   ├── data/                       # DB + avatars (volume persistant en prod)
│   └── package.json
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx       # Vue principale
        │   ├── Sleep.tsx           # Phases de sommeil
        │   ├── Workouts.tsx        # Liste + zones FC
        │   ├── Insights.tsx        # Corrélations
        │   ├── Feed.tsx            # Fil d'actualité + notifications
        │   ├── Profile.tsx         # Profil public + upload avatar
        │   ├── Discover.tsx        # Recherche d'utilisateurs
        │   └── Leaderboard.tsx     # Classements
        ├── components/
        │   ├── charts/             # TrendChart, SleepStack, WorkoutZones, Scatter
        │   ├── social/
        │   │   ├── PostCard.tsx    # Carte post style Strava
        │   │   ├── ReactionBar.tsx # Barre de réactions
        │   │   └── CommentThread.tsx # Commentaires + @mentions
        │   └── ui/                 # Gauge, MetricCard, Spinner, NotifToast
        ├── hooks/
        │   ├── useAuth.ts
        │   ├── useData.ts
        │   ├── useSocial.ts        # Feed, réactions, commentaires, notifs, avatar
        │   └── useWebSocket.ts
        ├── api/
        │   └── client.ts           # Axios + fetch helpers
        └── types/
            └── whoop.ts            # Types TypeScript complets
```

---

## 🔄 Endpoints API

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/auth/whoop` | Démarre le flux OAuth WHOOP |
| GET | `/auth/callback` | Callback OAuth |
| GET | `/auth/me` | Profil de l'utilisateur connecté |
| POST | `/auth/logout` | Déconnexion |

### Données WHOOP
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/dashboard` | Résumé du jour + tendances |
| GET | `/api/recovery?period=30d` | Scores de récupération |
| GET | `/api/sleep?period=30d` | Données de sommeil |
| GET | `/api/cycles?period=30d` | Cycles physiologiques |
| GET | `/api/workouts?period=30d` | Entraînements |
| GET | `/api/insights` | Corrélations calculées |
| POST | `/api/sync?full=true` | Sync manuelle |

### Social
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/feed` | Fil d'actualité paginé |
| GET | `/api/posts/:id/comments` | Commentaires d'un post |
| POST | `/api/posts/:id/comments` | Ajouter un commentaire (+ parsing @mentions) |
| POST | `/api/posts/:id/react` | Ajouter une réaction |
| DELETE | `/api/posts/:id/react` | Supprimer sa réaction |
| POST | `/api/posts/:id/repost` | Reposter |
| GET | `/api/notifications` | Notifications + compteur non lus |
| POST | `/api/notifications/read` | Marquer tout comme lu |
| GET | `/api/profile/:id` | Profil public d'un utilisateur |
| POST | `/api/follow/:id` | Suivre un utilisateur |
| DELETE | `/api/follow/:id` | Ne plus suivre |
| GET | `/api/discover` | Recherche d'utilisateurs |
| GET | `/api/leaderboard` | Classements |
| POST | `/api/avatar` | Upload photo de profil |

---

## 🚀 Installation locale

### Pré-requis
- Node.js 18+

### 1. WHOOP Developer Dashboard
Rendez-vous sur [https://developer-dashboard.whoop.com](https://developer-dashboard.whoop.com) et ajoutez `http://localhost:3001/auth/callback` dans les **Redirect URLs** de votre app.

### 2. Variables d'environnement

Créez `backend/.env` :

```env
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REDIRECT_URI=http://localhost:3001/auth/callback
PORT=3001
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=a-long-random-secret
DB_PATH=./data/fitiq.db
```

### 3. Installer les dépendances

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Lancer l'application

**Terminal 1 — Backend :**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend :**
```bash
cd frontend && npm run dev
```

### 5. Ouvrir l'app
→ [http://localhost:5173](http://localhost:5173)

Cliquez **"Connecter avec WHOOP"** → autorisez → le dashboard se charge automatiquement.

---

## ☁️ Déploiement (Railway)

L'application est déployée sur [Railway](https://railway.app) avec :
- **Volume persistant** `pulseiq-volume` monté sur `/data` — la base SQLite et les avatars survivent aux redéploiements
- **Auto-deploy** sur push vers `main`
- Variables d'environnement configurées dans Railway Dashboard
- `NODE_ENV=production` active le serving statique du frontend buildé

```
main branch push → Railway build → deploy automatique
```

---

## 🔒 Sécurité
- Tokens WHOOP stockés en base, refresh automatique 5 min avant expiration
- Sessions httpOnly cookies (30 jours)
- Protection CSRF via paramètre `state` OAuth
- Upload limité à 3 Mo, types MIME validés (jpg/png/gif/webp)
- Sync planifiée toutes les 6 heures via cron
