import { Hono } from "hono";
import { type AppEnv } from "../lib/auth";
import { uploadFile, isConfigured } from "../lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

export const uploads = new Hono<AppEnv>();

// POST /image — Upload an image
uploads.post("/image", async (c) => {
	if (!isConfigured()) {
		return c.json({ error: "Storage is not configured on this server" }, 501);
	}

	const formData = await c.req.formData();
	const file = formData.get("file");

	if (!file || !(file instanceof File)) {
		return c.json({ error: "No file provided" }, 400);
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return c.json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` }, 400);
	}

	if (file.size > MAX_FILE_SIZE) {
		return c.json({ error: "File too large. Maximum 5 MB." }, 400);
	}

	const ext = file.name.split(".").pop() || "png";
	const key = `${crypto.randomUUID()}.${ext}`;

	try {
		const buffer = new Uint8Array(await file.arrayBuffer());
		const url = await uploadFile(key, buffer, file.type);
		return c.json({ url }, 201);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[upload] S3 error:", message);
		return c.json({ error: `Upload failed: ${message}` }, 500);
	}
});
