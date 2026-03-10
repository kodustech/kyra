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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { Invite, UserRole } from "@kyra/shared";
import { canManageRole } from "@kyra/shared";
import { Copy, Plus, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface UserItem {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	color: string;
	createdAt: string;
}

const ROLE_COLORS: Record<UserRole, "default" | "secondary" | "outline"> = {
	owner: "default",
	admin: "secondary",
	editor: "outline",
	viewer: "outline",
	pending: "outline",
};

const GRID_COLS = "grid-cols-[1.75rem_1fr_1fr_7rem_7rem]";

export function UserManagement() {
	const { user: currentUser } = useAuth();
	const [users, setUsers] = useState<UserItem[]>([]);
	const [invites, setInvites] = useState<Invite[]>([]);
	const [loading, setLoading] = useState(true);
	const [showInvite, setShowInvite] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [transferTarget, setTransferTarget] = useState<UserItem | null>(null);
	const [transferring, setTransferring] = useState(false);

	const fetchData = useCallback(async () => {
		try {
			const [usersRes, invitesRes] = await Promise.all([
				api.get<UserItem[]>("/auth/users"),
				api.get<Invite[]>("/auth/invites"),
			]);
			setUsers(usersRes);
			setInvites(invitesRes);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	async function handleRoleChange(userId: string, newRole: UserRole) {
		try {
			const updated = await api.patch<UserItem>(`/auth/users/${userId}`, { role: newRole });
			setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
			toast.success("Role updated");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	async function handleDeleteConfirm() {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await api.delete(`/auth/users/${deleteTarget.id}`);
			setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
			toast.success("User removed");
			setDeleteTarget(null);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setDeleting(false);
		}
	}

	async function handleCancelInvite(inviteId: string) {
		try {
			await api.delete(`/auth/invites/${inviteId}`);
			setInvites((prev) => prev.filter((i) => i.id !== inviteId));
			toast.success("Invite cancelled");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	function copyInviteLink(token: string) {
		const link = `${window.location.origin}/invite/${token}`;
		navigator.clipboard.writeText(link);
		toast.success("Link copied to clipboard");
	}

	async function handleTransferConfirm() {
		if (!transferTarget) return;
		setTransferring(true);
		try {
			await api.post("/auth/transfer-ownership", { newOwnerId: transferTarget.id });
			toast.success("Ownership transferred. Reloading...");
			setTransferTarget(null);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setTransferring(false);
		}
	}

	if (!currentUser) return null;

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
				<h2 className="text-2xl font-semibold">User Management</h2>
				<Button onClick={() => setShowInvite(true)}>
					<UserPlus className="mr-2 h-4 w-4" /> Invite User
				</Button>
			</div>

			{/* Users table */}
			<div className="rounded-xl border border-border">
				<div className={`grid ${GRID_COLS} items-center gap-4 rounded-t-xl border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground`}>
					<span />
					<span>Name</span>
					<span>Email</span>
					<span>Role</span>
					<span />
				</div>
				{users.map((u) => {
					const canManage = canManageRole(currentUser.role, u.role) && u.id !== currentUser.id;
					return (
						<div
							key={u.id}
							className={`grid ${GRID_COLS} items-center gap-4 border-b border-border px-4 py-3 last:border-b-0`}
						>
							<UserAvatar name={u.name} color={u.color} size="sm" />
							<span className="text-sm font-medium truncate">
								{u.name}
								{u.id === currentUser.id && (
									<span className="ml-1 text-xs text-muted-foreground">(you)</span>
								)}
							</span>
							<span className="text-sm text-muted-foreground truncate">{u.email}</span>
							<div>
								{canManage ? (
									<Select
										value={u.role}
										onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}
									>
										<SelectTrigger size="sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{currentUser.role === "owner" && (
												<SelectItem value="admin">Admin</SelectItem>
											)}
											<SelectItem value="editor">Editor</SelectItem>
											<SelectItem value="viewer">Viewer</SelectItem>
										</SelectContent>
									</Select>
								) : (
									<Badge variant={ROLE_COLORS[u.role]}>{u.role}</Badge>
								)}
							</div>
							<div className="flex items-center justify-end gap-1">
								{currentUser.role === "owner" && u.id !== currentUser.id && u.role !== "owner" && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setTransferTarget(u)}
										className="text-xs"
									>
										Transfer
									</Button>
								)}
								{canManage && (
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-destructive hover:text-destructive"
										onClick={() => setDeleteTarget(u)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Pending invites */}
			{invites.length > 0 && (
				<>
					<Separator className="my-8" />
					<h3 className="mb-4 text-lg font-medium">Pending Invites</h3>
					<div className="rounded-xl border border-border">
						{invites.map((inv) => (
							<div
								key={inv.id}
								className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
							>
								<div>
									<p className="text-sm font-medium">{inv.email}</p>
									<p className="text-xs text-muted-foreground">
										<Badge variant="outline">{inv.role}</Badge>
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={() => copyInviteLink(inv.token)}
										title="Copy invite link"
									>
										<Copy className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-destructive hover:text-destructive"
										onClick={() => handleCancelInvite(inv.id)}
										title="Cancel invite"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			<InviteDialog
				open={showInvite}
				onOpenChange={setShowInvite}
				onCreated={(newInvites) => {
					setInvites((prev) => [...newInvites, ...prev]);
				}}
			/>

			{/* Delete user confirmation */}
			<Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove User</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
							{deleting ? "Removing..." : "Remove"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Transfer ownership confirmation */}
			<Dialog open={!!transferTarget} onOpenChange={(open) => { if (!open) setTransferTarget(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Transfer Ownership</DialogTitle>
						<DialogDescription>
							Transfer ownership to <strong>{transferTarget?.name}</strong>? You will become an Admin.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setTransferTarget(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleTransferConfirm} disabled={transferring}>
							{transferring ? "Transferring..." : "Transfer"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── Invite Dialog ──────────────────────────────────────────────────────────────

function InviteDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (newInvites: Invite[]) => void;
}) {
	const [emails, setEmails] = useState<string[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	function addEmail() {
		const trimmed = input.trim().toLowerCase();
		if (!trimmed) return;
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
			setError("Invalid email");
			return;
		}
		if (emails.includes(trimmed)) {
			setError("Email already added");
			return;
		}
		setEmails((prev) => [...prev, trimmed]);
		setInput("");
		setError("");
	}

	function removeEmail(email: string) {
		setEmails((prev) => prev.filter((e) => e !== email));
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			addEmail();
		}
	}

	async function handleSubmit() {
		if (emails.length === 0) return;
		setLoading(true);
		try {
			const res = await api.post<{ invites: Invite[]; skipped: string[] }>("/auth/invites", { emails });
			onCreated(res.invites);
			if (res.skipped.length > 0) {
				toast.info(`${res.skipped.length} email(s) skipped (already registered)`);
			}
			if (res.invites.length > 0) {
				// Copy all invite links
				const links = res.invites
					.map((inv) => `${window.location.origin}/invite/${inv.token}`)
					.join("\n");
				navigator.clipboard.writeText(links);
				toast.success(`${res.invites.length} invite(s) created! Links copied.`);
			}
			onOpenChange(false);
			setEmails([]);
			setInput("");
			setError("");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setEmails([]); setInput(""); setError(""); } }}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite Users</DialogTitle>
					<DialogDescription>
						Type an email and press Enter to add. All users will be invited as viewers.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="invite-email">Email</Label>
						<div className="flex gap-2">
							<Input
								id="invite-email"
								type="email"
								value={input}
								onChange={(e) => { setInput(e.target.value); setError(""); }}
								onKeyDown={handleKeyDown}
								placeholder="user@example.com"
								autoFocus
							/>
							<Button type="button" variant="outline" size="icon" onClick={addEmail} title="Add email">
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						{error && <p className="text-xs text-destructive">{error}</p>}
					</div>

					{emails.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{emails.map((email) => (
								<span
									key={email}
									className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm"
								>
									{email}
									<button
										type="button"
										onClick={() => removeEmail(email)}
										className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
									>
										<Trash2 className="h-3 w-3" />
									</button>
								</span>
							))}
						</div>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={emails.length === 0 || loading}>
							{loading ? "Inviting..." : `Invite ${emails.length > 0 ? `(${emails.length})` : ""}`}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
