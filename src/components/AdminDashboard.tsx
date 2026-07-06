import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Check, 
  X, 
  Filter, 
  Download, 
  ShieldAlert, 
  FileSpreadsheet, 
  Clock, 
  MapPin, 
  Search,
  CheckCircle,
  AlertCircle,
  Edit
} from "lucide-react";
import { User, Punch } from "../types";

interface AdminDashboardProps {
  user: User;
  token: string;
}

export default function AdminDashboard({ user, token }: AdminDashboardProps) {
  // States for employees
  const [employees, setEmployees] = useState<User[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  
  // Custom Delete confirmation state
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);

  // States for editing punch
  const [editingPunch, setEditingPunch] = useState<Punch | null>(null);
  const [editType, setEditType] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");
  const [editJustification, setEditJustification] = useState<string>("");
  const [editDevice, setEditDevice] = useState<string>("");
  const [editLatitude, setEditLatitude] = useState<string>("");
  const [editLongitude, setEditLongitude] = useState<string>("");

  // States for punch ledger
  const [allPunches, setAllPunches] = useState<Punch[]>([]);
  const [punchLoading, setPunchLoading] = useState(false);

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // New Employee Form States
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"employee" | "admin">("employee");
  
  // Feedback
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load everything on mount
  useEffect(() => {
    loadEmployees();
    loadAllPunches();
  }, []);

  const loadEmployees = async () => {
    setEmpLoading(true);
    try {
      const response = await fetch("/api/admin/employees", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error("Erro ao carregar funcionários:", err);
    } finally {
      setEmpLoading(false);
    }
  };

  const loadAllPunches = async () => {
    setPunchLoading(true);
    try {
      const response = await fetch("/api/admin/punches/all", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllPunches(data);
      }
    } catch (err) {
      console.error("Erro ao carregar registros de ponto:", err);
    } finally {
      setPunchLoading(false);
    }
  };

  // Add new employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim() || !newPassword.trim()) {
      setMessage({ text: "Por favor, preencha todos os campos para cadastrar.", type: "error" });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cadastrar funcionário.");
      }

      setMessage({ text: "Funcionário cadastrado com sucesso!", type: "success" });
      setNewUsername("");
      setNewName("");
      setNewPassword("");
      setNewRole("employee");
      loadEmployees();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete employee (Now uses custom confirmation state to bypass iframe confirm() block)
  const handleDeleteEmployeeClick = (emp: User) => {
    setEmployeeToDelete(emp);
  };

  const executeDeleteEmployee = async (empId: number) => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/employees/${empId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao remover funcionário.");
      }

      setMessage({ text: "Funcionário removido com sucesso.", type: "success" });
      loadEmployees();
      loadAllPunches(); // Reload as punches are cascade-deleted
    } catch (err: any) {
      setMessage({ text: err.message || "Erro ao remover.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Start punch edit session
  const handleStartEditPunch = (p: Punch) => {
    setEditingPunch(p);
    setEditType(p.type);
    setEditStatus(p.status);
    setEditJustification(p.justification || "");
    setEditDevice(p.device || "");
    setEditLatitude(p.latitude !== null && p.latitude !== undefined ? p.latitude.toString() : "");
    setEditLongitude(p.longitude !== null && p.longitude !== undefined ? p.longitude.toString() : "");

    // Split timestamp into local date and time fields
    const d = new Date(p.timestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setEditDate(`${yyyy}-${mm}-${dd}`);

    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    setEditTime(`${hh}:${min}:${ss}`);
  };

  // Save edited punch properties to the SQLite backend
  const handleSaveEditPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPunch) return;

    setActionLoading(true);
    setMessage(null);

    // Reconstruct timestamp from editDate & editTime in local timezone
    const [year, month, day] = editDate.split("-").map(Number);
    const [hour, minute, second] = editTime.split(":").map(Number);
    const localDate = new Date(year, month - 1, day, hour, minute, second || 0);
    const timestampISO = localDate.toISOString();

    try {
      const response = await fetch(`/api/admin/punches/${editingPunch.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: editType,
          timestamp: timestampISO,
          status: editStatus,
          justification: editJustification,
          device: editDevice,
          latitude: editLatitude ? parseFloat(editLatitude) : null,
          longitude: editLongitude ? parseFloat(editLongitude) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar registro de ponto.");
      }

      setMessage({ text: "Registro de ponto atualizado com sucesso!", type: "success" });
      setEditingPunch(null);
      loadAllPunches();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Update punch status (Approve/Reject manual requests)
  const handleUpdatePunchStatus = async (punchId: number, status: "approved" | "rejected") => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/punches/${punchId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar registro.");
      }

      setMessage({ text: `Marcação de ponto alterada com sucesso para: ${status === "approved" ? "Aprovado" : "Rejeitado"}.`, type: "success" });
      loadAllPunches();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro de rede.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export for quick reporting / spreadsheet loading
  const handleExportCSV = () => {
    if (filteredPunches.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    // Build standard CSV
    const headers = "ID Ponto,Matrícula,Nome,Data,Hora,Evento,Dispositivo,Lat,Long,Status,Justificativa\n";
    const rows = filteredPunches.map(p => {
      const dateStr = new Date(p.timestamp).toLocaleDateString("pt-BR");
      const timeStr = new Date(p.timestamp).toLocaleTimeString("pt-BR");
      return `"${p.id}","${p.employee_code || ""}","${p.employee_name || ""}","${dateStr}","${timeStr}","${formatPunchLabel(p.type)}","${p.device || ""}","${p.latitude || ""}","${p.longitude || ""}","${p.status}","${p.justification || ""}"`;
    }).join("\n");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pontos_exportados_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatPunchLabel = (type: string) => {
    switch (type) {
      case "entrada": return "Entrada";
      case "almoco_saida": return "Saída Almoço";
      case "almoco_retorno": return "Retorno Almoço";
      case "saida": return "Saída Final";
      default: return type;
    }
  };

  // Filtering Logic
  const filteredPunches = allPunches.filter(p => {
    const matchSearch = 
      (p.employee_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.employee_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.justification || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = filterType === "all" || p.type === filterType;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;

    return matchSearch && matchType && matchStatus;
  });

  // Calculate quick indicators
  const pendingRequestsCount = allPunches.filter(p => p.status === "pending").length;
  const activeEmployeesCount = employees.filter(e => e.role === "employee").length;

  return (
    <div id="admin-dashboard-root" className="space-y-8 animate-fade-in">
      
      {/* Overview Analytics row (Bento-like layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Registered employees */}
        <div className="p-5 rounded-2xl glass-panel border border-[#00ff00]/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#00ff00]/60 uppercase">Funcionários Ativos</span>
            <h3 className="text-3xl font-extrabold text-white mt-1 font-mono">
              {empLoading ? "..." : activeEmployeesCount}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">Registrados localmente na VM</p>
          </div>
          <div className="p-3 bg-black/30 border border-[#00ff00]/20 rounded-xl">
            <Users className="w-6 h-6 text-[#00ff00]" />
          </div>
        </div>

        {/* Card 2: Pending manual reviews */}
        <div className={`p-5 rounded-2xl glass-panel border flex items-center justify-between transition-all ${
          pendingRequestsCount > 0 
            ? "border-amber-500/30 bg-amber-500/[0.02]" 
            : "border-[#00ff00]/10"
        }`}>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-amber-500/70 uppercase">Pendentes de Aprovação</span>
            <h3 className="text-3xl font-extrabold text-white mt-1 font-mono">
              {punchLoading ? "..." : pendingRequestsCount}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">Ajustes manuais sob auditoria</p>
          </div>
          <div className={`p-3 rounded-xl border ${
            pendingRequestsCount > 0 
              ? "bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse" 
              : "bg-zinc-950/40 border-zinc-800 text-zinc-500"
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Logs */}
        <div className="p-5 rounded-2xl glass-panel border border-[#00ff00]/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#00ff00]/60 uppercase">Total de Batidas</span>
            <h3 className="text-3xl font-extrabold text-white mt-1 font-mono">
              {punchLoading ? "..." : allPunches.length}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">Lançadas no SQLite embarcado</p>
          </div>
          <div className="p-3 bg-black/30 border border-[#00ff00]/20 rounded-xl">
            <Clock className="w-6 h-6 text-[#00ff00]" />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-2.5 text-sm ${
            message.type === "success"
              ? "bg-[#00ff00]/10 border-[#00ff00]/30 text-[#00ff00]"
              : "bg-red-950/20 border-red-500/30 text-red-400"
          }`}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{message.type === "success" ? "Sucesso!" : "Erro"}</p>
            <p className="text-xs mt-0.5 opacity-90">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Create / Register new employees (lg:col-span-4) */}
        <div className="lg:col-span-4 rounded-2xl glass-panel border border-[#00ff00]/10 p-5 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UserPlus className="w-4.5 h-4.5 text-[#00ff00]" />
              <span>Cadastrar Colaborador</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Crie credenciais locais no banco de dados.</p>
          </div>

          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="w-full px-3 py-2 bg-zinc-950/55 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                Matrícula ou Código de Acesso
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Ex: 9876"
                className="w-full px-3 py-2 bg-zinc-950/55 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                Senha Inicial
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ex: 123456"
                className="w-full px-3 py-2 bg-zinc-950/55 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                Perfil de Acesso
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "employee" | "admin")}
                className="w-full px-2 py-2 bg-zinc-950/55 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
              >
                <option value="employee">Funcionário Geral</option>
                <option value="admin">Administrador (Gestão)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 bg-[#00ff00]/15 hover:bg-[#00ff00]/25 border border-[#00ff00]/30 rounded-xl text-[#00ff00] hover:text-white font-bold text-xs tracking-wide transition-all"
            >
              {actionLoading ? "Processando..." : "Gravar no Banco Local"}
            </button>
          </form>

          {/* Quick list of active members */}
          <div className="pt-4 border-t border-zinc-900/80">
            <h4 className="text-xs font-mono uppercase text-zinc-500 mb-3 flex items-center justify-between">
              <span>Equipe Cadastrada ({employees.length})</span>
            </h4>
            
            {empLoading ? (
              <div className="text-xs text-zinc-600 font-mono py-2">Buscando equipe...</div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {employees.map((emp) => (
                  <div key={emp.id} className="p-2.5 rounded-lg bg-zinc-950/30 border border-zinc-900 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-200 truncate max-w-[130px]">{emp.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500">Matrícula: {emp.username}</p>
                    </div>
                    
                    {emp.role === "admin" ? (
                      <span className="text-[9px] font-mono uppercase bg-black/45 border border-[#00ff00]/20 text-[#00ff00] px-1.5 py-0.5 rounded">
                        Gestor
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteEmployeeClick(emp)}
                        className="p-1.5 rounded-md hover:bg-red-950/40 border border-transparent hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Remover Funcionário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Ledger / Punches Audit History (lg:col-span-8) */}
        <div className="lg:col-span-8 rounded-2xl glass-panel border border-[#00ff00]/10 p-5 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-[#00ff00]" />
                  <span>Livro de Registro de Ponto</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Auditoria unificada de todas as batidas e ajustes.</p>
              </div>

              {/* CSV export trigger */}
              <button
                onClick={handleExportCSV}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-[#00ff00]/15 border border-[#00ff00]/30 hover:border-[#00ff00]/60 rounded-lg text-[11px] font-mono font-bold text-[#00ff00] hover:text-white flex items-center space-x-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,255,0,0.05)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Folha (CSV)</span>
              </button>
            </div>

            {/* Filter Panel (Glassmorphism layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-900 mb-5">
              {/* Search bar */}
              <div className="sm:col-span-5 relative">
                <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nome, matrícula, justificativa..."
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-md text-white text-xs focus:outline-none focus:border-[#00ff00]/40 font-sans"
                />
              </div>

              {/* Event Type Filter */}
              <div className="sm:col-span-4 flex items-center space-x-1.5">
                <Filter className="w-3 h-3 text-zinc-600" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full py-1.5 bg-zinc-950 border border-zinc-850 rounded-md text-white text-[11px] focus:outline-none focus:border-[#00ff00]/40 font-mono"
                >
                  <option value="all">Todos Eventos</option>
                  <option value="entrada">Entrada</option>
                  <option value="almoco_saida">Saída Almoço</option>
                  <option value="almoco_retorno">Retorno Almoço</option>
                  <option value="saida">Saída Final</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full py-1.5 bg-zinc-950 border border-zinc-850 rounded-md text-white text-[11px] focus:outline-none focus:border-[#00ff00]/40 font-mono"
                >
                  <option value="all">Todos Status</option>
                  <option value="approved">Aprovados</option>
                  <option value="pending">Solicitações</option>
                  <option value="rejected">Rejeitados</option>
                </select>
              </div>
            </div>

            {/* Ledger list */}
            {punchLoading ? (
              <div className="py-20 text-center font-mono text-zinc-500 text-xs animate-pulse">
                Carregando registros do banco SQL...
              </div>
            ) : filteredPunches.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-900 rounded-xl text-zinc-600 text-xs font-mono">
                Nenhum ponto encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-mono uppercase">
                      <th className="pb-3 font-semibold">Colaborador</th>
                      <th className="pb-3 font-semibold">Data/Hora</th>
                      <th className="pb-3 font-semibold">Evento</th>
                      <th className="pb-3 font-semibold">Dispositivo</th>
                      <th className="pb-3 font-semibold">Localização</th>
                      <th className="pb-3 font-semibold text-right">Ação / Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/50 text-zinc-300">
                    {filteredPunches.map((p) => {
                      const dateStr = new Date(p.timestamp).toLocaleDateString("pt-BR");
                      const timeStr = new Date(p.timestamp).toLocaleTimeString("pt-BR");
                      
                      return (
                        <tr key={p.id} className="hover:bg-zinc-950/25 transition-all">
                          <td className="py-3">
                            <div>
                              <p className="font-bold text-zinc-100">{p.employee_name}</p>
                              <p className="text-[10px] font-mono text-zinc-500">Matrícula: {p.employee_code}</p>
                            </div>
                          </td>
                          <td className="py-3 font-mono">
                            <p className="text-zinc-400">{dateStr}</p>
                            <p className="text-white font-bold text-sm">{timeStr}</p>
                          </td>
                          <td className="py-3">
                            <span className="text-[10px] font-mono uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-zinc-950 border border-[#00ff00]/10 text-[#00ff00]">
                              {formatPunchLabel(p.type)}
                            </span>
                          </td>
                          <td className="py-3 font-sans text-zinc-500 truncate max-w-[120px]" title={p.device || ""}>
                            {p.device || "Navegador"}
                          </td>
                          <td className="py-3 font-mono text-zinc-400">
                            {p.latitude && p.longitude ? (
                              <a 
                                href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center space-x-0.5 hover:text-[#00ff00] transition-all"
                                title="Ver no Google Maps"
                              >
                                <MapPin className="w-3 h-3 text-[#00ff00]" />
                                <span>GPS</span>
                              </a>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {p.status === "pending" ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleStartEditPunch(p)}
                                  className="p-1 px-1.5 rounded hover:bg-zinc-800 border border-transparent hover:border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-mono flex items-center space-x-1 transition-all cursor-pointer"
                                  title="Editar registro de ponto completo"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                                <div className="h-4 w-[1px] bg-zinc-800"></div>
                                <div className="flex items-center space-x-1.5 animate-pulse">
                                  {/* Approve button */}
                                  <button
                                    onClick={() => handleUpdatePunchStatus(p.id, "approved")}
                                    disabled={actionLoading}
                                    className="p-1 px-2.5 rounded bg-black/40 border border-[#00ff00]/30 text-[#00ff00] hover:text-white hover:bg-[#00ff00]/25 text-[10px] font-mono font-bold flex items-center space-x-0.5 transition-all cursor-pointer"
                                    title="Aprovar Ponto"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Deferir</span>
                                  </button>
                                  
                                  {/* Reject button */}
                                  <button
                                    onClick={() => handleUpdatePunchStatus(p.id, "rejected")}
                                    disabled={actionLoading}
                                    className="p-1 px-2 bg-red-950 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-900 text-[10px] font-mono font-bold flex items-center space-x-0.5 transition-all cursor-pointer"
                                    title="Rejeitar Ponto"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Indeferir</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end space-y-1.5">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleStartEditPunch(p)}
                                    className="p-1 px-1.5 rounded hover:bg-zinc-800 border border-transparent hover:border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-mono flex items-center space-x-1 transition-all cursor-pointer"
                                    title="Editar registro de ponto completo"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>Editar</span>
                                  </button>
                                  <div className="h-3 w-[1px] bg-zinc-850"></div>
                                  <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                    p.status === "approved" 
                                      ? "text-[#00ff00] bg-[#00ff00]/10 border border-[#00ff00]/20" 
                                      : "text-red-400 bg-red-950/20 border border-red-500/10"
                                  }`}>
                                    {p.status === "approved" ? "Auditado / OK" : "Indeferido"}
                                  </span>
                                </div>
                                {p.justification && (
                                  <p className="text-[10px] text-zinc-500 max-w-[150px] truncate italic" title={p.justification}>
                                    Justificativa: "{p.justification}"
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
            <span>REGISTRO SEGURO DE DADOS</span>
            <span>PROCESSO LOCAL (SQLITE3) COM ZERO DEPENDÊNCIAS DE NUVEM EXTRAS</span>
          </div>
        </div>
      </div>

      {/* Custom Edit Punch Modal */}
      {editingPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleSaveEditPunch}
            className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-[#00ff00]/20 p-6 space-y-4 shadow-[0_0_30px_rgba(0,255,0,0.1)] overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <Edit className="w-4 h-4 text-[#00ff00]" />
                <span>Editar Registro de Ponto</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingPunch(null)}
                className="text-zinc-500 hover:text-white transition-all text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-3 text-xs">
              <p className="text-zinc-400">Colaborador: <strong className="text-white">{editingPunch.employee_name}</strong></p>
              <p className="text-zinc-500 font-mono text-[10px] mt-0.5">Matrícula: {editingPunch.employee_code}</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                  Data do Evento
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                  Hora do Evento
                </label>
                <input
                  type="time"
                  step="1"
                  required
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
                >
                  <option value="entrada">Entrada</option>
                  <option value="almoco_saida">Saída Almoço</option>
                  <option value="almoco_retorno">Retorno Almoço</option>
                  <option value="saida">Saída Final</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
                >
                  <option value="approved">Aprovado</option>
                  <option value="pending">Solicitação Pendente</option>
                  <option value="rejected">Rejeitado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                Dispositivo / Origem
              </label>
              <input
                type="text"
                value={editDevice}
                onChange={(e) => setEditDevice(e.target.value)}
                placeholder="Ex: Navegador, Ajuste Manual, etc."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={editLatitude}
                  onChange={(e) => setEditLatitude(e.target.value)}
                  placeholder="Ex: -23.5505"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={editLongitude}
                  onChange={(e) => setEditLongitude(e.target.value)}
                  placeholder="Ex: -46.6333"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#00ff00]/70 mb-1">
                Justificativa / Motivo do Ajuste
              </label>
              <textarea
                value={editJustification}
                onChange={(e) => setEditJustification(e.target.value)}
                placeholder="Insira detalhes sobre este ajuste ou a justificativa original."
                rows={2}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white text-xs focus:outline-none focus:border-[#00ff00]/50"
              />
            </div>

            <div className="flex space-x-2.5 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setEditingPunch(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#00ff00]/15 hover:bg-[#00ff00]/25 border border-[#00ff00]/30 text-[#00ff00] hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                {actionLoading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-red-500/30 p-6 space-y-5 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-scale-up">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-3">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Excluir Colaborador</h3>
              <p className="text-xs text-zinc-400 mt-2 font-sans">
                Tem certeza de que deseja remover <strong className="text-zinc-200">{employeeToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-red-400/80 mt-1.5 font-mono">
                Todos os pontos registrados serão excluídos permanentemente do SQLite!
              </p>
            </div>
            <div className="flex space-x-2.5">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = employeeToDelete.id;
                  setEmployeeToDelete(null);
                  executeDeleteEmployee(id);
                }}
                className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
