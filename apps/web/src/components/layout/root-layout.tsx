import { CreateDatabaseDialog } from "@/components/databases/create-database-dialog";
import { CreatePageDialog } from "@/components/pages/create-page-dialog";
import { useDatabases } from "@/hooks/use-databases";
import { usePages } from "@/hooks/use-pages";
import { Eye } from "lucide-react";
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
					{!hovered && (
						<button
							type="button"
							onClick={() => setHovered(true)}
							className="fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
							title="Open menu"
						>
							<Eye className="h-5 w-5" />
						</button>
					)}
					{hovered && (
						<div
							className="fixed inset-0 z-40"
							onClick={() => setHovered(false)}
						>
							<div
								className="h-full w-64 shadow-xl"
								onClick={(e) => e.stopPropagation()}
							>
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
