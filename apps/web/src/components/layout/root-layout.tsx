import { CreateDatabaseDialog } from "@/components/databases/create-database-dialog";
import { CreatePageDialog } from "@/components/pages/create-page-dialog";
import { PageIcon } from "@/components/ui/icon-picker";
import { useDatabases } from "@/hooks/use-databases";
import { usePages } from "@/hooks/use-pages";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { canEditContent, canManageDatabases } from "@kyra/shared";
import { Database, PinOff, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
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
	const { user } = useAuth();
	const location = useLocation();
	const [showCreateDb, setShowCreateDb] = useState(false);
	const [showCreatePage, setShowCreatePage] = useState(false);
	const [pinned, setPinned] = useState(getInitialPinned);
	const [hovered, setHovered] = useState(false);
	// Keep sidebar mounted during exit animation
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (hovered) {
			setMounted(true);
		} else {
			const timer = setTimeout(() => setMounted(false), 200);
			return () => clearTimeout(timer);
		}
	}, [hovered]);

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
		userRole: user?.role,
	};

	const canAddPages = !user?.role || canEditContent(user.role);
	const canSeeDbSection = !user?.role || canManageDatabases(user.role);

	return (
		<div className="flex h-screen overflow-hidden">
			{pinned ? (
				<Sidebar {...sidebarProps} />
			) : (
				<div
					className="relative h-full shrink-0"
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
				>
					{/* Mini sidebar — icon-only, always visible when unpinned */}
					<aside className="flex h-full w-14 flex-col items-center border-r border-sidebar-border bg-sidebar py-2 gap-1">
						{/* Pin button */}
						<button
							type="button"
							onClick={() => handlePinChange(true)}
							className="mb-2 flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
							title="Pin sidebar"
						>
							<PinOff className="h-4 w-4" />
						</button>

						{/* Page icons */}
						{pages.map((page) => (
							<Link
								key={page.id}
								to={`/pages/${page.id}`}
								title={page.name}
								className={cn(
									"flex h-8 w-8 items-center justify-center rounded-md transition-colors",
									location.pathname === `/pages/${page.id}`
										? "bg-sidebar-accent text-sidebar-accent-foreground"
										: "text-sidebar-foreground hover:bg-sidebar-accent",
								)}
							>
								<PageIcon name={page.icon} className="h-4 w-4" />
							</Link>
						))}

						{/* Add page */}
						{canAddPages && (
							<button
								type="button"
								onClick={() => setShowCreatePage(true)}
								className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
								title="New page"
							>
								<Plus className="h-3.5 w-3.5" />
							</button>
						)}

						{/* Databases */}
						{canSeeDbSection && (
							<>
								<div className="my-1 h-px w-6 bg-sidebar-border" />
								{databases.map((db) => (
									<Link
										key={db.id}
										to={`/databases/${db.id}`}
										title={db.name}
										className={cn(
											"flex h-8 w-8 items-center justify-center rounded-md transition-colors",
											location.pathname === `/databases/${db.id}`
												? "bg-sidebar-accent text-sidebar-accent-foreground"
												: "text-sidebar-foreground hover:bg-sidebar-accent",
										)}
									>
										<Database className="h-4 w-4" />
									</Link>
								))}
								<button
									type="button"
									onClick={() => setShowCreateDb(true)}
									className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
									title="New database"
								>
									<Plus className="h-3.5 w-3.5" />
								</button>
							</>
						)}
					</aside>

					{/* Full sidebar overlay on hover */}
					{mounted && (
						<div
							className={cn(
								"absolute left-0 top-0 z-40 h-full w-64 shadow-xl transition-all duration-200 ease-out",
								hovered
									? "translate-x-0 opacity-100"
									: "-translate-x-4 opacity-0 pointer-events-none",
							)}
						>
							<Sidebar {...sidebarProps} />
						</div>
					)}
				</div>
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
