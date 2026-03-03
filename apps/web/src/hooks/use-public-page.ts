import { api } from "@/lib/api";
import type { PageWithBlocks } from "@kyra/shared";
import { useCallback, useEffect, useState } from "react";

export function usePublicPage(slug: string) {
	const [page, setPage] = useState<PageWithBlocks | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		try {
			const data = await api.get<PageWithBlocks>(`/p/${slug}`);
			setPage(data);
			setError(null);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [slug]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { page, loading, error, refetch: fetch };
}
