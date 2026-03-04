import { CreateDatabaseDialog } from "@/components/databases/create-database-dialog";
import { CreatePageDialog } from "@/components/pages/create-page-dialog";
import { useDatabases } from "@/hooks/use-databases";
import { usePages } from "@/hooks/use-pages";
import { useState } from "react";
import { Outlet } from "react-router";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

const PINNED_KEY = "kyra:sidebar-pinned";

function getInitialPinned(): boolean {
	try {
		const stored = localStorage.getItem(PINNED_KEY);
		return stored === null ? true : stored === "true";
	} catch {
		return true;
	}
}

export function RootLayout() {
	const { databases, reorder: reorderDatabases } = useDatabases();
	const { pages, reorder: reorderPages } = usePages();
	const [showCreateDb, setShowCreateDb] = useState(false);
	const [showCreatePage, setShowCreatePage] = useState(false);
	const [pinned, setPinned] = useState(getInitialPinned);
	const [hovered, setHovered] = useState(false);

	function handlePinChange(value: boolean) {
		setPinned(value);
		setHovered(false);
		try {
			localStorage.setItem(PINNED_KEY, String(value));
		} catch {
			// ignore
		}
	}

	const sidebarProps = {
		pages,
		databases,
		onCreatePage: () => setShowCreatePage(true),
		onCreateDatabase: () => setShowCreateDb(true),
		onReorderPages: reorderPages,
		onReorderDatabases: reorderDatabases,
		pinned,
		onPinChange: handlePinChange,
	};

	return (
		<div className="flex h-screen overflow-hidden">
			{pinned ? (
				<Sidebar {...sidebarProps} />
			) : (
				<>
					{/* Hover trigger zone */}
					<div
						className="fixed left-0 top-0 z-50 h-screen w-1.5"
						onMouseEnter={() => setHovered(true)}
					/>
					{hovered && (
						<div
							className="fixed inset-0 z-40"
							onMouseLeave={() => setHovered(false)}
						>
							<div className="h-screen w-64 shadow-xl">
								<Sidebar {...sidebarProps} />
							</div>
						</div>
					)}
				</>
			)}
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
