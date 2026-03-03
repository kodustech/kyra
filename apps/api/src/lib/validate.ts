import type { Context } from "hono";
import type { z } from "zod";

export async function parseBody<T extends z.ZodTypeAny>(
	c: Context,
	schema: T,
): Promise<{ data: z.infer<T> } | { error: Response }> {
	const body = await c.req.json();
	const result = schema.safeParse(body);

	if (!result.success) {
		return {
			error: c.json({ error: "Validation failed", details: result.error.issues }, 400),
		};
	}

	return { data: result.data as z.infer<T> };
}
