"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [uploadOpen, setUploadOpen] = useState(true)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)

  const [cvFile, setCvFile] = useState<File | null>(null)
  const [jobTitle, setJobTitle] = useState("")
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [analyses, setAnalyses] = useState<any[]>([])
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null)
  const [error, setError] = useState("")

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  if (status === "loading") return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" }}>
      <p style={{ color: "#888", fontFamily: "sans-serif" }}>Laddar...</p>
    </main>
  )

  const handleFile = (file: File) => {
    if (file.type === "application/pdf") {
      setCvFile(file)
      setError("")
    } else {
      setError("Endast PDF-filer stöds.")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleAnalyze = async () => {
    if (!cvFile) return
    setAnalyzing(true)
    setProgress(0)
    setError("")

    const interval = setInterval(() => {
      setProgress(p => p < 85 ? p + 6 : p)
    }, 400)

    try {
      const formData = new FormData()
      formData.append("file", cvFile)
      formData.append("jobTitle", jobTitle)

      const res = await fetch("/api/analyze-cv", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Något gick fel.")
        clearInterval(interval)
        setAnalyzing(false)
        return
      }

      clearInterval(interval)
      setProgress(100)

      setTimeout(() => {
        setAnalyses(prev => [{
          filename: cvFile.name,
          jobTitle: jobTitle || "Ej angiven",
          date: new Date().toLocaleDateString("sv-SE"),
          score: data.score ?? 70,
          atsScore: data.atsScore ?? Math.floor((data.score ?? 70) * 0.95),
          strengths: data.strengths ?? [],
          improvements: data.improvements ?? [],
          keywords: data.keywords ?? [],
        }, ...prev])
        setAnalyzing(false)
        setProgress(0)
        setUploadOpen(false)
        setFeedbackOpen(true)
      }, 600)
    } catch {
      clearInterval(interval)
      setAnalyzing(false)
      setError("Något gick fel. Försök igen.")
    }
  }

  const scoreBox: React.CSSProperties = { background: "#fff9c4", borderRadius: 8, padding: "10px", textAlign: "center", fontWeight: 700, fontSize: 18, color: "#7a6000" }
  const sectionStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", marginBottom: "1rem", overflow: "hidden" }
  const headerStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", cursor: "pointer", userSelect: "none" }
  const iconBox = (color: string): React.CSSProperties => ({ width: 38, height: 38, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 })
  const chevron = (open: boolean): React.CSSProperties => ({ fontSize: 18, color: "#888", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" })

  return (
    <main style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif", padding: "1.5rem 1rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "1rem 1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💼</div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>KarriarApp</p>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Välkommen, {session?.user?.name || session?.user?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: 13, color: "#888", background: "transparent", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
            Logga ut
          </button>
        </div>

        {/* ── STEP 1: Ladda upp CV ── */}
        <div style={sectionStyle}>
          <div style={headerStyle} onClick={() => setUploadOpen(o => !o)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={iconBox("#e8f0fe")}>📄</div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>Steg 1: Ladda upp ditt CV</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>
                  {cvFile ? `✅ ${cvFile.name}` : "Ladda upp ditt CV för AI-analys"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {analyses.length > 0 && <span style={{ background: "#1a1a2e", color: "#fff", fontSize: 12, borderRadius: 20, padding: "4px 12px", fontWeight: 500 }}>✓ Klar</span>}
              <span style={chevron(uploadOpen)}>⌄</span>
            </div>
          </div>

          {uploadOpen && (
            <div style={{ padding: "0 1.25rem 1.25rem" }}>
              {error && (
                <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: "1rem", border: "1px solid #fecaca" }}>
                  {error}
                </div>
              )}

              {!analyzing ? (
                <>
                  <div
                    style={{ border: `2px dashed ${dragging ? "#4f8ef7" : "#d0d5dd"}`, borderRadius: 12, padding: "2rem", textAlign: "center", background: dragging ? "#f0f5ff" : "#fafafa", cursor: "pointer", transition: "all 0.2s" }}
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>⬆️</div>
                    <p style={{ margin: 0, fontWeight: 600, color: "#1a1a2e", fontSize: 15 }}>
                      {cvFile ? cvFile.name : "Dra och släpp ditt CV här"}
                    </p>
                    <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#888" }}>
                      {cvFile ? "Klicka för att byta fil" : "eller klicka för att välja"}
                    </p>
                    <button style={{ padding: "8px 20px", border: "1px solid #d0d5dd", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13 }}>
                      Välj fil
                    </button>
                    <p style={{ margin: "10px 0 0", fontSize: 11, color: "#aaa" }}>Endast PDF (max 10MB)</p>
                    <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>💼 Vilken tjänst söker du?</label>
                    <input
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      placeholder="t.ex. Frontend Developer, UX Designer"
                      style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, outline: "none", boxSizing: "border-box", color: "#1a1a2e", background: "#fafafa" }}
                    />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={!cvFile}
                    style={{ width: "100%", padding: "12px", fontSize: 15, fontWeight: 600, border: "none", borderRadius: 10, cursor: cvFile ? "pointer" : "not-allowed", background: cvFile ? "linear-gradient(135deg, #4f8ef7, #a855f7)" : "#ccc", color: "#fff", marginTop: "1rem" }}
                  >
                    Analysera mitt CV →
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
                  <p style={{ fontWeight: 600, color: "#1a1a2e", margin: "0 0 4px" }}>Analyserar ditt CV{jobTitle ? ` för "${jobTitle}"` : ""}...</p>
                  <p style={{ fontSize: 13, color: "#888", margin: "0 0 1rem" }}>Vår AI granskar ditt dokument</p>
                  <div style={{ height: 6, background: "#e8e8e8", borderRadius: 99, overflow: "hidden", margin: "1rem 0" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #4f8ef7, #a855f7)", borderRadius: 99, transition: "width 0.4s" }} />
                  </div>
                  <p style={{ fontSize: 12, color: "#aaa" }}>{progress}% klart</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STEP 2: CV-feedback ── */}
        <div style={sectionStyle}>
          <div style={{ ...headerStyle, cursor: analyses.length > 0 ? "pointer" : "default" }} onClick={() => analyses.length > 0 && setFeedbackOpen(o => !o)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={iconBox("#f3e8ff")}>📊</div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>Steg 2: CV-feedback</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>AI-driven analys av ditt CV</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {analyses.length > 0 && <span style={{ background: "#1a1a2e", color: "#fff", fontSize: 12, borderRadius: 20, padding: "4px 12px", fontWeight: 500 }}>✓ Klar</span>}
              {analyses.length > 0 && <span style={{ fontSize: 13, color: "#555" }}>{feedbackOpen ? "Dölj detaljer" : "Visa detaljer"}</span>}
              {analyses.length > 0 && <span style={chevron(feedbackOpen)}>⌄</span>}
            </div>
          </div>

          {feedbackOpen && analyses.length > 0 && (
            <div style={{ padding: "0 1.25rem 1.25rem" }}>
              {analyses.map((a, i) => (
                <div key={i} style={{ border: "1px solid #e8e8e8", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{a.filename}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>Söker: {a.jobTitle}</p>
                      <p style={{ margin: "1px 0 0", fontSize: 12, color: "#aaa" }}>{a.date}</p>
                    </div>
                    <button onClick={() => setAnalyses(prev => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: "#e74c3c" }}>🗑</button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: "0.75rem" }}>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#555" }}>Overall Score</p>
                      <div style={scoreBox}>{a.score}/100</div>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#555" }}>ATS Score</p>
                      <div style={scoreBox}>{a.atsScore}/100</div>
                    </div>
                  </div>

                  <button
                    style={{ width: "100%", padding: "10px", background: "transparent", border: "1px solid #e8e8e8", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#555", marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => setExpandedFeedback(expandedFeedback === i ? null : i)}
                  >
                    {expandedFeedback === i ? "⌃ Dölj feedback" : "⌄ Visa full feedback"}
                  </button>

                  {expandedFeedback === i && (
                    <div style={{ marginTop: "0.75rem" }}>
                      {a.strengths.length > 0 && (
                        <div style={{ marginBottom: "0.75rem" }}>
                          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#1a7a4a" }}>✅ Styrkor</p>
                          {a.strengths.map((str: string, j: number) => <p key={j} style={{ margin: "3px 0", fontSize: 13, color: "#444" }}>• {str}</p>)}
                        </div>
                      )}
                      {a.improvements.length > 0 && (
                        <div style={{ marginBottom: "0.75rem" }}>
                          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#c0392b" }}>🔧 Förbättringar</p>
                          {a.improvements.map((str: string, j: number) => <p key={j} style={{ margin: "3px 0", fontSize: 13, color: "#444" }}>• {str}</p>)}
                        </div>
                      )}
                      {a.keywords.length > 0 && (
                        <div>
                          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>🔑 Nyckelord</p>
                          <div>{a.keywords.map((k: string, j: number) => (
                            <span key={j} style={{ display: "inline-block", background: "#f0f4ff", color: "#3b5bdb", fontSize: 12, borderRadius: 20, padding: "3px 10px", margin: "3px" }}>{k}</span>
                          ))}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => { setUploadOpen(true); setFeedbackOpen(false) }}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", background: "transparent", border: "1px solid #e0e0e0", borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginLeft: "auto" }}
              >
                + Ladda upp nytt CV
              </button>
            </div>
          )}
        </div>

        {/* ── STEP 3: Kompetensgapanalys ── */}
        <div style={sectionStyle}>
          <div style={headerStyle} onClick={() => setSkillOpen(o => !o)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={iconBox("#e8fff0")}>🎯</div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>Steg 3: Kompetensgapanalys</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>Identifiera dina kompetensgap</p>
              </div>
            </div>
            <span style={chevron(skillOpen)}>⌄</span>
          </div>
          {skillOpen && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#aaa", fontSize: 14 }}>
              🚧 Kommer snart
            </div>
          )}
        </div>

      </div>
    </main>
  )
}