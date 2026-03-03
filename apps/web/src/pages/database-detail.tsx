import { FieldEditor } from "@/components/fields/field-editor";
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
import { FileSpreadsheet, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

export function DatabaseDetail() {
	const { databaseId = "" } = useParams<{ databaseId: string }>();
	const { fields, loading: fieldsLoading } = useFields(databaseId);
	const { records, loading: recordsLoading, create, update, remove } = useRecords(databaseId);

	const [database, setDatabase] = useState<Database | null>(null);
	const [dbLoading, setDbLoading] = useState(true);
	const [showAdd, setShowAdd] = useState(false);
	const [editRecord, setEditRecord] = useState<DbRecord | null>(null);
	const [deleteRecord, setDeleteRecord] = useState<DbRecord | null>(null);
	const [deleting, setDeleting] = useState(false);

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
			<div className="mb-6">
				<h2 className="text-2xl font-semibold">{database?.name || "Database"}</h2>
				{database?.description && (
					<p className="mt-1 text-sm text-muted-foreground">{database.description}</p>
				)}
			</div>

			<FieldEditor databaseId={databaseId} />

			<Separator className="my-8" />

			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-medium">Records</h3>
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
					fields={fields}
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
		</div>
	);
}
