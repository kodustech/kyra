import { DeleteDatabaseDialog } from "@/components/databases/delete-database-dialog";
import { EditDatabaseDialog } from "@/components/databases/edit-database-dialog";
import { FieldEditor } from "@/components/fields/field-editor";
import { ColumnSettings } from "@/components/records/column-settings";
import { DataTable } from "@/components/records/data-table";
import { RecordDialog } from "@/components/records/record-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useFields } from "@/hooks/use-fields";
import { useRecords } from "@/hooks/use-records";
import { api } from "@/lib/api";
import type { Database, Record as DbRecord } from "@kyra/shared";
import { canManageDatabases } from "@kyra/shared";
import { useAuth } from "@/providers/auth-provider";
import { FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router";
import { toast } from "sonner";

export function DatabaseDetail() {
	const { user } = useAuth();
	const { databaseId = "" } = useParams<{ databaseId: string }>();

	if (user && !canManageDatabases(user.role)) {
		return <Navigate to="/" replace />;
	}
	const { fields, loading: fieldsLoading } = useFields(databaseId);
	const { records, loading: recordsLoading, create, update, remove } = useRecords(databaseId);

	const [database, setDatabase] = useState<Database | null>(null);
	const [dbLoading, setDbLoading] = useState(true);
	const [showAdd, setShowAdd] = useState(false);
	const [showEdit, setShowEdit] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [editRecord, setEditRecord] = useState<DbRecord | null>(null);
	const [deleteRecord, setDeleteRecord] = useState<DbRecord | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Column visibility & order (persisted per database in localStorage)
	const storageKey = `kyra:col-config:${databaseId}`;

	const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
	const [orderedIds, setOrderedIds] = useState<string[]>([]);
	const [colConfigReady, setColConfigReady] = useState(false);

	// Sync column config when fields load
	useEffect(() => {
		if (fieldsLoading || fields.length === 0) return;

		const fieldIds = fields.map((f) => f.id);
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw) {
				const saved = JSON.parse(raw) as { visibleIds: string[]; orderedIds: string[] };
				// Merge: keep saved order but add any new fields at the end
				const savedOrderSet = new Set(saved.orderedIds);
				const merged = [
					...saved.orderedIds.filter((id) => fieldIds.includes(id)),
					...fieldIds.filter((id) => !savedOrderSet.has(id)),
				];
				const savedVisible = new Set(saved.visibleIds.filter((id) => fieldIds.includes(id)));
				// New fields default to visible
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

	useEffect(() => {
		if (!databaseId) return;
		api
			.get<Database>(`/databases/${databaseId}`)
			.then(setDatabase)
			.catch(() => {})
			.finally(() => setDbLoading(false));
	}, [databaseId]);

	async function handleCreate(data: { [fieldId: string]: unknown }) {
		await create(data);
		toast.success("Record created");
		setShowAdd(false);
	}

	async function handleUpdate(data: { [fieldId: string]: unknown }) {
		if (!editRecord) return;
		await update(editRecord.id, data);
		toast.success("Record updated");
		setEditRecord(null);
	}

	async function handleDelete() {
		if (!deleteRecord) return;
		setDeleting(true);
		try {
			await remove(deleteRecord.id);
			toast.success("Record deleted");
			setDeleteRecord(null);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setDeleting(false);
		}
	}

	if (dbLoading || fieldsLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold">{database?.name || "Database"}</h2>
					{database?.description && (
						<p className="mt-1 text-sm text-muted-foreground">{database.description}</p>
					)}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setShowEdit(true)}
						title="Edit database"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-destructive hover:text-destructive"
						onClick={() => setShowDelete(true)}
						title="Delete database"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<FieldEditor databaseId={databaseId} />

			<Separator className="my-8" />

			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-1">
					<h3 className="text-lg font-medium">Records</h3>
					{fields.length > 0 && (
						<ColumnSettings
							fields={fields}
							visibleIds={visibleIds}
							orderedIds={orderedIds}
							onChange={handleColumnChange}
						/>
					)}
				</div>
				<Button size="sm" onClick={() => setShowAdd(true)} disabled={fields.length === 0}>
					<Plus className="mr-2 h-4 w-4" /> Add Record
				</Button>
			</div>

			{recordsLoading ? (
				<p className="py-8 text-center text-muted-foreground">Loading records...</p>
			) : records.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
					<FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
					<p className="mb-1 text-sm font-medium">No records yet</p>
					<p className="mb-3 text-xs text-muted-foreground">
						{fields.length === 0
							? "Add fields first, then create records."
							: "Create your first record."}
					</p>
					{fields.length > 0 && (
						<Button size="sm" onClick={() => setShowAdd(true)}>
							<Plus className="mr-2 h-4 w-4" /> Add Record
						</Button>
					)}
				</div>
			) : (
				<DataTable
					fields={displayFields}
					records={records}
					onEdit={setEditRecord}
					onDelete={setDeleteRecord}
				/>
			)}

			<RecordDialog
				fields={fields}
				open={showAdd}
				onOpenChange={setShowAdd}
				onSubmit={handleCreate}
			/>

			<RecordDialog
				fields={fields}
				record={editRecord}
				open={!!editRecord}
				databaseId={databaseId}
				onOpenChange={(o) => !o && setEditRecord(null)}
				onSubmit={handleUpdate}
			/>

			<Dialog open={!!deleteRecord} onOpenChange={(o) => !o && setDeleteRecord(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Record</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this record? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteRecord(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<EditDatabaseDialog
				database={database}
				open={showEdit}
				onOpenChange={setShowEdit}
				onSuccess={setDatabase}
			/>

			<DeleteDatabaseDialog
				database={database}
				open={showDelete}
				onOpenChange={setShowDelete}
			/>
		</div>
	);
}
