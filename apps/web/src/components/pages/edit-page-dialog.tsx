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
import { usePages } from "@/hooks/use-pages";
import type { Page } from "@kyra/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditPageDialogProps {
	page: Page | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditPageDialog({ page, open, onOpenChange }: EditPageDialogProps) {
	const { update } = usePages();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (page && open) {
			setName(page.name);
			setSlug(page.slug);
		}
	}, [page, open]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!page || !name.trim() || !slug.trim()) return;

		setLoading(true);
		try {
			await update(page.id, { name: name.trim(), slug: slug.trim() });
			toast.success("Page updated");
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
						<DialogTitle>Edit Page</DialogTitle>
						<DialogDescription>Update the page name and slug.</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="edit-page-name">Name</Label>
							<Input
								id="edit-page-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-page-slug">Slug</Label>
							<Input
								id="edit-page-slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">Public URL: /p/{slug || "..."}</p>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || !slug.trim() || loading}>
							{loading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
