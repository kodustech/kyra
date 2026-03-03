import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center py-20">
			<h2 className="mb-2 text-4xl font-bold">404</h2>
			<p className="mb-6 text-muted-foreground">Page not found</p>
			<Button asChild>
				<Link to="/">Go to Dashboard</Link>
			</Button>
		</div>
	);
}
