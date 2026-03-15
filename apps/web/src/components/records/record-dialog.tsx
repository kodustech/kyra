import { CommentSection } from "@/components/comments/comment-section";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { Record as DbRecord, Field } from "@kyra/shared";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { DynamicForm } from "./dynamic-form";

interface RecordDialogProps {
	fields: Field[];
	record?: DbRecord | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { [fieldId: string]: unknown }) => Promise<void>;
	onDelete?: (recordId: string) => Promise<void>;
	databaseId?: string;
}

export function RecordDialog({ fields, record, open, onOpenChange, onSubmit, onDelete, databaseId }: RecordDialogProps) {
	const isEdit = !!record;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<div className="flex items-center justify-between">
						<div>
							<DialogTitle>{isEdit ? "Edit Record" : "New Record"}</DialogTitle>
							<DialogDescription>
								{isEdit ? "Update the record values." : "Fill in the fields to create a new record."}
							</DialogDescription>
						</div>
						{isEdit && onDelete && record && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => onDelete(record.id)}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</DialogHeader>
				<div className="mt-4">
					<DynamicForm
						fields={fields}
						defaultValues={record?.data}
						onSubmit={onSubmit}
						onCancel={() => onOpenChange(false)}
						submitLabel={isEdit ? "Save" : "Create"}
					/>
				</div>
				{record && databaseId && (
					<>
						<Separator className="my-6" />
						<CommentSection databaseId={databaseId} recordId={record.id} />
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
