import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Record as DbRecord, Field } from "@kyra/shared";
import { DynamicForm } from "./dynamic-form";

interface RecordDialogProps {
	fields: Field[];
	record?: DbRecord | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { [fieldId: string]: unknown }) => Promise<void>;
}

export function RecordDialog({ fields, record, open, onOpenChange, onSubmit }: RecordDialogProps) {
	const isEdit = !!record;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Record" : "New Record"}</DialogTitle>
					<DialogDescription>
						{isEdit ? "Update the record values." : "Fill in the fields to create a new record."}
					</DialogDescription>
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
			</DialogContent>
		</Dialog>
	);
}
