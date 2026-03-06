import { api } from "@/lib/api";
import type { CommentWithAuthor } from "@kyra/shared";
import { useCallback, useEffect, useState } from "react";

export function useComments(databaseId: string, recordId: string) {
	const [comments, setComments] = useState<CommentWithAuthor[]>([]);
	const [loading, setLoading] = useState(true);

	const basePath = `/databases/${databaseId}/records/${recordId}/comments`;

	const fetch = useCallback(async () => {
		try {
			const data = await api.get<CommentWithAuthor[]>(basePath);
			setComments(data);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, [basePath]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	const create = useCallback(
		async (content: string) => {
			const comment = await api.post<CommentWithAuthor>(basePath, { content });
			setComments((prev) => [...prev, comment]);
			return comment;
		},
		[basePath],
	);

	const remove = useCallback(
		async (commentId: string) => {
			await api.delete(`${basePath}/${commentId}`);
			setComments((prev) => prev.filter((c) => c.id !== commentId));
		},
		[basePath],
	);

	return { comments, loading, create, remove, refetch: fetch };
}
