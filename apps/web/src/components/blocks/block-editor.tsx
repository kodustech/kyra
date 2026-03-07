import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useBlocks } from "@/hooks/use-blocks";
import type { CreateBlockInput } from "@kyra/shared";
import { Layers, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BlockFormDialog } from "./block-form-dialog";
import { BlockRenderer } from "./block-renderer";
import { RichTextEditor } from "./rich-text-editor";
import { SortableBlockList } from "./sortable-block-list";

interface BlockEditorProps {
	pageId: string;
}

export function BlockEditor({ pageId }: BlockEditorProps) {
	const { blocks, loading, create, update, remove, reorder } = useBlocks(pageId);
	const [showAdd, setShowAdd] = useState(false);
	const [richTextContents, setRichTextContents] = useState<Record<string, string>>({});
	const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

	// Initialize richtext content from blocks (only for new blocks, never overwrite local edits)
	useEffect(() => {
		setRichTextContents((prev) => {
			let changed = false;
			const next = { ...prev };
			for (const block of blocks) {
				if (block.viewType === "richtext" && !(block.id in next)) {
					next[block.id] = block.content ?? "";
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	}, [blocks]);

	const handleRichTextChange = useCallback(
		(blockId: string, content: string) => {
			setRichTextContents((prev) => ({ ...prev, [blockId]: content }));

			if (debounceTimers.current[blockId]) {
				clearTimeout(debounceTimers.current[blockId]);
			}

			debounceTimers.current[blockId] = setTimeout(async () => {
				try {
					await update(blockId, { content });
				} catch (err) {
					toast.error((err as Error).message);
				}
			}, 800);
		},
		[update],
	);

	// Clean up timers on unmount
	useEffect(() => {
		const timers = debounceTimers.current;
		return () => {
			for (const timer of Object.values(timers)) {
				clearTimeout(timer);
			}
		};
	}, []);

	async function handleAdd(data: CreateBlockInput) {
		try {
			await create(data);
			toast.success("Block added");
		} catch (err) {
			toast.error((err as Error).message);
			throw err;
		}
	}

	async function handleDelete(blockId: string) {
		try {
			await remove(blockId);
			toast.success("Block removed");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	async function handleReorder(blockIds: string[]) {
		try {
			await reorder(blockIds);
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	if (loading) {
		return <p className="py-8 text-center text-muted-foreground">Loading blocks...</p>;
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-medium">Blocks</h3>
				<Button size="sm" onClick={() => setShowAdd(true)}>
					<Plus className="mr-2 h-4 w-4" /> Add Block
				</Button>
			</div>

			{blocks.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
					<Layers className="mb-3 h-10 w-10 text-muted-foreground" />
					<p className="mb-1 text-sm font-medium">No blocks yet</p>
					<p className="mb-3 text-xs text-muted-foreground">
						Add blocks to connect databases with form or table views.
					</p>
					<Button size="sm" onClick={() => setShowAdd(true)}>
						<Plus className="mr-2 h-4 w-4" /> Add Block
					</Button>
				</div>
			) : (
				<>
					<SortableBlockList blocks={blocks} onReorder={handleReorder} onDelete={handleDelete} />
					<Separator className="my-6" />
					<div className="space-y-6">
						{blocks.map((block) => (
							<div key={block.id} className="rounded-lg border border-border p-4">
								<h4 className="mb-3 text-sm font-medium text-muted-foreground">
									{block.viewType === "richtext"
										? "Rich Text"
										: `${block.database?.name} — ${block.viewType}`}
								</h4>
								{block.viewType === "richtext" ? (
									<RichTextEditor
										content={richTextContents[block.id] ?? block.content ?? ""}
										onChange={(content) => handleRichTextChange(block.id, content)}
									/>
								) : (
									<BlockRenderer
										databaseId={block.databaseId!}
										databaseName={block.database?.name ?? ""}
										viewType={block.viewType}
									/>
								)}
							</div>
						))}
					</div>
				</>
			)}

			<BlockFormDialog open={showAdd} onOpenChange={setShowAdd} onSubmit={handleAdd} />
		</div>
	);
}
