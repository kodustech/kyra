import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Record as DbRecord, Field } from "@kyra/shared";
import { Pencil, Trash2 } from "lucide-react";

interface DataTableProps {
	fields: Field[];
	records: DbRecord[];
	onEdit: (record: DbRecord) => void;
	onDelete: (record: DbRecord) => void;
}

function formatCellValue(value: unknown, field: Field): string {
	if (value == null || value === "") return "—";

	switch (field.type) {
		case "boolean":
			return value ? "Yes" : "No";
		case "date":
			try {
				return new Date(String(value)).toLocaleDateString();
			} catch {
				return String(value);
			}
		default:
			return String(value);
	}
}

export function DataTable({ fields, records, onEdit, onDelete }: DataTableProps) {
	if (records.length === 0) {
		return null;
	}

	return (
		<div className="rounded-md border border-border">
			<Table>
				<TableHeader>
					<TableRow>
						{fields.map((field) => (
							<TableHead key={field.id}>{field.name}</TableHead>
						))}
						<TableHead className="w-24" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{records.map((record) => (
						<TableRow key={record.id}>
							{fields.map((field) => (
								<TableCell key={field.id} className="max-w-xs truncate">
									{formatCellValue(record.data[field.id], field)}
								</TableCell>
							))}
							<TableCell>
								<div className="flex gap-1">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() => onEdit(record)}
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-destructive hover:text-destructive"
										onClick={() => onDelete(record)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
