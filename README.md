# VisaCoach

Coach IA pour maximiser ses chances d'obtenir un visa — cible : ressortissants
d'Afrique subsaharienne francophone (Sénégal, Côte d'Ivoire, Cameroun, Mali,
Congo…).

**Tunnel :** diagnostic gratuit (7 questions) → score 0-100 → rapport payant
généré par IA.

## Stack

| Couche       | Techno                                              |
| ------------ | --------------------------------------------------- |
| Backend      | FastAPI (Python 3.11) — déploiement Railway         |
| Frontend     | React 18 + TypeScript + Tailwind CSS — déploiement Vercel |
| Base de données | Supabase (PostgreSQL + Auth + Storage)           |
| Paiements    | CinetPay (FCFA / mobile money) · Stripe (EUR)       |
| IA           | Claude API (`claude-sonnet-4-6`)                    |
| Email        | Resend                                              |

## Structure

```
visacoach/
├── backend/        # API FastAPI
│   └── app/
│       ├── core/       # config + client Supabase
│       ├── routers/    # diagnostics, payments, reports
│       └── services/   # cinetpay, claude, resend
├── frontend/       # SPA React + Vite
│   └── src/
│       ├── pages/      # Home, Diagnostic, Score, Rapport, Success
│       ├── components/ # QuestionCard, ScoreGauge, PaymentModal
│       └── lib/        # client API
├── supabase/
│   └── schema.sql  # tables diagnostics / orders / reports
└── .env.example
```

## Démarrage local

### 1. Base de données

Créez un projet Supabase, puis exécutez `supabase/schema.sql` dans le SQL Editor.

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # (Windows : .venv\Scripts\activate)
pip install -r requirements.txt
cp ../.env.example .env   # puis renseignez les vraies clés
uvicorn app.main:app --reload
```

API disponible sur http://localhost:8000 (docs interactives : `/docs`).

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:8000
npm run dev
```

App disponible sur http://localhost:5173.

## Déploiement

- **Backend → Railway** : connectez le dépôt, Railway lit `backend/railway.toml`.
  Renseignez les variables d'environnement (cf. `.env.example`).
- **Frontend → Vercel** : importez le dossier `frontend/`, Vercel lit
  `vercel.json`. Définissez `VITE_API_URL` sur l'URL Railway de production.

## Tarifs

| Offre           | FCFA        | EUR     |
| --------------- | ----------- | ------- |
| Rapport complet | 6 500 FCFA  | 9,90 €  |
| Suivi Expert    | 19 600 FCFA | 29,90 € |

> ⚠️ VisaCoach est un accompagnement méthodologique et ne garantit pas
> l'obtention du visa.
