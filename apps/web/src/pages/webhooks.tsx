import { Badge } from "@/components/ui/badge";
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
import type { Webhook } from "@kyra/shared";
import { Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function WebhooksPage() {
	const [webhooks, setWebhooks] = useState<Webhook[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreate, setShowCreate] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
	const [deleting, setDeleting] = useState(false);

	const fetchWebhooks = useCallback(async () => {
		try {
			const data = await api.get<Webhook[]>("/webhooks");
			setWebhooks(data);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchWebhooks();
	}, [fetchWebhooks]);

	async function handleToggleActive(webhook: Webhook) {
		try {
			const updated = await api.patch<Webhook>(`/webhooks/${webhook.id}`, {
				active: !webhook.active,
			});
			setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
			toast.success(updated.active ? "Webhook enabled" : "Webhook disabled");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	async function handleDeleteConfirm() {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await api.delete(`/webhooks/${deleteTarget.id}`);
			setWebhooks((prev) => prev.filter((w) => w.id !== deleteTarget.id));
			toast.success("Webhook deleted");
			setDeleteTarget(null);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setDeleting(false);
		}
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
					<h2 className="text-2xl font-semibold">Webhooks</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Receive real-time notifications when records are created, updated, or deleted.
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" /> New Webhook
				</Button>
			</div>

			{/* Events info */}
			<div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
				<p className="mb-2 text-sm font-medium">Events sent to all webhooks:</p>
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">record.created</Badge>
					<Badge variant="secondary">record.updated</Badge>
					<Badge variant="secondary">record.deleted</Badge>
					<Badge variant="secondary">comment.created</Badge>
				</div>
				<p className="mt-2 text-xs text-muted-foreground">
					Use a Switch or IF node in n8n/Make to filter by the <code className="rounded bg-muted px-1">event</code> field in the payload.
				</p>
			</div>

			{webhooks.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
					<WebhookIcon className="mb-4 h-10 w-10 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">No webhooks yet</p>
					<Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
						Create your first webhook
					</Button>
				</div>
			) : (
				<div className="rounded-xl border border-border">
					<div className="grid grid-cols-[1fr_1fr_6rem_6rem_3rem] items-center gap-4 rounded-t-xl border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
						<span>Name</span>
						<span>URL</span>
						<span>Status</span>
						<span>Created</span>
						<span />
					</div>
					{webhooks.map((w) => (
						<div
							key={w.id}
							className="grid grid-cols-[1fr_1fr_6rem_6rem_3rem] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
						>
							<span className="text-sm font-medium truncate">{w.name}</span>
							<span className="text-sm text-muted-foreground truncate font-mono">{w.url}</span>
							<button type="button" onClick={() => handleToggleActive(w)}>
								<Badge variant={w.active ? "default" : "outline"}>
									{w.active ? "Active" : "Inactive"}
								</Badge>
							</button>
							<span className="text-sm text-muted-foreground">{formatDate(w.createdAt)}</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-destructive hover:text-destructive"
								onClick={() => setDeleteTarget(w)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			)}

			{/* Create dialog */}
			<CreateWebhookDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onCreated={(created) => {
					setWebhooks((prev) => [created, ...prev]);
				}}
			/>

			{/* Delete confirmation */}
			<Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Webhook</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Events will no longer be sent to this URL.
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

// ─── Create Webhook Dialog ──────────────────────────────────────────────────

function CreateWebhookDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (webhook: Webhook) => void;
}) {
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			const created = await api.post<Webhook>("/webhooks", { name, url });
			onCreated(created);
			onOpenChange(false);
			setName("");
			setUrl("");
			toast.success("Webhook created");
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
					<DialogTitle>Create Webhook</DialogTitle>
					<DialogDescription>
						All events will be sent to this URL via POST request.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="webhook-name">Name</Label>
						<Input
							id="webhook-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. n8n Automation"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="webhook-url">URL</Label>
						<Input
							id="webhook-url"
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://your-n8n.com/webhook/abc123"
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
