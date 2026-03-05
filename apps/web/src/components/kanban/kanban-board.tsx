import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCorners,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
	type DragOverEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RecordDialog } from "@/components/records/record-dialog";
import type { Record as DbRecord, Field, KanbanStatusOption } from "@kyra/shared";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";

interface KanbanBoardProps {
	fields: Field[];
	records: DbRecord[];
	statusField: Field;
	readOnly?: boolean;
	onCreateRecord: (data: { [fieldId: string]: unknown }) => Promise<DbRecord>;
	onUpdateRecord: (recordId: string, data: { [fieldId: string]: unknown }) => Promise<DbRecord>;
	onDeleteRecord: (recordId: string) => Promise<void>;
	onAddStatus?: (label: string, color: string) => Promise<void>;
	onReorderColumns?: (reordered: KanbanStatusOption[]) => Promise<void>;
}

const ADD_STATUS_COLORS = [
	{ id: "gray", cls: "bg-gray-400" },
	{ id: "red", cls: "bg-red-500" },
	{ id: "orange", cls: "bg-orange-500" },
	{ id: "yellow", cls: "bg-yellow-500" },
	{ id: "green", cls: "bg-green-500" },
	{ id: "blue", cls: "bg-blue-500" },
	{ id: "purple", cls: "bg-purple-500" },
	{ id: "pink", cls: "bg-pink-500" },
];

export function KanbanBoard({
	fields,
	records,
	statusField,
	readOnly,
	onCreateRecord,
	onUpdateRecord,
	onAddStatus,
	onReorderColumns,
}: KanbanBoardProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [activeType, setActiveType] = useState<"card" | "column" | null>(null);
	const [editingRecord, setEditingRecord] = useState<DbRecord | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [newLabel, setNewLabel] = useState("");
	const [newColor, setNewColor] = useState("gray");

	const statusOptions = statusField.settings?.options ?? [];
	const firstStatusId = statusOptions[0]?.id ?? "";

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	// Group records by status
	const recordsByStatus = useMemo(() => {
		const map = new Map<string, DbRecord[]>();
		for (const opt of statusOptions) {
			map.set(opt.id, []);
		}
		for (const record of records) {
			const statusVal = record.data[statusField.id] as string | undefined;
			const key = statusVal && map.has(statusVal) ? statusVal : firstStatusId;
			const arr = map.get(key);
			if (arr) arr.push(record);
		}
		// Sort each column by created_at ascending
		for (const arr of map.values()) {
			arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
		}
		return map;
	}, [records, statusField.id, statusOptions, firstStatusId]);

	const activeRecord = activeId ? records.find((r) => r.id === activeId) : null;

	const columnIds = useMemo(() => statusOptions.map((opt) => `column-${opt.id}`), [statusOptions]);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		const id = event.active.id as string;
		setActiveId(id);
		setActiveType(id.startsWith("column-") ? "column" : "card");
	}, []);

	const handleDragOver = useCallback((_event: DragOverEvent) => {
		// We handle movement in dragEnd
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const dragType = activeType;
			setActiveId(null);
			setActiveType(null);
			const { active, over } = event;
			if (!over || active.id === over.id) return;

			// Column reorder
			if (dragType === "column" && onReorderColumns) {
				const activeStatusId = (active.id as string).replace("column-", "");
				const overStatusId = (over.id as string).replace("column-", "");
				const oldIndex = statusOptions.findIndex((o) => o.id === activeStatusId);
				const newIndex = statusOptions.findIndex((o) => o.id === overStatusId);
				if (oldIndex === -1 || newIndex === -1) return;
				const reordered = [...statusOptions];
				const [moved] = reordered.splice(oldIndex, 1);
				reordered.splice(newIndex, 0, moved);
				await onReorderColumns(reordered);
				return;
			}

			// Card drag between columns
			const recordId = active.id as string;
			let newStatusId: string | null = null;

			const overId = over.id as string;
			if (overId.startsWith("column-")) {
				newStatusId = overId.replace("column-", "");
			} else {
				for (const [statusId, recs] of recordsByStatus) {
					if (recs.some((r) => r.id === overId)) {
						newStatusId = statusId;
						break;
					}
				}
			}

			if (!newStatusId) return;

			const record = records.find((r) => r.id === recordId);
			if (!record) return;
			const currentStatus = record.data[statusField.id] as string | undefined;

			if (currentStatus === newStatusId) return;

			await onUpdateRecord(recordId, { [statusField.id]: newStatusId });
		},
		[activeType, recordsByStatus, records, statusField.id, statusOptions, onUpdateRecord, onReorderColumns],
	);

	const handleQuickAdd = useCallback(
		async (statusId: string, title: string) => {
			// Find first text field to use as title
			const textField = fields.find((f) => f.type === "text");
			const data: { [fieldId: string]: unknown } = {
				[statusField.id]: statusId,
			};
			if (textField) {
				data[textField.id] = title;
			}
			await onCreateRecord(data);
		},
		[fields, statusField.id, onCreateRecord],
	);

	const handleCardClick = useCallback((record: DbRecord) => {
		setEditingRecord(record);
	}, []);

	return (
		<>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<div className="flex gap-4 overflow-x-auto pb-4">
					<SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
						{statusOptions.map((opt) => (
							<KanbanColumn
								key={opt.id}
								status={opt}
								records={recordsByStatus.get(opt.id) ?? []}
								fields={fields}
								statusFieldId={statusField.id}
								readOnly={readOnly}
								onQuickAdd={(title) => handleQuickAdd(opt.id, title)}
								onCardClick={handleCardClick}
							/>
						))}
					</SortableContext>
					{!readOnly && onAddStatus && (
						<div className="flex shrink-0 items-start pt-1">
							<Popover open={addOpen} onOpenChange={setAddOpen}>
								<PopoverTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
										<Plus className="h-4 w-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-56 space-y-3" align="start">
									<Input
										placeholder="Column name"
										value={newLabel}
										onChange={(e) => setNewLabel(e.target.value)}
										autoFocus
									/>
									<div className="flex flex-wrap gap-2">
										{ADD_STATUS_COLORS.map((c) => (
											<button
												key={c.id}
												type="button"
												className={`h-5 w-5 rounded-full ${c.cls} ${newColor === c.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
												onClick={() => setNewColor(c.id)}
											/>
										))}
									</div>
									<Button
										size="sm"
										className="w-full"
										disabled={!newLabel.trim()}
										onClick={async () => {
											await onAddStatus(newLabel.trim(), newColor);
											setNewLabel("");
											setNewColor("gray");
											setAddOpen(false);
										}}
									>
										Add
									</Button>
								</PopoverContent>
							</Popover>
						</div>
					)}
				</div>

				<DragOverlay>
					{activeRecord ? (
						<KanbanCard
							record={activeRecord}
							highlightFields={fields.filter((f) => f.highlight)}
							onClick={() => {}}
						/>
					) : null}
				</DragOverlay>
			</DndContext>

			{/* Edit modal */}
			{editingRecord && (
				<RecordDialog
					fields={fields}
					record={editingRecord}
					open={!!editingRecord}
					onOpenChange={(open: boolean) => {
						if (!open) setEditingRecord(null);
					}}
					onSubmit={async (data: { [fieldId: string]: unknown }) => {
						await onUpdateRecord(editingRecord.id, data);
						setEditingRecord(null);
					}}
				/>
			)}
		</>
	);
}
