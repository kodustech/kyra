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
import { RecordDialog } from "@/components/records/record-dialog";
import type { Record as DbRecord, Field } from "@kyra/shared";
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
}

export function KanbanBoard({
	fields,
	records,
	statusField,
	readOnly,
	onCreateRecord,
	onUpdateRecord,
}: KanbanBoardProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [editingRecord, setEditingRecord] = useState<DbRecord | null>(null);

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

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	}, []);

	const handleDragOver = useCallback((_event: DragOverEvent) => {
		// We handle movement in dragEnd
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setActiveId(null);
			const { active, over } = event;
			if (!over) return;

			const recordId = active.id as string;
			let newStatusId: string | null = null;

			// Check if dropped on a column
			const overId = over.id as string;
			if (overId.startsWith("column-")) {
				newStatusId = overId.replace("column-", "");
			} else {
				// Dropped on another card — find which column that card belongs to
				for (const [statusId, recs] of recordsByStatus) {
					if (recs.some((r) => r.id === overId)) {
						newStatusId = statusId;
						break;
					}
				}
			}

			if (!newStatusId) return;

			// Find current status of dragged record
			const record = records.find((r) => r.id === recordId);
			if (!record) return;
			const currentStatus = record.data[statusField.id] as string | undefined;

			if (currentStatus === newStatusId) return;

			await onUpdateRecord(recordId, { [statusField.id]: newStatusId });
		},
		[recordsByStatus, records, statusField.id, onUpdateRecord],
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
