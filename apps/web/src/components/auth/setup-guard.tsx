import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

export function SetupGuard() {
	const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
	const [error, setError] = useState(false);
	const location = useLocation();

	useEffect(() => {
		api
			.get<{ needsSetup: boolean }>("/auth/setup/status")
			.then((res) => setNeedsSetup(res.needsSetup))
			.catch(() => {
				// If API fails, default to needing setup (safer)
				setNeedsSetup(true);
				setError(true);
			});
	}, []);

	if (needsSetup === null) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	// If needs setup and we're not already on /setup, redirect
	if (needsSetup && location.pathname !== "/setup") {
		return <Navigate to="/setup" replace />;
	}

	return <Outlet />;
}
