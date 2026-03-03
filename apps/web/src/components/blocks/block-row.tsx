import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

interface BlockRowProps {
	block: {
		id: string;
		view_type: string;
		database: { id: string; name: string };
	};
	onDelete: (id: string) => void;
}

export function BlockRow({ block, onDelete }: BlockRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: block.id,
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
			className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
		>
			<button
				type="button"
				className="cursor-grab text-muted-foreground hover:text-foreground"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>

			<span className="flex-1 truncate text-sm font-medium">{block.database.name}</span>

			<Badge variant="secondary" className="text-xs">
				{block.view_type}
			</Badge>

			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-destructive hover:text-destructive"
				onClick={() => onDelete(block.id)}
			>
				<Trash2 className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}
