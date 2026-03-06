import { api } from "@/lib/api";

export interface UserInfo {
	id: string;
	name: string;
	color: string;
}

let cachedUsers: UserInfo[] | null = null;
let fetchPromise: Promise<UserInfo[]> | null = null;

export function fetchUsers(): Promise<UserInfo[]> {
	if (cachedUsers) return Promise.resolve(cachedUsers);
	if (fetchPromise) return fetchPromise;
	fetchPromise = api.get<UserInfo[]>("/auth/users/list").then((data) => {
		cachedUsers = data;
		fetchPromise = null;
		return data;
	});
	return fetchPromise;
}

export function invalidateUsersCache() {
	cachedUsers = null;
	fetchPromise = null;
}
