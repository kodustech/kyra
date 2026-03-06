import { useAuth } from "@/providers/auth-provider";
import { useState } from "react";
import { Navigate, Outlet } from "react-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ProtectedRoute() {
	const { user, loading, logout, refreshUser } = useAuth();
	const [checking, setChecking] = useState(false);

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (user.role === "pending") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-6 text-center">
					<h1 className="text-3xl font-bold text-primary">Kyra</h1>
					<div className="rounded-xl border border-border p-6 space-y-4">
						<h2 className="text-lg font-semibold">Account Pending Approval</h2>
						<p className="text-sm text-muted-foreground">
							Your account is pending approval. An administrator will assign your role.
						</p>
						<div className="flex flex-col gap-2">
							<Button
								disabled={checking}
								onClick={async () => {
									setChecking(true);
									try {
										await refreshUser();
										toast.success("Status checked");
									} catch {
										toast.error("Failed to check status");
									} finally {
										setChecking(false);
									}
								}}
							>
								{checking ? "Checking..." : "Check Status"}
							</Button>
							<Button variant="outline" onClick={logout}>
								Sign Out
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return <Outlet />;
}
