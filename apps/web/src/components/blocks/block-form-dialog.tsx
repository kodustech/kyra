import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDatabases } from "@/hooks/use-databases";
import type { ViewType } from "@kyra/shared";
import { useState } from "react";

interface BlockFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { database_id: string; view_type: ViewType }) => Promise<void>;
}

export function BlockFormDialog({ open, onOpenChange, onSubmit }: BlockFormDialogProps) {
	const { databases } = useDatabases();
	const [databaseId, setDatabaseId] = useState("");
	const [viewType, setViewType] = useState<ViewType>("form");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!databaseId) return;

		setLoading(true);
		try {
			await onSubmit({ database_id: databaseId, view_type: viewType });
			setDatabaseId("");
			setViewType("form");
			onOpenChange(false);
		} catch {
			// error handled by parent
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Add Block</DialogTitle>
						<DialogDescription>Choose a database and how to display it.</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label>Database</Label>
							<Select value={databaseId} onValueChange={setDatabaseId}>
								<SelectTrigger>
									<SelectValue placeholder="Select a database" />
								</SelectTrigger>
								<SelectContent>
									{databases.map((db) => (
										<SelectItem key={db.id} value={db.id}>
											{db.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>View Type</Label>
							<Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="form">Form</SelectItem>
									<SelectItem value="table">Table</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!databaseId || loading}>
							{loading ? "Adding..." : "Add Block"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
