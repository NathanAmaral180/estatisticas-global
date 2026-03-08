import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Estatísticas Global",
  description: "Painel de estatísticas em tempo real",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-white">
        <div className="min-h-screen flex flex-col">
          
          {/* HEADER */}
          <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,.6)]" />
                
                <div>
                  <div className="font-semibold leading-tight">
                    Estatísticas Global
                  </div>
                  <div className="text-xs text-zinc-400">
                    Indicadores em tempo real
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-400">
                <span className="hidden sm:inline">API: </span>
                <span className="font-mono">
                  http://127.0.0.1:8000
                </span>
              </div>
            </div>
          </header>

          {/* MAIN */}
          <main className="flex-1">
            {children}
          </main>

          {/* FOOTER */}
          <footer className="border-t border-white/10 py-6">
            <div className="mx-auto max-w-6xl px-4 text-xs text-zinc-500">
              Feito com Next + FastAPI • {new Date().getFullYear()}
            </div>
          </footer>

        </div>
      </body>
    </html>
  )
}