import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePages } from "@/hooks/use-pages";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

interface CreatePageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function CreatePageDialog({ open, onOpenChange }: CreatePageDialogProps) {
	const { create } = usePages();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [icon, setIcon] = useState<string | null>(null);
	const [slugManual, setSlugManual] = useState(false);
	const [loading, setLoading] = useState(false);

	function handleNameChange(value: string) {
		setName(value);
		if (!slugManual) {
			setSlug(toSlug(value));
		}
	}

	function handleSlugChange(value: string) {
		setSlugManual(true);
		setSlug(value);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || !slug.trim()) return;

		setLoading(true);
		try {
			const page = await create({ name: name.trim(), slug: slug.trim(), icon, published: false });
			toast.success("Page created");
			setName("");
			setSlug("");
			setIcon(null);
			setSlugManual(false);
			onOpenChange(false);
			navigate(`/pages/${page.id}?config`);
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
						<DialogTitle>Create Page</DialogTitle>
						<DialogDescription>
							Create a new page with blocks that connect to your databases.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="page-name">Name</Label>
							<div className="flex items-center gap-2">
								<IconPicker value={icon} onChange={setIcon} />
								<Input
									id="page-name"
									value={name}
									onChange={(e) => handleNameChange(e.target.value)}
									placeholder="e.g. Contact Form"
									autoFocus
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="page-slug">Slug</Label>
							<Input
								id="page-slug"
								value={slug}
								onChange={(e) => handleSlugChange(e.target.value)}
								placeholder="e.g. contact-form"
							/>
							<p className="text-xs text-muted-foreground">Public URL: /p/{slug || "..."}</p>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || !slug.trim() || loading}>
							{loading ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
