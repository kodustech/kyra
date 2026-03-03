import { api } from "@/lib/api";
import type { Record as DbRecord } from "@kyra/shared";
import { useCallback, useEffect, useState } from "react";

interface PaginatedRecords {
	data: DbRecord[];
	total: number | null;
	page: number;
	limit: number;
}

export function useRecords(databaseId: string) {
	const [records, setRecords] = useState<DbRecord[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);

	const fetch = useCallback(
		async (p = 1) => {
			try {
				const res = await api.get<PaginatedRecords>(
					`/databases/${databaseId}/records?page=${p}&limit=50`,
				);
				setRecords(res.data);
				setTotal(res.total ?? 0);
				setPage(res.page);
			} catch {
				// silently fail
			} finally {
				setLoading(false);
			}
		},
		[databaseId],
	);

	useEffect(() => {
		fetch();
	}, [fetch]);

	const create = async (data: { [fieldId: string]: unknown }) => {
		const record = await api.post<DbRecord>(`/databases/${databaseId}/records`, { data });
		setRecords((prev) => [record, ...prev]);
		setTotal((t) => t + 1);
		return record;
	};

	const update = async (recordId: string, data: { [fieldId: string]: unknown }) => {
		const record = await api.patch<DbRecord>(`/databases/${databaseId}/records/${recordId}`, {
			data,
		});
		setRecords((prev) => prev.map((r) => (r.id === recordId ? record : r)));
		return record;
	};

	const remove = async (recordId: string) => {
		await api.delete(`/databases/${databaseId}/records/${recordId}`);
		setRecords((prev) => prev.filter((r) => r.id !== recordId));
		setTotal((t) => t - 1);
	};

	return { records, total, page, loading, refetch: fetch, setPage, create, update, remove };
}
