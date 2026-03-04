import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DataTable } from "@/components/records/data-table";
import { DynamicForm } from "@/components/records/dynamic-form";
import { RecordDialog } from "@/components/records/record-dialog";
import { useFields } from "@/hooks/use-fields";
import { useRecords } from "@/hooks/use-records";
import type { Field, Record as DbRecord, ViewType } from "@kyra/shared";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const RECORD_CHANGE_EVENT = "record-change";

export interface ColumnConfig {
	fields: Field[];
	visibleIds: Set<string>;
	orderedIds: string[];
	handleColumnChange: (visibleIds: Set<string>, orderedIds: string[]) => void;
}

interface BlockRendererProps {
	databaseId: string;
	databaseName: string;
	viewType: ViewType;
	readOnly?: boolean;
	onSubmit?: (data: { [fieldId: string]: unknown }) => Promise<void>;
	onColumnConfigReady?: (config: ColumnConfig) => void;
}

export function BlockRenderer({
	databaseId,
	databaseName,
	viewType,
	readOnly,
	onSubmit,
	onColumnConfigReady,
}: BlockRendererProps) {
	const { fields, loading: fieldsLoading, update: updateField } = useFields(databaseId);
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
	const [showAdd, setShowAdd] = useState(false);

	// Column visibility & order (persisted per database+block in localStorage)
	const storageKey = `kyra:col-config:block:${databaseId}`;
	const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
	const [orderedIds, setOrderedIds] = useState<string[]>([]);
	const [colConfigReady, setColConfigReady] = useState(false);

	useEffect(() => {
		if (fieldsLoading || fields.length === 0) return;
		const fieldIds = fields.map((f) => f.id);
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw) {
				const saved = JSON.parse(raw) as { visibleIds: string[]; orderedIds: string[] };
				const savedOrderSet = new Set(saved.orderedIds);
				const merged = [
					...saved.orderedIds.filter((id) => fieldIds.includes(id)),
					...fieldIds.filter((id) => !savedOrderSet.has(id)),
				];
				const savedVisible = new Set(saved.visibleIds.filter((id) => fieldIds.includes(id)));
				for (const id of fieldIds) {
					if (!savedOrderSet.has(id)) savedVisible.add(id);
				}
				setOrderedIds(merged);
				setVisibleIds(savedVisible);
				setColConfigReady(true);
				return;
			}
		} catch {
			// ignore corrupt localStorage
		}
		setOrderedIds(fieldIds);
		setVisibleIds(new Set(fieldIds));
		setColConfigReady(true);
	}, [fieldsLoading, fields, storageKey]);

	const handleColumnChange = useCallback(
		(nextVisible: Set<string>, nextOrder: string[]) => {
			setVisibleIds(nextVisible);
			setOrderedIds(nextOrder);
			localStorage.setItem(
				storageKey,
				JSON.stringify({ visibleIds: [...nextVisible], orderedIds: nextOrder }),
			);
		},
		[storageKey],
	);

	const displayFields = useMemo(() => {
		if (!colConfigReady) return fields;
		const fieldMap = new Map(fields.map((f) => [f.id, f]));
		return orderedIds
			.filter((id) => visibleIds.has(id))
			.map((id) => fieldMap.get(id))
			.filter(Boolean) as typeof fields;
	}, [fields, orderedIds, visibleIds, colConfigReady]);

	// Expose column config to parent (for BlockSettings) — use ref to avoid infinite loop
	const onColumnConfigReadyRef = useRef(onColumnConfigReady);
	useEffect(() => {
		onColumnConfigReadyRef.current = onColumnConfigReady;
	});

	useEffect(() => {
		if (!colConfigReady || viewType !== "table" || !onColumnConfigReadyRef.current) return;
		onColumnConfigReadyRef.current({ fields, visibleIds, orderedIds, handleColumnChange });
	}, [colConfigReady, fields, visibleIds, orderedIds, handleColumnChange, viewType]);

	// Listen for record changes from other blocks targeting the same database
	useEffect(() => {
		if (viewType !== "table" && viewType !== "kanban") return;

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

		async function handleCreate(data: { [fieldId: string]: unknown }) {
			await create(data);
			toast.success("Record created");
			setShowAdd(false);
			window.dispatchEvent(
				new CustomEvent(RECORD_CHANGE_EVENT, { detail: { databaseId } }),
			);
		}

		return (
			<>
				{!readOnly && (
					<div className="mb-3 flex items-center justify-end">
						<Button size="sm" onClick={() => setShowAdd(true)}>
							<Plus className="mr-2 h-4 w-4" /> Add Record
						</Button>
					</div>
				)}

				<DataTable
					fields={displayFields}
					records={records}
					readOnly={readOnly}
					onEdit={setEditingRecord}
					onDelete={setDeletingRecord}
				/>

				{/* Add modal */}
				<RecordDialog
					fields={fields}
					open={showAdd}
					onOpenChange={setShowAdd}
					onSubmit={handleCreate}
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

	// ─── Kanban view ──────────────────────────────────────────────────────────

	if (viewType === "kanban") {
		if (recordsLoading) {
			return <p className="py-4 text-center text-sm text-muted-foreground">Loading records...</p>;
		}

		const statusField = fields.find((f) => f.type === "kanban_status");
		if (!statusField) {
			return (
				<p className="py-4 text-center text-sm text-muted-foreground">
					Add a Kanban Status field to this database
				</p>
			);
		}

		return (
			<KanbanBoard
				fields={fields}
				records={records}
				statusField={statusField}
				readOnly={readOnly}
				onCreateRecord={async (data) => {
					const record = await create(data);
					toast.success("Record created");
					window.dispatchEvent(
						new CustomEvent(RECORD_CHANGE_EVENT, { detail: { databaseId } }),
					);
					return record;
				}}
				onUpdateRecord={async (recordId, data) => {
					const existing = records.find((r) => r.id === recordId);
					const mergedData = existing ? { ...existing.data, ...data } : data;
					const record = await update(recordId, mergedData);
					return record;
				}}
				onDeleteRecord={async (recordId) => {
					await remove(recordId);
					toast.success("Record deleted");
				}}
				onAddStatus={async (label, color) => {
					const existingOptions = statusField.settings?.options ?? [];
					const newOption = {
						id: label.toLowerCase().replace(/\s+/g, "-"),
						label,
						color,
						icon: "circle",
					};
					await updateField(statusField.id, {
						settings: { options: [...existingOptions, newOption] },
					});
				}}
			/>
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
