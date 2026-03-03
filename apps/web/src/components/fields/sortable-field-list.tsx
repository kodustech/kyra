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
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Field } from "@kyra/shared";
import { FieldRow } from "./field-row";

interface SortableFieldListProps {
	fields: Field[];
	onReorder: (fieldIds: string[]) => void;
	onEdit: (field: Field) => void;
	onDelete: (field: Field) => void;
}

export function SortableFieldList({ fields, onReorder, onEdit, onDelete }: SortableFieldListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = fields.findIndex((f) => f.id === active.id);
		const newIndex = fields.findIndex((f) => f.id === over.id);

		const reordered = [...fields];
		const [moved] = reordered.splice(oldIndex, 1);
		reordered.splice(newIndex, 0, moved);

		onReorder(reordered.map((f) => f.id));
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
				<div className="space-y-2">
					{fields.map((field) => (
						<FieldRow key={field.id} field={field} onEdit={onEdit} onDelete={onDelete} />
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
