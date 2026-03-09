import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Field } from "@kyra/shared";
import { useEffect, useState } from "react";

interface LookupOption {
	value: string;
	label: string;
}

interface LookupSelectProps {
	field: Field;
	value: string;
	onChange: (value: unknown) => void;
}

export function LookupSelect({ field, value, onChange }: LookupSelectProps) {
	const [options, setOptions] = useState<LookupOption[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!field.lookupSettings) return;

		let cancelled = false;
		setLoading(true);

		api.get<{ options: LookupOption[] }>(
			`/databases/${field.databaseId}/records/lookup-options/${field.id}`,
		)
			.then((res) => {
				if (!cancelled) setOptions(res.options);
			})
			.catch(() => {
				if (!cancelled) setOptions([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [field.id, field.databaseId, field.lookupSettings]);

	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger>
				<SelectValue placeholder={loading ? "Loading..." : `Select ${field.name}`} />
			</SelectTrigger>
			<SelectContent>
				{options.map((opt) => (
					<SelectItem key={opt.value} value={opt.value}>
						{opt.label}
					</SelectItem>
				))}
				{!loading && options.length === 0 && (
					<div className="px-2 py-1.5 text-sm text-muted-foreground">No options available</div>
				)}
			</SelectContent>
		</Select>
	);
}
