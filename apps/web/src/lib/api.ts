const BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "kyra:auth-token";

export function getToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
	localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const token = getToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(init?.headers as Record<string, string>),
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const res = await fetch(`${BASE}${path}`, { ...init, headers });

	if (res.status === 401) {
		removeToken();
		if (window.location.pathname !== "/login" && window.location.pathname !== "/setup") {
			window.location.href = "/login";
		}
		throw new Error("Unauthorized");
	}

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(body.error || `Request failed: ${res.status}`);
	}

	return res.json() as Promise<T>;
}

export const api = {
	get: <T>(path: string) => request<T>(path),

	post: <T>(path: string, data: unknown) =>
		request<T>(path, { method: "POST", body: JSON.stringify(data) }),

	patch: <T>(path: string, data: unknown) =>
		request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),

	put: <T>(path: string, data: unknown) =>
		request<T>(path, { method: "PUT", body: JSON.stringify(data) }),

	delete: <T = { ok: boolean }>(path: string) => request<T>(path, { method: "DELETE" }),
};
