import { Parser } from "expr-eval";
import type { Field } from "@kyra/shared";

const parser = new Parser({
	operators: {
		logical: true,
		comparison: true,
		concatenate: true,
		conditional: true,
		assignment: false,
		array: false,
		fndef: false,
	},
});

// Register custom functions
parser.functions.abs = Math.abs;
parser.functions.ceil = Math.ceil;
parser.functions.floor = Math.floor;
parser.functions.round = (v: number, decimals?: number) => {
	if (decimals == null) return Math.round(v);
	const factor = 10 ** decimals;
	return Math.round(v * factor) / factor;
};
parser.functions.min = Math.min;
parser.functions.max = Math.max;
parser.functions.sqrt = Math.sqrt;
parser.functions.pow = Math.pow;

// String functions
parser.functions.lower = (s: unknown) => String(s ?? "").toLowerCase();
parser.functions.upper = (s: unknown) => String(s ?? "").toUpperCase();
parser.functions.trim = (s: unknown) => String(s ?? "").trim();
parser.functions.length = (s: unknown) => {
	const val = s ?? "";
	if (Array.isArray(val)) return val.length;
	return String(val).length;
};
parser.functions.contains = (s: unknown, search: unknown) =>
	String(s ?? "").toLowerCase().includes(String(search ?? "").toLowerCase());
parser.functions.concat = (...args: unknown[]) => args.map((a) => String(a ?? "")).join("");
parser.functions.replace = (s: unknown, search: unknown, replacement: unknown) =>
	String(s ?? "").replaceAll(String(search ?? ""), String(replacement ?? ""));
parser.functions.left = (s: unknown, n: number) => String(s ?? "").slice(0, n);
parser.functions.right = (s: unknown, n: number) => String(s ?? "").slice(-n);

// Number functions
parser.functions.toNumber = (v: unknown) => Number(v) || 0;
parser.functions.toString = (v: unknown) => String(v ?? "");

// Date functions
parser.functions.now = () => new Date().toISOString();
parser.functions.today = () => new Date().toISOString().slice(0, 10);
parser.functions.year = (d: unknown) => new Date(String(d)).getFullYear();
parser.functions.month = (d: unknown) => new Date(String(d)).getMonth() + 1;
parser.functions.day = (d: unknown) => new Date(String(d)).getDate();

// Conditional
parser.functions.IF = (cond: unknown, then: unknown, otherwise: unknown) =>
	cond ? then : otherwise;

// Logic
parser.functions.AND = (...args: unknown[]) => args.every(Boolean);
parser.functions.OR = (...args: unknown[]) => args.some(Boolean);
parser.functions.NOT = (v: unknown) => !v;
parser.functions.empty = (v: unknown) => v == null || v === "";

/**
 * Evaluates all formula fields for a single record.
 * Mutates record.data by adding computed values for formula fields.
 */
export function evaluateFormulas(
	recordData: { [key: string]: unknown },
	fields: Field[],
): { [key: string]: unknown } {
	const formulaFields = fields.filter((f) => f.type === "formula" && f.formulaExpression);
	if (formulaFields.length === 0) return recordData;

	// Build slug → value map from current record data
	const idToSlug = new Map(fields.map((f) => [f.id, f.slug]));
	const slugToValue: { [slug: string]: unknown } = {};
	for (const [id, value] of Object.entries(recordData)) {
		const slug = idToSlug.get(id);
		if (slug) slugToValue[slug] = value;
	}

	const result = { ...recordData };

	for (const field of formulaFields) {
		try {
			// Pre-process: replace prop("slug") with variable references
			const expression = field.formulaExpression!.replace(
				/prop\("([^"]+)"\)/g,
				(_match, slug: string) => {
					// Use a safe variable name (replace hyphens with underscores for expr-eval)
					return `__prop_${slug.replace(/-/g, "_")}__`;
				},
			);

			// Build variables for the expression
			const variables: { [key: string]: unknown } = {};
			for (const [slug, value] of Object.entries(slugToValue)) {
				const varName = `__prop_${slug.replace(/-/g, "_")}__`;
				variables[varName] = value ?? "";
			}

			const parsed = parser.parse(expression);
			result[field.id] = parsed.evaluate(variables);
		} catch {
			// On error, set to null
			result[field.id] = null;
		}
	}

	return result;
}
