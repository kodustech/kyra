import { CreateDatabaseDialog } from "@/components/databases/create-database-dialog";
import { CreatePageDialog } from "@/components/pages/create-page-dialog";
import { useDatabases } from "@/hooks/use-databases";
import { usePages } from "@/hooks/use-pages";
import { useState } from "react";
import { Outlet } from "react-router";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function RootLayout() {
	const { databases, reorder: reorderDatabases } = useDatabases();
	const { pages, reorder: reorderPages } = usePages();
	const [showCreateDb, setShowCreateDb] = useState(false);
	const [showCreatePage, setShowCreatePage] = useState(false);

	return (
		<div className="flex h-screen overflow-hidden">
			<Sidebar
				pages={pages}
				databases={databases}
				onCreatePage={() => setShowCreatePage(true)}
				onCreateDatabase={() => setShowCreateDb(true)}
				onReorderPages={reorderPages}
				onReorderDatabases={reorderDatabases}
			/>
			<div className="flex flex-1 flex-col overflow-hidden">
				<Header />
				<main className="flex-1 overflow-y-auto p-8">
					<Outlet />
				</main>
			</div>
			<CreateDatabaseDialog open={showCreateDb} onOpenChange={setShowCreateDb} />
			<CreatePageDialog open={showCreatePage} onOpenChange={setShowCreatePage} />
		</div>
	);
}
