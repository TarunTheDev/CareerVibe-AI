<div align="center">

# ⚡ CareerVibe AI

### AI-Powered Resume Analyzer · Skill Gap Detector · Career Path Planner

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-careervibe--v2.vercel.app-3ED9A8?style=for-the-badge)](https://careervibe-v2.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **Stop guessing your career moves. Start knowing them.**  
> Upload your resume → Get instant AI analysis → Know exactly what skills to learn next.

**[🚀 Try it Live](https://careervibe-v2.vercel.app) · [📹 Demo Video](#) · [🐛 Report Bug](https://github.com/TarunTheDev/CareerVibe-AI/issues)**

</div>

---

## 🎯 What is CareerVibe AI?

CareerVibe AI is a full-stack, AI-powered career intelligence platform that helps job seekers make **smarter career decisions** in seconds — not weeks.

Unlike generic resume builders, CareerVibe:
- **Understands** your resume deeply with multi-model AI (Groq LLaMA + Google Gemini)
- **Compares** your skills against real job market requirements
- **Detects** fake/scam job listings automatically with a Reality Score™ engine
- **Plans** your career transition with actionable timelines and learning paths
- **Finds** live job listings from 5+ job APIs simultaneously

---

## ✨ Features

### 🤖 AI Resume Analysis
- Upload **PDF, DOCX, or TXT** resumes
- Multi-model AI extraction: name, skills, experience, education, industries
- Instant skill tag generation with canonical normalization (no duplicates)
- AI-powered career summary and professional strengths detection

### 📊 Skill Gap Analysis
- Enter any target job title → see your exact skill match %
- Visual breakdown of **matched vs. missing skills**
- Priority-ranked learning recommendations
- Market demand rating for each required skill

### 🗺️ Career Path Simulator
- Simulate transitions between any two roles
- AI-generated: transition timeline, salary range, transferable strengths
- 3-step personalized action plan for each career move
- Career DNA radar chart for visual self-assessment

### 🔍 Reality Score™ — Scam Job Detector
- Proprietary algorithm flags suspicious job listings
- Detects: salary anomalies, vague descriptions, urgent red flags, credibility signals
- Color-coded trust indicator on every job card (Green / Yellow / Red)
- Unique differentiator — **no other career platform has this**

### 💼 Live Job Board
- Aggregates from **5 job APIs simultaneously**: Adzuna, JSearch, Findwork, Apify, Arbeitsamt
- Auto-retry with AI-generated fallback jobs if all APIs fail (100% uptime guarantee)
- Real-time freshness indicators (posted X hours/days ago)
- One-click skill match scoring per job listing

### 🤖 AI Career Coach (Sidebar)
- Persistent Gemini-powered chat assistant
- Context-aware: knows your resume, target role, and skill gaps
- Answers career questions, interview tips, salary negotiation advice

### 🌍 Career World Map
- Visualize global job demand by role and location
- Explore career opportunities across different countries

### 👤 User Profiles
- Persistent user data with Firebase
- Dark/Light/Pixel theme switcher
- Full data privacy controls with one-click deletion

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Frontend** | React 18, Vanilla CSS, Lucide Icons |
| **Authentication** | Firebase Auth (Email + Google OAuth) |
| **AI — Primary** | Groq API (LLaMA 3.3 70B) |
| **AI — Fallback** | Google Gemini 2.0 Flash |
| **AI — Sidebar** | Google Gemini (context-aware chat) |
| **Job APIs** | Adzuna, JSearch (RapidAPI), Findwork, Apify, Arbeitsamt |
| **Deployment** | Vercel (Serverless, Edge Functions) |
| **Performance** | Dynamic imports, code splitting, loading states |

### 🏗️ Architecture Highlights

```
┌─────────────────────────────────────────────┐
│             CareerVibe AI Architecture       │
├─────────────────────────────────────────────┤
│  Client (Next.js)                           │
│  ├── Dynamic imports (code splitting)       │
│  ├── Firebase Auth (client-side)            │
│  └── Optimistic UI updates                 │
├─────────────────────────────────────────────┤
│  API Layer (Serverless Functions)           │
│  ├── /api/[[...path]]  → AI proxy router   │
│  ├── /api/ai-coach     → Career coach      │
│  ├── /api/chat         → Gemini chat       │
│  └── /api/gemini-sidebar → Sidebar AI      │
├─────────────────────────────────────────────┤
│  AI Tier System (100% Uptime)              │
│  ├── Tier 1: Groq (LLaMA 3.3 70B) — fast  │
│  ├── Tier 2: Gemini 2.0 Flash — fallback   │
│  └── Tier 3: Local AI — emergency fallback │
├─────────────────────────────────────────────┤
│  Job Aggregation (5 APIs)                  │
│  Adzuna → JSearch → Findwork → Apify       │
│  → Auto-fallback AI-generated listings     │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase project
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone & Install

```bash
git clone https://github.com/TarunTheDev/CareerVibe-AI.git
cd CareerVibe-AI
npm install --legacy-peer-deps
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
# ── AI ──────────────────────────────────────
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.0-flash
LLM_PROVIDER=groq

# ── Firebase ────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── Job APIs (optional — fallback AI if missing) ──
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
RAPIDAPI_KEY=
FINDWORK_KEY=
APIFY_KEY=

# ── App ─────────────────────────────────────
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Project Structure

```
CareerVibe-AI/
├── app/
│   ├── api/
│   │   ├── [[...path]]/     # Central AI proxy (Groq → Gemini → Local)
│   │   ├── ai-coach/        # Career coaching endpoint
│   │   ├── chat/            # Gemini chat endpoint
│   │   └── gemini-sidebar/  # Sidebar AI endpoint
│   ├── login/               # Auth pages
│   ├── signup/
│   ├── profile/             # User profile
│   ├── settings/            # App settings
│   ├── compare/             # Job comparison tool
│   ├── world/               # Career world map
│   ├── loading.js           # Instant loading screen
│   ├── layout.js            # Root layout
│   └── page.js              # Main dashboard
├── components/
│   ├── LandingPage.js       # Landing page
│   ├── LeftSidebar.js       # Navigation sidebar
│   ├── RightSidebar.js      # AI insights panel
│   ├── CareerChangePaths.js # Career path simulator
│   ├── FreshnessSystem.js   # Job freshness detection
│   ├── ModernDashboardLayout.js
│   └── pixel/               # Pixel art UI components
├── lib/
│   ├── firebase.js          # Firebase config
│   ├── authContext.js       # Auth context
│   ├── realityScore.mjs     # Reality Score™ engine
│   ├── salary.mjs           # Salary normalization
│   └── skills/
│       └── normalize.mjs    # Skill canonicalization
├── vercel.json              # Vercel deployment config
└── public/                  # Static assets
```

---

## 🌟 What Makes CareerVibe Unique

| Feature | CareerVibe | LinkedIn | Indeed | Resume.io |
|---------|-----------|----------|--------|-----------|
| AI Skill Gap Analysis | ✅ | ❌ | ❌ | ❌ |
| Reality Score™ (Scam Detection) | ✅ | ❌ | ❌ | ❌ |
| Multi-API Job Aggregation | ✅ | ❌ | ❌ | ❌ |
| AI Fallback (100% uptime) | ✅ | ❌ | ❌ | ❌ |
| Career Path Simulator | ✅ | Partial | ❌ | ❌ |
| Free | ✅ | Partial | ✅ | ❌ |

---

## 📸 Screenshots

> 🌐 **[View Live Demo → careervibe-v2.vercel.app](https://careervibe-v2.vercel.app)**

---

## 🤝 Contributing

Contributions are welcome!

```bash
# Fork → Clone → Create branch
git checkout -b feature/your-feature

# Commit
git commit -m "feat: add your feature"

# Push & open PR
git push origin feature/your-feature
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Tarun** — [@TarunTheDev](https://github.com/TarunTheDev)

---

<div align="center">

**⭐ Star this repo if CareerVibe helped you!**

[![Live Demo](https://img.shields.io/badge/🚀_Try_CareerVibe_Now-careervibe--v2.vercel.app-3ED9A8?style=for-the-badge)](https://careervibe-v2.vercel.app)

*Built for hackathons. Built with ❤️.*

</div>
