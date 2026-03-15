import { BlockEditor } from "@/components/blocks/block-editor";
import { BlockRenderer, type ColumnConfig } from "@/components/blocks/block-renderer";
import { BlockSettings } from "@/components/blocks/block-settings";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useBlocks } from "@/hooks/use-blocks";
import { useDatabases } from "@/hooks/use-databases";
import { usePages } from "@/hooks/use-pages";
import { api } from "@/lib/api";
import type { CreateBlockInput, Page, UpdateBlockInput, ViewType } from "@kyra/shared";
import { canEditContent } from "@kyra/shared";
import { useAuth } from "@/providers/auth-provider";
import { Settings, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const HOME_SLUG = "home";

export function Dashboard() {
	const { pages, create: createPage } = usePages();
	const { user } = useAuth();
	const isEditor = user ? canEditContent(user.role) : false;

	const [homePage, setHomePage] = useState<Page | null>(null);
	const [loading, setLoading] = useState(true);
	const [isConfig, setIsConfig] = useState(false);

	// Find or create the home page
	useEffect(() => {
		async function ensureHomePage() {
			try {
				// Try to find existing home page
				const allPages = await api.get<Page[]>("/pages");
				const existing = allPages.find((p) => p.slug === HOME_SLUG);
				if (existing) {
					setHomePage(existing);
				} else if (isEditor) {
					// Create home page
					const page = await createPage({
						name: "Home",
						slug: HOME_SLUG,
						published: false,
					});
					setHomePage(page);
				}
			} catch {
				// silently fail
			} finally {
				setLoading(false);
			}
		}
		ensureHomePage();
	}, [isEditor, createPage]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!homePage) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Welcome to Kyra</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-semibold">Home</h2>
				{isEditor && (
					<Button
						variant="outline"
						size="icon"
						onClick={() => setIsConfig(!isConfig)}
						title={isConfig ? "Preview" : "Settings"}
					>
						{isConfig ? <Eye className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
					</Button>
				)}
			</div>

			{isConfig ? (
				<BlockEditor pageId={homePage.id} />
			) : (
				<HomePreview pageId={homePage.id} />
			)}
		</div>
	);
}

// ─── Home Preview (reuses the same pattern as PageDetail's PreviewView) ─────

function HomePreview({ pageId }: { pageId: string }) {
	const { blocks, loading, update, create: createBlock } = useBlocks(pageId);
	const { pages, create: createPage } = usePages();
	const { databases } = useDatabases();
	const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnConfig>>({});
	const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
	const [slashBlockType, setSlashBlockType] = useState<string | null>(null);
	const [slashDbId, setSlashDbId] = useState("");

	const handleSlashInsertBlock = useCallback((type: string) => {
		setSlashBlockType(type);
		setSlashDbId("");
	}, []);

	async function handleSlashBlockConfirm() {
		if (!slashBlockType || !slashDbId) return;
		try {
			await createBlock({
				viewType: slashBlockType as ViewType,
				databaseId: slashDbId,
			} as CreateBlockInput);
			toast.success("Block added");
		} catch (err) {
			toast.error((err as Error).message);
		}
		setSlashBlockType(null);
		setSlashDbId("");
	}

	const pageItems = useMemo(
		() => pages.map((p) => ({ id: p.id, name: p.name, slug: p.slug, icon: p.icon })),
		[pages],
	);

	const handleCreatePageFromEditor = useCallback(
		async (name: string) => {
			try {
				const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
				const suffix = Math.random().toString(36).slice(2, 6);
				const slug = `${base}-${suffix}`;
				const page = await createPage({ name, slug, published: false });
				return { id: page.id, name: page.name, slug: page.slug, icon: page.icon };
			} catch (err) {
				toast.error((err as Error).message);
				return null;
			}
		},
		[createPage],
	);

	useEffect(() => {
		const timers = debounceTimers.current;
		return () => {
			for (const timer of Object.values(timers)) clearTimeout(timer);
		};
	}, []);

	const handleRichTextChange = useCallback(
		(blockId: string, content: string) => {
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

	const handleBlockUpdate = useCallback(
		async (blockId: string, input: UpdateBlockInput) => {
			try {
				await update(blockId, input);
			} catch (err) {
				toast.error((err as Error).message);
			}
		},
		[update],
	);

	const handleColumnConfigReady = useCallback(
		(blockId: string, config: ColumnConfig) => {
			setColumnConfigs((prev) => ({ ...prev, [blockId]: config }));
		},
		[],
	);

	if (loading) {
		return <p className="py-8 text-center text-muted-foreground">Loading...</p>;
	}

	if (blocks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
				<p className="mb-2 text-lg font-medium">Your home page is empty</p>
				<p className="text-sm text-muted-foreground">
					Click the settings icon to add blocks, or switch to config mode.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{blocks.map((block) => {
				const showBorder = block.viewType !== "richtext" && block.showBorder !== false;
				const showTitle = block.viewType !== "richtext" && block.showTitle !== false;
				const displayTitle = block.title ?? block.database?.name;
				const colConfig = columnConfigs[block.id];

				return (
					<div
						key={block.id}
						className={`group/block relative ${
							block.viewType === "richtext"
								? ""
								: showBorder
									? "rounded-lg border border-border p-6"
									: "p-6"
						}`}
					>
						{block.viewType === "richtext" ? (
							<RichTextEditor
								editable
								showToolbar={false}
								content={block.content ?? ""}
								onChange={(content) => handleRichTextChange(block.id, content)}
								onInsertBlock={handleSlashInsertBlock}
								pages={pageItems}
								onCreatePage={handleCreatePageFromEditor}
							/>
						) : (
							<>
								{showTitle && (
									<div className="mb-4">
										<h3 className="text-lg font-medium">{displayTitle}</h3>
									</div>
								)}
								<BlockRenderer
									databaseId={block.databaseId!}
									databaseName={block.database?.name ?? ""}
									viewType={block.viewType}
									onColumnConfigReady={(config) =>
										handleColumnConfigReady(block.id, config)
									}
									toolbarExtra={
										<BlockSettings
											title={block.title}
											icon={block.icon}
											showTitle={block.showTitle !== false}
											showBorder={block.showBorder !== false}
											viewType={block.viewType}
											onUpdate={(input) => handleBlockUpdate(block.id, input)}
											fields={colConfig?.fields}
											visibleIds={colConfig?.visibleIds}
											orderedIds={colConfig?.orderedIds}
											onColumnChange={colConfig?.handleColumnChange}
										/>
									}
								/>
							</>
						)}
					</div>
				);
			})}

			<Dialog open={!!slashBlockType} onOpenChange={(o) => !o && setSlashBlockType(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Insert {slashBlockType === "table" ? "Table" : slashBlockType === "kanban" ? "Kanban" : "Form"} View
						</DialogTitle>
						<DialogDescription>Choose which database to display.</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-2">
						<Label>Database</Label>
						<Select value={slashDbId} onValueChange={setSlashDbId}>
							<SelectTrigger>
								<SelectValue placeholder="Select a database" />
							</SelectTrigger>
							<SelectContent>
								{databases.map((db) => (
									<SelectItem key={db.id} value={db.id}>
										{db.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter className="mt-4">
						<Button variant="outline" onClick={() => setSlashBlockType(null)}>
							Cancel
						</Button>
						<Button onClick={handleSlashBlockConfirm} disabled={!slashDbId}>
							Insert
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
