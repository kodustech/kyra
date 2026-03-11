import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { useState } from "react";
import { BlockRow } from "./block-row";

interface BlockItem {
	id: string;
	viewType: string;
	database: { id: string; name: string } | null;
}

interface SortableBlockListProps {
	blocks: BlockItem[];
	onReorder: (blockIds: string[]) => void;
	onDelete: (blockId: string) => void;
}

export function SortableBlockList({ blocks, onReorder, onDelete }: SortableBlockListProps) {
	const [deletingBlock, setDeletingBlock] = useState<BlockItem | null>(null);

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

	function handleDeleteConfirm() {
		if (!deletingBlock) return;
		onDelete(deletingBlock.id);
		setDeletingBlock(null);
	}

	const deletingLabel = deletingBlock
		? deletingBlock.viewType === "richtext"
			? "Rich Text"
			: deletingBlock.database?.name ?? "this block"
		: "";

	return (
		<>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
					<div className="space-y-2">
						{blocks.map((block) => (
							<BlockRow key={block.id} block={block} onDelete={() => setDeletingBlock(block)} />
						))}
					</div>
				</SortableContext>
			</DndContext>

			<Dialog open={!!deletingBlock} onOpenChange={(open) => { if (!open) setDeletingBlock(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Block</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete <strong>{deletingLabel}</strong>? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeletingBlock(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteConfirm}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
