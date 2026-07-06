export type Role = "admin" | "employee";

export type PunchType = "entrada" | "almoco_saida" | "almoco_retorno" | "saida";

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  created_at?: string;
}

export interface Punch {
  id: number;
  user_id: number;
  type: PunchType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  device: string | null;
  justification: string | null;
  status: "approved" | "pending" | "rejected";
  employee_name?: string; // Included for admin views
  employee_code?: string; // Included for admin views
}

export interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}
