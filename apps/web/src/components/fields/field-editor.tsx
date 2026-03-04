import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useFields } from "@/hooks/use-fields";
import type { Field, FieldType, KanbanStatusOption } from "@kyra/shared";
import { Columns3, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FieldFormDialog } from "./field-form-dialog";
import { SortableFieldList } from "./sortable-field-list";

interface FieldEditorProps {
	databaseId: string;
}

export function FieldEditor({ databaseId }: FieldEditorProps) {
	const { fields, loading, create, update, remove, reorder } = useFields(databaseId);
	const [showAdd, setShowAdd] = useState(false);
	const [editField, setEditField] = useState<Field | null>(null);
	const [deleteField, setDeleteField] = useState<Field | null>(null);
	const [deleting, setDeleting] = useState(false);

	const hasKanbanStatus = fields.some((f) => f.type === "kanban_status");

	async function handleCreate(data: {
		name: string;
		type: FieldType;
		required: boolean;
		mask: string | null;
		options: string[] | null;
		settings?: { options: KanbanStatusOption[] } | null;
		highlight?: boolean;
	}) {
		await create({ ...data, highlight: data.highlight ?? false });
		toast.success("Field added");
	}

	async function handleUpdate(data: {
		name: string;
		type: FieldType;
		required: boolean;
		mask: string | null;
		options: string[] | null;
		settings?: { options: KanbanStatusOption[] } | null;
		highlight?: boolean;
	}) {
		if (!editField) return;
		await update(editField.id, { ...data, highlight: data.highlight ?? false });
		toast.success("Field updated");
		setEditField(null);
	}

	async function handleDelete() {
		if (!deleteField) return;
		setDeleting(true);
		try {
			await remove(deleteField.id);
			toast.success("Field deleted");
			setDeleteField(null);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setDeleting(false);
		}
	}

	async function handleReorder(fieldIds: string[]) {
		try {
			await reorder(fieldIds);
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	if (loading) {
		return <p className="py-8 text-center text-muted-foreground">Loading fields...</p>;
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-medium">Fields</h3>
				<Button size="sm" onClick={() => setShowAdd(true)}>
					<Plus className="mr-2 h-4 w-4" /> Add Field
				</Button>
			</div>

			{fields.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
					<Columns3 className="mb-3 h-10 w-10 text-muted-foreground" />
					<p className="mb-1 text-sm font-medium">No fields defined</p>
					<p className="mb-3 text-xs text-muted-foreground">
						Add fields to define your database schema.
					</p>
					<Button size="sm" onClick={() => setShowAdd(true)}>
						<Plus className="mr-2 h-4 w-4" /> Add Field
					</Button>
				</div>
			) : (
				<SortableFieldList
					fields={fields}
					onReorder={handleReorder}
					onEdit={setEditField}
					onDelete={setDeleteField}
				/>
			)}

			<FieldFormDialog open={showAdd} onOpenChange={setShowAdd} hasKanbanStatus={hasKanbanStatus} onSubmit={handleCreate} />

			<FieldFormDialog
				field={editField}
				open={!!editField}
				onOpenChange={(o) => !o && setEditField(null)}
				hasKanbanStatus={hasKanbanStatus}
				onSubmit={handleUpdate}
			/>

			<Dialog open={!!deleteField} onOpenChange={(o) => !o && setDeleteField(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Field</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete <strong>{deleteField?.name}</strong>? Existing records
							will lose this field&apos;s data.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteField(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
