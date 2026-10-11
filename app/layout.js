import './globals.css'
import './retro-overrides.css'
import './minecraft-theme.css'
import { AuthProvider } from '@/lib/authContext'

export const metadata = {
  title: 'CareerVibe — AI Resume Parser & Career Path Analyzer',
  description: 'Upload your resume and get AI-powered skill extraction, career path analysis, and personalized gap analysis for your target role. Free during beta.',
  keywords: 'resume parser, AI career path, skill gap analysis, career exploration, resume analysis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/media/poster.webp" type="image/webp" fetchPriority="high" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('IntersectionObserver' in window) document.documentElement.classList.add('rv-js');
            window.addEventListener('error', function(e) {
              if (e.error instanceof DOMException && e.error.name === 'DataCloneError' &&
                  e.message && e.message.includes('PerformanceServerTiming')) {
                e.stopImmediatePropagation(); e.preventDefault();
              }
            }, true);
          `
        }} />
      </head>
      <body style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

