import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Field } from "@kyra/shared";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

interface FieldRowProps {
	field: Field;
	onEdit: (field: Field) => void;
	onDelete: (field: Field) => void;
}

export function FieldRow({ field, onEdit, onDelete }: FieldRowProps) {
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

			<span className="flex-1 truncate text-sm font-medium">{field.name}</span>

			<Badge variant="secondary" className="text-xs">
				{field.type}
			</Badge>

			{field.required && (
				<Badge variant="outline" className="text-xs">
					required
				</Badge>
			)}

			<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(field)}>
				<Pencil className="h-3.5 w-3.5" />
			</Button>

			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-destructive hover:text-destructive"
				onClick={() => onDelete(field)}
			>
				<Trash2 className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}
