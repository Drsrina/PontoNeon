import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./src/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "pontoneon_super_neon_secret_key_2026";

app.use(express.json());

// Initialize database
async function initDb() {
  // Enable foreign keys
  await db.run("PRAGMA foreign_keys = ON;");

  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Punches table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS punches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'entrada' | 'almoco_saida' | 'almoco_retorno' | 'saida'
      timestamp TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      device TEXT,
      justification TEXT,
      status TEXT NOT NULL DEFAULT 'approved', -- 'approved' | 'pending' | 'rejected'
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default users if none exist
  const userCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM users;");
  if (userCount && userCount.count === 0) {
    console.log("Seeding default database records...");
    
    // Default Admin (admin/admin)
    const adminHash = await bcrypt.hash("admin", 10);
    await db.run(
      "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?);",
      ["admin", adminHash, "Administrador Geral", "admin"]
    );

    // Default Employee (1234/1234)
    const employeeHash = await bcrypt.hash("1234", 10);
    await db.run(
      "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?);",
      ["1234", employeeHash, "João Silva (Desenvolvedor)", "employee"]
    );

    // Default Employee 2 (5678/5678)
    const employee2Hash = await bcrypt.hash("5678", 10);
    await db.run(
      "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?);",
      ["5678", employee2Hash, "Maria Oliveira (Design)", "employee"]
    );

    console.log("Default admin (admin/admin) and employees seeded!");
  }
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação não fornecido." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Sessão expirada ou token inválido." });
    }
    req.user = user;
    next();
  });
}

// Admin checking middleware
function requireAdmin(req: any, res: any, next: any) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acesso restrito a administradores." });
  }
}

// --- API ROUTES ---

// Login Endpoint
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }

  try {
    const user = await db.get<any>("SELECT * FROM users WHERE username = ?;", [username.trim()]);
    if (!user) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Get self info
app.get("/api/users/me", authenticateToken, async (req: any, res) => {
  try {
    const user = await db.get<any>("SELECT id, username, name, role FROM users WHERE id = ?;", [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- ADMIN ENDPOINTS ---

// Register employee
app.post("/api/admin/employees", authenticateToken, requireAdmin, async (req: any, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: "Todos os campos (usuário, senha, nome) são obrigatórios." });
  }

  try {
    // Check if username exists
    const existing = await db.get("SELECT id FROM users WHERE username = ?;", [username.trim()]);
    if (existing) {
      return res.status(400).json({ error: "Este código de usuário já está em uso." });
    }

    const hash = await bcrypt.hash(password, 10);
    const userRole = role === "admin" ? "admin" : "employee";

    const result = await db.run(
      "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?);",
      [username.trim(), hash, name.trim(), userRole]
    );

    res.status(201).json({
      message: "Funcionário cadastrado com sucesso!",
      id: result.lastID,
      employee: {
        username: username.trim(),
        name: name.trim(),
        role: userRole,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao cadastrar funcionário." });
  }
});

// List all employees
app.get("/api/admin/employees", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const employees = await db.all(
      "SELECT id, username, name, role, created_at FROM users ORDER BY name ASC;"
    );
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar funcionários." });
  }
});

// Delete employee
app.delete("/api/admin/employees/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  const employeeId = req.params.id;

  if (parseInt(employeeId) === req.user.id) {
    return res.status(400).json({ error: "Você não pode excluir sua própria conta de administrador." });
  }

  try {
    await db.run("DELETE FROM users WHERE id = ?;", [employeeId]);
    res.json({ message: "Funcionário excluído com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir funcionário." });
  }
});

// List all punches for report
app.get("/api/admin/punches/all", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const punches = await db.all(`
      SELECT p.*, u.name as employee_name, u.username as employee_code 
      FROM punches p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.timestamp DESC;
    `);
    res.json(punches);
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar todos os registros de ponto." });
  }
});

// Update punch status (approve/reject manual punch request)
app.put("/api/admin/punches/:id/status", authenticateToken, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status inválido. Deve ser 'approved' ou 'rejected'." });
  }

  try {
    const result = await db.run(
      "UPDATE punches SET status = ? WHERE id = ?;",
      [status, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Ponto não encontrado." });
    }

    res.json({ message: `Status do ponto alterado para ${status}.` });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar status do ponto." });
  }
});

// Update/Edit any punch record fully (for actual editing from Admin Dashboard)
app.put("/api/admin/punches/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { type, timestamp, status, justification, latitude, longitude, device } = req.body;

  if (type && !["entrada", "almoco_saida", "almoco_retorno", "saida"].includes(type)) {
    return res.status(400).json({ error: "Tipo de marcação de ponto inválido." });
  }

  if (status && !["approved", "pending", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status inválido. Deve ser 'approved', 'pending' ou 'rejected'." });
  }

  try {
    const existing = await db.get("SELECT id FROM punches WHERE id = ?;", [id]);
    if (!existing) {
      return res.status(404).json({ error: "Ponto não encontrado." });
    }

    await db.run(
      `UPDATE punches 
       SET type = ?,
           timestamp = ?,
           status = ?,
           justification = ?,
           latitude = ?,
           longitude = ?,
           device = ?
       WHERE id = ?;`,
      [
        type, 
        timestamp, 
        status, 
        justification || null,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        device || null,
        id
      ]
    );

    res.json({ message: "Ponto atualizado com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar registro de ponto." });
  }
});


// --- EMPLOYEE ENDPOINTS ---

// Get current user's punches
app.get("/api/punches/my", authenticateToken, async (req: any, res) => {
  try {
    const punches = await db.all(
      "SELECT * FROM punches WHERE user_id = ? ORDER BY timestamp DESC;",
      [req.user.id]
    );
    res.json(punches);
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar seus pontos." });
  }
});

// Record new standard punch
app.post("/api/punches", authenticateToken, async (req: any, res) => {
  const { type, latitude, longitude, device } = req.body;

  if (!["entrada", "almoco_saida", "almoco_retorno", "saida"].includes(type)) {
    return res.status(400).json({ error: "Tipo de marcação de ponto inválido." });
  }

  try {
    const timestamp = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO punches (user_id, type, timestamp, latitude, longitude, device, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'approved');`,
      [req.user.id, type, timestamp, latitude || null, longitude || null, device || "Navegador", "approved"]
    );

    const inserted = await db.get("SELECT * FROM punches WHERE id = ?;", [result.lastID]);

    res.status(201).json({
      message: "Ponto registrado com sucesso!",
      punch: inserted,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao registrar o ponto." });
  }
});

// Request manual punch correction
app.post("/api/punches/manual", authenticateToken, async (req: any, res) => {
  const { type, timestamp, justification, device } = req.body;

  if (!["entrada", "almoco_saida", "almoco_retorno", "saida"].includes(type)) {
    return res.status(400).json({ error: "Tipo de marcação de ponto inválido." });
  }

  if (!timestamp || !justification || justification.trim().length < 5) {
    return res.status(400).json({ 
      error: "Data/hora e justificativa (mínimo de 5 caracteres) são obrigatórias para solicitações manuais." 
    });
  }

  try {
    const result = await db.run(
      `INSERT INTO punches (user_id, type, timestamp, latitude, longitude, device, justification, status) 
       VALUES (?, ?, ?, null, null, ?, ?, 'pending');`,
      [req.user.id, type, timestamp, device || "Ajuste Manual", justification.trim()]
    );

    const inserted = await db.get("SELECT * FROM punches WHERE id = ?;", [result.lastID]);

    res.status(201).json({
      message: "Solicitação de ponto enviada para aprovação do administrador!",
      punch: inserted,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao registrar solicitação de ponto manual." });
  }
});


// Start application and configure Vite/Static serve
async function start() {
  await initDb();
  console.log("SQLite Database initialized successfully.");

  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite server in dev
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
