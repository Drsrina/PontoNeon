import React, { useState } from "react";
import { LogIn, Shield, Users, Loader2 } from "lucide-react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha na autenticação.");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Erro de rede. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper
  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div id="login-container" className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8">
      {/* Visual Logo / Icon */}
      <div className="flex items-center space-x-2.5 mb-8 animate-fade-in">
        <div className="p-3 rounded-xl bg-black/40 border border-[#00ff00]/30 shadow-[0_0_15px_rgba(0,255,0,0.25)]">
          <Shield className="w-8 h-8 text-[#00ff00] neon-glow" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">
            Ponto<span className="text-[#00ff00] neon-glow">Neon</span>
          </h1>
          <p className="text-[10px] font-mono tracking-widest text-[#00ff00]/60 uppercase">
            Sistema de Ponto de Extrema Leveza
          </p>
        </div>
      </div>

      {/* Main glass card */}
      <div className="w-full max-w-md rounded-2xl glass-panel neon-border p-8 relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,0,0.1)]">
        {/* Light overlay glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff00]/5 rounded-full blur-2xl pointer-events-none"></div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <LogIn className="w-5 h-5 text-[#00ff00]" />
          <span>Acessar o Painel</span>
        </h2>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase text-[#00ff00]/70 mb-1.5">
              Código ou Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: 1234 ou admin"
              className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#00ff00]/50 focus:ring-1 focus:ring-[#00ff00]/20 focus:shadow-[0_0_10px_rgba(0,255,0,0.1)] transition-all placeholder:text-zinc-600 font-sans"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#00ff00]/70 mb-1.5">
              Senha de Acesso
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#00ff00]/50 focus:ring-1 focus:ring-[#00ff00]/20 focus:shadow-[0_0_10px_rgba(0,255,0,0.1)] transition-all placeholder:text-zinc-600 font-sans"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#00ff00]/10 hover:bg-[#00ff00]/20 border border-[#00ff00]/30 hover:border-[#00ff00]/60 rounded-xl text-[#00ff00] hover:text-white font-bold text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,255,0,0.05)] hover:shadow-[0_0_20px_rgba(0,255,0,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#00ff00]" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Integrated Quick-Fill Example Logins */}
        <div className="mt-6 pt-4 border-t border-zinc-900/60 text-center">
          <p className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Logins de Exemplo (Clique para preencher):</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("admin", "admin")}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-900 hover:border-[#00ff00]/20 text-[10px] font-mono text-zinc-400 hover:text-[#00ff00] transition-all cursor-pointer"
            >
              admin / admin (Gestor)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("1234", "1234")}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-900 hover:border-[#00ff00]/20 text-[10px] font-mono text-zinc-400 hover:text-[#00ff00] transition-all cursor-pointer"
            >
              1234 / 1234 (Funcionário)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
