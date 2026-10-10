# CareerVibe 🚀

**AI-Powered Resume Parser & Career Path Analyzer**

CareerVibe is an honest, early-stage MVP that helps job seekers understand their career path through AI-powered resume analysis and skill gap identification. Built with integrity—every claim on our landing page is real.

🌐 **Live Demo**: [careervibe-wheat.vercel.app](https://careervibe-wheat.vercel.app/)

---

## ✨ What CareerVibe Actually Does (v1)

### ✅ Shipped Features

1. **AI Resume Parser**
   - Upload PDF, DOCX, or TXT resumes
   - AI extracts: name, summary, skills (with tags), education, work experience, industries
   - Works reliably with Gemini AI

2. **Career Path Simulator**
   - Enter any target job title
   - Get: match score (%), transition timeline, market demand rating, salary range
   - See transferable strengths and skill gaps
   - Receive a personalized 3-step action plan

3. **Skill Gap Analysis**
   - Identify exactly which skills you need for your target role
   - Get learning resources and priority recommendations
   - Understand market demand for each skill

4. **Profile Management**
   - Edit your profile and manage your data
   - Dark/light theme toggle
   - Privacy controls and data deletion

5. **Authentication**
   - Email/password signup and login
   - Google OAuth integration
   - Secure Firebase authentication

---

## 🚧 In Development

- Job description matching (one-click tailor resume to job posts)
- ATS score checker
- Interview prep AI
- Smart job matching
- Application tracker

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **UI Components**: shadcn/ui, Lucide icons
- **Authentication**: Firebase Auth
- **AI**: Google Gemini API
- **Deployment**: Vercel
- **Styling**: Custom design system with dark/light modes

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project (for authentication)
- Gemini API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TarunTheDev/CareerVibe.git
   cd CareerVibe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your `.env.local` file**
   - Add your Firebase credentials
   - Add your Gemini API key
   - (Optional) Add job API keys for future features

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Structure

```
CareerVibe/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── ai-coach/      # Career coaching AI endpoint
│   │   ├── gemini-sidebar/# Sidebar AI features
│   │   └── [[...path]]/   # Catch-all API proxy
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── profile/           # User profile page
│   ├── settings/          # Settings page
│   └── page.js            # Main dashboard
├── components/            # React components
│   ├── LandingPage.js     # Honest landing page
│   ├── CareerChangePaths.js # Career path simulator
│   ├── LeftSidebar.js     # Navigation sidebar
│   ├── RightSidebar.js    # AI insights sidebar
│   └── ui/                # shadcn/ui components
├── lib/                   # Utility functions
│   ├── firebase.js        # Firebase config
│   ├── authContext.js     # Auth context provider
│   └── utils.js           # Helper functions
└── public/                # Static assets
```

---

## 🔑 Environment Variables

See `.env.example` for all required environment variables. Key variables:

```env
# Firebase (Required for auth)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Gemini AI (Required for resume parsing and career analysis)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Optional: Job APIs (for future features)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
RAPIDAPI_KEY=
```

---

## 🎨 Design Philosophy

CareerVibe is built with **honesty and integrity**:

- ❌ No fake testimonials
- ❌ No fake user metrics
- ❌ No fake company logos
- ❌ No fake security badges
- ✅ Only real, working features
- ✅ Transparent roadmap
- ✅ Honest about what's "coming soon"

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Contact

**Tarun** - [@TarunTheDev](https://github.com/TarunTheDev)

Project Link: [https://github.com/TarunTheDev/CareerVibe](https://github.com/TarunTheDev/CareerVibe)

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Deployed on [Vercel](https://vercel.com/)

---

**Built with honesty. Shipping in public. 🚀**
