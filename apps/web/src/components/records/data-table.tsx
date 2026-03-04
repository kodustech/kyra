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
import type { ReactNode } from "react";

interface DataTableProps {
	fields: Field[];
	records: DbRecord[];
	readOnly?: boolean;
	onEdit: (record: DbRecord) => void;
	onDelete: (record: DbRecord) => void;
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

function formatCellValue(value: unknown, field: Field): ReactNode {
	if (value == null || value === "") return "\u2014";

	switch (field.type) {
		case "boolean":
			return value ? "Yes" : "No";
		case "date":
			try {
				return new Date(String(value)).toLocaleDateString();
			} catch {
				return String(value);
			}
		case "kanban_status": {
			const opt = field.settings?.options?.find((o) => o.id === value);
			if (opt) {
				const colorClass = STATUS_COLOR_MAP[opt.color] || STATUS_COLOR_MAP.gray;
				return (
					<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
						{opt.label}
					</span>
				);
			}
			return String(value);
		}
		default:
			return String(value);
	}
}

export function DataTable({ fields, records, readOnly, onEdit, onDelete }: DataTableProps) {
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
						{!readOnly && <TableHead className="w-24" />}
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
							{!readOnly && (
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
							)}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
