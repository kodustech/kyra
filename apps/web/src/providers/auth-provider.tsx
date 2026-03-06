import type { AuthUser } from "@kyra/shared";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, removeToken, setToken } from "@/lib/api";

interface AuthContextValue {
	user: AuthUser | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<void>;
	setup: (data: { name: string; email: string; password: string; color: string }) => Promise<void>;
	register: (data: { name: string; email: string; password: string; color: string }) => Promise<void>;
	logout: () => void;
	updateUser: (user: AuthUser) => void;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const token = getToken();
		if (!token) {
			setLoading(false);
			return;
		}

		api
			.get<AuthUser>("/auth/me")
			.then(setUser)
			.catch(() => {
				removeToken();
			})
			.finally(() => setLoading(false));
	}, []);

	const login = useCallback(async (email: string, password: string) => {
		const res = await api.post<{ user: AuthUser; token: string }>("/auth/login", {
			email,
			password,
		});
		setToken(res.token);
		setUser(res.user);
	}, []);

	const setup = useCallback(
		async (data: { name: string; email: string; password: string; color: string }) => {
			const res = await api.post<{ user: AuthUser; token: string }>("/auth/setup", data);
			setToken(res.token);
			setUser(res.user);
		},
		[],
	);

	const register = useCallback(
		async (data: { name: string; email: string; password: string; color: string }) => {
			const res = await api.post<{ user: AuthUser; token: string }>("/auth/register", data);
			setToken(res.token);
			setUser(res.user);
		},
		[],
	);

	const refreshUser = useCallback(async () => {
		const updated = await api.get<AuthUser>("/auth/me");
		setUser(updated);
	}, []);

	const logout = useCallback(() => {
		removeToken();
		setUser(null);
		window.location.href = "/login";
	}, []);

	const updateUser = useCallback((updated: AuthUser) => {
		setUser(updated);
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, setup, register, logout, updateUser, refreshUser }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
