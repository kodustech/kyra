import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Field } from "@kyra/shared";

interface DynamicFieldInputProps {
	field: Field;
	value: unknown;
	onChange: (value: unknown) => void;
}

export function DynamicFieldInput({ field, value, onChange }: DynamicFieldInputProps) {
	const strVal = value == null ? "" : String(value);

	switch (field.type) {
		case "text":
			return (
				<Input
					type="text"
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.name}
				/>
			);
		case "number":
			return (
				<Input
					type="number"
					value={strVal}
					onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
					placeholder={field.name}
				/>
			);
		case "email":
			return (
				<Input
					type="email"
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.name}
				/>
			);
		case "phone":
			return (
				<Input
					type="tel"
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.name}
				/>
			);
		case "url":
			return (
				<Input
					type="url"
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.name}
				/>
			);
		case "date":
			return <Input type="date" value={strVal} onChange={(e) => onChange(e.target.value)} />;
		case "textarea":
			return (
				<Textarea
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.name}
					rows={3}
				/>
			);
		case "boolean":
			return <Switch checked={!!value} onCheckedChange={(checked) => onChange(checked)} />;
		case "select":
			return (
				<Select value={strVal} onValueChange={onChange}>
					<SelectTrigger>
						<SelectValue placeholder={`Select ${field.name}`} />
					</SelectTrigger>
					<SelectContent>
						{(field.options || []).map((opt) => (
							<SelectItem key={opt} value={opt}>
								{opt}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		default:
			return (
				<Input
					type="text"
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.name}
				/>
			);
	}
}
