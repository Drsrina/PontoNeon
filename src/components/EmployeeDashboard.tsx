import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Clock, 
  PlusCircle, 
  History, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Calendar, 
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import { User, Punch, PunchType } from "../types";
import ClockWidget from "./ClockWidget";

interface EmployeeDashboardProps {
  user: User;
  token: string;
}

export default function EmployeeDashboard({ user, token }: EmployeeDashboardProps) {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  // Tab states and Week calculations
  const [activeTab, setActiveTab] = useState<"bater" | "semana" | "historico">("bater");
  const [weekOffset, setWeekOffset] = useState(0);

  // Format helpers
  const formatMsToHoursAndMins = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatMsToReadable = (ms: number) => {
    if (ms <= 0) return "0h 00min";
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}min`;
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  };

  const calculateWorkedMsForDay = (dayPunches: Punch[]) => {
    const validPunches = dayPunches.filter(p => p.status !== "rejected");
    const sorted = [...validPunches].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let totalMs = 0;
    let currentIn: number | null = null;
    
    for (const p of sorted) {
      if (p.type === "entrada" || p.type === "almoco_retorno") {
        if (currentIn === null) {
          currentIn = new Date(p.timestamp).getTime();
        }
      } else if (p.type === "almoco_saida" || p.type === "saida") {
        if (currentIn !== null) {
          totalMs += new Date(p.timestamp).getTime() - currentIn;
          currentIn = null;
        }
      }
    }
    return totalMs;
  };

  const getWeekDays = () => {
    const today = new Date();
    const targetDate = new Date(today.setDate(today.getDate() + (weekOffset * 7)));
    const day = targetDate.getDay();
    const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(targetDate.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getPunchesForDay = (date: Date) => {
    const dateStr = date.toLocaleDateString("pt-BR");
    return punches.filter(p => {
      const pDate = new Date(p.timestamp).toLocaleDateString("pt-BR");
      return pDate === dateStr && p.status !== "rejected";
    });
  };

  const formatDayName = (date: Date) => {
    const days = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado"
    ];
    return days[date.getDay()];
  };

  const formatDayShort = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const isToday = (date: Date) => {
    return date.toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR");
  };

  // Geolocation
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Manual Punch Form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState<PunchType>("entrada");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [justification, setJustification] = useState("");

  // Load employee punches
  const loadPunches = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/punches/my", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPunches(data);
      }
    } catch (err) {
      console.error("Erro ao carregar marcações de ponto:", err);
    } finally {
      setLoading(false);
    }
  };

  // Capture location on mount and periodic updates
  useEffect(() => {
    loadPunches();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation access denied or unavailable:", error.message);
          setGeoError("Permissão de GPS indisponível (usando localização IP aproximada).");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGeoError("Geolocalização não suportada pelo navegador.");
    }
  }, []);

  // Standard Punch submission
  const handlePunch = async (type: PunchType) => {
    setActionLoading(true);
    setMessage(null);

    // Get current browser device agent
    const device = `${navigator.userAgent.split(" ")[0]} (${navigator.platform})`;

    try {
      const response = await fetch("/api/punches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null,
          device,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao registrar ponto.");
      }

      setMessage({ text: `Ponto de '${formatPunchLabel(type)}' registrado com sucesso!`, type: "success" });
      loadPunches();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro de rede.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Manual adjustment submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !manualTime || !justification.trim()) {
      setMessage({ text: "Por favor, preencha todos os campos do formulário manual.", type: "error" });
      return;
    }

    if (justification.trim().length < 5) {
      setMessage({ text: "A justificativa deve conter pelo menos 5 caracteres.", type: "error" });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    const device = "Solicitado via Painel do Funcionário";
    
    // Combine date and time to ISO format
    const punchTimestamp = new Date(`${manualDate}T${manualTime}`).toISOString();

    try {
      const response = await fetch("/api/punches/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: manualType,
          timestamp: punchTimestamp,
          justification: justification.trim(),
          device,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao solicitar correção manual.");
      }

      setMessage({ text: "Solicitação de ponto manual enviada com sucesso!", type: "success" });
      setShowManualForm(false);
      setManualDate("");
      setManualTime("");
      setJustification("");
      loadPunches();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro ao enviar solicitação.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const formatPunchLabel = (type: PunchType) => {
    switch (type) {
      case "entrada": return "Entrada";
      case "almoco_saida": return "Saída Almoço";
      case "almoco_retorno": return "Retorno Almoço";
      case "saida": return "Saída Final";
    }
  };

  const getPunchTypeBadgeStyle = (type: PunchType) => {
    switch (type) {
      case "entrada":
        return "bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00]";
      case "almoco_saida":
        return "bg-cyan-950/40 border border-cyan-500/30 text-cyan-300";
      case "almoco_retorno":
        return "bg-sky-950/40 border border-sky-500/30 text-sky-300";
      case "saida":
        return "bg-purple-950/40 border border-purple-500/30 text-purple-300";
    }
  };

  // Filter punches for today to build a visual Checklist state
  const getTodayPunches = () => {
    const todayStr = new Date().toLocaleDateString("pt-BR");
    return punches.filter(p => {
      const pDate = new Date(p.timestamp).toLocaleDateString("pt-BR");
      return pDate === todayStr && p.status !== "rejected";
    });
  };

  const todayPunches = getTodayPunches();
  const hasEntrada = todayPunches.some(p => p.type === "entrada");
  const hasAlmocoSaida = todayPunches.some(p => p.type === "almoco_saida");
  const hasAlmocoRetorno = todayPunches.some(p => p.type === "almoco_retorno");
  const hasSaida = todayPunches.some(p => p.type === "saida");

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Pre-calculate weekly metrics
  const daysOfWeek = getWeekDays();
  const firstDay = daysOfWeek[0];
  const lastDay = daysOfWeek[6];

  let totalWeekMs = 0;
  const dayBreakdown = daysOfWeek.map(day => {
    const dayPunches = getPunchesForDay(day);
    const workedMs = calculateWorkedMsForDay(dayPunches);
    totalWeekMs += workedMs;
    return {
      day,
      punches: dayPunches,
      workedMs
    };
  });

  return (
    <div id="employee-dashboard-root" className="space-y-6 animate-fade-in">
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl glass-panel border border-[#00ff00]/10">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#00ff00]/60 uppercase">
            Colaborador Logado
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {user.name}
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Matrícula: <span className="text-[#00ff00]">{user.username}</span> | Função: Geral
          </p>
        </div>

        {/* Location display */}
        <div className="mt-4 md:mt-0 flex items-center space-x-2.5 bg-zinc-950/40 border border-zinc-800 p-3 rounded-xl">
          <div className="p-2 bg-[#00ff00]/10 border border-[#00ff00]/20 rounded-lg">
            <MapPin className="w-4 h-4 text-[#00ff00] neon-glow" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Geolocalização (Ponto Seguro)</p>
            {coords ? (
              <p className="text-xs text-[#00ff00] font-mono">
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 font-mono max-w-[180px] truncate">
                {geoError ? "Localização Padrão IP" : "Obtendo sinal GPS..."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1.5 p-1 bg-zinc-950/45 border border-white/5 rounded-xl max-w-sm sm:max-w-md">
        <button
          onClick={() => setActiveTab("bater")}
          className={`flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "bater"
              ? "bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] font-bold shadow-[0_0_15px_rgba(0,255,0,0.1)]"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Registrar Ponto</span>
        </button>
        <button
          onClick={() => setActiveTab("semana")}
          className={`flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "semana"
              ? "bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] font-bold shadow-[0_0_15px_rgba(0,255,0,0.1)]"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Minha Semana</span>
        </button>
        <button
          onClick={() => setActiveTab("historico")}
          className={`flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "historico"
              ? "bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] font-bold shadow-[0_0_15px_rgba(0,255,0,0.1)]"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Histórico</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-2.5 text-sm ${
            message.type === "success"
              ? "bg-[#00ff00]/10 border-[#00ff00]/30 text-[#00ff00]"
              : "bg-red-950/20 border-red-500/30 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{message.type === "success" ? "Sucesso!" : "Atenção"}</p>
            <p className="text-xs mt-0.5 opacity-90">{message.text}</p>
          </div>
        </div>
      )}

      {/* TAB 1: BATER PONTO */}
      {activeTab === "bater" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Clock Widget */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <ClockWidget />

            {/* Today's sequence status checklist (Brazilian Standard workflow) */}
            <div className="p-5 rounded-2xl glass-panel border border-[#00ff00]/10 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#00ff00]/80 mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Rotina de Hoje</span>
              </h3>

              <div className="space-y-2.5">
                {[
                  { label: "Entrada", completed: hasEntrada, type: "entrada" },
                  { label: "Saída Almoço", completed: hasAlmocoSaida, type: "almoco_saida" },
                  { label: "Retorno Almoço", completed: hasAlmocoRetorno, type: "almoco_retorno" },
                  { label: "Saída Final", completed: hasSaida, type: "saida" },
                ].map((item, idx) => {
                  const punchObj = todayPunches.find(p => p.type === item.type);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        item.completed
                          ? "bg-[#00ff00]/10 border-[#00ff00]/25 text-white"
                          : "bg-zinc-950/40 border-zinc-900/60 text-zinc-500"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          item.completed ? "bg-[#00ff00] text-black font-extrabold" : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="text-xs font-semibold">{item.label}</span>
                      </div>
                      {item.completed && punchObj ? (
                        <span className="text-xs font-mono text-[#00ff00] font-bold">
                          {formatTime(punchObj.timestamp)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono uppercase text-zinc-600">Pendente</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic interactive punch pad */}
          <div className="lg:col-span-7 rounded-2xl glass-panel border border-[#00ff00]/10 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Smartphone className="w-5 h-5 text-[#00ff00]" />
                    <span>Terminal de Registros</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Selecione o evento correspondente para gravar o seu horário atual.
                  </p>
                </div>

                {/* Toggle manual mode */}
                <button
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-[#00ff00]/10 border border-zinc-800 hover:border-[#00ff00]/30 text-[11px] font-mono text-zinc-300 hover:text-[#00ff00] transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showManualForm ? "Voltar ao Painel" : "Solicitar Ajuste"}</span>
                </button>
              </div>

              {/* If Manual Form is active */}
              {showManualForm ? (
                <form onSubmit={handleManualSubmit} className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs flex items-start space-x-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Ajuste de Ponto Manual:</strong> Útil caso você tenha esquecido de bater o ponto. Todas as solicitações passam por auditoria do Administrador antes de constarem na folha oficial.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                        Tipo de Marcação
                      </label>
                      <select
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value as PunchType)}
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
                      >
                        <option value="entrada">Entrada Geral</option>
                        <option value="almoco_saida">Saída pro Almoço</option>
                        <option value="almoco_retorno">Retorno do Almoço</option>
                        <option value="saida">Saída Final</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                          Data do Evento
                        </label>
                        <input
                          type="date"
                          required
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                          Hora do Evento
                        </label>
                        <input
                          type="time"
                          required
                          value={manualTime}
                          onChange={(e) => setManualTime(e.target.value)}
                          className="w-full px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                      Justificativa de Ajuste
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Ex: Esqueci de bater o ponto na entrada, estava em atendimento externo urgente..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 placeholder:text-zinc-600 resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 font-bold text-xs tracking-wider transition-all uppercase cursor-pointer"
                  >
                    {actionLoading ? "Processando..." : "Enviar Solicitação de Ajuste"}
                  </button>
                </form>
              ) : (
                /* Standard Quick Touch Punch Pad */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. ENTRADA */}
                  <button
                    onClick={() => handlePunch("entrada")}
                    disabled={actionLoading || hasEntrada}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      hasEntrada
                        ? "bg-zinc-950/20 border-zinc-900 text-zinc-500 cursor-not-allowed opacity-50"
                        : "bg-[#00ff00]/10 hover:bg-[#00ff00]/20 border-[#00ff00]/20 hover:border-[#00ff00]/60 text-white cursor-pointer hover:shadow-[0_0_15px_rgba(0,255,0,0.15)] active:scale-[0.98]"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#00ff00]/5 rounded-bl-full pointer-events-none group-hover:bg-[#00ff00]/10 transition-all"></div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono uppercase tracking-widest text-[#00ff00]/70">Ponto 1</span>
                      {hasEntrada && <CheckCircle className="w-4 h-4 text-[#00ff00]" />}
                    </div>
                    <h4 className="text-lg font-bold">1. Entrada</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {hasEntrada ? "Entrada já registrada hoje." : "Gravar início da jornada de trabalho."}
                    </p>
                  </button>

                  {/* 2. ALMOÇO SAÍDA */}
                  <button
                    onClick={() => handlePunch("almoco_saida")}
                    disabled={actionLoading || !hasEntrada || hasAlmocoSaida}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      hasAlmocoSaida || !hasEntrada
                        ? "bg-zinc-950/20 border-zinc-900 text-zinc-500 cursor-not-allowed opacity-50"
                        : "bg-cyan-950/15 hover:bg-cyan-950/35 border-cyan-500/20 hover:border-cyan-400/60 text-white cursor-pointer hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] active:scale-[0.98]"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-400/10 transition-all"></div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono uppercase tracking-widest text-cyan-500/70">Ponto 2</span>
                      {hasAlmocoSaida && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <h4 className="text-lg font-bold">2. Saída Almoço</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {!hasEntrada 
                        ? "Requer ponto de Entrada primeiro." 
                        : hasAlmocoSaida ? "Ponto de almoço registrado." : "Início do intervalo/descanso."}
                    </p>
                  </button>

                  {/* 3. ALMOÇO RETORNO */}
                  <button
                    onClick={() => handlePunch("almoco_retorno")}
                    disabled={actionLoading || !hasAlmocoSaida || hasAlmocoRetorno}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      hasAlmocoRetorno || !hasAlmocoSaida
                        ? "bg-zinc-950/20 border-zinc-900 text-zinc-500 cursor-not-allowed opacity-50"
                        : "bg-sky-950/15 hover:bg-sky-950/35 border-sky-500/20 hover:border-sky-400/60 text-white cursor-pointer hover:shadow-[0_0_15px_rgba(14,165,233,0.1)] active:scale-[0.98]"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-bl-full pointer-events-none group-hover:bg-sky-400/10 transition-all"></div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono uppercase tracking-widest text-sky-500/70">Ponto 3</span>
                      {hasAlmocoRetorno && <CheckCircle className="w-4 h-4 text-sky-400" />}
                    </div>
                    <h4 className="text-lg font-bold">3. Volta Almoço</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {!hasAlmocoSaida 
                        ? "Requer saída pro almoço primeiro." 
                        : hasAlmocoRetorno ? "Retorno registrado hoje." : "Gravar retorno ao trabalho."}
                    </p>
                  </button>

                  {/* 4. SAÍDA FINAL */}
                  <button
                    onClick={() => handlePunch("saida")}
                    disabled={actionLoading || !hasEntrada || hasSaida}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      hasSaida || !hasEntrada
                        ? "bg-zinc-950/20 border-zinc-900 text-zinc-500 cursor-not-allowed opacity-50"
                        : "bg-purple-950/15 hover:bg-purple-950/35 border-purple-500/20 hover:border-purple-400/60 text-white cursor-pointer hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] active:scale-[0.98]"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:bg-purple-400/10 transition-all"></div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono uppercase tracking-widest text-purple-500/70">Ponto 4</span>
                      {hasSaida && <CheckCircle className="w-4 h-4 text-purple-400" />}
                    </div>
                    <h4 className="text-lg font-bold">4. Saída Final</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {!hasEntrada 
                        ? "Requer ponto de Entrada primeiro." 
                        : hasSaida ? "Jornada de hoje encerrada." : "Fim da jornada de trabalho."}
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Legal Compliance Footer (Brazilian CLT standard) */}
            <div className="mt-6 pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>REGISTRO ELETRÔNICO PORTARIA CLT MTE</span>
              <span className="mt-1 sm:mt-0 text-[#00ff00]/60">● SEGURO E AUDITÁVEL (SQL LOCAL)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MINHA SEMANA ATUAL & DIAS DA SEMANA */}
      {activeTab === "semana" && (
        <div className="space-y-6 animate-fade-in">
          {/* Week Selector / Navigator */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-zinc-950/40 border border-white/5 gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-[#00ff00]/30 text-zinc-400 hover:text-[#00ff00] transition-all cursor-pointer"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-[#00ff00]/30 text-xs font-mono font-medium text-zinc-300 hover:text-[#00ff00] transition-all cursor-pointer"
              >
                Semana Atual
              </button>
              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-[#00ff00]/30 text-zinc-400 hover:text-[#00ff00] transition-all cursor-pointer"
                title="Próxima Semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-zinc-500">Período de Apuração</p>
              <p className="text-xs font-mono font-bold text-[#00ff00]">
                {firstDay.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a {lastDay.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* KPI Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Total Worked */}
            <div className="md:col-span-6 p-5 rounded-2xl glass-panel border border-[#00ff00]/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#00ff00]/60 uppercase">Total Acumulado na Semana</span>
                <h3 className="text-3xl font-extrabold text-white mt-2 font-mono neon-glow">
                  {formatMsToReadable(totalWeekMs)}
                </h3>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                  <span>META SEMANAL CLT: 44h 00m</span>
                  <span>{Math.min(100, Math.round((totalWeekMs / (44 * 60 * 60 * 1000)) * 100))}%</span>
                </div>
                <div className="w-full bg-zinc-900/60 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div
                    className="bg-gradient-to-r from-[#00ff00]/60 to-[#00ff00] h-full rounded-full transition-all duration-500 animate-pulse"
                    style={{ width: `${Math.min(100, (totalWeekMs / (44 * 60 * 60 * 1000)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* General Metrics (Average & Days logged) */}
            <div className="md:col-span-6 p-5 rounded-2xl glass-panel border border-[#00ff00]/10 grid grid-cols-2 gap-4">
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Média Diária</span>
                  <p className="text-xl font-bold text-white mt-1 font-mono">
                    {formatMsToReadable(totalWeekMs / Math.max(1, dayBreakdown.filter(d => d.workedMs > 0).length))}
                  </p>
                </div>
                <p className="text-[9px] text-zinc-500 font-mono mt-2">Baseado em dias ativos</p>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Dias Ativos</span>
                  <p className="text-xl font-bold text-white mt-1 font-mono">
                    {dayBreakdown.filter(d => d.punches.length > 0).length} <span className="text-xs text-zinc-500">de 7</span>
                  </p>
                </div>
                <p className="text-[9px] text-zinc-500 font-mono mt-2">Marcações gravadas</p>
              </div>
            </div>
          </div>

          {/* Daily list container */}
          <div className="rounded-2xl glass-panel border border-[#00ff00]/10 overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/20 flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white">Detalhamento por Dia da Semana</h4>
              <span className="text-[10px] font-mono text-zinc-500">Jornada Diária Padrão: 8h 00m</span>
            </div>

            <div className="divide-y divide-zinc-900/60">
              {dayBreakdown.map(({ day, punches: dayPunches, workedMs }) => {
                const dayIsToday = isToday(day);
                const dayName = formatDayName(day);
                const dayNameShort = formatDayShort(day);
                
                // Target: 8 hours standard
                const targetMs = 8 * 60 * 60 * 1000;
                const progressPct = Math.min(100, Math.round((workedMs / targetMs) * 100));
                
                // Calculate extra hours or missing hours
                const isOvertime = workedMs > targetMs;
                const extraMs = isOvertime ? workedMs - targetMs : 0;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-4 transition-all ${
                      dayIsToday 
                        ? "bg-[#00ff00]/[0.02] border-l-2 border-l-[#00ff00]" 
                        : "hover:bg-zinc-950/10"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Day description */}
                      <div className="flex items-center space-x-3 min-w-[190px]">
                        <div className={`p-2 rounded-xl text-center font-mono w-12 ${
                          dayIsToday 
                            ? "bg-[#00ff00]/10 text-[#00ff00] border border-[#00ff00]/30 font-bold" 
                            : workedMs > 0 
                              ? "bg-zinc-900/80 text-zinc-300 border border-zinc-800"
                              : "bg-zinc-950/40 text-zinc-600 border border-zinc-900/40"
                        }`}>
                          <p className="text-[10px] uppercase font-bold">{dayName.slice(0, 3)}</p>
                          <p className="text-xs mt-0.5">{dayNameShort}</p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="text-xs font-bold text-white">{dayName}</h5>
                            {dayIsToday && (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff00] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff00]"></span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {dayPunches.length === 0 
                              ? "Nenhuma batida registrada" 
                              : `${dayPunches.length} batida(s) no dia`}
                          </p>
                        </div>
                      </div>

                      {/* Punches chronological sequence */}
                      <div className="flex-grow">
                        {dayPunches.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {dayPunches.map(p => {
                              const timeStr = new Date(p.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-mono border ${
                                    p.type === "entrada"
                                      ? "bg-[#00ff00]/5 border-[#00ff00]/20 text-[#00ff00]"
                                      : p.type === "almoco_saida"
                                        ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-400"
                                        : p.type === "almoco_retorno"
                                          ? "bg-sky-950/30 border-sky-500/20 text-sky-400"
                                          : "bg-purple-950/30 border-purple-500/20 text-purple-400"
                                  }`}
                                  title={`${formatPunchLabel(p.type)} às ${timeStr}`}
                                >
                                  <span className="w-1 h-1 rounded-full bg-current opacity-80"></span>
                                  <span className="font-bold">{timeStr}</span>
                                  <span className="opacity-60">{formatPunchLabel(p.type).split(" ")[0]}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-650 font-mono italic">
                            Sem marcações neste dia.
                          </div>
                        )}
                      </div>

                      {/* Worked hour metrics */}
                      <div className="flex flex-col items-end justify-center min-w-[120px]">
                        <p className={`text-base font-bold font-mono ${workedMs > 0 ? "text-[#00ff00]" : "text-zinc-600"}`}>
                          {formatMsToHoursAndMins(workedMs)}
                        </p>
                        {workedMs > 0 && (
                          <div className="flex items-center space-x-1 mt-0.5">
                            {isOvertime ? (
                              <span className="text-[9px] font-mono text-amber-400 bg-amber-950/35 border border-amber-500/20 px-1 rounded">
                                + {formatMsToHoursAndMins(extraMs)} Extra
                              </span>
                            ) : workedMs < targetMs ? (
                              <span className="text-[9px] font-mono text-zinc-500">
                                Incompleto
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-1 rounded">
                                100% OK
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Simple sleek progress indicator */}
                    {workedMs > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-zinc-950/60 rounded-full h-1 overflow-hidden border border-zinc-900/40">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOvertime ? "bg-amber-400" : "bg-[#00ff00]"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTÓRICO GERAL */}
      {activeTab === "historico" && (
        <div className="rounded-2xl glass-panel border border-[#00ff00]/10 p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center space-x-2">
            <History className="w-5 h-5 text-[#00ff00]" />
            <span>Seu Histórico Completo de Marcações</span>
          </h3>

          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm font-mono animate-pulse">
              Carregando marcações de ponto...
            </div>
          ) : punches.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-xs border border-dashed border-zinc-900 rounded-xl">
              Nenhum ponto registrado neste período. Use o painel de registro para começar!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 text-xs font-mono uppercase">
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Horário</th>
                    <th className="pb-3 font-semibold">Evento</th>
                    <th className="pb-3 font-semibold">Dispositivo</th>
                    <th className="pb-3 font-semibold">Localização</th>
                    <th className="pb-3 font-semibold">Status / Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60 text-xs text-zinc-300">
                  {punches.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-950/20 transition-all">
                      <td className="py-3.5 font-mono">{formatDate(p.timestamp)}</td>
                      <td className="py-3.5 font-mono font-bold text-white text-sm">
                        {formatTime(p.timestamp)}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${getPunchTypeBadgeStyle(p.type)}`}>
                          {formatPunchLabel(p.type)}
                        </span>
                      </td>
                      <td className="py-3.5 font-sans max-w-[150px] truncate text-zinc-400" title={p.device || ""}>
                        {p.device || "Navegador"}
                      </td>
                      <td className="py-3.5 font-mono text-zinc-400">
                        {p.latitude && p.longitude ? (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-[#00ff00]/70" />
                            <span>{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-1.5">
                            {p.status === "approved" && (
                              <span className="text-[#00ff00] flex items-center space-x-1 text-[10px] font-semibold bg-[#00ff00]/10 border border-[#00ff00]/20 px-1.5 py-0.5 rounded">
                                <CheckCircle className="w-3 h-3 text-[#00ff00]" />
                                <span>Aprovado</span>
                              </span>
                            )}
                            {p.status === "pending" && (
                              <span className="text-amber-400 flex items-center space-x-1 text-[10px] font-semibold bg-amber-950/20 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span>Em Análise</span>
                              </span>
                            )}
                            {p.status === "rejected" && (
                              <span className="text-red-400 flex items-center space-x-1 text-[10px] font-semibold bg-red-950/20 border border-red-500/20 px-1.5 py-0.5 rounded">
                                <XCircle className="w-3 h-3 text-red-400" />
                                <span>Rejeitado</span>
                              </span>
                            )}
                          </div>
                          {p.justification && (
                            <p className="text-[10px] text-amber-500/70 font-sans italic max-w-xs truncate" title={p.justification}>
                              Motivo: "{p.justification}"
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
