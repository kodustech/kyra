import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { AuthUser } from "@kyra/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

const DEFAULT_COLORS = [
	"#6366f1",
	"#f43f5e",
	"#10b981",
	"#f59e0b",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
	"#14b8a6",
];

interface InviteData {
	id: string;
	email: string;
	name: string;
	role: string;
	expiresAt: string;
}

export function AcceptInvitePage() {
	const { token = "" } = useParams<{ token: string }>();
	const { updateUser } = useAuth();
	const navigate = useNavigate();

	const [invite, setInvite] = useState<InviteData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [password, setPassword] = useState("");
	const [color, setColor] = useState(DEFAULT_COLORS[0]);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		api
			.get<InviteData>(`/auth/invite/${token}`)
			.then(setInvite)
			.catch((err) => setError((err as Error).message))
			.finally(() => setLoading(false));
	}, [token]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		try {
			const res = await api.post<{ user: AuthUser; token: string }>(
				`/auth/invite/${token}/accept`,
				{ password, color },
			);
			setToken(res.token);
			updateUser(res.user);
			navigate("/", { replace: true });
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (error || !invite) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-destructive">Invalid Invite</h1>
					<p className="mt-2 text-muted-foreground">{error || "Invite not found."}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-6">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-primary">Kyra</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						You've been invited to join as <strong>{invite.role}</strong>.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border p-6">
					<div className="space-y-2">
						<Label>Name</Label>
						<Input value={invite.name} disabled />
					</div>

					<div className="space-y-2">
						<Label>Email</Label>
						<Input value={invite.email} disabled />
					</div>

					<div className="space-y-2">
						<Label htmlFor="invite-password">Password</Label>
						<Input
							id="invite-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="At least 6 characters"
							minLength={6}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label>Avatar Color</Label>
						<div className="flex gap-2">
							{DEFAULT_COLORS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setColor(c)}
									className={`h-8 w-8 rounded-full transition-all ${
										color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
									}`}
									style={{ backgroundColor: c }}
								/>
							))}
						</div>
					</div>

					<Button type="submit" className="w-full" disabled={submitting}>
						{submitting ? "Joining..." : "Join Kyra"}
					</Button>
				</form>
			</div>
		</div>
	);
}
