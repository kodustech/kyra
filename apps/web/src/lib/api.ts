const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		headers: { "Content-Type": "application/json", ...init?.headers },
		...init,
	});

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
