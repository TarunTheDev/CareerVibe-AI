"use client";

import React, { useState, useEffect, useRef } from 'react';

const CATEGORIES = {
  operations: { id: 'operations', name: 'Operations & Admin', short: 'Operations', color: '#00d4a0', bgRgba: 'rgba(0,212,160,.08)', borderRgba: 'rgba(0,212,160,.25)', text: '#4eeac4', hoverShadow: 'rgba(0,212,160,.2)' },
  office: { id: 'office', name: 'MS Office & Tools', short: 'MS Office', color: '#f59e0b', bgRgba: 'rgba(245,158,11,.08)', borderRgba: 'rgba(245,158,11,.25)', text: '#fbbf5a', hoverShadow: 'rgba(245,158,11,.2)' },
  comm: { id: 'comm', name: 'Communication', short: 'Communication', color: '#3b82f6', bgRgba: 'rgba(59,130,246,.08)', borderRgba: 'rgba(59,130,246,.25)', text: '#7cb7ff', hoverShadow: 'rgba(59,130,246,.2)' },
  data: { id: 'data', name: 'Data & Analysis', short: 'Data', color: '#8b5cf6', bgRgba: 'rgba(139,92,246,.08)', borderRgba: 'rgba(139,92,246,.25)', text: '#b38dff', hoverShadow: 'rgba(139,92,246,.2)' },
  tech: { id: 'tech', name: 'Technical', short: 'Technical', color: '#22c55e', bgRgba: 'rgba(34,197,94,.08)', borderRgba: 'rgba(34,197,94,.25)', text: '#6ee0a0', hoverShadow: 'rgba(34,197,94,.2)' }
} as const;

type CategoryId = keyof typeof CATEGORIES;

interface Skill {
  name: string;
  categoryId: CategoryId;
  active: boolean;
}

const INITIAL_SKILLS: Skill[] = [
  { name: 'Operations Management', categoryId: 'operations' },
  { name: 'Administrative Support', categoryId: 'operations' },
  { name: 'Scheduling', categoryId: 'operations' },
  { name: 'Customer Service', categoryId: 'operations' },
  { name: 'Documentation', categoryId: 'operations' },
  { name: 'MS Excel', categoryId: 'office' },
  { name: 'MS Word', categoryId: 'office' },
  { name: 'MS PowerPoint', categoryId: 'office' },
  { name: 'Communication', categoryId: 'comm' },
  { name: 'Presentation Skills', categoryId: 'comm' },
  { name: 'Team Collaboration', categoryId: 'comm' },
  { name: 'Data Entry', categoryId: 'data' },
  { name: 'Data Analysis', categoryId: 'data' },
  { name: 'Market Research', categoryId: 'data' },
  { name: 'Reporting', categoryId: 'data' },
  { name: 'Time Management', categoryId: 'data' },
  { name: 'Problem Solving', categoryId: 'data' },
  { name: 'javascript', categoryId: 'tech' }
].map(s => ({ ...s, active: true } as Skill));

const SUGGESTIONS_DB = ['Python', 'SQL', 'Tableau', 'Power BI', 'Salesforce', 'Project Management', 'Agile', 'Leadership', 'SEO', 'Google Analytics', 'Excel Macros', 'Canva'];

// Main Component
export default function SkillBoostDashboard() {
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingSkills, setTrendingSkills] = useState(['Python', 'SQL', 'Tableau', 'Power BI', 'Agile']);
  const [mounted, setMounted] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [ripple, setRipple] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && e.target !== inputRef.current) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const activeSkillsCount = skills.filter(s => s.active).length;
  const removedSkillsCount = skills.filter(s => !s.active).length;

  const toggleSkill = (name: string) => {
    setSkills(prev => prev.map(s => s.name === name ? { ...s, active: !s.active } : s));
  };

  const addSkill = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setSkills(prev => prev.map(s => s.name.toLowerCase() === trimmed.toLowerCase() ? { ...s, active: true } : s));
    } else {
      setSkills(prev => [...prev, { name: trimmed, categoryId: 'tech', active: true }]);
    }
    setInputValue('');
    setShowSuggestions(false);
    setTrendingSkills(prev => prev.filter(ts => ts.toLowerCase() !== trimmed.toLowerCase()));
  };

  const handleRematch = () => {
    setRipple(true);
    setRematching(true);
    setTimeout(() => setRipple(false), 600);
    setTimeout(() => setRematching(false), 1800);
  };

  const availableSuggestions = SUGGESTIONS_DB
    .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !skills.some(sk => sk.name.toLowerCase() === s.toLowerCase() && sk.active))
    .slice(0, 4);

  // Group skills by category for rendering
  const groupedSkills = Object.values(CATEGORIES).map(cat => ({
    ...cat,
    skills: skills.filter(s => s.categoryId === cat.id)
  })).filter(cat => cat.skills.length > 0);

  return (
    <div className="w-full text-slate-200" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes tagIn {
          from { opacity: 0; transform: scale(0.85) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes btnPulse {
          from { opacity: 0.15; transform: scale(1); }
          to { opacity: 0; transform: scale(1.5); }
        }
        @keyframes dotsBounce {
          0%, 20% { content: "."; }
          40% { content: ".."; }
          60%, 100% { content: "..."; }
        }
        .loading-dots::after {
          content: "";
          animation: dotsBounce 1.5s infinite;
        }
        .skill-tag {
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          animation: tagIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
        }
        .skill-tag.removed {
          opacity: 0.35 !important;
          text-decoration: line-through;
          box-shadow: none !important;
          transform: none !important;
        }
        .skill-tag:not(.removed):hover .tag-check { display: none; }
        .skill-tag:not(.removed):hover .tag-cross { display: inline-block; }
        .tag-cross { display: none; }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: 220px 1fr 220px;
          gap: 16px;
          width: 100%;
          background-color: #0a0e13;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }
        .bg-grid-lines {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 212, 160, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 160, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          z-index: 0;
        }
        .bg-orb-1 {
          position: absolute;
          top: -50px;
          left: 10%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,212,160,0.08) 0%, rgba(0,0,0,0) 70%);
          filter: blur(40px);
          animation: orbFloat 8s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        .bg-orb-2 {
          position: absolute;
          bottom: -100px;
          right: 15%;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.06) 0%, rgba(0,0,0,0) 70%);
          filter: blur(50px);
          animation: orbFloat 10s ease-in-out infinite reverse;
          pointer-events: none;
          z-index: 0;
        }
        .panel {
          background: #111720;
          border: 1px solid #1e2d3d;
          border-radius: 12px;
          position: relative;
          z-index: 1;
        }
        .ripple {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.25);
          border-radius: inherit;
          animation: btnPulse 0.6s ease-out forwards;
          pointer-events: none;
        }
      `}</style>

      <div className="dashboard-grid">
        <div className="bg-grid-lines"></div>
        <div className="bg-orb-1"></div>
        <div className="bg-orb-2"></div>

        {/* ================= LEFT PANEL ================= */}
        <div className="flex flex-col gap-4 z-10">
          <div className="panel p-4">
            <h2 className="text-[#64748b] text-[11px] tracking-[0.08em] font-semibold mb-4" style={{ fontVariant: 'small-caps' }}>
              ⚡ SKILL STRENGTH
            </h2>
            
            <div className="flex flex-col gap-3 mb-4">
              {[
                { name: 'Operations', val: 92, col: CATEGORIES.operations.color },
                { name: 'MS Office', val: 85, col: CATEGORIES.office.color },
                { name: 'Communication', val: 78, col: CATEGORIES.comm.color },
                { name: 'Data Skills', val: 64, col: CATEGORIES.data.color },
                { name: 'Technical', val: 31, col: CATEGORIES.tech.color },
              ].map((bar, i) => (
                <div key={bar.name}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span>{bar.name}</span>
                    <span className="text-slate-400">{bar.val}%</span>
                  </div>
                  <div className="h-[4px] bg-[#1e2d3d] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: mounted ? `${bar.val}%` : '0%', 
                        backgroundColor: bar.col,
                        transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transitionDelay: `${200 + i * 100}ms`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="h-[1px] w-full bg-[#1e2d3d] mb-4"></div>

            <div className="flex flex-wrap gap-2">
              {Object.values(CATEGORIES).map(cat => (
                <div key={cat.id} className="flex items-center gap-[4px] bg-[#161e2a] border border-[#1e2d3d] rounded-full px-2 py-1 text-[10px] text-slate-300">
                  <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: cat.color }}></div>
                  {cat.short}
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="text-[#64748b] text-[11px] tracking-[0.08em] font-semibold mb-3" style={{ fontVariant: 'small-caps' }}>
              📊 YOUR STATS
            </h2>
            <div className="flex flex-col gap-2">
              <StatChip icon="✓" val={activeSkillsCount} label="Active Skills" bg="rgba(0,212,160,0.15)" col="#00d4a0" />
              <StatChip icon="💼" val={8} label="Jobs Matched" bg="rgba(139,92,246,0.15)" col="#8b5cf6" />
              <StatChip icon="📈" val="+24%" label="Match Boost" bg="rgba(245,158,11,0.15)" col="#f59e0b" />
            </div>
          </div>
        </div>

        {/* ================= CENTER PANEL ================= */}
        <div className="flex flex-col gap-4 z-10">
          <div className="panel flex flex-col">
            <div className="p-4 border-b border-[#1e2d3d] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center bg-gradient-to-br from-[#0f9e77] to-[#00d4a0] text-black font-bold text-sm">
                  ⚡
                </div>
                <h2 className="text-[14px] font-semibold">Boost Your Matches — Add More Skills</h2>
              </div>
              <button className="text-[11px] text-[#64748b] border border-[#1e2d3d] rounded-[4px] px-2 py-1 hover:border-[#00d4a0] hover:text-[#00d4a0] transition-colors">
                ↑ Hide
              </button>
            </div>
            
            <div className="p-4 pb-0">
              <p className="text-[12px] text-[#64748b] leading-relaxed mb-4">
                Skills from your experience not on your resume. Click any tag to toggle it 
                — removed skills won't affect matching.
              </p>

              <div className="flex flex-col gap-4 mb-4">
                {groupedSkills.map(cat => (
                  <div key={cat.id}>
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[#64748b] mb-2">{cat.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {cat.skills.map((skill, index) => (
                        <div 
                          key={skill.name} 
                          onClick={() => toggleSkill(skill.name)}
                          className={`skill-tag inline-flex items-center gap-[5px] px-[10px] py-[5px] rounded-[20px] text-[12px] font-medium cursor-pointer border ${!skill.active ? 'removed' : ''}`}
                          style={{
                            backgroundColor: cat.bgRgba,
                            borderColor: cat.borderRgba,
                            color: cat.text,
                            animationDelay: `${index * 25}ms`
                          }}
                          onMouseEnter={(e) => {
                            if (skill.active) e.currentTarget.style.boxShadow = `0 4px 12px ${cat.hoverShadow}`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {skill.name}
                          <span className="tag-check text-[9px] w-[9px] text-center">✓</span>
                          <span className="tag-cross text-[10px] w-[9px] text-center">✕</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 px-4 border-t border-[#1e2d3d] bg-[#0d121a] rounded-b-[12px]">
              <div className="relative flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a skill and press Enter…"
                  className="flex-1 bg-[#161e2a] border border-[#1e2d3d] rounded-[8px] px-3 py-[7px] text-[12px] text-[#e2e8f0] focus:outline-none focus:border-[#0f9e77] focus:ring-[3px] focus:ring-[rgba(0,212,160,0.08)] transition-all"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSkill(inputValue);
                  }}
                />
                <button 
                  onClick={() => addSkill(inputValue)}
                  className="w-[28px] h-[28px] bg-[#0f9e77] rounded-[6px] text-black font-bold flex items-center justify-center hover:bg-[#00d4a0] hover:scale-105 transition-all"
                >
                  +
                </button>

                {showSuggestions && inputValue && availableSuggestions.length > 0 && (
                  <div ref={dropdownRef} className="absolute top-[100%] left-0 w-full mt-1 bg-[#161e2a] border border-[#1e2d3d] rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 overflow-hidden">
                    {availableSuggestions.map(s => (
                      <div 
                        key={s} 
                        className="px-3 py-[7px] text-[12px] cursor-pointer hover:bg-[rgba(0,212,160,0.08)] hover:text-[#00d4a0] transition-colors"
                        onClick={() => addSkill(s)}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-3 relative">
                <button 
                  onClick={handleRematch}
                  className="w-full relative overflow-hidden py-[11px] rounded-[8px] text-black text-[13px] font-semibold transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(0,212,160,0.3)]"
                  style={{ background: 'linear-gradient(135deg, #0f9e77, #00d4a0)' }}
                >
                  {rematching ? (
                    <span className="loading-dots">Updating Matches</span>
                  ) : (
                    "Rematch Jobs"
                  )}
                  {ripple && <div className="ripple"></div>}
                </button>
              </div>
            </div>
          </div>

          <div className="panel p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[18px] font-bold">8 Jobs Matched</h3>
              <div className="flex gap-2">
                {['All', 'Remote', 'On-site'].map((filter, i) => (
                  <span key={filter} className={`text-[10px] px-2 py-1 rounded-[4px] border ${i === 0 ? 'border-[#00d4a0] text-[#00d4a0]' : 'border-[#1e2d3d] text-[#64748b] hover:border-slate-500'} cursor-pointer transition-colors`}>
                    {filter}
                  </span>
                ))}
              </div>
            </div>

            {[
              { init: 'HB', bg: '#1e3a5f', col: '#7cb7ff', title: 'Sales, Business Admin', comp: 'Harlow Bros · On-site', match: 81, mcol: '#00d4a0' },
              { init: 'SC', bg: '#3b1e5f', col: '#b38dff', title: 'Office Admin Executive', comp: 'SecureCo · Hybrid', match: 76, mcol: '#8b5cf6' },
              { init: 'TK', bg: '#3b2800', col: '#fbbf5a', title: 'Data Entry Specialist', comp: 'Taskline · Remote', match: 69, mcol: '#f59e0b' },
              { init: 'FW', bg: '#1e3b28', col: '#6ee0a0', title: 'Operations Coordinator', comp: 'FlowWork · On-site', match: 63, mcol: '#22c55e' },
            ].map((job, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-[#161e2a] rounded-[8px] transition-colors border border-transparent hover:border-[#1e2d3d] cursor-pointer">
                <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: job.bg, color: job.col }}>
                  {job.init}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{job.title}</div>
                  <div className="text-[10px] text-[#64748b] truncate">{job.comp}</div>
                </div>
                <div 
                  className="w-[44px] h-[44px] rounded-full border-2 flex items-center justify-center text-[12px] font-bold shrink-0"
                  style={{ borderColor: job.mcol, color: job.mcol }}
                >
                  {job.match}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <div className="flex flex-col gap-4 z-10">
          <div className="panel p-4 flex flex-col items-center">
            <h2 className="text-[#64748b] text-[11px] tracking-[0.08em] font-semibold w-full mb-4" style={{ fontVariant: 'small-caps' }}>
              🎯 BEST MATCH
            </h2>
            
            <div className="relative w-[100px] h-[100px] mb-4">
              <svg width="100" height="100" className="-rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1e2d3d" strokeWidth="6" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#00d4a0" 
                  strokeWidth="6" 
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={mounted ? 283 * (1 - 0.81) : 283}
                  style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1) 300ms' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-bold leading-none">81%</span>
                <span className="text-[9px] text-[#64748b] mt-1">Match</span>
              </div>
            </div>

            <div className="text-center w-full">
              <div className="text-[12px] font-semibold truncate">Sales, Business Admin</div>
              <div className="text-[10px] text-[#64748b] truncate mt-1">Harlow Bros · Loughborough</div>
            </div>

            <div className="w-full h-[1px] bg-[#1e2d3d] my-4"></div>

            <div className="bg-[rgba(0,212,160,0.08)] border border-[rgba(0,212,160,0.2)] rounded-[6px] py-2 px-4 flex flex-col items-center w-full">
              <span className="text-[22px] font-bold text-[#00d4a0] leading-none mb-1">{removedSkillsCount}</span>
              <span className="text-[10px] text-[#64748b]">Skills Removed</span>
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="text-[#64748b] text-[11px] tracking-[0.08em] font-semibold w-full mb-3" style={{ fontVariant: 'small-caps' }}>
              💡 AI INSIGHTS
            </h2>

            <div className="flex flex-col gap-2 mb-3">
              <InsightCard 
                color="#00d4a0"
                strong="Strong fit"
                text="Your admin & MS Office skills match 6 of 8 openings perfectly."
              />
              <InsightCard 
                color="#f59e0b"
                strong="Gap detected"
                text="Adding Python could unlock 14 more senior roles."
              />
              <InsightCard 
                color="#8b5cf6"
                strong="Trending"
                text="Employers want Data Analysis + Reporting combos this week."
              />
            </div>

            {trendingSkills.length > 0 && (
              <>
                <div className="text-[11px] text-[#64748b] my-3">🔥 Trending skills to add</div>
                <div className="flex flex-wrap gap-1.5">
                  {trendingSkills.map(ts => (
                    <button
                      key={ts}
                      onClick={() => addSkill(ts)}
                      className="text-[10px] px-2 py-1 bg-[#161e2a] border border-[#1e2d3d] text-[#64748b] rounded-[20px] hover:border-[#00d4a0] hover:text-[#00d4a0] transition-colors"
                    >
                      {ts}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponents
function StatChip({ icon, val, label, bg, col }: { icon: string, val: string | number, label: string, bg: string, col: string }) {
  return (
    <div className="flex items-center gap-3 p-[10px] bg-[#161e2a] border border-[#1e2d3d] rounded-[8px]">
      <div className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center font-bold text-[12px]" style={{ backgroundColor: bg, color: col }}>
        {icon}
      </div>
      <div>
        <div className="text-[14px] font-bold leading-tight">{val}</div>
        <div className="text-[10px] text-[#64748b]">{label}</div>
      </div>
    </div>
  );
}

function InsightCard({ color, strong, text }: { color: string, strong: string, text: string }) {
  return (
    <div className="flex gap-2 p-[10px] bg-[#161e2a] border border-[#1e2d3d] rounded-[8px]">
      <div className="w-[6px] h-[6px] rounded-full shrink-0 mt-[4px]" style={{ backgroundColor: color }}></div>
      <div className="text-[11px] text-[#64748b] leading-[1.5]">
        <strong className="text-[#e2e8f0] font-medium">{strong}:</strong> {text}
      </div>
    </div>
  );
}
