import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import type { ReactNode } from "react"

interface Props {
    children: ReactNode
    adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
    const { token, isAdmin } = useAuth()
    if (!token) return <Navigate to="/login" replace />
    if (adminOnly && !isAdmin) return <Navigate to="/home" replace />
    return <>{children}</>
}