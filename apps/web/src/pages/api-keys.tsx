import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { ApiKey } from "@kyra/shared";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Copy, Key, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ApiKeyWithRawKey extends ApiKey {
	key?: string;
}

export function ApiKeysPage() {
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreate, setShowCreate] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [newKey, setNewKey] = useState<ApiKeyWithRawKey | null>(null);
	const [copied, setCopied] = useState(false);

	const fetchKeys = useCallback(async () => {
		try {
			const data = await api.get<ApiKey[]>("/api-keys");
			setKeys(data);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchKeys();
	}, [fetchKeys]);

	async function handleDeleteConfirm() {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await api.delete(`/api-keys/${deleteTarget.id}`);
			setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id));
			toast.success("API key deleted");
			setDeleteTarget(null);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setDeleting(false);
		}
	}

	function copyKey(key: string) {
		navigator.clipboard.writeText(key);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold">API Keys</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Create API keys to integrate with external services like n8n, Make, or custom applications.
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" /> New API Key
				</Button>
			</div>

			{keys.length === 0 && !newKey ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
					<Key className="mb-4 h-10 w-10 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">No API keys yet</p>
					<Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
						Create your first API key
					</Button>
				</div>
			) : (
				<div className="rounded-xl border border-border">
					<div className="grid grid-cols-[1fr_10rem_10rem_3rem] items-center gap-4 rounded-t-xl border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
						<span>Name</span>
						<span>Created</span>
						<span>Last used</span>
						<span />
					</div>
					{keys.map((k) => (
						<div
							key={k.id}
							className="grid grid-cols-[1fr_10rem_10rem_3rem] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
						>
							<div>
								<p className="text-sm font-medium">{k.name}</p>
								<p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}••••••••</p>
							</div>
							<span className="text-sm text-muted-foreground">{formatDate(k.createdAt)}</span>
							<span className="text-sm text-muted-foreground">
								{k.lastUsedAt ? formatDate(k.lastUsedAt) : "Never"}
							</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-destructive hover:text-destructive"
								onClick={() => setDeleteTarget(k)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			)}

			{/* API Reference */}
			<EndpointsReference />

			{/* Create dialog */}
			<CreateApiKeyDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onCreated={(created) => {
					setNewKey(created);
					setKeys((prev) => [created, ...prev]);
				}}
			/>

			{/* Show new key dialog */}
			<Dialog open={!!newKey} onOpenChange={(open) => { if (!open) setNewKey(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>API Key Created</DialogTitle>
						<DialogDescription>
							Copy your API key now. You won't be able to see it again!
						</DialogDescription>
					</DialogHeader>
					{newKey?.key && (
						<div className="flex items-center gap-2 rounded-lg bg-muted p-3">
							<code className="flex-1 break-all text-sm font-mono">{newKey.key}</code>
							<Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyKey(newKey.key!)}>
								{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
							</Button>
						</div>
					)}
					<DialogFooter>
						<Button onClick={() => setNewKey(null)}>Done</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation */}
			<Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete API Key</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Any integrations using this key will stop working.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
						<Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── Endpoints Reference ────────────────────────────────────────────────────

const ENDPOINT_GROUPS = [
	{
		title: "Databases",
		endpoints: [
			{ method: "GET", path: "/api/databases", description: "List all databases" },
			{ method: "GET", path: "/api/databases/:id", description: "Get database by ID" },
			{ method: "POST", path: "/api/databases", description: "Create a new database" },
			{ method: "PATCH", path: "/api/databases/:id", description: "Update a database" },
			{ method: "DELETE", path: "/api/databases/:id", description: "Delete a database" },
		],
	},
	{
		title: "Fields",
		endpoints: [
			{ method: "GET", path: "/api/databases/:databaseId/fields", description: "List fields of a database" },
			{ method: "POST", path: "/api/databases/:databaseId/fields", description: "Create a field" },
			{ method: "PATCH", path: "/api/databases/:databaseId/fields/:fieldId", description: "Update a field" },
			{ method: "DELETE", path: "/api/databases/:databaseId/fields/:fieldId", description: "Delete a field" },
		],
	},
	{
		title: "Records",
		endpoints: [
			{ method: "GET", path: "/api/databases/:databaseId/records", description: "List records (paginated: ?page=1&limit=50)" },
			{ method: "POST", path: "/api/databases/:databaseId/records", description: "Create a record" },
			{ method: "PATCH", path: "/api/databases/:databaseId/records/:recordId", description: "Update a record" },
			{ method: "DELETE", path: "/api/databases/:databaseId/records/:recordId", description: "Delete a record" },
		],
	},
	{
		title: "Comments",
		endpoints: [
			{ method: "GET", path: "/api/databases/:databaseId/records/:recordId/comments", description: "List comments on a record" },
			{ method: "POST", path: "/api/databases/:databaseId/records/:recordId/comments", description: "Create a comment" },
			{ method: "DELETE", path: "/api/databases/:databaseId/records/:recordId/comments/:commentId", description: "Delete a comment" },
		],
	},
	{
		title: "Pages",
		endpoints: [
			{ method: "GET", path: "/api/pages", description: "List all pages" },
			{ method: "POST", path: "/api/pages", description: "Create a page" },
			{ method: "PATCH", path: "/api/pages/:id", description: "Update a page" },
			{ method: "DELETE", path: "/api/pages/:id", description: "Delete a page" },
		],
	},
	{
		title: "Webhooks",
		endpoints: [
			{ method: "GET", path: "/api/webhooks", description: "List all webhooks" },
			{ method: "POST", path: "/api/webhooks", description: "Create a webhook" },
			{ method: "PATCH", path: "/api/webhooks/:id", description: "Update a webhook (enable/disable)" },
			{ method: "DELETE", path: "/api/webhooks/:id", description: "Delete a webhook" },
		],
	},
];

const METHOD_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
	GET: "secondary",
	POST: "default",
	PATCH: "outline",
	DELETE: "destructive",
};

function EndpointsReference() {
	const [open, setOpen] = useState(false);

	return (
		<div className="mt-8">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
			>
				<ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
				API Reference
			</button>

			{open && (
				<div className="mt-4 space-y-6">
					<div className="rounded-lg border border-border bg-muted/30 p-4">
						<p className="text-sm text-muted-foreground">
							Base URL: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{window.location.origin}/api</code>
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Auth header: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer your_api_key</code>
						</p>
					</div>

					{ENDPOINT_GROUPS.map((group) => (
						<div key={group.title}>
							<h4 className="mb-2 text-sm font-medium text-foreground">{group.title}</h4>
							<div className="rounded-xl border border-border">
								{group.endpoints.map((ep, i) => (
									<div
										key={`${ep.method}-${ep.path}`}
										className={`flex items-center gap-3 px-4 py-2.5 ${i < group.endpoints.length - 1 ? "border-b border-border" : ""}`}
									>
										<Badge variant={METHOD_COLORS[ep.method]} className="w-16 justify-center text-xs font-mono">
											{ep.method}
										</Badge>
										<code className="text-xs font-mono text-muted-foreground">{ep.path}</code>
										<span className="ml-auto text-xs text-muted-foreground">{ep.description}</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Create API Key Dialog ──────────────────────────────────────────────────

function CreateApiKeyDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (key: ApiKeyWithRawKey) => void;
}) {
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			const created = await api.post<ApiKeyWithRawKey>("/api-keys", { name });
			onCreated(created);
			onOpenChange(false);
			setName("");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create API Key</DialogTitle>
					<DialogDescription>
						Give your API key a name to identify where it's being used.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="api-key-name">Name</Label>
						<Input
							id="api-key-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. n8n Integration, CI/CD Pipeline"
							required
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
