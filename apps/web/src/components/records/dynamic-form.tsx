import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Field, buildRecordValidator } from "@kyra/shared";
import { Parser } from "expr-eval";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { DynamicFieldInput } from "./dynamic-field-input";

const formulaParser = new Parser({
	operators: {
		logical: true,
		comparison: true,
		concatenate: true,
		conditional: true,
		assignment: false,
	},
});

formulaParser.functions.abs = Math.abs;
formulaParser.functions.ceil = Math.ceil;
formulaParser.functions.floor = Math.floor;
formulaParser.functions.round = (v: number, decimals?: number) => {
	if (decimals == null) return Math.round(v);
	const factor = 10 ** decimals;
	return Math.round(v * factor) / factor;
};
formulaParser.functions.min = Math.min;
formulaParser.functions.max = Math.max;
formulaParser.functions.sqrt = Math.sqrt;
formulaParser.functions.pow = Math.pow;
formulaParser.functions.lower = (s: unknown) => String(s ?? "").toLowerCase();
formulaParser.functions.upper = (s: unknown) => String(s ?? "").toUpperCase();
formulaParser.functions.trim = (s: unknown) => String(s ?? "").trim();
formulaParser.functions.length = (s: unknown) => String(s ?? "").length;
formulaParser.functions.contains = (s: unknown, search: unknown) =>
	String(s ?? "").toLowerCase().includes(String(search ?? "").toLowerCase());
formulaParser.functions.concat = (...args: unknown[]) => args.map((a) => String(a ?? "")).join("");
formulaParser.functions.replace = (s: unknown, search: unknown, replacement: unknown) =>
	String(s ?? "").replaceAll(String(search ?? ""), String(replacement ?? ""));
formulaParser.functions.toNumber = (v: unknown) => Number(v) || 0;
formulaParser.functions.now = () => new Date().toISOString();
formulaParser.functions.today = () => new Date().toISOString().slice(0, 10);
formulaParser.functions.empty = (v: unknown) => v == null || v === "";
formulaParser.functions.IF = (cond: unknown, then: unknown, otherwise: unknown) =>
	cond ? then : otherwise;

function evaluateClientFormula(
	expression: string,
	currentValues: { [key: string]: unknown },
	fields: Field[],
): unknown {
	try {
		const idToSlug = new Map(fields.map((f) => [f.id, f.slug]));
		const slugToValue: { [slug: string]: unknown } = {};
		for (const [id, value] of Object.entries(currentValues)) {
			const slug = idToSlug.get(id);
			if (slug) slugToValue[slug] = value;
		}

		const processedExpr = expression.replace(
			/prop\("([^"]+)"\)/g,
			(_match, slug: string) => `__prop_${slug.replace(/-/g, "_")}__`,
		);

		const variables: { [key: string]: unknown } = {};
		for (const [slug, value] of Object.entries(slugToValue)) {
			const varName = `__prop_${slug.replace(/-/g, "_")}__`;
			variables[varName] = value ?? "";
		}

		const parsed = formulaParser.parse(processedExpr);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return parsed.evaluate(variables as any);
	} catch {
		return null;
	}
}

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

	// Evaluate formula fields client-side in real-time
	const formulaFields = useMemo(() => fields.filter((f) => f.type === "formula" && f.formulaExpression), [fields]);

	useEffect(() => {
		for (const ff of formulaFields) {
			const result = evaluateClientFormula(ff.formulaExpression!, values, fields);
			const current = values[ff.id];
			// Only update if value changed to avoid infinite loop
			if (result !== current && String(result ?? "") !== String(current ?? "")) {
				setValue(ff.id, result);
			}
		}
	}, [values, formulaFields, fields, setValue]);

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
