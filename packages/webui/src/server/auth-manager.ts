import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "disabled";

export interface AndyUser {
	id: string;
	username: string;
	displayName: string;
	passwordHash: string;
	salt: string;
	role: UserRole;
	status: UserStatus;
	createdAt: number;
	lastLoginAt?: number;
	mustChangePassword?: boolean;
}

export interface AndyUserPublic {
	id: string;
	username: string;
	displayName: string;
	role: UserRole;
	status: UserStatus;
	createdAt: number;
	lastLoginAt?: number;
	mustChangePassword?: boolean;
}

export interface UserSession {
	token: string;
	userId: string;
	username: string;
	role: UserRole;
	createdAt: number;
	expiresAt: number;
}

interface StoredUsersFile {
	version: number;
	users: AndyUser[];
	sessions: UserSession[];
}

export class AuthManager {
	private filePath: string;
	private users = new Map<string, AndyUser>();
	private sessions = new Map<string, UserSession>();

	constructor(storageDir?: string) {
		const baseDir =
			storageDir ||
			(existsSync(path.join(os.homedir(), ".andy", "agent"))
				? path.join(os.homedir(), ".andy", "agent")
				: existsSync(path.join(os.homedir(), ".prime", "agent"))
					? path.join(os.homedir(), ".prime", "agent")
					: path.join(os.homedir(), ".andy", "agent"));

		this.filePath = path.join(baseDir, "users.json");
		this.loadData();
	}

	private loadData(): void {
		if (existsSync(this.filePath)) {
			try {
				const raw = readFileSync(this.filePath, "utf-8");
				const data = JSON.parse(raw) as StoredUsersFile;
				if (Array.isArray(data.users)) {
					for (const u of data.users) {
						this.users.set(u.id, u);
					}
				}
				if (Array.isArray(data.sessions)) {
					const now = Date.now();
					for (const s of data.sessions) {
						if (s.expiresAt > now) {
							this.sessions.set(s.token, s);
						}
					}
				}
			} catch (err) {
				console.warn("[AuthManager] Warning loading users.json:", err);
			}
		}

		// Bootstrap initial admin if no users exist
		if (this.users.size === 0) {
			this.bootstrapInitialAdmin();
		}
	}

	private saveData(): void {
		try {
			const dir = path.dirname(this.filePath);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			const now = Date.now();
			// Purge expired sessions
			for (const [token, s] of this.sessions.entries()) {
				if (s.expiresAt <= now) {
					this.sessions.delete(token);
				}
			}
			const data: StoredUsersFile = {
				version: 1,
				users: Array.from(this.users.values()),
				sessions: Array.from(this.sessions.values()),
			};
			writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
		} catch (err) {
			console.error("[AuthManager] Failed to persist users.json:", err);
		}
	}

	private hashPassword(password: string, salt: string): string {
		return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
	}

	private toPublicUser(user: AndyUser): AndyUserPublic {
		return {
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			role: user.role,
			status: user.status,
			createdAt: user.createdAt,
			lastLoginAt: user.lastLoginAt,
			mustChangePassword: user.mustChangePassword,
		};
	}

	public bootstrapInitialAdmin(): AndyUser {
		const salt = crypto.randomBytes(16).toString("hex");
		const passwordHash = this.hashPassword("admin", salt);
		const initialAdmin: AndyUser = {
			id: `usr_${crypto.randomBytes(6).toString("hex")}`,
			username: "admin",
			displayName: "Administrador",
			passwordHash,
			salt,
			role: "admin",
			status: "active",
			createdAt: Date.now(),
			mustChangePassword: false,
		};

		this.users.set(initialAdmin.id, initialAdmin);
		this.saveData();
		return initialAdmin;
	}

	public findByUsername(username: string): AndyUser | undefined {
		const clean = username.trim().toLowerCase();
		for (const u of this.users.values()) {
			if (u.username.toLowerCase() === clean) {
				return u;
			}
		}
		return undefined;
	}

	public findById(userId: string): AndyUser | undefined {
		return this.users.get(userId);
	}

	public login(
		username: string,
		password: string,
		rememberMe = false,
	): { success: boolean; token?: string; user?: AndyUserPublic; error?: string } {
		const user = this.findByUsername(username);
		if (!user) {
			return { success: false, error: "Usuario o contraseña incorrectos." };
		}

		if (user.status !== "active") {
			return { success: false, error: "Esta cuenta de usuario ha sido desactivada." };
		}

		const incomingHash = this.hashPassword(password, user.salt);
		if (incomingHash !== user.passwordHash) {
			return { success: false, error: "Usuario o contraseña incorrectos." };
		}

		user.lastLoginAt = Date.now();

		// Session duration: 30 days if rememberMe, else 7 days
		const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
		const token = `andy_sess_${crypto.randomBytes(32).toString("hex")}`;
		const session: UserSession = {
			token,
			userId: user.id,
			username: user.username,
			role: user.role,
			createdAt: Date.now(),
			expiresAt: Date.now() + durationMs,
		};

		this.sessions.set(token, session);
		this.saveData();

		return {
			success: true,
			token,
			user: this.toPublicUser(user),
		};
	}

	public logout(token: string): boolean {
		const deleted = this.sessions.delete(token);
		if (deleted) {
			this.saveData();
		}
		return deleted;
	}

	public validateSession(token: string): { valid: boolean; session?: UserSession; user?: AndyUserPublic } {
		if (!token) return { valid: false };

		const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
		const session = this.sessions.get(cleanToken);
		if (!session) return { valid: false };

		if (Date.now() > session.expiresAt) {
			this.sessions.delete(cleanToken);
			this.saveData();
			return { valid: false };
		}

		const user = this.users.get(session.userId);
		if (!user || user.status !== "active") {
			this.sessions.delete(cleanToken);
			this.saveData();
			return { valid: false };
		}

		return {
			valid: true,
			session,
			user: this.toPublicUser(user),
		};
	}

	public changePassword(
		userId: string,
		oldPassword: string,
		newPassword: string,
	): { success: boolean; error?: string } {
		const user = this.users.get(userId);
		if (!user) {
			return { success: false, error: "Usuario no encontrado." };
		}

		const currentHash = this.hashPassword(oldPassword, user.salt);
		if (currentHash !== user.passwordHash) {
			return { success: false, error: "La contraseña actual es incorrecta." };
		}

		if (!newPassword || newPassword.length < 4) {
			return { success: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
		}

		const newSalt = crypto.randomBytes(16).toString("hex");
		user.salt = newSalt;
		user.passwordHash = this.hashPassword(newPassword, newSalt);
		user.mustChangePassword = false;
		this.saveData();

		return { success: true };
	}

	public adminResetPassword(
		adminUserId: string,
		targetUserId: string,
		newPassword: string,
	): { success: boolean; error?: string } {
		const admin = this.users.get(adminUserId);
		if (!admin || admin.role !== "admin") {
			return { success: false, error: "Permiso denegado. Solo administradores pueden restablecer contraseñas." };
		}

		const target = this.users.get(targetUserId);
		if (!target) {
			return { success: false, error: "Usuario no encontrado." };
		}

		if (!newPassword || newPassword.length < 4) {
			return { success: false, error: "La contraseña debe tener al menos 4 caracteres." };
		}

		const newSalt = crypto.randomBytes(16).toString("hex");
		target.salt = newSalt;
		target.passwordHash = this.hashPassword(newPassword, newSalt);
		this.saveData();

		return { success: true };
	}

	public listUsers(requestingUserId: string): AndyUserPublic[] {
		const reqUser = this.users.get(requestingUserId);
		if (!reqUser || reqUser.role !== "admin") {
			throw new Error("Permiso denegado. Solo administradores pueden ver la lista de usuarios.");
		}

		return Array.from(this.users.values())
			.map((u) => this.toPublicUser(u))
			.sort((a, b) => a.createdAt - b.createdAt);
	}

	public createUser(
		adminUserId: string,
		data: {
			username: string;
			displayName?: string;
			password: string;
			role?: UserRole;
		},
	): { success: boolean; user?: AndyUserPublic; error?: string } {
		const admin = this.users.get(adminUserId);
		if (!admin || admin.role !== "admin") {
			return { success: false, error: "Permiso denegado. Solo administradores pueden crear usuarios." };
		}

		const username = (data.username || "").trim().toLowerCase();
		if (!username || username.length < 3) {
			return { success: false, error: "El nombre de usuario debe tener al menos 3 caracteres." };
		}

		if (this.findByUsername(username)) {
			return { success: false, error: `El usuario "${username}" ya existe.` };
		}

		if (!data.password || data.password.length < 4) {
			return { success: false, error: "La contraseña debe tener al menos 4 caracteres." };
		}

		const salt = crypto.randomBytes(16).toString("hex");
		const passwordHash = this.hashPassword(data.password, salt);
		const newUser: AndyUser = {
			id: `usr_${crypto.randomBytes(6).toString("hex")}`,
			username,
			displayName: (data.displayName || "").trim() || username,
			passwordHash,
			salt,
			role: data.role === "admin" ? "admin" : "user",
			status: "active",
			createdAt: Date.now(),
			mustChangePassword: false,
		};

		this.users.set(newUser.id, newUser);
		this.saveData();

		return {
			success: true,
			user: this.toPublicUser(newUser),
		};
	}

	public updateUser(
		adminUserId: string,
		targetUserId: string,
		data: {
			displayName?: string;
			role?: UserRole;
			status?: UserStatus;
		},
	): { success: boolean; user?: AndyUserPublic; error?: string } {
		const admin = this.users.get(adminUserId);
		if (!admin || admin.role !== "admin") {
			return { success: false, error: "Permiso denegado." };
		}

		const target = this.users.get(targetUserId);
		if (!target) {
			return { success: false, error: "Usuario no encontrado." };
		}

		if (target.id === admin.id && data.status === "disabled") {
			return { success: false, error: "No puedes desactivar tu propia cuenta de administrador." };
		}

		if (data.displayName !== undefined) {
			target.displayName = data.displayName.trim() || target.username;
		}
		if (data.role !== undefined) {
			target.role = data.role === "admin" ? "admin" : "user";
		}
		if (data.status !== undefined) {
			target.status = data.status === "disabled" ? "disabled" : "active";
		}

		this.saveData();
		return { success: true, user: this.toPublicUser(target) };
	}

	public deleteUser(adminUserId: string, targetUserId: string): { success: boolean; error?: string } {
		const admin = this.users.get(adminUserId);
		if (!admin || admin.role !== "admin") {
			return { success: false, error: "Permiso denegado." };
		}

		if (targetUserId === admin.id) {
			return { success: false, error: "No puedes eliminar tu propia cuenta de administrador." };
		}

		const target = this.users.get(targetUserId);
		if (!target) {
			return { success: false, error: "Usuario no encontrado." };
		}

		// Revoke any active sessions for target user
		for (const [token, s] of this.sessions.entries()) {
			if (s.userId === targetUserId) {
				this.sessions.delete(token);
			}
		}

		this.users.delete(targetUserId);
		this.saveData();
		return { success: true };
	}

	public getTotalUsersCount(): number {
		return this.users.size;
	}
}
