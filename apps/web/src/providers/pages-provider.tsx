import { api } from "@/lib/api";
import type { CreatePageInput, Page, UpdatePageInput } from "@kyra/shared";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

interface PagesContextValue {
	pages: Page[];
	loading: boolean;
	refetch: () => Promise<void>;
	create: (input: CreatePageInput) => Promise<Page>;
	update: (id: string, input: UpdatePageInput) => Promise<Page>;
	remove: (id: string) => Promise<void>;
	reorder: (pageIds: string[]) => Promise<void>;
}

const PagesContext = createContext<PagesContextValue | undefined>(undefined);

export function PagesProvider({ children }: { children: ReactNode }) {
	const [pages, setPages] = useState<Page[]>([]);
	const [loading, setLoading] = useState(true);

	const refetch = useCallback(async () => {
		try {
			const data = await api.get<Page[]>("/pages");
			setPages(data);
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refetch();
	}, [refetch]);

	const create = async (input: CreatePageInput) => {
		const page = await api.post<Page>("/pages", input);
		setPages((prev) => [...prev, page]);
		return page;
	};

	const update = async (id: string, input: UpdatePageInput) => {
		const page = await api.patch<Page>(`/pages/${id}`, input);
		setPages((prev) => prev.map((p) => (p.id === id ? page : p)));
		return page;
	};

	const remove = async (id: string) => {
		await api.delete(`/pages/${id}`);
		setPages((prev) => prev.filter((p) => p.id !== id));
	};

	const reorder = async (pageIds: string[]) => {
		await api.put("/pages/reorder", { pageIds });
		setPages((prev) => {
			const map = new Map(prev.map((p) => [p.id, p]));
			return pageIds
				.map((id, i) => {
					const p = map.get(id);
					return p ? { ...p, position: i } : undefined;
				})
				.filter(Boolean) as Page[];
		});
	};

	return (
		<PagesContext.Provider value={{ pages, loading, refetch, create, update, remove, reorder }}>
			{children}
		</PagesContext.Provider>
	);
}

export function usePages() {
	const context = useContext(PagesContext);
	if (!context) {
		throw new Error("usePages must be used within a PagesProvider");
	}
	return context;
}
