import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import type { Field } from "@kyra/shared";
import { GripVertical, Settings2 } from "lucide-react";

interface ColumnSettingsProps {
	fields: Field[];
	visibleIds: Set<string>;
	orderedIds: string[];
	onChange: (visibleIds: Set<string>, orderedIds: string[]) => void;
}

function SortableColumnRow({
	field,
	visible,
	onToggle,
}: {
	field: Field;
	visible: boolean;
	onToggle: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: field.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent"
		>
			<button
				type="button"
				className="cursor-grab text-muted-foreground hover:text-foreground"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-3.5 w-3.5" />
			</button>

			<label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={visible}
					onChange={onToggle}
					className="h-3.5 w-3.5 rounded border-border accent-primary"
				/>
				<span className="truncate">{field.name}</span>
			</label>
		</div>
	);
}

export function ColumnSettingsContent({ fields, visibleIds, orderedIds, onChange }: ColumnSettingsProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const fieldMap = new Map(fields.map((f) => [f.id, f]));
	const sortedFields = orderedIds.map((id) => fieldMap.get(id)).filter(Boolean) as Field[];

	function handleToggle(fieldId: string) {
		const next = new Set(visibleIds);
		if (next.has(fieldId)) {
			next.delete(fieldId);
		} else {
			next.add(fieldId);
		}
		onChange(next, orderedIds);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = orderedIds.indexOf(String(active.id));
		const newIndex = orderedIds.indexOf(String(over.id));

		const reordered = [...orderedIds];
		const [moved] = reordered.splice(oldIndex, 1);
		reordered.splice(newIndex, 0, moved);

		onChange(visibleIds, reordered);
	}

	return (
		<>
			<p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Columns</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={sortedFields.map((f) => f.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="space-y-0.5">
						{sortedFields.map((field) => (
							<SortableColumnRow
								key={field.id}
								field={field}
								visible={visibleIds.has(field.id)}
								onToggle={() => handleToggle(field.id)}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</>
	);
}

export function ColumnSettings({ fields, visibleIds, orderedIds, onChange }: ColumnSettingsProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" title="Column settings">
					<Settings2 className="h-4 w-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 p-2">
				<ColumnSettingsContent
					fields={fields}
					visibleIds={visibleIds}
					orderedIds={orderedIds}
					onChange={onChange}
				/>
			</PopoverContent>
		</Popover>
	);
}
