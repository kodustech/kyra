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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FIELD_TYPES, type Field, type FieldType } from "@kyra/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FieldFormDialogProps {
	field?: Field | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		name: string;
		type: FieldType;
		required: boolean;
		mask: string | null;
		options: string[] | null;
	}) => Promise<void>;
}

export function FieldFormDialog({ field, open, onOpenChange, onSubmit }: FieldFormDialogProps) {
	const isEdit = !!field;
	const [name, setName] = useState("");
	const [type, setType] = useState<FieldType>("text");
	const [required, setRequired] = useState(false);
	const [mask, setMask] = useState("");
	const [optionsText, setOptionsText] = useState("");
	const [loading, setLoading] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset form when dialog opens
	useEffect(() => {
		if (field) {
			setName(field.name);
			setType(field.type);
			setRequired(field.required);
			setMask(field.mask || "");
			setOptionsText(field.options?.join(", ") || "");
		} else {
			setName("");
			setType("text");
			setRequired(false);
			setMask("");
			setOptionsText("");
		}
	}, [field, open]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setLoading(true);
		try {
			const options =
				type === "select"
					? optionsText
							.split(",")
							.map((o) => o.trim())
							.filter(Boolean)
					: null;

			await onSubmit({
				name: name.trim(),
				type,
				required,
				mask: mask.trim() || null,
				options,
			});
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
						<DialogTitle>{isEdit ? "Edit Field" : "Add Field"}</DialogTitle>
						<DialogDescription>
							{isEdit ? "Update field properties." : "Define a new field for this database."}
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="field-name">Name</Label>
							<Input
								id="field-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Full Name"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="field-type">Type</Label>
							<Select value={type} onValueChange={(v) => setType(v as FieldType)}>
								<SelectTrigger id="field-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FIELD_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t.charAt(0).toUpperCase() + t.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{type === "select" && (
							<div className="space-y-2">
								<Label htmlFor="field-options">Options (comma separated)</Label>
								<Input
									id="field-options"
									value={optionsText}
									onChange={(e) => setOptionsText(e.target.value)}
									placeholder="e.g. Active, Inactive, Pending"
								/>
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="field-mask">Mask (regex, optional)</Label>
							<Input
								id="field-mask"
								value={mask}
								onChange={(e) => setMask(e.target.value)}
								placeholder="e.g. ^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$"
							/>
						</div>
						<div className="flex items-center gap-3">
							<Switch id="field-required" checked={required} onCheckedChange={setRequired} />
							<Label htmlFor="field-required">Required</Label>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || loading}>
							{loading ? "Saving..." : isEdit ? "Save" : "Add Field"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
