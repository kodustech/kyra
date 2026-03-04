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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { FIELD_TYPES, type CreateFieldInput, type FieldType } from "@kyra/shared";
import { Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface FieldRow {
	_key: string;
	name: string;
	type: FieldType;
	required: boolean;
	options: string;
	mask: string;
	highlight: boolean;
	_error?: string;
}

function createEmptyRow(): FieldRow {
	return {
		_key: crypto.randomUUID(),
		name: "",
		type: "text",
		required: false,
		options: "",
		mask: "",
		highlight: false,
	};
}

interface BulkFieldEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasKanbanStatus: boolean;
	onSave: (inputs: CreateFieldInput[]) => Promise<void>;
}

export function BulkFieldEditor({ open, onOpenChange, hasKanbanStatus, onSave }: BulkFieldEditorProps) {
	const [rows, setRows] = useState<FieldRow[]>([createEmptyRow()]);
	const [saving, setSaving] = useState(false);

	const filledRows = rows.filter((r) => r.name.trim() !== "");
	const saveCount = filledRows.length;

	const updateRow = useCallback((key: string, patch: Partial<FieldRow>) => {
		setRows((prev) => {
			const updated = prev.map((r) => (r._key === key ? { ...r, ...patch, _error: undefined } : r));

			// Auto-grow: if the last row now has a name, add a new empty row
			const last = updated[updated.length - 1];
			if (last && last.name.trim() !== "") {
				updated.push(createEmptyRow());
			}

			return updated;
		});
	}, []);

	const removeRow = useCallback((key: string) => {
		setRows((prev) => {
			const filtered = prev.filter((r) => r._key !== key);
			// Always keep at least one empty row
			if (filtered.length === 0 || filtered[filtered.length - 1].name.trim() !== "") {
				filtered.push(createEmptyRow());
			}
			return filtered;
		});
	}, []);

	function validate(): CreateFieldInput[] | null {
		const filled = rows.filter((r) => r.name.trim() !== "");
		if (filled.length === 0) {
			toast.error("Add at least one field");
			return null;
		}

		let hasError = false;
		const names = new Set<string>();
		const kanbanInBatch = filled.filter((r) => r.type === "kanban_status").length;

		const updated = rows.map((r) => {
			if (r.name.trim() === "") return r;

			const nameLower = r.name.trim().toLowerCase();
			if (names.has(nameLower)) {
				hasError = true;
				return { ...r, _error: "Duplicate name" };
			}
			names.add(nameLower);

			if (r.type === "select" && r.options.trim() === "") {
				hasError = true;
				return { ...r, _error: "Options required for select" };
			}

			if (r.type === "kanban_status" && hasKanbanStatus) {
				hasError = true;
				return { ...r, _error: "Kanban status already exists" };
			}

			if (r.type === "kanban_status" && kanbanInBatch > 1) {
				hasError = true;
				return { ...r, _error: "Only one kanban status allowed" };
			}

			return { ...r, _error: undefined };
		});

		if (hasError) {
			setRows(updated);
			return null;
		}

		return filled.map((r) => {
			const input: CreateFieldInput = {
				name: r.name.trim(),
				type: r.type,
				required: r.type === "kanban_status" ? false : r.required,
				mask: r.type === "kanban_status" ? null : r.mask.trim() || null,
				options: r.type === "select" ? r.options.split(",").map((o) => o.trim()).filter(Boolean) : null,
				highlight: r.highlight,
			};
			return input;
		});
	}

	async function handleSave() {
		const inputs = validate();
		if (!inputs) return;

		setSaving(true);
		try {
			await onSave(inputs);
			toast.success(`${inputs.length} field(s) created`);
			setRows([createEmptyRow()]);
			onOpenChange(false);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	}

	function handleOpenChange(value: boolean) {
		if (!value) {
			setRows([createEmptyRow()]);
		}
		onOpenChange(value);
	}

	// Determine if kanban_status should be available in type select
	const hasKanbanInBatch = rows.some((r) => r.type === "kanban_status" && r.name.trim() !== "");
	const kanbanDisabled = hasKanbanStatus || hasKanbanInBatch;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Add Fields</DialogTitle>
					<DialogDescription>Add multiple fields at once. Type a name to start a new row.</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-auto min-h-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10">#</TableHead>
								<TableHead className="min-w-[180px]">Name</TableHead>
								<TableHead className="w-[150px]">Type</TableHead>
								<TableHead className="w-[80px]">Required</TableHead>
								<TableHead className="min-w-[180px]">Options / Mask</TableHead>
								{hasKanbanStatus && <TableHead className="w-[80px]">Highlight</TableHead>}
								<TableHead className="w-10" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row, index) => {
								const isLastEmpty = index === rows.length - 1 && row.name.trim() === "";

								return (
									<TableRow key={row._key} className={row._error ? "bg-destructive/5" : undefined}>
										<TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
										<TableCell>
											<div className="space-y-1">
												<Input
													placeholder={isLastEmpty ? "Type to add a field..." : "Field name"}
													value={row.name}
													onChange={(e) => updateRow(row._key, { name: e.target.value })}
													className="h-8"
												/>
												{row._error && (
													<p className="text-xs text-destructive">{row._error}</p>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Select
												value={row.type}
												onValueChange={(value) => updateRow(row._key, { type: value as FieldType })}
											>
												<SelectTrigger className="h-8">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{FIELD_TYPES.map((ft) => (
														<SelectItem
															key={ft}
															value={ft}
															disabled={ft === "kanban_status" && kanbanDisabled && row.type !== "kanban_status"}
														>
															{ft.replace(/_/g, " ")}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											{row.type !== "kanban_status" && (
												<Switch
													checked={row.required}
													onCheckedChange={(checked) => updateRow(row._key, { required: checked })}
												/>
											)}
										</TableCell>
										<TableCell>
											{row.type === "select" ? (
												<Input
													placeholder="opt1, opt2, opt3"
													value={row.options}
													onChange={(e) => updateRow(row._key, { options: e.target.value })}
													className="h-8"
												/>
											) : row.type === "kanban_status" ? (
												<span className="text-muted-foreground text-xs">Defaults applied</span>
											) : (
												<Input
													placeholder="Regex mask (optional)"
													value={row.mask}
													onChange={(e) => updateRow(row._key, { mask: e.target.value })}
													className="h-8"
												/>
											)}
										</TableCell>
										{hasKanbanStatus && (
											<TableCell>
												<Switch
													checked={row.highlight}
													onCheckedChange={(checked) => updateRow(row._key, { highlight: checked })}
												/>
											</TableCell>
										)}
										<TableCell>
											{!isLastEmpty && (
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													onClick={() => removeRow(row._key)}
												>
													<X className="h-4 w-4" />
												</Button>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={saving || saveCount === 0}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Save {saveCount} field{saveCount !== 1 ? "s" : ""}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
