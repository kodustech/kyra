import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Field, buildRecordValidator } from "@kyra/shared";
import { useForm } from "react-hook-form";
import { DynamicFieldInput } from "./dynamic-field-input";

interface DynamicFormProps {
	fields: Field[];
	defaultValues?: { [fieldId: string]: unknown };
	onSubmit: (data: { [fieldId: string]: unknown }) => Promise<void>;
	onCancel: () => void;
	submitLabel?: string;
}

export function DynamicForm({
	fields,
	defaultValues,
	onSubmit,
	onCancel,
	submitLabel = "Save",
}: DynamicFormProps) {
	const schema = buildRecordValidator(fields);

	const defaults: { [key: string]: unknown } = {};
	for (const field of fields) {
		defaults[field.id] = defaultValues?.[field.id] ?? (field.type === "boolean" ? false : "");
	}

	const {
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(schema),
		defaultValues: defaults,
	});

	const values = watch();

	async function handleFormSubmit(data: { [fieldId: string]: unknown }) {
		await onSubmit(data);
		reset(defaults);
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
			{fields.map((field) => (
				<div key={field.id} className="space-y-1.5">
					<Label htmlFor={field.id}>
						{field.name}
						{field.required && <span className="ml-1 text-destructive">*</span>}
					</Label>
					<DynamicFieldInput
						field={field}
						value={values[field.id]}
						onChange={(v) => setValue(field.id, v, { shouldValidate: true })}
					/>
					{errors[field.id] && (
						<p className="text-xs text-destructive">
							{(errors[field.id] as { message?: string })?.message || "Invalid value"}
						</p>
					)}
				</div>
			))}
			<div className="flex justify-end gap-2 pt-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : submitLabel}
				</Button>
			</div>
		</form>
	);
}
