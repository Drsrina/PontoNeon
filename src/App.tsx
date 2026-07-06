import React, { useState, useEffect } from "react";
import { LogOut, Shield, Users, ShieldAlert, Cpu } from "lucide-react";
import { User } from "./types";
import Login from "./components/Login";
import EmployeeDashboard from "./components/EmployeeDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Attempt to restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("pontoneon_token");
    const savedUser = localStorage.getItem("pontoneon_user");

    if (savedToken && savedUser) {
      // Validate saved token with server
      fetch("/api/users/me", {
        headers: { "Authorization": `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Sessão expirada");
        })
        .then((userData) => {
          setToken(savedToken);
          setUser(userData);
          localStorage.setItem("pontoneon_user", JSON.stringify(userData));
        })
        .catch(() => {
          // Token is stale or invalid, clean up
          localStorage.removeItem("pontoneon_token");
          localStorage.removeItem("pontoneon_user");
        })
        .finally(() => {
          setInitializing(false);
        });
    } else {
      setInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: User) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem("pontoneon_token", newToken);
    localStorage.setItem("pontoneon_user", JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("pontoneon_token");
    localStorage.removeItem("pontoneon_user");
  };

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050805] text-[#00ff00] font-mono">
        <div className="relative flex h-10 w-10 mb-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff00] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-10 w-10 bg-[#00ff00]/25 border border-[#00ff00] flex items-center justify-center text-sm font-bold">
            ⚡
          </span>
        </div>
        <span className="text-xs uppercase tracking-widest animate-pulse">
          Iniciando PontoNeon...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050805] flex flex-col justify-between selection:bg-[#00ff00] selection:text-black">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/4 w-[40vw] h-[30vh] bg-[#00ff00]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[30vw] h-[40vh] bg-[#00ff00]/3 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="flex-grow">
        {user && token ? (
          /* Header Navigation for logged in users */
          <>
            <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 md:px-8 py-3.5 flex items-center justify-between">
              {/* Left Logo and title */}
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-black/40 border border-[#00ff00]/20 rounded-lg shadow-[0_0_10px_rgba(0,255,0,0.15)]">
                  <Shield className="w-5 h-5 text-[#00ff00] neon-glow" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-white uppercase flex items-center">
                    Ponto<span className="text-[#00ff00] neon-glow">Neon</span>
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse"></span>
                  </h1>
                  <p className="text-[9px] font-mono tracking-wider text-[#00ff00]/50 uppercase">
                    v1.0.0 (SQLite Local)
                  </p>
                </div>
              </div>

              {/* Center Dashboard Indicator */}
              <div className="hidden sm:flex items-center space-x-2 bg-zinc-950/50 border border-zinc-900 px-3.5 py-1.5 rounded-xl text-xs">
                {user.role === "admin" ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-[#00ff00]" />
                    <span className="font-mono text-[#00ff00] font-semibold uppercase tracking-wider">
                      Painel Administrativo
                    </span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-[#00ff00]" />
                    <span className="font-mono text-[#00ff00] font-semibold uppercase tracking-wider">
                      Painel do Colaborador
                    </span>
                  </>
                )}
              </div>

              {/* Right Profile & Logout Button */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">
                    {user.role === "admin" ? "Administrador" : `Matrícula: ${user.username}`}
                  </p>
                </div>

                <div className="h-8 w-[1px] bg-zinc-900 hidden md:block"></div>

                {/* Logout Action */}
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-lg bg-zinc-950/60 hover:bg-red-950/30 border border-zinc-850 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-all flex items-center justify-center cursor-pointer group shadow-sm"
                  title="Sair do Sistema"
                >
                  <LogOut className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
                </button>
              </div>
            </header>

            {/* Dashboard Workspace Wrap */}
            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full relative z-10">
              {user.role === "admin" ? (
                <AdminDashboard user={user} token={token} />
              ) : (
                <EmployeeDashboard user={user} token={token} />
              )}
            </main>
          </>
        ) : (
          /* Login Screen Container */
          <main className="max-w-7xl mx-auto px-4 w-full relative z-10">
            <Login onLoginSuccess={handleLoginSuccess} />
          </main>
        )}
      </div>

      {/* Extreme Low Memory (CLT/MTE-Compliant) Footer */}
      <footer className="w-full border-t border-white/5 py-4 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-zinc-600 tracking-wider">
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-[#00ff00]/60" />
            <span>CONSUMO DE RAM ESTIMADO: <strong className="text-[#00ff00]/50">~24MB</strong></span>
          </div>
          <div className="mt-1 sm:mt-0 text-center sm:text-right text-zinc-700">
            PontoNeon &copy; 2026 | Desenvolvido com SQLite3 local & Glassmorphism design
          </div>
        </div>
      </footer>
    </div>
  );
}
