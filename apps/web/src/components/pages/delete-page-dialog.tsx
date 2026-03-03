import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { usePages } from "@/hooks/use-pages";
import type { Page } from "@kyra/shared";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

interface DeletePageDialogProps {
	page: Page | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeletePageDialog({ page, open, onOpenChange }: DeletePageDialogProps) {
	const { remove } = usePages();
	const navigate = useNavigate();
	const location = useLocation();
	const [loading, setLoading] = useState(false);

	async function handleDelete() {
		if (!page) return;

		setLoading(true);
		try {
			await remove(page.id);
			toast.success("Page deleted");
			onOpenChange(false);
			if (location.pathname.includes(page.id)) {
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
					<DialogTitle>Delete Page</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete <strong>{page?.name}</strong>? This will also delete all
						blocks. This action cannot be undone.
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
