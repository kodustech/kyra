import { api } from "@/lib/api";
import type { Block, CreateBlockInput, UpdateBlockInput } from "@kyra/shared";
import { useCallback, useEffect, useState } from "react";

interface BlockWithDatabase extends Block {
	database: { id: string; name: string; description: string | null };
}

export function useBlocks(pageId: string) {
	const [blocks, setBlocks] = useState<BlockWithDatabase[]>([]);
	const [loading, setLoading] = useState(true);

	const fetch = useCallback(async () => {
		try {
			const data = await api.get<BlockWithDatabase[]>(`/pages/${pageId}/blocks`);
			setBlocks(data);
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, [pageId]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	const create = async (input: CreateBlockInput) => {
		const block = await api.post<BlockWithDatabase>(`/pages/${pageId}/blocks`, input);
		setBlocks((prev) => [...prev, block]);
		return block;
	};

	const update = async (blockId: string, input: UpdateBlockInput) => {
		const block = await api.patch<BlockWithDatabase>(`/pages/${pageId}/blocks/${blockId}`, input);
		setBlocks((prev) => prev.map((b) => (b.id === blockId ? block : b)));
		return block;
	};

	const remove = async (blockId: string) => {
		await api.delete(`/pages/${pageId}/blocks/${blockId}`);
		setBlocks((prev) => prev.filter((b) => b.id !== blockId));
	};

	const reorder = async (blockIds: string[]) => {
		await api.put(`/pages/${pageId}/blocks/reorder`, { blockIds });
		setBlocks((prev) => {
			const map = new Map(prev.map((b) => [b.id, b]));
			return blockIds
				.map((id, i) => {
					const b = map.get(id);
					return b ? { ...b, position: i } : undefined;
				})
				.filter(Boolean) as BlockWithDatabase[];
		});
	};

	return { blocks, loading, refetch: fetch, create, update, remove, reorder };
}
