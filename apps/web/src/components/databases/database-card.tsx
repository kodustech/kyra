import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@kyra/shared";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router";

interface DatabaseCardProps {
	database: Database;
	onEdit: (db: Database) => void;
	onDelete: (db: Database) => void;
}

export function DatabaseCard({ database, onEdit, onDelete }: DatabaseCardProps) {
	return (
		<Card className="group relative transition-shadow hover:shadow-md">
			<Link to={`/databases/${database.id}`} className="absolute inset-0 z-0" />
			<CardHeader className="flex-row items-start justify-between space-y-0">
				<div className="min-w-0 flex-1">
					<CardTitle className="truncate text-base">{database.name}</CardTitle>
					{database.description && (
						<CardDescription className="mt-1 line-clamp-2">{database.description}</CardDescription>
					)}
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="relative z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onEdit(database)}>
							<Pencil className="mr-2 h-4 w-4" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onDelete(database)}
							className="text-destructive focus:text-destructive"
						>
							<Trash2 className="mr-2 h-4 w-4" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardHeader>
		</Card>
	);
}
