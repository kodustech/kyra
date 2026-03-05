import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Database as DatabaseType, Page as PageType, UserRole } from "@kyra/shared";
import { canEditContent, canManageDatabases } from "@kyra/shared";
import { PageIcon } from "@/components/ui/icon-picker";
import { ChevronDown, Database, GripVertical, Pin, PinOff, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";

interface SidebarProps {
	pages: PageType[];
	databases: DatabaseType[];
	onCreatePage: () => void;
	onCreateDatabase: () => void;
	onReorderPages: (pageIds: string[]) => void;
	onReorderDatabases: (databaseIds: string[]) => void;
	pinned: boolean;
	onPinChange: (pinned: boolean) => void;
	userRole?: UserRole;
}

export function Sidebar({
	pages,
	databases,
	onCreatePage,
	onCreateDatabase,
	onReorderPages,
	onReorderDatabases,
	pinned,
	onPinChange,
	userRole,
}: SidebarProps) {
	const location = useLocation();
	const [pagesOpen, setPagesOpen] = useState(true);
	const [dbOpen, setDbOpen] = useState(true);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handlePagesDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = pages.findIndex((p) => p.id === active.id);
		const newIndex = pages.findIndex((p) => p.id === over.id);
		const reordered = [...pages];
		const [moved] = reordered.splice(oldIndex, 1);
		reordered.splice(newIndex, 0, moved);
		onReorderPages(reordered.map((p) => p.id));
	}

	function handleDbDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = databases.findIndex((d) => d.id === active.id);
		const newIndex = databases.findIndex((d) => d.id === over.id);
		const reordered = [...databases];
		const [moved] = reordered.splice(oldIndex, 1);
		reordered.splice(newIndex, 0, moved);
		onReorderDatabases(reordered.map((d) => d.id));
	}

	return (
		<aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
			{/* Pin/Unpin button */}
			<div className="flex justify-end px-3 pt-2">
				<button
					type="button"
					onClick={() => onPinChange(!pinned)}
					className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
					title={pinned ? "Unpin sidebar" : "Pin sidebar"}
				>
					{pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
				</button>
			</div>

			{/* Pages section */}
			<SectionHeader
				label="Pages"
				open={pagesOpen}
				onToggle={() => setPagesOpen((v) => !v)}
				onAdd={onCreatePage}
				addTitle="New page"
				showAdd={!userRole || canEditContent(userRole)}
			/>
			{pagesOpen && (
				<nav className="overflow-y-auto p-2">
					{pages.length === 0 ? (
						<p className="px-2 py-4 text-center text-xs text-muted-foreground">No pages yet</p>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handlePagesDragEnd}
						>
							<SortableContext
								items={pages.map((p) => p.id)}
								strategy={verticalListSortingStrategy}
							>
								{pages.map((page) => (
									<SortableNavItem
										key={page.id}
										id={page.id}
										to={`/pages/${page.id}`}
										label={page.name}
										icon={<PageIcon name={page.icon} className="h-4 w-4 shrink-0" />}
										active={location.pathname === `/pages/${page.id}`}
									/>
								))}
							</SortableContext>
						</DndContext>
					)}
				</nav>
			)}

			{/* Databases section — only for users who can manage databases */}
			{(!userRole || canManageDatabases(userRole)) && (
				<>
					<SectionHeader
						label="Databases"
						open={dbOpen}
						onToggle={() => setDbOpen((v) => !v)}
						onAdd={onCreateDatabase}
						addTitle="New database"
						borderTop
					/>
					{dbOpen && (
						<nav className="flex-1 overflow-y-auto p-2">
							{databases.length === 0 ? (
								<p className="px-2 py-4 text-center text-xs text-muted-foreground">No databases yet</p>
							) : (
								<DndContext
									sensors={sensors}
									collisionDetection={closestCenter}
									onDragEnd={handleDbDragEnd}
								>
									<SortableContext
										items={databases.map((d) => d.id)}
										strategy={verticalListSortingStrategy}
									>
										{databases.map((db) => (
											<SortableNavItem
												key={db.id}
												id={db.id}
												to={`/databases/${db.id}`}
												label={db.name}
												icon={<Database className="h-4 w-4 shrink-0" />}
												active={location.pathname === `/databases/${db.id}`}
											/>
										))}
									</SortableContext>
								</DndContext>
							)}
						</nav>
					)}
				</>
			)}
		</aside>
	);
}

// ─── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({
	label,
	open,
	onToggle,
	onAdd,
	addTitle,
	borderTop,
	showAdd = true,
}: {
	label: string;
	open: boolean;
	onToggle: () => void;
	onAdd: () => void;
	addTitle: string;
	borderTop?: boolean;
	showAdd?: boolean;
}) {
	return (
		<div
			className={`flex h-12 items-center justify-between border-b border-sidebar-border px-4 ${borderTop ? "border-t" : ""}`}
		>
			<button
				type="button"
				onClick={onToggle}
				className="flex items-center gap-1 text-sm font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
			>
				<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
				{label}
			</button>
			{showAdd && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onAdd();
					}}
					className="inline-flex h-6 w-6 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
					title={addTitle}
				>
					<Plus className="h-3.5 w-3.5" />
				</button>
			)}
		</div>
	);
}

// ─── Sortable Nav Item ──────────────────────────────────────────────────────────

function SortableNavItem({
	id,
	to,
	label,
	icon,
	active,
}: {
	id: string;
	to: string;
	label: string;
	icon: React.ReactNode;
	active: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="group flex items-center">
			<button
				type="button"
				className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center text-transparent group-hover:text-muted-foreground"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-3 w-3" />
			</button>
			<Link
				to={to}
				className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
						: "text-sidebar-foreground hover:bg-sidebar-accent"
				}`}
			>
				{icon}
				<span className="truncate">{label}</span>
			</Link>
		</div>
	);
}
