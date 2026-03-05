import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Record as DbRecord, Field, KanbanStatusOption } from "@kyra/shared";
import { PageIcon } from "@/components/ui/icon-picker";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { KanbanCard, STATUS_COLOR_MAP } from "./kanban-card";

interface KanbanColumnProps {
	status: KanbanStatusOption;
	records: DbRecord[];
	fields: Field[];
	statusFieldId: string;
	readOnly?: boolean;
	onQuickAdd: (title: string) => Promise<void>;
	onCardClick: (record: DbRecord) => void;
}

export function KanbanColumn({
	status,
	records,
	fields,
	readOnly,
	onQuickAdd,
	onCardClick,
}: KanbanColumnProps) {
	const [quickAddValue, setQuickAddValue] = useState("");
	const [adding, setAdding] = useState(false);

	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: `column-${status.id}`,
		data: { statusId: status.id },
	});

	const {
		attributes,
		listeners,
		setNodeRef: setSortRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: `column-${status.id}`,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const explicitHighlights = fields.filter((f) => f.highlight);
	const highlightFields = explicitHighlights.length > 0
		? explicitHighlights
		: fields.filter((f) => f.type !== "kanban_status").slice(0, 1);
	const recordIds = records.map((r) => r.id);

	const accentColor = STATUS_COLOR_MAP[status.color] || STATUS_COLOR_MAP.gray;

	async function handleQuickAdd() {
		const val = quickAddValue.trim();
		if (!val) return;
		setAdding(true);
		try {
			await onQuickAdd(val);
			setQuickAddValue("");
		} finally {
			setAdding(false);
		}
	}

	return (
		<div ref={setSortRef} style={style} className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50">
			{/* Header */}
			<div className="group/col flex items-center gap-2 px-3 py-2.5">
				<button
					type="button"
					className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center text-transparent group-hover/col:text-muted-foreground"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="h-3.5 w-3.5" />
				</button>
				<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${accentColor}`}>
					{status.icon && <PageIcon name={status.icon} className="mr-1 h-3 w-3" />}
					{status.label}
				</span>
				<span className="text-xs text-muted-foreground">{records.length}</span>
			</div>

			{/* Cards */}
			<div
				ref={setDropRef}
				className={`flex min-h-[2rem] flex-1 flex-col gap-2 px-2 pb-2 transition-colors ${
					isOver ? "bg-muted/80 rounded-b-lg" : ""
				}`}
			>
				<SortableContext items={recordIds} strategy={verticalListSortingStrategy}>
					{records.map((record) => (
						<KanbanCard
							key={record.id}
							record={record}
							highlightFields={highlightFields}
							onClick={() => onCardClick(record)}
						/>
					))}
				</SortableContext>
			</div>

			{/* Quick add */}
			{!readOnly && (
				<div className="px-2 pb-2">
					<input
						type="text"
						className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
						placeholder="Add a record..."
						value={quickAddValue}
						onChange={(e) => setQuickAddValue(e.target.value)}
						disabled={adding}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleQuickAdd();
							}
						}}
					/>
				</div>
			)}
		</div>
	);
}
