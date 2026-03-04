import { RichTextRenderer } from "@/components/blocks/rich-text-renderer";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DataTable } from "@/components/records/data-table";
import { DynamicForm } from "@/components/records/dynamic-form";
import { Toaster } from "@/components/ui/sonner";
import { usePublicPage } from "@/hooks/use-public-page";
import { api } from "@/lib/api";
import type { Record as DbRecord } from "@kyra/shared";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

export function PublicPage() {
	const { slug = "" } = useParams<{ slug: string }>();
	const { page, loading, error, refetch } = usePublicPage(slug);
	const [submitted, setSubmitted] = useState<Set<string>>(new Set());

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (error || !page) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-semibold">Page not found</h1>
					<p className="mt-2 text-muted-foreground">
						This page doesn't exist or hasn't been published yet.
					</p>
				</div>
			</div>
		);
	}

	async function handleFormSubmit(blockId: string, data: { [fieldId: string]: unknown }) {
		try {
			await api.post(`/p/${slug}/submit/${blockId}`, { data });
			toast.success("Submitted successfully!");
			setSubmitted((prev) => new Set(prev).add(blockId));
			refetch();
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-12">
			<h1 className="mb-8 text-3xl font-bold">{page.name}</h1>

			<div className="space-y-8">
				{page.blocks.map((block) => {
					const showBorder = block.view_type !== "richtext" && block.show_border !== false;
					const showTitle = block.view_type !== "richtext" && block.show_title !== false;
					const displayTitle = block.title ?? block.database?.name;

					return (
					<div
						key={block.id}
						className={
							block.view_type === "richtext"
								? ""
								: showBorder
									? "rounded-lg border border-border p-6"
									: "p-6"
						}
					>
						{block.view_type === "richtext" ? (
							<RichTextRenderer content={block.content ?? ""} />
						) : (
							<>
								{showTitle && <h2 className="mb-4 text-lg font-medium">{displayTitle}</h2>}

								{block.fields.length === 0 ? (
									<p className="text-sm text-muted-foreground">No fields configured</p>
								) : block.view_type === "kanban" ? (
									(() => {
										const statusField = block.fields.find((f) => f.type === "kanban_status");
										if (!statusField) return <p className="text-sm text-muted-foreground">No kanban status field configured</p>;
										return (
											<KanbanBoard
												fields={block.fields}
												records={block.records}
												statusField={statusField}
												readOnly
												onCreateRecord={async () => ({} as DbRecord)}
												onUpdateRecord={async (recordId, data) => {
													const updated = await api.patch<DbRecord>(`/p/${slug}/records/${recordId}`, { data });
													refetch();
													return updated;
												}}
												onDeleteRecord={async () => {}}
											/>
										);
									})()
								) : block.view_type === "table" ? (
									<DataTable
										fields={block.fields}
										records={block.records}
										readOnly
										onEdit={() => {}}
										onDelete={() => {}}
									/>
								) : submitted.has(block.id) ? (
									<div className="rounded-lg bg-green-50 p-6 text-center dark:bg-green-950">
										<p className="text-green-700 dark:text-green-300">
											Thank you! Your submission has been received.
										</p>
									</div>
								) : (
									<DynamicForm
										fields={block.fields}
										onSubmit={(data) => handleFormSubmit(block.id, data)}
										onCancel={() => {}}
										submitLabel="Submit"
									/>
								)}
							</>
						)}
					</div>
					);
				})}
			</div>

			<Toaster />
		</div>
	);
}
