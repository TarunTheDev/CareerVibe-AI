"use client";
import { useRouter } from "next/navigation";
import { Search, Briefcase, TrendingUp, FileText, Globe } from "lucide-react";

export default function MobileBottomBar({ T, isDark, activeTab, setActiveTab }) {
  const router = useRouter();
  const items = [
    { id: "find", icon: <Search size={18} />, label: "Find Jobs", desc: "Browse roles matched to your resume" },
    { id: "saved", icon: <Briefcase size={18} />, label: "My Jobs", desc: "Saved / Applied / Interview / Offer" },
    { id: "career", icon: <TrendingUp size={18} />, label: "Career Path", desc: "Match score, gaps & 3-step plan" },
    { id: "resumelab", icon: <FileText size={18} />, label: "Resume Lab", desc: "Review or compare resumes" },
    { id: "world", icon: <Globe size={18} />, label: "Skill World", desc: "Your skills as a 3D block map", route: "/world" },
  ];
  const go = (it) => {
    if (it.route) { router.push(it.route); return; }
    if (it.id === "resumelab") { router.push("/review"); return; }
    setActiveTab(it.id === "saved" ? "saved" : it.id);
  };
  return (
    <nav className="mobile-bottom-bar" aria-label="Primary" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 60, display: "flex", alignItems: "stretch", zIndex: 900,
      background: T.bg2, borderTop: `2px solid ${T.ink || T.border}`, paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {items.map((item) => {
        const isActive = activeTab === item.id || (item.id === "saved" && (activeTab === "saved" || activeTab === "applied" || activeTab === "myjobs"));
        return (
          <button key={item.id} aria-label={`${item.label}: ${item.desc}`} aria-current={isActive ? "page" : undefined} title={item.desc}
            onClick={() => go(item)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, border: "none", background: "transparent", color: isActive ? T.accent : T.text3, cursor: "pointer", fontSize: "0.52rem", fontWeight: isActive ? 700 : 500, minWidth: 0 }}>
            {item.icon}
            <span style={{ whiteSpace: "nowrap", fontSize: "0.52rem" }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
