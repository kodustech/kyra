import { DataTable } from "@/components/records/data-table";
import { DynamicForm } from "@/components/records/dynamic-form";
import { useFields } from "@/hooks/use-fields";
import { useRecords } from "@/hooks/use-records";
import type { ViewType } from "@kyra/shared";
import { toast } from "sonner";

interface BlockRendererProps {
	databaseId: string;
	databaseName: string;
	viewType: ViewType;
	readOnly?: boolean;
	onSubmit?: (data: { [fieldId: string]: unknown }) => Promise<void>;
}

export function BlockRenderer({
	databaseId,
	databaseName,
	viewType,
	readOnly,
	onSubmit,
}: BlockRendererProps) {
	const { fields, loading: fieldsLoading } = useFields(databaseId);
	const { records, loading: recordsLoading, create } = useRecords(databaseId);

	if (fieldsLoading) {
		return <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>;
	}

	if (fields.length === 0) {
		return (
			<p className="py-4 text-center text-sm text-muted-foreground">
				No fields configured for {databaseName}
			</p>
		);
	}

	if (viewType === "table") {
		if (recordsLoading) {
			return <p className="py-4 text-center text-sm text-muted-foreground">Loading records...</p>;
		}
		return (
			<DataTable
				fields={fields}
				records={records}
				readOnly={readOnly}
				onEdit={() => {}}
				onDelete={() => {}}
			/>
		);
	}

	// viewType === "form"
	async function handleFormSubmit(data: { [fieldId: string]: unknown }) {
		if (onSubmit) {
			await onSubmit(data);
			return;
		}
		try {
			await create(data);
			toast.success("Record created");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	return (
		<DynamicForm
			fields={fields}
			onSubmit={handleFormSubmit}
			onCancel={() => {}}
			submitLabel="Submit"
		/>
	);
}
