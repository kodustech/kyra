import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useDatabases } from "@/hooks/use-databases";
import type { Database } from "@kyra/shared";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

interface DeleteDatabaseDialogProps {
	database: Database | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteDatabaseDialog({ database, open, onOpenChange }: DeleteDatabaseDialogProps) {
	const { remove } = useDatabases();
	const navigate = useNavigate();
	const location = useLocation();
	const [loading, setLoading] = useState(false);

	async function handleDelete() {
		if (!database) return;

		setLoading(true);
		try {
			await remove(database.id);
			toast.success("Database deleted");
			onOpenChange(false);
			if (location.pathname.includes(database.id)) {
				navigate("/");
			}
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
					<DialogTitle>Delete Database</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete <strong>{database?.name}</strong>? This will also delete
						all fields and records. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={loading}>
						{loading ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
