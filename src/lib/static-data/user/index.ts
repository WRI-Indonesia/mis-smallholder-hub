import Papa from "papaparse";
import userCsv from "./user.csv";

export type UserRole = "SUPERADMIN" | "ADMIN_KOPERASI" | "FIELD_OFFICER" | "STAKEHOLDER";

export type UserType = {
  id: string;
  name: string;
  email: string;
  password?: string; // in a real app, this would be hashed
  role: UserRole;
  institutionId?: string;
  isActive: boolean;
};

// Parse raw CSV
const rawUsers = Papa.parse(userCsv, { header: true, skipEmptyLines: true }).data as Record<string, string>[];

// Transform string values to correct types
export const usersData: UserType[] = rawUsers.map((row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password: row.password,
  role: row.role as UserRole,
  institutionId: row.institutionId || undefined,
  isActive: row.isActive === "true",
}));
