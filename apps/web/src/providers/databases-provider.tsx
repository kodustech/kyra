import { api } from "@/lib/api";
import type { CreateDatabaseInput, Database, UpdateDatabaseInput } from "@kyra/shared";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

interface DatabasesContextValue {
	databases: Database[];
	loading: boolean;
	refetch: () => Promise<void>;
	create: (input: CreateDatabaseInput) => Promise<Database>;
	update: (id: string, input: UpdateDatabaseInput) => Promise<Database>;
	remove: (id: string) => Promise<void>;
}

const DatabasesContext = createContext<DatabasesContextValue | undefined>(undefined);

export function DatabasesProvider({ children }: { children: ReactNode }) {
	const [databases, setDatabases] = useState<Database[]>([]);
	const [loading, setLoading] = useState(true);

	const refetch = useCallback(async () => {
		try {
			const data = await api.get<Database[]>("/databases");
			setDatabases(data);
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refetch();
	}, [refetch]);

	const create = async (input: CreateDatabaseInput) => {
		const db = await api.post<Database>("/databases", input);
		setDatabases((prev) => [db, ...prev]);
		return db;
	};

	const update = async (id: string, input: UpdateDatabaseInput) => {
		const db = await api.patch<Database>(`/databases/${id}`, input);
		setDatabases((prev) => prev.map((d) => (d.id === id ? db : d)));
		return db;
	};

	const remove = async (id: string) => {
		await api.delete(`/databases/${id}`);
		setDatabases((prev) => prev.filter((d) => d.id !== id));
	};

	return (
		<DatabasesContext.Provider value={{ databases, loading, refetch, create, update, remove }}>
			{children}
		</DatabasesContext.Provider>
	);
}

export function useDatabases() {
	const context = useContext(DatabasesContext);
	if (!context) {
		throw new Error("useDatabases must be used within a DatabasesProvider");
	}
	return context;
}
