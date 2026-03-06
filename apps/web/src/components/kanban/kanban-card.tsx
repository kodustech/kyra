import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AssigneeCell } from "@/components/records/assignee-cell";
import type { FieldType, Record as DbRecord, Field } from "@kyra/shared";
import {
	AlignLeft,
	Calendar,
	CheckSquare,
	GripVertical,
	Hash,
	Link,
	List,
	Mail,
	Phone,
	Tag,
	Type,
	User,
} from "lucide-react";

interface KanbanCardProps {
	record: DbRecord;
	highlightFields: Field[];
	onClick: () => void;
}

const STATUS_COLOR_MAP: Record<string, string> = {
	gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
	red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
	orange: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
	yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
	green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
	blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
	purple: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
	pink: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

export { STATUS_COLOR_MAP };

const FIELD_TYPE_ICONS: Record<FieldType, typeof Type> = {
	text: Type,
	number: Hash,
	email: Mail,
	phone: Phone,
	date: Calendar,
	select: List,
	boolean: CheckSquare,
	url: Link,
	textarea: AlignLeft,
	kanban_status: List,
	assignee: User,
	label: Tag,
};

export function KanbanCard({ record, highlightFields, onClick }: KanbanCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: record.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	// Use first highlight field as title, rest as preview
	const [titleField, ...previewFields] = highlightFields;
	const titleValue = titleField ? record.data[titleField.id] : undefined;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter") onClick();
			}}
		>
			<div className="flex items-start gap-2">
				<button
					type="button"
					className="mt-0.5 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 active:cursor-grabbing"
					{...attributes}
					{...listeners}
					onClick={(e) => e.stopPropagation()}
				>
					<GripVertical className="h-4 w-4 text-muted-foreground" />
				</button>
				<div className="min-w-0 flex-1">
					{titleValue != null && titleValue !== "" && (
						<p className="truncate text-sm font-medium">{String(titleValue)}</p>
					)}
					{previewFields.length > 0 && (
						<div className="mt-1.5 space-y-1">
							{previewFields.map((field) => {
								const val = record.data[field.id];
								if (val == null || val === "") return null;

								// For kanban_status and label fields, show the label with color
								if ((field.type === "kanban_status" || field.type === "label") && field.settings?.options) {
									const opt = field.settings.options.find((o) => o.id === val);
									if (opt) {
										const colorClass = STATUS_COLOR_MAP[opt.color] || STATUS_COLOR_MAP.gray;
										return (
											<span
												key={field.id}
												className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
											>
												{opt.label}
											</span>
										);
									}
								}

								// For assignee fields, show avatar + name
								if (field.type === "assignee") {
									return (
										<div key={field.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<AssigneeCell userId={String(val)} />
										</div>
									);
								}

								const Icon = FIELD_TYPE_ICONS[field.type] || Type;

								return (
									<div
										key={field.id}
										className="flex items-center gap-1.5 text-xs text-muted-foreground"
									>
										<Icon className="h-3 w-3 shrink-0" />
										<span className="truncate">{String(val)}</span>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
