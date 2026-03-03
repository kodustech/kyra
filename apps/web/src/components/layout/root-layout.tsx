import { CreateDatabaseDialog } from "@/components/databases/create-database-dialog";
import { useDatabases } from "@/hooks/use-databases";
import { useState } from "react";
import { Outlet } from "react-router";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function RootLayout() {
	const { databases } = useDatabases();
	const [showCreate, setShowCreate] = useState(false);

	return (
		<div className="flex h-screen overflow-hidden">
			<Sidebar databases={databases} onCreateClick={() => setShowCreate(true)} />
			<div className="flex flex-1 flex-col overflow-hidden">
				<Header />
				<main className="flex-1 overflow-y-auto p-6">
					<Outlet />
				</main>
			</div>
			<CreateDatabaseDialog open={showCreate} onOpenChange={setShowCreate} />
		</div>
	);
}
