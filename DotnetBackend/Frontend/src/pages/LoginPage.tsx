import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api/client"

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState<"login" | "register">("login")
    const [form, setForm] = useState({ name: "", email: "", password: "" })
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)

    const update = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setError(""); setSuccess("")
    }

    const handleLogin = async () => {
        if (!form.email || !form.password) { setError("Fyll i alla fält."); return }
        setLoading(true)
        try {
            const res = await api.post("/auth/login", { email: form.email, password: form.password })
            login(res.data.token, { email: res.data.email, name: res.data.name, roles: res.data.roles, xp: res.data.xp })
            navigate("/home")
        } catch (e: any) {
            setError(e.response?.data?.error || "Fel e-post eller lösenord.")
        } finally { setLoading(false) }
    }

    const handleRegister = async () => {
        if (!form.name || !form.email || !form.password) { setError("Fyll i alla fält."); return }
        setLoading(true)
        try {
            const res = await api.post("/auth/register", { name: form.name, email: form.email, password: form.password })
            login(res.data.token, { email: res.data.email, name: res.data.name, roles: res.data.roles, xp: res.data.xp })
            navigate("/home")
        } catch (e: any) {
            setError(e.response?.data?.error || "Något gick fel.")
        } finally { setLoading(false) }
    }

    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "9px 12px", fontSize: 14,
        border: "1px solid #e0e0e0", borderRadius: 8, outline: "none",
        background: "#fafafa", color: "#1a1a2e", boxSizing: "border-box",
    }

    return (
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f0", fontFamily: "'Segoe UI', sans-serif", padding: "1rem" }}>
            <div style={{ width: "100%", maxWidth: 420 }}>

                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: "#1a1a2e", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 24 }}>💼</div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a2e", margin: 0 }}>KarriarApp</h1>
                    <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>Din smarta karriärcoach</p>
                </div>

                {/* Card */}
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", padding: "1.75rem" }}>

                    {/* Tabs */}
                    <div style={{ display: "flex", background: "#f5f5f0", borderRadius: 10, padding: 4, marginBottom: "1.5rem" }}>
                        {(["login", "register"] as const).map((t) => (
                            <button key={t} onClick={() => { setTab(t); setError(""); setSuccess("") }} style={{
                                flex: 1, padding: "8px 0", fontSize: 14,
                                fontWeight: tab === t ? 600 : 400,
                                border: "none", cursor: "pointer", borderRadius: 8,
                                background: tab === t ? "#fff" : "transparent",
                                color: tab === t ? "#1a1a2e" : "#888",
                                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                            }}>
                                {t === "login" ? "Logga in" : "Skapa konto"}
                            </button>
                        ))}
                    </div>

                    {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: "1rem", border: "1px solid #fecaca" }}>{error}</div>}
                    {success && <div style={{ background: "#f0fdf4", color: "#166534", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: "1rem", border: "1px solid #bbf7d0" }}>{success}</div>}

                    {tab === "register" && (
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>Namn</label>
                            <input name="name" value={form.name} onChange={update} placeholder="Ditt namn" style={inputStyle} />
                        </div>
                    )}

                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>E-postadress</label>
                        <input name="email" type="email" value={form.email} onChange={update} placeholder="din@email.com" style={inputStyle} />
                    </div>

                    <div style={{ marginBottom: "1.25rem" }}>
                        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>Lösenord</label>
                        <input name="password" type="password" value={form.password} onChange={update} placeholder="••••••••" style={inputStyle} />
                    </div>

                    <button
                        onClick={tab === "login" ? handleLogin : handleRegister}
                        disabled={loading}
                        style={{ width: "100%", padding: "11px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", background: loading ? "#aaa" : "#1a1a2e", color: "#fff" }}>
                        {loading ? "Laddar..." : tab === "login" ? "Logga in" : "Skapa konto"}
                    </button>
                </div>
            </div>
        </main>
    )
}