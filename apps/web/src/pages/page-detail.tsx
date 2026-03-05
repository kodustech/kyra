import { BlockEditor } from "@/components/blocks/block-editor";
import { BlockRenderer, type ColumnConfig } from "@/components/blocks/block-renderer";
import { BlockSettings } from "@/components/blocks/block-settings";
import { RichTextRenderer } from "@/components/blocks/rich-text-renderer";
import { DeletePageDialog } from "@/components/pages/delete-page-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBlocks } from "@/hooks/use-blocks";
import { usePages } from "@/hooks/use-pages";
import { api } from "@/lib/api";
import type { Page, UpdateBlockInput } from "@kyra/shared";
import { canEditContent } from "@kyra/shared";
import { IconPicker } from "@/components/ui/icon-picker";
import { useAuth } from "@/providers/auth-provider";
import { ExternalLink, Eye, Settings, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

export function PageDetail() {
	const { pageId = "" } = useParams<{ pageId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const { update } = usePages();
	const { user } = useAuth();
	const isEditor = user ? canEditContent(user.role) : false;

	const isConfig = searchParams.has("config");

	const [page, setPage] = useState<Page | null>(null);
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [icon, setIcon] = useState<string | null>(null);
	const [published, setPublished] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showDelete, setShowDelete] = useState(false);

	useEffect(() => {
		if (!pageId) return;
		api
			.get<Page>(`/pages/${pageId}`)
			.then((p) => {
				setPage(p);
				setName(p.name);
				setSlug(p.slug);
				setIcon(p.icon);
				setPublished(p.published);
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [pageId]);

	function toggleMode() {
		if (isConfig) {
			setSearchParams({});
		} else {
			setSearchParams({ config: "" });
		}
	}

	async function handleSave() {
		if (!page) return;
		setSaving(true);
		try {
			const updated = await update(page.id, { name, slug, published });
			setPage(updated);
			toast.success("Page saved");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	}

	async function handleIconChange(value: string | null) {
		const prev = icon;
		setIcon(value);
		if (!page) return;
		try {
			const updated = await update(page.id, { icon: value });
			setPage(updated);
		} catch (err) {
			toast.error((err as Error).message);
			setIcon(prev);
		}
	}

	async function handlePublishToggle(value: boolean) {
		setPublished(value);
		if (!page) return;
		try {
			const updated = await update(page.id, { published: value });
			setPage(updated);
			toast.success(value ? "Page published" : "Page unpublished");
		} catch (err) {
			toast.error((err as Error).message);
			setPublished(!value);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!page) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Page not found</p>
			</div>
		);
	}

	return (
		<div>
			{/* Header — always visible */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<IconPicker value={icon} onChange={handleIconChange} />
					<h2 className="text-2xl font-semibold">{page.name}</h2>
				</div>
				<div className="flex items-center gap-2">
					{isEditor && published && (
						<Button variant="outline" size="sm" asChild>
							<a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
								<ExternalLink className="mr-2 h-4 w-4" /> Open Public
							</a>
						</Button>
					)}
					{isEditor && (
					<Button
						variant="outline"
						size="icon"
						onClick={toggleMode}
						title={isConfig ? "Preview" : "Settings"}
					>
						{isConfig ? <Eye className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
					</Button>
					)}
					{isEditor && isConfig && (
						<Button
							variant="ghost"
							size="icon"
							className="text-destructive hover:text-destructive"
							onClick={() => setShowDelete(true)}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			{isConfig ? (
				<ConfigView
					page={page}
					pageId={pageId}
					name={name}
					slug={slug}
					published={published}
					saving={saving}
					onNameChange={setName}
					onSlugChange={setSlug}
					onPublishToggle={handlePublishToggle}
					onSave={handleSave}
				/>
			) : (
				<PreviewView pageId={pageId} />
			)}

			<DeletePageDialog page={page} open={showDelete} onOpenChange={setShowDelete} />
		</div>
	);
}

// ─── Config View ────────────────────────────────────────────────────────────────

interface ConfigViewProps {
	page: Page;
	pageId: string;
	name: string;
	slug: string;
	published: boolean;
	saving: boolean;
	onNameChange: (v: string) => void;
	onSlugChange: (v: string) => void;
	onPublishToggle: (v: boolean) => void;
	onSave: () => void;
}

function ConfigView({
	page,
	pageId,
	name,
	slug,
	published,
	saving,
	onNameChange,
	onSlugChange,
	onPublishToggle,
	onSave,
}: ConfigViewProps) {
	const hasChanges = name !== page.name || slug !== page.slug;

	return (
		<>
			<div className="mb-8 space-y-4 rounded-xl border border-border p-6">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="page-name">Name</Label>
						<Input id="page-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="page-slug">Slug</Label>
						<Input id="page-slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} />
					</div>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Switch id="page-published" checked={published} onCheckedChange={onPublishToggle} />
						<Label htmlFor="page-published">Published</Label>
					</div>
					{hasChanges && (
						<Button size="sm" onClick={onSave} disabled={saving}>
							{saving ? "Saving..." : "Save Changes"}
						</Button>
					)}
				</div>
			</div>

			<BlockEditor pageId={pageId} />
		</>
	);
}

// ─── Preview View ───────────────────────────────────────────────────────────────

function PreviewView({ pageId }: { pageId: string }) {
	const { blocks, loading, update } = useBlocks(pageId);
	const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnConfig>>({});

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
				<p className="mb-2 text-lg font-medium">No blocks yet</p>
				<p className="text-sm text-muted-foreground">Open settings to add blocks to this page.</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{blocks.map((block) => {
				const showBorder = block.view_type !== "richtext" && block.show_border !== false;
				const showTitle = block.view_type !== "richtext" && block.show_title !== false;
				const displayTitle = block.title ?? block.database?.name;
				const colConfig = columnConfigs[block.id];

				return (
					<div
						key={block.id}
						className={`group/block relative ${
							block.view_type === "richtext"
								? ""
								: showBorder
									? "rounded-lg border border-border p-6"
									: "p-6"
						}`}
					>
						{block.view_type === "richtext" ? (
							<RichTextRenderer content={block.content ?? ""} />
						) : (
							<>
								<div className={`flex items-center justify-between ${showTitle ? "mb-4" : "mb-1"}`}>
									{showTitle && (
										<h3 className="text-lg font-medium">{displayTitle}</h3>
									)}
									<div className={showTitle ? "" : "ml-auto"}>
									<BlockSettings
										title={block.title}
										icon={block.icon}
										showTitle={block.show_title !== false}
										showBorder={block.show_border !== false}
										viewType={block.view_type}
										onUpdate={(input) => handleBlockUpdate(block.id, input)}
										fields={colConfig?.fields}
										visibleIds={colConfig?.visibleIds}
										orderedIds={colConfig?.orderedIds}
										onColumnChange={colConfig?.handleColumnChange}
									/>
									</div>
								</div>
								<BlockRenderer
									databaseId={block.database_id!}
									databaseName={block.database?.name ?? ""}
									viewType={block.view_type}
									onColumnConfigReady={(config) =>
										handleColumnConfigReady(block.id, config)
									}
								/>
							</>
						)}
					</div>
				);
			})}
		</div>
	);
}
