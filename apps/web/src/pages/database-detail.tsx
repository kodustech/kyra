import { DeleteDatabaseDialog } from "@/components/databases/delete-database-dialog";
import { EditDatabaseDialog } from "@/components/databases/edit-database-dialog";
import { FieldEditor } from "@/components/fields/field-editor";
import { Button } from "@/components/ui/button";
import { useFields } from "@/hooks/use-fields";
import { api } from "@/lib/api";
import type { Database } from "@kyra/shared";
import { canManageDatabases } from "@kyra/shared";
import { useAuth } from "@/providers/auth-provider";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router";

export function DatabaseDetail() {
	const { user } = useAuth();
	const { databaseId = "" } = useParams<{ databaseId: string }>();

	if (user && !canManageDatabases(user.role)) {
		return <Navigate to="/" replace />;
	}
	const { loading: fieldsLoading } = useFields(databaseId);

	const [database, setDatabase] = useState<Database | null>(null);
	const [dbLoading, setDbLoading] = useState(true);
	const [showEdit, setShowEdit] = useState(false);
	const [showDelete, setShowDelete] = useState(false);

	useEffect(() => {
		if (!databaseId) return;
		api
			.get<Database>(`/databases/${databaseId}`)
			.then(setDatabase)
			.catch(() => {})
			.finally(() => setDbLoading(false));
	}, [databaseId]);

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
