import type { Metadata } from "next"
import Providers from "./providers"

export const metadata: Metadata = {
  title: "KarriarApp",
  description: "Din smarta karriärcoach",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body style={{ margin: 0, padding: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}