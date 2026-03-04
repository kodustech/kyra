import { CreateDatabaseDialog } from "@/components/databases/create-database-dialog";
import { DatabaseCard } from "@/components/databases/database-card";
import { DeleteDatabaseDialog } from "@/components/databases/delete-database-dialog";
import { EditDatabaseDialog } from "@/components/databases/edit-database-dialog";
import { CreatePageDialog } from "@/components/pages/create-page-dialog";
import { DeletePageDialog } from "@/components/pages/delete-page-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDatabases } from "@/hooks/use-databases";
import { usePages } from "@/hooks/use-pages";
import type { Database as DatabaseType, Page as PageType } from "@kyra/shared";
import { PageIcon } from "@/components/ui/icon-picker";
import { Database, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export function Dashboard() {
	const { pages, loading: pagesLoading } = usePages();
	const { databases, loading: dbLoading } = useDatabases();
	const [showCreatePage, setShowCreatePage] = useState(false);
	const [showCreateDb, setShowCreateDb] = useState(false);
	const [editDb, setEditDb] = useState<DatabaseType | null>(null);
	const [deleteDb, setDeleteDb] = useState<DatabaseType | null>(null);
	const [deletePage, setDeletePage] = useState<PageType | null>(null);

	if (pagesLoading && dbLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div>
			{/* Pages section */}
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-semibold">Pages</h2>
				<Button onClick={() => setShowCreatePage(true)}>
					<Plus className="mr-2 h-4 w-4" /> New Page
				</Button>
			</div>

			{pages.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
					<FileText className="mb-4 h-12 w-12 text-muted-foreground" />
					<p className="mb-2 text-lg font-medium">No pages yet</p>
					<p className="mb-4 text-sm text-muted-foreground">
						Create your first page to get started.
					</p>
					<Button onClick={() => setShowCreatePage(true)}>
						<Plus className="mr-2 h-4 w-4" /> Create Page
					</Button>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{pages.map((page) => (
						<Link
							key={page.id}
							to={`/pages/${page.id}`}
							className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<PageIcon name={page.icon} className="h-5 w-5 text-muted-foreground" />
									<span className="font-medium">{page.name}</span>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										setDeletePage(page);
									}}
									className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
								>
									<span className="text-xs">Delete</span>
								</button>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">/p/{page.slug}</p>
							<span
								className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
									page.published
										? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
										: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
								}`}
							>
								{page.published ? "Published" : "Draft"}
							</span>
						</Link>
					))}
				</div>
			)}

			<Separator className="my-8" />

			{/* Databases section */}
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-semibold">Databases</h2>
				<Button onClick={() => setShowCreateDb(true)}>
					<Plus className="mr-2 h-4 w-4" /> New Database
				</Button>
			</div>

			{databases.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
					<Database className="mb-4 h-12 w-12 text-muted-foreground" />
					<p className="mb-2 text-lg font-medium">No databases yet</p>
					<p className="mb-4 text-sm text-muted-foreground">
						Create your first database to get started.
					</p>
					<Button onClick={() => setShowCreateDb(true)}>
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

			<CreatePageDialog open={showCreatePage} onOpenChange={setShowCreatePage} />
			<CreateDatabaseDialog open={showCreateDb} onOpenChange={setShowCreateDb} />
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
			<DeletePageDialog
				page={deletePage}
				open={!!deletePage}
				onOpenChange={(o) => !o && setDeletePage(null)}
			/>
		</div>
	);
}
