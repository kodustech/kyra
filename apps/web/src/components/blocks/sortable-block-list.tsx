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
import { BlockRow } from "./block-row";

interface BlockItem {
	id: string;
	view_type: string;
	database: { id: string; name: string } | null;
}

interface SortableBlockListProps {
	blocks: BlockItem[];
	onReorder: (blockIds: string[]) => void;
	onDelete: (blockId: string) => void;
}

export function SortableBlockList({ blocks, onReorder, onDelete }: SortableBlockListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = blocks.findIndex((b) => b.id === active.id);
		const newIndex = blocks.findIndex((b) => b.id === over.id);

		const reordered = [...blocks];
		const [moved] = reordered.splice(oldIndex, 1);
		reordered.splice(newIndex, 0, moved);

		onReorder(reordered.map((b) => b.id));
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
				<div className="space-y-2">
					{blocks.map((block) => (
						<BlockRow key={block.id} block={block} onDelete={onDelete} />
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
