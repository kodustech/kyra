import type { Database as DatabaseType } from "@kyra/shared";
import { Database, Plus } from "lucide-react";
import { Link, useLocation } from "react-router";

interface SidebarProps {
	databases: DatabaseType[];
	onCreateClick: () => void;
}

export function Sidebar({ databases, onCreateClick }: SidebarProps) {
	const location = useLocation();

	return (
		<aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
			<div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
				<span className="text-sm font-medium text-sidebar-foreground">Databases</span>
				<button
					type="button"
					onClick={onCreateClick}
					className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
					title="New database"
				>
					<Plus className="h-4 w-4" />
				</button>
			</div>

			<nav className="flex-1 overflow-y-auto p-2">
				{databases.length === 0 && (
					<p className="px-2 py-4 text-center text-xs text-muted-foreground">No databases yet</p>
				)}
				{databases.map((db) => {
					const active = location.pathname === `/databases/${db.id}`;
					return (
						<Link
							key={db.id}
							to={`/databases/${db.id}`}
							className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
								active
									? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
									: "text-sidebar-foreground hover:bg-sidebar-accent"
							}`}
						>
							<Database className="h-4 w-4 shrink-0" />
							<span className="truncate">{db.name}</span>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
