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
import { useState } from "react";
import { toast } from "sonner";

interface CreateDatabaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateDatabaseDialog({ open, onOpenChange }: CreateDatabaseDialogProps) {
	const { create } = useDatabases();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setLoading(true);
		try {
			await create({ name: name.trim(), description: description.trim() || null });
			toast.success("Database created");
			setName("");
			setDescription("");
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
						<DialogTitle>Create Database</DialogTitle>
						<DialogDescription>
							Give your database a name and optional description.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="db-name">Name</Label>
							<Input
								id="db-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Contacts"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="db-desc">Description</Label>
							<Textarea
								id="db-desc"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What is this database for?"
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || loading}>
							{loading ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
