import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.STORAGE_ENDPOINT;
const region = process.env.STORAGE_REGION || "auto";
const bucket = process.env.STORAGE_BUCKET || "images";
const accessKeyId = process.env.STORAGE_ACCESS_KEY;
const secretAccessKey = process.env.STORAGE_SECRET_KEY;
const publicUrl = process.env.STORAGE_PUBLIC_URL; // e.g. https://xxx.supabase.co/storage/v1/object/public/images

function isConfigured(): boolean {
	return !!(endpoint && accessKeyId && secretAccessKey);
}

let s3: S3Client | null = null;

function getClient(): S3Client {
	if (!s3) {
		if (!isConfigured()) {
			throw new Error("Storage is not configured. Set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY.");
		}
		s3 = new S3Client({
			endpoint,
			region,
			credentials: {
				accessKeyId: accessKeyId!,
				secretAccessKey: secretAccessKey!,
			},
			forcePathStyle: true,
		});
	}
	return s3;
}

export async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
	const client = getClient();

	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
			ACL: "public-read",
		}),
	);

	// Return the public URL
	let url: string;
	if (publicUrl) {
		url = `${publicUrl}/${key}`;
	} else if (endpoint?.includes("/storage/v1/s3")) {
		// Supabase Storage: derive public URL from the S3 endpoint
		// S3 endpoint uses .storage.supabase.co but public URLs use .supabase.co
		url = `${endpoint.replace(".storage.supabase.co", ".supabase.co").replace("/storage/v1/s3", "/storage/v1/object/public")}/${bucket}/${key}`;
	} else {
		url = `${endpoint}/${bucket}/${key}`;
	}

	console.log("[storage] Uploaded:", { key, bucket, publicUrl: !!publicUrl, url });
	return url;
}

export { isConfigured };
