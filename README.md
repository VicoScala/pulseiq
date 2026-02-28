# FitIQ — Tableau de bord WHOOP Personnel

Application full-stack connectée à l'API WHOOP v2 pour visualiser vos données de santé et performance.

## Stack
- **Backend** : Node.js + Express + TypeScript + SQLite (better-sqlite3)
- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Auth** : OAuth2 WHOOP avec refresh automatique de token

---

## 🚀 Installation rapide

### Pré-requis
- Node.js 18+
- npm ou pnpm

### 1. Ajouter la redirect URI dans WHOOP Developer Dashboard

Rendez-vous sur https://developer-dashboard.whoop.com et modifiez l'app **Claude01** :
- Ajoutez `http://localhost:3001/auth/callback` dans les **Redirect URLs**

### 2. Installer les dépendances

```bash
cd /Users/victoralexandrian/fitiq

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Lancer l'application

**Terminal 1 — Backend :**
```bash
cd /Users/victoralexandrian/fitiq/backend
npm run dev
```

**Terminal 2 — Frontend :**
```bash
cd /Users/victoralexandrian/fitiq/frontend
npm run dev
```

### 4. Ouvrir l'app
→ http://localhost:5173

Cliquez **"Connecter avec WHOOP"** → autorisez → le dashboard se charge automatiquement.

---

## 📁 Structure

```
fitiq/
├── backend/
│   ├── src/
│   │   ├── config.ts           # Variables d'environnement
│   │   ├── index.ts            # Express app + cron jobs
│   │   ├── db/database.ts      # SQLite schema + queries
│   │   ├── services/
│   │   │   ├── whoop.ts        # Client API WHOOP + pagination
│   │   │   └── sync.ts         # Sync de toutes les données
│   │   ├── routes/
│   │   │   ├── auth.ts         # OAuth flow (/auth/whoop, /auth/callback)
│   │   │   └── api.ts          # Données (/api/dashboard, /api/recovery, etc.)
│   │   └── middleware/session.ts
│   ├── .env                    # Credentials WHOOP (pré-rempli)
│   └── data/fitiq.db           # Base SQLite (auto-créée)
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx   # Vue principale + Recovery Gauge
        │   ├── Sleep.tsx       # Phases de sommeil + tendances
        │   ├── Workouts.tsx    # Liste + détail + zones FC
        │   └── Insights.tsx    # Corrélations HRV/Sommeil/Strain
        ├── components/
        │   ├── charts/         # TrendChart, SleepStack, WorkoutZones, Scatter
        │   └── ui/             # Gauge, MetricCard, Badge, Spinner
        └── hooks/
            ├── useAuth.ts
            └── useData.ts
```

---

## 🔄 Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/auth/whoop` | Démarre le flux OAuth |
| GET | `/auth/callback` | Callback OAuth WHOOP |
| GET | `/auth/me` | Profil utilisateur connecté |
| POST | `/auth/logout` | Déconnexion |
| GET | `/api/dashboard` | Résumé du jour + tendances |
| GET | `/api/recovery?period=30d` | Scores de récupération |
| GET | `/api/sleep?period=30d` | Données de sommeil |
| GET | `/api/cycles?period=30d` | Cycles physiologiques |
| GET | `/api/workouts?period=30d` | Entraînements |
| GET | `/api/insights` | Corrélations calculées |
| POST | `/api/sync?full=true` | Sync manuelle |

---

## ⚙️ Configuration (.env)

```env
WHOOP_CLIENT_ID=830cab9a-ce0c-4a01-80de-4681ea567be6
WHOOP_CLIENT_SECRET=9cc6f5fc39eb41097b3f3193418b9b24e1e426d114938d51cfd603241a7b8aa2
WHOOP_REDIRECT_URI=http://localhost:3001/auth/callback
PORT=3001
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=change-me-in-production
DB_PATH=./data/fitiq.db
```

---

## 🔒 Sécurité
- Tokens WHOOP stockés en SQLite (chiffrés en prod avec SQLCipher)
- Sessions httpOnly cookies (30 jours)
- CSRF protection via paramètre `state` OAuth
- Refresh automatique du token 5 min avant expiration
- Sync planifiée toutes les 6 heures
