import { api } from "@/lib/api";
import type { CreateFieldInput, Field, UpdateFieldInput } from "@kyra/shared";
import { useCallback, useEffect, useState } from "react";

export function useFields(databaseId: string) {
	const [fields, setFields] = useState<Field[]>([]);
	const [loading, setLoading] = useState(true);

	const fetch = useCallback(async () => {
		try {
			const data = await api.get<Field[]>(`/databases/${databaseId}/fields`);
			setFields(data);
		} catch {
			// silently fail
		} finally {
			setLoading(false);
		}
	}, [databaseId]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	const create = async (input: CreateFieldInput) => {
		const field = await api.post<Field>(`/databases/${databaseId}/fields`, input);
		setFields((prev) => [...prev, field]);
		return field;
	};

	const update = async (fieldId: string, input: UpdateFieldInput) => {
		const field = await api.patch<Field>(`/databases/${databaseId}/fields/${fieldId}`, input);
		setFields((prev) => prev.map((f) => (f.id === fieldId ? field : f)));
		return field;
	};

	const remove = async (fieldId: string) => {
		await api.delete(`/databases/${databaseId}/fields/${fieldId}`);
		setFields((prev) => prev.filter((f) => f.id !== fieldId));
	};

	const reorder = async (fieldIds: string[]) => {
		await api.put(`/databases/${databaseId}/fields/reorder`, { fieldIds });
		setFields((prev) => {
			const map = new Map(prev.map((f) => [f.id, f]));
			return fieldIds
				.map((id, i) => {
					const f = map.get(id);
					return f ? { ...f, position: i } : undefined;
				})
				.filter(Boolean) as Field[];
		});
	};

	return { fields, loading, refetch: fetch, create, update, remove, reorder };
}
