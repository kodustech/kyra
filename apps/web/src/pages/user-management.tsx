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
};

export function UserManagement() {
	const { user: currentUser } = useAuth();
	const [users, setUsers] = useState<UserItem[]>([]);
	const [invites, setInvites] = useState<Invite[]>([]);
	const [loading, setLoading] = useState(true);
	const [showInvite, setShowInvite] = useState(false);

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

	async function handleDeleteUser(userId: string) {
		try {
			await api.delete(`/auth/users/${userId}`);
			setUsers((prev) => prev.filter((u) => u.id !== userId));
			toast.success("User removed");
		} catch (err) {
			toast.error((err as Error).message);
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

	async function handleTransferOwnership(userId: string) {
		try {
			await api.post("/auth/transfer-ownership", { newOwnerId: userId });
			toast.success("Ownership transferred. Reloading...");
			setTimeout(() => window.location.reload(), 1000);
		} catch (err) {
			toast.error((err as Error).message);
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
				<div className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 border-b border-border px-4 py-3 text-sm font-medium text-muted-foreground">
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
							className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
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
							<div className="flex items-center gap-1">
								{currentUser.role === "owner" && u.id !== currentUser.id && u.role !== "owner" && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											if (confirm(`Transfer ownership to ${u.name}? You will become an Admin.`)) {
												handleTransferOwnership(u.id);
											}
										}}
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
										onClick={() => {
											if (confirm(`Remove ${u.name}?`)) {
												handleDeleteUser(u.id);
											}
										}}
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
									<p className="text-sm font-medium">{inv.name}</p>
									<p className="text-xs text-muted-foreground">
										{inv.email} — <Badge variant="outline">{inv.role}</Badge>
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
				isOwner={currentUser.role === "owner"}
				onCreated={(invite) => {
					setInvites((prev) => [invite, ...prev]);
					copyInviteLink(invite.token);
				}}
			/>
		</div>
	);
}

// ─── Invite Dialog ──────────────────────────────────────────────────────────────

function InviteDialog({
	open,
	onOpenChange,
	isOwner,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isOwner: boolean;
	onCreated: (invite: Invite) => void;
}) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<string>("editor");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			const invite = await api.post<Invite>("/auth/invites", { name, email, role });
			onCreated(invite);
			onOpenChange(false);
			setName("");
			setEmail("");
			setRole("editor");
			toast.success("Invite created and link copied!");
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
					<DialogTitle>Invite User</DialogTitle>
					<DialogDescription>Send an invitation to join Kyra.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="invite-name">Name</Label>
						<Input
							id="invite-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="User's name"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="invite-email">Email</Label>
						<Input
							id="invite-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="user@example.com"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label>Role</Label>
						<Select value={role} onValueChange={setRole}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{isOwner && <SelectItem value="admin">Admin</SelectItem>}
								<SelectItem value="editor">Editor</SelectItem>
								<SelectItem value="viewer">Viewer</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Creating..." : "Create Invite"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
