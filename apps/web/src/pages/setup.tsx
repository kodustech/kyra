import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
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

export function SetupPage() {
	const { setup } = useAuth();
	const navigate = useNavigate();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [color, setColor] = useState(DEFAULT_COLORS[0]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		api.get<{ needsSetup: boolean }>("/auth/setup/status").then((res) => {
			if (!res.needsSetup) {
				navigate("/login", { replace: true });
			}
		});
	}, [navigate]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await setup({ name, email, password, color });
			navigate("/", { replace: true });
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-6">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-primary">Kyra</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Create your admin account to get started.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border p-6">
					<div className="space-y-2">
						<Label htmlFor="setup-name">Name</Label>
						<Input
							id="setup-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Your name"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="setup-email">Email</Label>
						<Input
							id="setup-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="setup-password">Password</Label>
						<Input
							id="setup-password"
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

					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Creating..." : "Create Account"}
					</Button>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link to="/login" className="text-primary hover:underline">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
