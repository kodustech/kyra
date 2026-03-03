import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/records/data-table";
import { DynamicForm } from "@/components/records/dynamic-form";
import { RecordDialog } from "@/components/records/record-dialog";
import { useFields } from "@/hooks/use-fields";
import { useRecords } from "@/hooks/use-records";
import type { Record as DbRecord, ViewType } from "@kyra/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const RECORD_CHANGE_EVENT = "record-change";

interface BlockRendererProps {
	databaseId: string;
	databaseName: string;
	viewType: ViewType;
	readOnly?: boolean;
	onSubmit?: (data: { [fieldId: string]: unknown }) => Promise<void>;
}

export function BlockRenderer({
	databaseId,
	databaseName,
	viewType,
	readOnly,
	onSubmit,
}: BlockRendererProps) {
	const { fields, loading: fieldsLoading } = useFields(databaseId);
	const {
		records,
		loading: recordsLoading,
		create,
		update,
		remove,
		refetch,
	} = useRecords(databaseId);

	const [editingRecord, setEditingRecord] = useState<DbRecord | null>(null);
	const [deletingRecord, setDeletingRecord] = useState<DbRecord | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Listen for record changes from other blocks targeting the same database
	useEffect(() => {
		if (viewType !== "table") return;

		function handleRecordChange(e: Event) {
			const detail = (e as CustomEvent).detail;
			if (detail?.databaseId === databaseId) {
				refetch();
			}
		}

		window.addEventListener(RECORD_CHANGE_EVENT, handleRecordChange);
		return () => window.removeEventListener(RECORD_CHANGE_EVENT, handleRecordChange);
	}, [viewType, databaseId, refetch]);

	if (fieldsLoading) {
		return <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>;
	}

	if (fields.length === 0) {
		return (
			<p className="py-4 text-center text-sm text-muted-foreground">
				No fields configured for {databaseName}
			</p>
		);
	}

	// ─── Table view ────────────────────────────────────────────────────────────

	if (viewType === "table") {
		if (recordsLoading) {
			return <p className="py-4 text-center text-sm text-muted-foreground">Loading records...</p>;
		}

		async function handleEditSubmit(data: { [fieldId: string]: unknown }) {
			if (!editingRecord) return;
			try {
				await update(editingRecord.id, data);
				toast.success("Record updated");
				setEditingRecord(null);
			} catch (err) {
				toast.error((err as Error).message);
			}
		}

		async function handleDeleteConfirm() {
			if (!deletingRecord) return;
			setDeleting(true);
			try {
				await remove(deletingRecord.id);
				toast.success("Record deleted");
				setDeletingRecord(null);
			} catch (err) {
				toast.error((err as Error).message);
			} finally {
				setDeleting(false);
			}
		}

		return (
			<>
				<DataTable
					fields={fields}
					records={records}
					readOnly={readOnly}
					onEdit={setEditingRecord}
					onDelete={setDeletingRecord}
				/>

				{/* Edit modal */}
				<RecordDialog
					fields={fields}
					record={editingRecord}
					open={!!editingRecord}
					onOpenChange={(open) => {
						if (!open) setEditingRecord(null);
					}}
					onSubmit={handleEditSubmit}
				/>

				{/* Delete confirmation */}
				<Dialog
					open={!!deletingRecord}
					onOpenChange={(open) => {
						if (!open) setDeletingRecord(null);
					}}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Delete Record</DialogTitle>
							<DialogDescription>
								Are you sure you want to delete this record? This action cannot be undone.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button variant="outline" onClick={() => setDeletingRecord(null)}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
								{deleting ? "Deleting..." : "Delete"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	// ─── Form view ─────────────────────────────────────────────────────────────

	async function handleFormSubmit(data: { [fieldId: string]: unknown }) {
		if (onSubmit) {
			await onSubmit(data);
			return;
		}
		try {
			await create(data);
			toast.success("Record created");
			window.dispatchEvent(
				new CustomEvent(RECORD_CHANGE_EVENT, { detail: { databaseId } }),
			);
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	return (
		<DynamicForm
			fields={fields}
			onSubmit={handleFormSubmit}
			onCancel={() => {}}
			submitLabel="Submit"
		/>
	);
}
