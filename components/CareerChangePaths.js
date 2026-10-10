"use client";

import { useState } from "react";
import {
  GraduationCap,
  Upload,
  Target,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Star,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  MapPin
} from "lucide-react";

export default function CareerChangePaths({ T, isDark, profile, onGoUpload }) {
  const [dreamJob, setDreamJob] = useState("");
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async (title = dreamJob) => {
    const query = title?.trim();
    if (!query || !profile) return;
    setLoading(true);
    setError("");
    setGapAnalysis(null);
    try {
      const res = await fetch("/api/dream-job-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamJob: query, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze path");
      setGapAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedPaths = () => {
    if (!profile) return [];
    const domain = profile.domain || "tech_engineering";
    const title = profile.jobTitles?.[0] || "Professional";
    
    // Simple custom recommendation rules
    if (domain.includes("tech") || domain.includes("engineer")) {
      return [
        `Senior ${title}`,
        "Solutions Architect",
        "Technical Product Manager",
      ];
    } else if (domain.includes("business") || domain.includes("operation")) {
      return [
        `Operations Director`,
        "Product Manager",
        "Business Consultant",
      ];
    } else if (domain.includes("sale") || domain.includes("marketing")) {
      return [
        "Growth Marketing Director",
        "Head of Sales",
        "Marketing Analytics Manager",
      ];
    } else {
      return [
        `Lead ${title}`,
        "Project Manager",
        "Operations Specialist",
      ];
    }
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1.5rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.5rem",
            marginBottom: "0.375rem",
            color: T.text,
          }}
        >
          Career Path Simulator & Gap Analysis
        </h2>
        <p
          style={{
            color: T.text2,
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          Explore transition pathways to target roles. Enter a dream job title to get an automated skill gap analysis, a personalized learning roadmap, and immediate next steps.
        </p>
      </div>

      {!profile ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: T.bg2,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <GraduationCap
            size={48}
            style={{ marginBottom: "1.25rem", color: T.text3 }}
          />
          <p style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: "0.5rem" }}>
            Upload your resume to begin
          </p>
          <p
            style={{
              color: T.text2,
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            We need your current skills and experience profile to generate a customized transition roadmap.
          </p>
          <button
            className="btn-primary"
            style={{ background: T.accent, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            onClick={onGoUpload}
          >
            <Upload size={14} /> Upload Resume
          </button>
        </div>
      ) : (
        <>
          {/* Transition Finder */}
          <div
            style={{
              background: T.bg2,
              borderRadius: 16,
              border: `1px solid ${T.border}`,
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 600,
                fontSize: "0.9375rem",
                marginBottom: "0.75rem",
                color: T.text,
              }}
            >
              <Target size={16} color={T.accent} /> What is your target or dream role?
            </label>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <input
                value={dreamJob}
                onChange={(e) => setDreamJob(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="e.g. Solutions Architect, Product Manager, Technical Lead, Data Scientist..."
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  background: T.bg3,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  color: T.text,
                  fontSize: "0.875rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = T.accent}
                onBlur={(e) => e.target.style.borderColor = T.border}
              />
              <button
                className="btn-primary"
                style={{ background: T.accent, flexShrink: 0, padding: "0 1.25rem" }}
                onClick={() => analyze()}
                disabled={loading || !dreamJob.trim()}
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin-slow" />
                ) : (
                  <Sparkles size={15} />
                )}
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            {/* Recommendations */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", color: T.text3, fontWeight: 500 }}>Recommended for you:</span>
              {getRecommendedPaths().map((path) => (
                <button
                  key={path}
                  onClick={() => {
                    setDreamJob(path);
                    analyze(path);
                  }}
                  style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: 50,
                    fontSize: "0.75rem",
                    border: `1px solid ${T.border}`,
                    background: T.bg3,
                    color: T.text2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.color = T.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.color = T.text2;
                  }}
                >
                  {path}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#EF4444",
              borderRadius: 12,
              padding: "1rem",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Current profile skills */}
          {!gapAnalysis && !loading && (
            <div
              style={{
                background: T.bg2,
                borderRadius: 16,
                border: `1px solid ${T.border}`,
                padding: "1.5rem",
                boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: T.text,
                }}
              >
                <CheckCircle size={16} color={T.accent} /> Your Base Skills Inventory
              </div>
              <p style={{ fontSize: "0.8125rem", color: T.text2, marginBottom: "1rem" }}>
                These are the skills extracted from your resume used as a baseline for gap calculations.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {profile.topSkills?.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: 50,
                      background: T.accentDim,
                      color: T.accent,
                      fontSize: "0.75rem",
                      border: `1px solid ${T.borderA}`,
                      fontWeight: 500,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Gap results */}
          {gapAnalysis && (
            <div className="animate-fade-in">
              {/* Summary card */}
              <div
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, #0F1520, #141E2E)"
                    : "linear-gradient(135deg, #FAF7F2, #F0EBE3)",
                  borderRadius: 16,
                  border: `1px solid ${T.borderA}`,
                  padding: "1.5rem",
                  marginBottom: "1.25rem",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>Target Career Path</span>
                    <h3
                      style={{
                        fontWeight: 800,
                        fontSize: "1.375rem",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginTop: "0.25rem",
                        color: T.text,
                      }}
                    >
                      {gapAnalysis.dreamJobTitle}
                    </h3>
                  </div>
                  <div style={{
                    textAlign: "right",
                    background: "rgba(0, 0, 0, 0.2)",
                    padding: "0.5rem 1rem",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                  }}>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: T.accent, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {gapAnalysis.currentMatch}%
                    </span>
                    <div style={{ fontSize: "0.625rem", color: T.text2, fontWeight: 600 }}>Match Score</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    marginTop: "1.25rem",
                    color: T.text2,
                    fontSize: "0.8125rem",
                    flexWrap: "wrap",
                    borderTop: `1px solid ${T.border}`,
                    paddingTop: "1rem",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Clock size={13} color={T.text3} /> {gapAnalysis.timeline} transition
                  </span>
                  <span style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    color: gapAnalysis.demandLevel?.toLowerCase() === "high" ? T.accent : T.gold,
                    fontWeight: 600
                  }}>
                    <TrendingUp size={13} /> {gapAnalysis.demandLevel} Demand
                  </span>
                  {gapAnalysis.salaryRange && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <DollarSign size={13} color={T.text3} /> 
                      Est. ${gapAnalysis.salaryRange.min?.toLocaleString()} – ${gapAnalysis.salaryRange.max?.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Strengths */}
              {gapAnalysis.strengths?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1px solid ${T.border}`,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1.25rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: T.text,
                    }}
                  >
                    <Star size={15} color={T.gold} /> Your Transferable Strengths
                  </div>
                  <p style={{ fontSize: "0.75rem", color: T.text2, marginBottom: "0.75rem" }}>
                    Great! You already have these key skills matching the target role profile:
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                    }}
                  >
                    {gapAnalysis.strengths.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: 999,
                          background: T.accent2,
                          color: "#17150F",
                          fontSize: "0.75rem",
                          border: `1px solid ${T.border}`,
                          fontWeight: 700,
                        }}
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill gaps & learning resources */}
              {gapAnalysis.skillGaps?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1px solid ${T.border}`,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1.25rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: T.text,
                    }}
                  >
                    <AlertCircle size={15} color={T.gold} /> Required Gaps & Learning Roadmap
                  </div>
                  {gapAnalysis.skillGaps.map((gap, i) => (
                    <div
                      key={gap.skill}
                      style={{
                        marginBottom: "1.125rem",
                        paddingBottom: "1.125rem",
                        borderBottom:
                          i < gapAnalysis.skillGaps.length - 1
                            ? `1px solid ${T.border}`
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.625rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "0.875rem", color: T.text }}>
                          {gap.skill}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            padding: "0.125rem 0.5rem",
                            borderRadius: 50,
                            fontWeight: 600,
                            background:
                              gap.priority === "Essential"
                                ? "rgba(239,68,68,0.1)"
                                : gap.priority === "Important"
                                  ? "rgba(245,158,11,0.1)"
                                  : T.accentDim,
                            color:
                              gap.priority === "Essential"
                                ? "#EF4444"
                                : gap.priority === "Important"
                                  ? T.gold
                                  : T.accent,
                            border: `1px solid ${
                              gap.priority === "Essential"
                                ? "rgba(239,68,68,0.2)"
                                : gap.priority === "Important"
                                  ? "rgba(245,158,11,0.2)"
                                  : T.borderA
                            }`
                          }}
                        >
                          {gap.priority}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            color: T.text2,
                            marginLeft: "auto",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Clock size={10} />
                          {gap.timeToLearn}
                        </span>
                      </div>
                      
                      {gap.resources?.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                            marginTop: "0.5rem"
                          }}
                        >
                          {gap.resources.map((res, ri) => (
                            <a
                              key={ri}
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                padding: "0.3rem 0.75rem",
                                borderRadius: 50,
                                fontSize: "0.75rem",
                                background: T.bg3,
                                border: `1px solid ${T.border}`,
                                color: T.text2,
                                textDecoration: "none",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = T.accent;
                                e.currentTarget.style.color = T.text;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = T.border;
                                e.currentTarget.style.color = T.text2;
                              }}
                            >
                              {res.free && (
                                <span
                                  style={{
                                    color: T.accent,
                                    fontSize: "0.625rem",
                                    fontWeight: 700,
                                    background: T.accentDim,
                                    padding: "0.05rem 0.25rem",
                                    borderRadius: 4
                                  }}
                                >
                                  FREE
                                </span>
                              )}
                              <span>{res.name}</span>
                              <ExternalLink size={9} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Next steps */}
              {gapAnalysis.nextSteps?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1px solid ${T.border}`,
                    padding: "1.25rem 1.5rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: T.text,
                    }}
                  >
                    <ChevronRight size={15} color={T.accent2 || T.accent} /> Immediate Action Plan
                  </div>
                  {gapAnalysis.nextSteps.map((step, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        marginBottom: "0.75rem",
                        fontSize: "0.8125rem",
                        color: T.text2,
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: T.accentDim,
                          color: T.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ paddingTop: 2 }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
