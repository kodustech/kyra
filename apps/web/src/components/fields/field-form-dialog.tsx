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
import { FIELD_TYPES, type Field, type FieldType, type KanbanStatusOption } from "@kyra/shared";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS = [
	{ id: "gray", label: "Gray" },
	{ id: "red", label: "Red" },
	{ id: "orange", label: "Orange" },
	{ id: "yellow", label: "Yellow" },
	{ id: "green", label: "Green" },
	{ id: "blue", label: "Blue" },
	{ id: "purple", label: "Purple" },
	{ id: "pink", label: "Pink" },
] as const;

const DEFAULT_KANBAN_OPTIONS: KanbanStatusOption[] = [
	{ id: "todo", label: "To-do", color: "gray", icon: "circle" },
	{ id: "in-progress", label: "In Progress", color: "blue", icon: "loader" },
	{ id: "done", label: "Done", color: "green", icon: "circle-check" },
];

const COLOR_DOT: Record<string, string> = {
	gray: "bg-gray-400",
	red: "bg-red-500",
	orange: "bg-orange-500",
	yellow: "bg-yellow-500",
	green: "bg-green-500",
	blue: "bg-blue-500",
	purple: "bg-purple-500",
	pink: "bg-pink-500",
};

interface FieldFormDialogProps {
	field?: Field | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasKanbanStatus?: boolean;
	onSubmit: (data: {
		name: string;
		type: FieldType;
		required: boolean;
		mask: string | null;
		options: string[] | null;
		settings?: { options: KanbanStatusOption[] } | null;
		highlight?: boolean;
	}) => Promise<void>;
}

export function FieldFormDialog({ field, open, onOpenChange, hasKanbanStatus, onSubmit }: FieldFormDialogProps) {
	const isEdit = !!field;
	const [name, setName] = useState("");
	const [type, setType] = useState<FieldType>("text");
	const [required, setRequired] = useState(false);
	const [mask, setMask] = useState("");
	const [optionsText, setOptionsText] = useState("");
	const [loading, setLoading] = useState(false);
	const [kanbanOptions, setKanbanOptions] = useState<KanbanStatusOption[]>(DEFAULT_KANBAN_OPTIONS);
	const [highlight, setHighlight] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset form when dialog opens
	useEffect(() => {
		if (field) {
			setName(field.name);
			setType(field.type);
			setRequired(field.required);
			setMask(field.mask || "");
			setOptionsText(field.options?.join(", ") || "");
			setKanbanOptions(field.settings?.options ?? DEFAULT_KANBAN_OPTIONS);
			setHighlight(field.highlight ?? false);
		} else {
			setName("");
			setType("text");
			setRequired(false);
			setMask("");
			setOptionsText("");
			setKanbanOptions(DEFAULT_KANBAN_OPTIONS);
			setHighlight(false);
		}
	}, [field, open]);

	function resetForm() {
		setName("");
		setType("text");
		setRequired(false);
		setMask("");
		setOptionsText("");
		setKanbanOptions(DEFAULT_KANBAN_OPTIONS);
		setHighlight(false);
	}

	async function handleSubmit(e: React.FormEvent, addAnother = false) {
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

			// Derive stable IDs from labels for new kanban options at submit time
			const finalKanbanOptions =
				type === "kanban_status"
					? kanbanOptions.map((opt) => ({
							...opt,
							id: opt.label
								? opt.label.toLowerCase().replace(/\s+/g, "-")
								: opt.id,
						}))
					: null;

			await onSubmit({
				name: name.trim(),
				type,
				required: type === "kanban_status" ? false : required,
				mask: type === "kanban_status" ? null : mask.trim() || null,
				options,
				settings: finalKanbanOptions ? { options: finalKanbanOptions } : null,
				highlight,
			});

			if (addAnother) {
				resetForm();
				toast.success("Field added");
			} else {
				onOpenChange(false);
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
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEdit ? "Edit Field" : "Add Field"}</DialogTitle>
						<DialogDescription>
							{isEdit ? "Update field properties." : "Define a new field for this database."}
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
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
											{t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
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
						{type === "kanban_status" && (
							<div className="space-y-2">
								<Label>Status Options</Label>
								<div className="space-y-2 rounded-md border border-border p-3">
									{kanbanOptions.map((opt, idx) => (
										<div key={idx} className="flex items-center gap-2">
											<Input
												className="flex-1"
												value={opt.label}
												onChange={(e) => {
													const next = [...kanbanOptions];
													next[idx] = {
														...opt,
														label: e.target.value,
													};
													setKanbanOptions(next);
												}}
												placeholder="Status label"
											/>
											<Select
												value={opt.color}
												onValueChange={(color) => {
													const next = [...kanbanOptions];
													next[idx] = { ...opt, color };
													setKanbanOptions(next);
												}}
											>
												<SelectTrigger className="w-10">
													<span className={`h-3 w-3 rounded-full ${COLOR_DOT[opt.color] || "bg-gray-400"}`} />
												</SelectTrigger>
												<SelectContent position="popper">
													{STATUS_COLORS.map((c) => (
														<SelectItem key={c.id} value={c.id}>
															<span className={`h-3 w-3 rounded-full ${COLOR_DOT[c.id]}`} />
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{kanbanOptions.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 shrink-0"
													onClick={() => setKanbanOptions(kanbanOptions.filter((_, i) => i !== idx))}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											)}
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full"
										onClick={() =>
											setKanbanOptions([
												...kanbanOptions,
												{
													id: `status-${Date.now()}`,
													label: "",
													color: "gray",
													icon: "circle",
												},
											])
										}
									>
										<Plus className="mr-1 h-3.5 w-3.5" /> Add status
									</Button>
								</div>
							</div>
						)}
						{type !== "kanban_status" && (
							<>
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
							</>
						)}
						{hasKanbanStatus && (
							<div className="flex items-center gap-3">
								<Switch id="field-highlight" checked={highlight} onCheckedChange={setHighlight} />
								<Label htmlFor="field-highlight">Highlight on cards</Label>
							</div>
						)}
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						{!isEdit && (
							<Button
								type="button"
								variant="outline"
								disabled={!name.trim() || loading}
								onClick={(e) => handleSubmit(e, true)}
							>
								Add & Add Another
							</Button>
						)}
						<Button type="submit" disabled={!name.trim() || loading}>
							{loading ? "Saving..." : isEdit ? "Save" : "Add Field"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
