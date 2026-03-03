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
import { Textarea } from "@/components/ui/textarea";
import { useDatabases } from "@/hooks/use-databases";
import type { Database } from "@kyra/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditDatabaseDialogProps {
	database: Database | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditDatabaseDialog({ database, open, onOpenChange }: EditDatabaseDialogProps) {
	const { update } = useDatabases();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (database) {
			setName(database.name);
			setDescription(database.description || "");
		}
	}, [database]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!database || !name.trim()) return;

		setLoading(true);
		try {
			await update(database.id, { name: name.trim(), description: description.trim() || null });
			toast.success("Database updated");
			onOpenChange(false);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Database</DialogTitle>
						<DialogDescription>Update your database details.</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="edit-db-name">Name</Label>
							<Input
								id="edit-db-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-db-desc">Description</Label>
							<Textarea
								id="edit-db-desc"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || loading}>
							{loading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
