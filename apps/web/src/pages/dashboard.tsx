import { CreateDatabaseDialog } from "@/components/databases/create-database-dialog";
import { DatabaseCard } from "@/components/databases/database-card";
import { DeleteDatabaseDialog } from "@/components/databases/delete-database-dialog";
import { EditDatabaseDialog } from "@/components/databases/edit-database-dialog";
import { Button } from "@/components/ui/button";
import { useDatabases } from "@/hooks/use-databases";
import type { Database as DatabaseType } from "@kyra/shared";
import { Database, Plus } from "lucide-react";
import { useState } from "react";

export function Dashboard() {
	const { databases, loading } = useDatabases();
	const [showCreate, setShowCreate] = useState(false);
	const [editDb, setEditDb] = useState<DatabaseType | null>(null);
	const [deleteDb, setDeleteDb] = useState<DatabaseType | null>(null);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading databases...</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-semibold">Databases</h2>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" /> New Database
				</Button>
			</div>

			{databases.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
					<Database className="mb-4 h-12 w-12 text-muted-foreground" />
					<p className="mb-2 text-lg font-medium">No databases yet</p>
					<p className="mb-4 text-sm text-muted-foreground">
						Create your first database to get started.
					</p>
					<Button onClick={() => setShowCreate(true)}>
						<Plus className="mr-2 h-4 w-4" /> Create Database
					</Button>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{databases.map((db) => (
						<DatabaseCard key={db.id} database={db} onEdit={setEditDb} onDelete={setDeleteDb} />
					))}
				</div>
			)}

			<CreateDatabaseDialog open={showCreate} onOpenChange={setShowCreate} />
			<EditDatabaseDialog
				database={editDb}
				open={!!editDb}
				onOpenChange={(o) => !o && setEditDb(null)}
			/>
			<DeleteDatabaseDialog
				database={deleteDb}
				open={!!deleteDb}
				onOpenChange={(o) => !o && setDeleteDb(null)}
			/>
		</div>
	);
}
