import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api/client"

export default function HomePage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

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

    const [skillGap, setSkillGap] = useState<any | null>(null)
    const [skillAnalyzing, setSkillAnalyzing] = useState(false)
    const [expandedGap, setExpandedGap] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState<Record<number, "youtube" | "coursera" | "udemy">>({})
    const [gapVideos, setGapVideos] = useState<Record<number, any[]>>({})
    const [gapCourses, setGapCourses] = useState<Record<number, any[]>>({})
    const [gapUdemy, setGapUdemy] = useState<Record<number, any[]>>({})
    const [loadingVideos, setLoadingVideos] = useState<Record<number, boolean>>({})
    const [loadingCourses, setLoadingCourses] = useState<Record<number, boolean>>({})
    const [loadingUdemy, setLoadingUdemy] = useState<Record<number, boolean>>({})

    // Covered gaps — set of skill names that are covered by certificates
    const [coveredGaps, setCoveredGaps] = useState<Set<string>>(new Set())

    const [xp, setXp] = useState(user?.xp || 0)
    const [certUploading, setCertUploading] = useState(false)
    const [certResult, setCertResult] = useState<any | null>(null)
    const [showCertModal, setShowCertModal] = useState(false)
    const [cvText, setCvText] = useState("")

    const fileRef = useRef<HTMLInputElement>(null)
    const certRef = useRef<HTMLInputElement>(null)

    useEffect(() => { fetchXp() }, [])

    const fetchXp = async () => {
        try {
            const res = await api.get("/certificate/xp")
            setXp(res.data.xp)
        } catch { }
    }

    const handleFile = (file: File) => {
        if (file.type === "application/pdf") { setCvFile(file); setError("") }
        else setError("Endast PDF-filer stöds.")
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    const handleAnalyze = async () => {
        if (!cvFile) return
        setAnalyzing(true); setProgress(0); setError("")
        const interval = setInterval(() => setProgress(p => p < 85 ? p + 6 : p), 400)
        try {
            const formData = new FormData()
            formData.append("file", cvFile)
            formData.append("jobTitle", jobTitle)
            const res = await api.post("/cvanalysis/analyze", formData)
            const data = res.data
            clearInterval(interval); setProgress(100)
            setCvText(data.cvText || "")
            setTimeout(() => {
                setAnalyses(prev => [{
                    filename: data.filename,
                    jobTitle: data.jobTitle || "Ej angiven",
                    date: data.date,
                    score: data.score,
                    atsScore: data.atsScore,
                    strengths: data.strengths ?? [],
                    improvements: data.improvements ?? [],
                    keywords: data.keywords ?? [],
                }, ...prev])
                setAnalyzing(false); setProgress(0)
                setUploadOpen(false); setFeedbackOpen(true)
            }, 600)
        } catch (e: any) {
            clearInterval(interval); setAnalyzing(false)
            setError(e.response?.data?.error || "Något gick fel.")
        }
    }

    const handleSkillGap = async () => {
        if (!cvText || !jobTitle) return
        setSkillAnalyzing(true)
        try {
            const res = await api.post("/skillgap/analyze", { cvText, jobTitle })
            setSkillGap(res.data)
        } catch { } finally { setSkillAnalyzing(false) }
    }

    const handleCertUpload = async (file: File) => {
        setCertUploading(true); setCertResult(null)
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("gaps", JSON.stringify(skillGap?.gaps || []))
            const res = await api.post("/certificate/upload", formData)
            const data = res.data
            setCertResult(data)
            setXp(data.totalXp || 0)
            setShowCertModal(true)

            // Mark gap as covered if matched
            if (data.matchedGap) {
                setCoveredGaps(prev => new Set([...prev, data.matchedGap.toLowerCase()]))
            }
        } catch { } finally { setCertUploading(false) }
    }

    const isGapCovered = (skill: string) =>
        coveredGaps.has(skill.toLowerCase())

    const toggleGap = (i: number) => {
        const gap = skillGap?.gaps[i]
        if (gap && isGapCovered(gap.skill)) return // Don't expand covered gaps
        setExpandedGap(expandedGap === i ? null : i)
        if (!activeTab[i]) setActiveTab(prev => ({ ...prev, [i]: "youtube" }))
    }

    const switchTab = (i: number, tab: "youtube" | "coursera" | "udemy") => {
        setActiveTab(prev => ({ ...prev, [i]: tab }))
        if (tab === "youtube" && !gapVideos[i]) fetchVideos(skillGap.gaps[i].skill, i)
        if (tab === "coursera" && !gapCourses[i]) fetchCourses(skillGap.gaps[i].skill, i)
        if (tab === "udemy" && !gapUdemy[i]) fetchUdemy(skillGap.gaps[i].skill, i)
    }

    const fetchVideos = async (skill: string, i: number) => {
        if (gapVideos[i]) return
        setLoadingVideos(prev => ({ ...prev, [i]: true }))
        try {
            const res = await api.get(`/skillgap/youtube?skill=${encodeURIComponent(skill)}`)
            setGapVideos(prev => ({ ...prev, [i]: res.data.videos || [] }))
        } catch { } finally { setLoadingVideos(prev => ({ ...prev, [i]: false })) }
    }

    const fetchCourses = async (skill: string, i: number) => {
        if (gapCourses[i]) return
        setLoadingCourses(prev => ({ ...prev, [i]: true }))
        try {
            const res = await api.get(`/skillgap/coursera?skill=${encodeURIComponent(skill)}`)
            setGapCourses(prev => ({ ...prev, [i]: res.data.courses || [] }))
        } catch { } finally { setLoadingCourses(prev => ({ ...prev, [i]: false })) }
    }

    const fetchUdemy = async (skill: string, i: number) => {
        if (gapUdemy[i]) return
        setLoadingUdemy(prev => ({ ...prev, [i]: true }))
        try {
            const res = await api.get(`/skillgap/udemy?skill=${encodeURIComponent(skill)}`)
            setGapUdemy(prev => ({ ...prev, [i]: res.data.courses || [] }))
        } catch { } finally { setLoadingUdemy(prev => ({ ...prev, [i]: false })) }
    }

    const handleGapOpen = (i: number) => {
        const gap = skillGap?.gaps[i]
        if (gap && isGapCovered(gap.skill)) return
        toggleGap(i)
        if (expandedGap !== i) fetchVideos(skillGap.gaps[i].skill, i)
    }

    const handleLogout = () => { logout(); navigate("/login") }

    const sectionStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", marginBottom: "1rem", overflow: "hidden" }
    const headerStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", cursor: "pointer", userSelect: "none" }
    const iconBox = (color: string): React.CSSProperties => ({ width: 38, height: 38, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 })
    const chevron = (open: boolean): React.CSSProperties => ({ fontSize: 18, color: "#888", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" })
    const scoreBox: React.CSSProperties = { background: "#fff9c4", borderRadius: 8, padding: "10px", textAlign: "center", fontWeight: 700, fontSize: 18, color: "#7a6000" }
    const priorityColor = (p: string) => p === "hög" ? "#e74c3c" : p === "medel" ? "#f39c12" : "#27ae60"
    const xpLevel = Math.floor(xp / 100) + 1
    const tabs = [
        { key: "youtube" as const, label: "▶ YouTube" },
        { key: "coursera" as const, label: "🎓 Coursera" },
        { key: "udemy" as const, label: "🛒 Udemy" },
    ]

    return (
        <main style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif", padding: "1.5rem 1rem" }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "1rem 1.5rem", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💼</div>
                        <div>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>KarriarApp</p>
                            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Välkommen, {user?.name || user?.email}</p>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff9c4", border: "1px solid #f0d060", borderRadius: 20, padding: "4px 12px" }}>
                            <span>⭐</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#7a6000" }}>{xp} XP</span>
                            <span style={{ fontSize: 11, color: "#b8860b" }}>Nivå {xpLevel}</span>
                        </div>
                        <button onClick={() => certRef.current?.click()} disabled={certUploading}
                            style={{ fontSize: 13, fontWeight: 500, color: "#fff", background: certUploading ? "#aaa" : "linear-gradient(135deg, #4f8ef7, #a855f7)", border: "none", borderRadius: 8, padding: "7px 14px", cursor: certUploading ? "not-allowed" : "pointer" }}>
                            {certUploading ? "Laddar upp..." : "🎓 Ladda upp certifikat"}
                        </button>
                        <input ref={certRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleCertUpload(e.target.files[0])} />
                        <button onClick={handleLogout} style={{ fontSize: 13, color: "#888", background: "transparent", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>Logga ut</button>
                    </div>
                </div>

                {/* XP Modal */}
                {showCertModal && certResult && (
                    <div style={{ background: "#fff", borderRadius: 14, border: "2px solid #f0d060", padding: "1.5rem", marginBottom: "1rem", textAlign: "center", position: "relative" }}>
                        <button onClick={() => setShowCertModal(false)} style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "#888" }}>✕</button>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                        <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>+{certResult.xpEarned} XP!</p>
                        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#555" }}>{certResult.message}</p>
                        {certResult.matchedGap && (
                            <div style={{ background: "#f0fff4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 16px", display: "inline-block" }}>
                                <p style={{ margin: 0, fontSize: 13, color: "#1a7a4a" }}>✅ Gap täckt: <strong>{certResult.matchedGap}</strong> — visas nu som grön!</p>
                            </div>
                        )}
                        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#888" }}>Totalt: <strong>{certResult.totalXp} XP</strong> — Nivå {Math.floor(certResult.totalXp / 100) + 1}</p>
                    </div>
                )}

                {/* STEP 1 */}
                <div style={sectionStyle}>
                    <div style={headerStyle} onClick={() => setUploadOpen(o => !o)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={iconBox("#e8f0fe")}>📄</div>
                            <div>
                                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>Steg 1: Ladda upp ditt CV</p>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{cvFile ? `✅ ${cvFile.name}` : "Ladda upp ditt CV för AI-analys"}</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {analyses.length > 0 && <span style={{ background: "#1a1a2e", color: "#fff", fontSize: 12, borderRadius: 20, padding: "4px 12px", fontWeight: 500 }}>✓ Klar</span>}
                            <span style={chevron(uploadOpen)}>⌄</span>
                        </div>
                    </div>

                    {uploadOpen && (
                        <div style={{ padding: "0 1.25rem 1.25rem" }}>
                            {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: "1rem", border: "1px solid #fecaca" }}>{error}</div>}
                            {!analyzing ? (
                                <>
                                    <div style={{ border: `2px dashed ${dragging ? "#4f8ef7" : "#d0d5dd"}`, borderRadius: 12, padding: "2rem", textAlign: "center", background: dragging ? "#f0f5ff" : "#fafafa", cursor: "pointer" }}
                                        onDragOver={e => { e.preventDefault(); setDragging(true) }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileRef.current?.click()}>
                                        <div style={{ fontSize: 36, marginBottom: 8 }}>⬆️</div>
                                        <p style={{ margin: 0, fontWeight: 600, color: "#1a1a2e", fontSize: 15 }}>{cvFile ? cvFile.name : "Dra och släpp ditt CV här"}</p>
                                        <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#888" }}>{cvFile ? "Klicka för att byta fil" : "eller klicka för att välja"}</p>
                                        <button style={{ padding: "8px 20px", border: "1px solid #d0d5dd", borderRadius: 8, color: "#ffff", fontSize: 15 }}>Välj fil</button>
                                        <p style={{ margin: "10px 0 0", fontSize: 11, color: "#aaa" }}>Endast PDF (max 10MB)</p>
                                        <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                                    </div>
                                    <div style={{ marginTop: "1rem" }}>
                                        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>💼 Vilken tjänst söker du?</label>
                                        <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="t.ex. Frontend Developer, UX Designer"
                                            style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, outline: "none", boxSizing: "border-box", color: "#1a1a2e", background: "#fafafa" }} />
                                    </div>
                                    <button onClick={handleAnalyze} disabled={!cvFile}
                                        style={{ width: "100%", padding: "12px", fontSize: 15, fontWeight: 600, border: "none", borderRadius: 10, cursor: cvFile ? "pointer" : "not-allowed", background: cvFile ? "linear-gradient(135deg, #4f8ef7, #a855f7)" : "#ccc", color: "#fff", marginTop: "1rem" }}>
                                        Analysera mitt CV →
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
                                    <p style={{ fontWeight: 600, color: "#1a1a2e", margin: "0 0 4px" }}>Analyserar{jobTitle ? ` för "${jobTitle}"` : ""}...</p>
                                    <div style={{ height: 6, background: "#e8e8e8", borderRadius: 99, overflow: "hidden", margin: "1rem 0" }}>
                                        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #4f8ef7, #a855f7)", borderRadius: 99, transition: "width 0.4s" }} />
                                    </div>
                                    <p style={{ fontSize: 12, color: "#aaa" }}>{progress}% klart</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* STEP 2 */}
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
                            {analyses.length > 0 && <span style={{ fontSize: 13, color: "#555" }}>{feedbackOpen ? "Dölj" : "Visa"} detaljer</span>}
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
                                        <div><p style={{ margin: "0 0 6px", fontSize: 12, color: "#555" }}>Overall Score</p><div style={scoreBox}>{a.score}/100</div></div>
                                        <div><p style={{ margin: "0 0 6px", fontSize: 12, color: "#555" }}>ATS Score</p><div style={scoreBox}>{a.atsScore}/100</div></div>
                                    </div>
                                    <button style={{ width: "100%", padding: "10px", background: "transparent", border: "1px solid #e8e8e8", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#555", marginTop: "0.75rem" }}
                                        onClick={() => setExpandedFeedback(expandedFeedback === i ? null : i)}>
                                        {expandedFeedback === i ? "⌃ Dölj feedback" : "⌄ Visa full feedback"}
                                    </button>
                                    {expandedFeedback === i && (
                                        <div style={{ marginTop: "0.75rem" }}>
                                            {a.strengths.length > 0 && <div style={{ marginBottom: "0.75rem" }}>
                                                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#1a7a4a" }}>✅ Styrkor</p>
                                                {a.strengths.map((s: string, j: number) => <p key={j} style={{ margin: "3px 0", fontSize: 13, color: "#444" }}>• {s}</p>)}
                                            </div>}
                                            {a.improvements.length > 0 && <div style={{ marginBottom: "0.75rem" }}>
                                                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#c0392b" }}>🔧 Förbättringar</p>
                                                {a.improvements.map((s: string, j: number) => <p key={j} style={{ margin: "3px 0", fontSize: 13, color: "#444" }}>• {s}</p>)}
                                            </div>}
                                            {a.keywords.length > 0 && <div>
                                                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>🔑 Nyckelord</p>
                                                <div>{a.keywords.map((k: string, j: number) => <span key={j} style={{ display: "inline-block", background: "#f0f4ff", color: "#3b5bdb", fontSize: 12, borderRadius: 20, padding: "3px 10px", margin: "3px" }}>{k}</span>)}</div>
                                            </div>}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button onClick={() => { setUploadOpen(true); setFeedbackOpen(false) }}
                                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", background: "transparent", border: "1px solid #e0e0e0", borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginLeft: "auto" }}>
                                + Ladda upp nytt CV
                            </button>
                        </div>
                    )}
                </div>

                {/* STEP 3 */}
                <div style={sectionStyle}>
                    <div style={headerStyle} onClick={() => setSkillOpen(o => !o)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={iconBox("#e8fff0")}>🎯</div>
                            <div>
                                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>Steg 3: Kompetensgapanalys</p>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>Identifiera gap och få kursrekommendationer</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {skillGap && <span style={{ background: "#1a1a2e", color: "#fff", fontSize: 12, borderRadius: 20, padding: "4px 12px", fontWeight: 500 }}>✓ Klar</span>}
                            <span style={chevron(skillOpen)}>⌄</span>
                        </div>
                    </div>

                    {skillOpen && (
                        <div style={{ padding: "0 1.25rem 1.25rem" }}>
                            {!skillGap ? (
                                <>
                                    {(!cvText || !jobTitle) && (
                                        <div style={{ background: "#fef9e7", color: "#b7950b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: "1rem", border: "1px solid #f9e79f" }}>
                                            ⚠️ Ladda upp ett CV och ange jobbtitel i Steg 1 först.
                                        </div>
                                    )}
                                    <button onClick={handleSkillGap} disabled={!cvText || !jobTitle || skillAnalyzing}
                                        style={{ width: "100%", padding: "12px", fontSize: 15, fontWeight: 600, border: "none", borderRadius: 10, cursor: cvText && jobTitle ? "pointer" : "not-allowed", background: cvText && jobTitle ? "linear-gradient(135deg, #27ae60, #2ecc71)" : "#ccc", color: "#fff" }}>
                                        {skillAnalyzing ? "Analyserar..." : "Analysera kompetensgap →"}
                                    </button>
                                </>
                            ) : (
                                <div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.25rem" }}>
                                        <div style={{ background: "#f0fff4", borderRadius: 10, padding: "1rem", textAlign: "center", border: "1px solid #bbf7d0" }}>
                                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#555" }}>Matchningsgrad</p>
                                            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1a7a4a" }}>{skillGap.matchScore}%</p>
                                        </div>
                                        <div style={{ background: "#fef2f2", borderRadius: 10, padding: "1rem", textAlign: "center", border: "1px solid #fecaca" }}>
                                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#555" }}>Identifierade gap</p>
                                            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#c0392b" }}>{skillGap.gaps?.length ?? 0}</p>
                                        </div>
                                    </div>

                                    {skillGap.summary && (
                                        <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "12px 16px", marginBottom: "1rem", border: "1px solid #e8e8e8" }}>
                                            <p style={{ margin: 0, fontSize: 13, color: "#555", fontStyle: "italic" }}>"{skillGap.summary}"</p>
                                        </div>
                                    )}

                                    {skillGap.candidateSkills?.length > 0 && (
                                        <div style={{ marginBottom: "1rem" }}>
                                            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#1a7a4a" }}>✅ Dina befintliga kompetenser</p>
                                            <div>{skillGap.candidateSkills.map((s: string, i: number) => (
                                                <span key={i} style={{ display: "inline-block", background: "#f0fff4", color: "#1a7a4a", fontSize: 12, borderRadius: 20, padding: "3px 10px", margin: "3px", border: "1px solid #bbf7d0" }}>{s}</span>
                                            ))}</div>
                                        </div>
                                    )}

                                    {skillGap.gaps?.length > 0 && (
                                        <div>
                                            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#555" }}>Kompetensgap</p>
                                            {skillGap.gaps.map((gap: any, i: number) => {
                                                const covered = isGapCovered(gap.skill)
                                                return (
                                                    <div key={i} style={{
                                                        border: `1px solid ${covered ? "#bbf7d0" : "#e8e8e8"}`,
                                                        borderRadius: 10, marginBottom: "0.5rem", overflow: "hidden",
                                                        background: covered ? "#f0fff4" : "#fff",
                                                        transition: "all 0.3s",
                                                    }}>
                                                        {/* Gap header */}
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", cursor: covered ? "default" : "pointer", background: covered ? "#f0fff4" : "#fafafa" }}
                                                            onClick={() => handleGapOpen(i)}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                {covered ? (
                                                                    <span style={{ background: "#27ae60", color: "#fff", fontSize: 11, borderRadius: 20, padding: "2px 8px" }}>✓ täckt</span>
                                                                ) : (
                                                                    <span style={{ background: priorityColor(gap.priority), color: "#fff", fontSize: 11, borderRadius: 20, padding: "2px 8px" }}>{gap.priority}</span>
                                                                )}
                                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: covered ? "#1a7a4a" : "#1a1a2e" }}>{gap.skill}</p>
                                                            </div>
                                                            {covered ? (
                                                                <span style={{ fontSize: 18 }}>✅</span>
                                                            ) : (
                                                                <span style={chevron(expandedGap === i)}>⌄</span>
                                                            )}
                                                        </div>

                                                        {/* Covered message */}
                                                        {covered && (
                                                            <div style={{ padding: "0.5rem 1rem 0.75rem", borderTop: "1px solid #bbf7d0" }}>
                                                                <p style={{ margin: 0, fontSize: 13, color: "#1a7a4a" }}>🎓 Certifikat uppladdad — detta gap är täckt!</p>
                                                            </div>
                                                        )}

                                                        {/* Expanded content — only for uncovered gaps */}
                                                        {!covered && expandedGap === i && (
                                                            <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e8e8e8" }}>
                                                                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#555" }}>{gap.description}</p>

                                                                {/* Tabs */}
                                                                <div style={{ display: "flex", gap: 0, marginBottom: "1rem", background: "#f5f5f0", borderRadius: 10, padding: 4 }}>
                                                                    {tabs.map(tab => (
                                                                        <button key={tab.key} onClick={() => switchTab(i, tab.key)} style={{
                                                                            flex: 1, padding: "7px 0", fontSize: 12,
                                                                            fontWeight: activeTab[i] === tab.key ? 600 : 400,
                                                                            border: "none", cursor: "pointer", borderRadius: 8,
                                                                            background: activeTab[i] === tab.key ? "#fff" : "transparent",
                                                                            color: activeTab[i] === tab.key ? "#1a1a2e" : "#888",
                                                                            boxShadow: activeTab[i] === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                                                                        }}>{tab.label}</button>
                                                                    ))}
                                                                </div>

                                                                {/* YouTube */}
                                                                {activeTab[i] === "youtube" && (
                                                                    loadingVideos[i] ? <p style={{ fontSize: 13, color: "#888" }}>Hämtar videos...</p> :
                                                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                                            {(gapVideos[i] || []).map((v: any, j: number) => (
                                                                                <a key={j} href={v.url} target="_blank" rel="noopener noreferrer"
                                                                                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", background: "#f8f9fa", borderRadius: 8, padding: "8px", border: "1px solid #e8e8e8" }}>
                                                                                    <img src={v.thumbnail} alt={v.title} style={{ width: 80, height: 45, borderRadius: 6, objectFit: "cover" }} />
                                                                                    <div>
                                                                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{v.title}</p>
                                                                                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>{v.channel}</p>
                                                                                    </div>
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                )}

                                                                {/* Coursera */}
                                                                {activeTab[i] === "coursera" && (
                                                                    loadingCourses[i] ? <p style={{ fontSize: 13, color: "#888" }}>Hämtar kurser...</p> :
                                                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                                            {(gapCourses[i] || []).map((c: any, j: number) => (
                                                                                <a key={j} href={c.url} target="_blank" rel="noopener noreferrer"
                                                                                    style={{ textDecoration: "none", background: "#f8f9fa", borderRadius: 8, padding: "12px", border: "1px solid #e8e8e8", display: "block" }}>
                                                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{c.title}</p>
                                                                                        <span style={{ background: "#e8f0fe", color: "#1a73e8", fontSize: 11, borderRadius: 20, padding: "2px 8px", marginLeft: 8, whiteSpace: "nowrap" }}>{c.price}</span>
                                                                                    </div>
                                                                                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>{c.description}</p>
                                                                                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                                                                        <span style={{ fontSize: 11, color: "#555" }}>📊 {c.level}</span>
                                                                                        <span style={{ fontSize: 11, color: "#555" }}>⏱ {c.duration}</span>
                                                                                        {c.rating && <span style={{ fontSize: 11, color: "#555" }}>⭐ {c.rating}</span>}
                                                                                    </div>
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                )}

                                                                {/* Udemy */}
                                                                {activeTab[i] === "udemy" && (
                                                                    loadingUdemy[i] ? <p style={{ fontSize: 13, color: "#888" }}>Hämtar kurser...</p> :
                                                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                                            {(gapUdemy[i] || []).map((c: any, j: number) => (
                                                                                <a key={j} href={c.url} target="_blank" rel="noopener noreferrer"
                                                                                    style={{ display: "flex", gap: 10, textDecoration: "none", background: "#f8f9fa", borderRadius: 8, padding: "8px", border: "1px solid #e8e8e8" }}>
                                                                                    {c.thumbnail && <img src={c.thumbnail} alt={c.title} style={{ width: 80, height: 45, borderRadius: 6, objectFit: "cover" }} />}
                                                                                    <div style={{ flex: 1 }}>
                                                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{c.title}</p>
                                                                                            <span style={{ background: "#fff3e0", color: "#e65100", fontSize: 11, borderRadius: 20, padding: "2px 8px", marginLeft: 8, fontWeight: 600, whiteSpace: "nowrap" }}>{c.price}</span>
                                                                                        </div>
                                                                                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>{c.headline}</p>
                                                                                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                                                                            {c.rating && <span style={{ fontSize: 11, color: "#555" }}>⭐ {c.rating}</span>}
                                                                                            {c.level && <span style={{ fontSize: 11, color: "#555" }}>📊 {c.level}</span>}
                                                                                        </div>
                                                                                    </div>
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    <button onClick={() => { setSkillGap(null); setExpandedGap(null); setGapVideos({}); setGapCourses({}); setGapUdemy({}); setCoveredGaps(new Set()) }}
                                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", background: "transparent", border: "1px solid #e0e0e0", borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginTop: "1rem", marginLeft: "auto" }}>
                                        🔄 Analysera igen
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </main>
    )
}