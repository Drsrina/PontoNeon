import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_FILE = path.join(process.cwd(), "database.json");

interface User {
  id: number;
  username: string;
  passwordHash: string; // Map of password hash
  name: string;
  role: "employee" | "admin";
  created_at: string;
}

interface Punch {
  id: number;
  user_id: number;
  type: "entrada" | "almoco_saida" | "almoco_retorno" | "saida";
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  device: string;
  justification?: string;
  status: "approved" | "pending" | "rejected";
}

interface Schema {
  users: User[];
  punches: Punch[];
}

class JsonDatabase {
  private data: Schema = { users: [], punches: [] };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        // Ensure structure is correct
        if (!this.data.users) this.data.users = [];
        if (!this.data.punches) this.data.punches = [];
      } else {
        this.save();
      }
    } catch (error) {
      console.error("Error loading JSON database, resetting:", error);
      this.data = { users: [], punches: [] };
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (error) {
      console.error("Error saving JSON database:", error);
    }
  }

  // Mimic sqlite .exec()
  async exec(sql: string): Promise<void> {
    // Schema creation is handled automatically, no-op
    return;
  }

  // Mimic sqlite .run()
  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    this.load();
    const query = sql.toLowerCase().trim();

    if (query.includes("insert into users")) {
      // params: [username, password, name, role]
      const [username, passwordHash, name, role] = params;
      const nextId = this.data.users.length > 0 ? Math.max(...this.data.users.map(u => u.id)) + 1 : 1;
      const newUser: User = {
        id: nextId,
        username,
        passwordHash,
        name,
        role: role as "employee" | "admin",
        created_at: new Date().toISOString(),
      };
      this.data.users.push(newUser);
      this.save();
      return { lastID: nextId, changes: 1 };
    }

    if (query.includes("insert into punches")) {
      // params: [user_id, type, timestamp, latitude, longitude, device, status] or [user_id, type, timestamp, device, justification]
      // We can inspect parameters or query structure to parse correctly.
      let user_id: number;
      let type: any;
      let timestamp: string;
      let latitude: number | null = null;
      let longitude: number | null = null;
      let device: string;
      let justification: string | undefined = undefined;
      let status: any = "approved";

      if (params.length === 7) {
        [user_id, type, timestamp, latitude, longitude, device, status] = params;
      } else if (params.length === 5) {
        // [user_id, type, timestamp, device, justification] with default 'pending' status
        [user_id, type, timestamp, device, justification] = params;
        status = "pending";
      } else {
        // Fallback or debug
        [user_id, type, timestamp, latitude, longitude, device, justification, status] = params;
      }

      const nextId = this.data.punches.length > 0 ? Math.max(...this.data.punches.map(p => p.id)) + 1 : 1;
      const newPunch: Punch = {
        id: nextId,
        user_id: Number(user_id),
        type,
        timestamp,
        latitude: latitude !== undefined ? latitude : null,
        longitude: longitude !== undefined ? longitude : null,
        device,
        justification,
        status: status || "approved",
      };
      this.data.punches.push(newPunch);
      this.save();
      return { lastID: nextId, changes: 1 };
    }

    if (query.includes("delete from users")) {
      // params: [id]
      const id = Number(params[0]);
      const initialLength = this.data.users.length;
      this.data.users = this.data.users.filter(u => u.id !== id);
      // Cascade delete punches
      this.data.punches = this.data.punches.filter(p => p.user_id !== id);
      this.save();
      return { changes: initialLength - this.data.users.length };
    }

    if (query.includes("update punches set status")) {
      // params: [status, id]
      const [status, id] = params;
      const punch = this.data.punches.find(p => p.id === Number(id));
      if (punch) {
        punch.status = status;
        this.save();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (query.includes("pragma foreign_keys")) {
      return { changes: 0 };
    }

    console.warn("Unmatched JSON db run query:", sql, params);
    return { changes: 0 };
  }

  // Mimic sqlite .get()
  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    this.load();
    const query = sql.toLowerCase().trim();

    if (query.includes("select count(*)")) {
      return { count: this.data.users.length } as unknown as T;
    }

    if (query.includes("select * from users where username =")) {
      const username = String(params[0]).trim().toLowerCase();
      const user = this.data.users.find(u => u.username.toLowerCase() === username);
      if (!user) return undefined;
      return {
        id: user.id,
        username: user.username,
        password: user.passwordHash, // Maps back to SQL column password
        name: user.name,
        role: user.role,
        created_at: user.created_at,
      } as unknown as T;
    }

    if (query.includes("select id, username, name, role from users where id =")) {
      const id = Number(params[0]);
      const user = this.data.users.find(u => u.id === id);
      if (!user) return undefined;
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      } as unknown as T;
    }

    if (query.includes("select id from users where username =")) {
      const username = String(params[0]).trim().toLowerCase();
      const user = this.data.users.find(u => u.username.toLowerCase() === username);
      if (!user) return undefined;
      return { id: user.id } as unknown as T;
    }

    if (query.includes("select * from punches where id =")) {
      const id = Number(params[0]);
      const punch = this.data.punches.find(p => p.id === id);
      return punch as unknown as T;
    }

    console.warn("Unmatched JSON db get query:", sql, params);
    return undefined;
  }

  // Mimic sqlite .all()
  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    this.load();
    const query = sql.toLowerCase().trim();

    if (query.includes("select id, username, name, role, created_at from users")) {
      // Sort users by name ascending
      const sortedUsers = [...this.data.users].sort((a, b) => a.name.localeCompare(b.name));
      return sortedUsers.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        created_at: u.created_at,
      })) as unknown as T[];
    }

    if (query.includes("select p.*, u.name as employee_name, u.username as employee_code")) {
      // Join punches and users, ordered by timestamp desc
      const joined = this.data.punches.map(p => {
        const u = this.data.users.find(user => user.id === p.user_id);
        return {
          ...p,
          employee_name: u ? u.name : "Desconhecido",
          employee_code: u ? u.username : "0000",
        };
      });
      // Order by timestamp desc
      joined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return joined as unknown as T[];
    }

    if (query.includes("select * from punches where user_id =")) {
      const userId = Number(params[0]);
      const userPunches = this.data.punches.filter(p => p.user_id === userId);
      // Order by timestamp desc
      userPunches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return userPunches as unknown as T[];
    }

    console.warn("Unmatched JSON db all query:", sql, params);
    return [];
  }
}

export const db = new JsonDatabase();
