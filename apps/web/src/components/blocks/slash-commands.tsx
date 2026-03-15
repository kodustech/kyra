import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Extension } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
	AlignLeft,
	ChevronRight,
	Columns2,
	Columns3,
	FileText,
	FormInput,
	Heading1,
	Heading2,
	Heading3,
	ImageIcon,
	Kanban,
	LayoutPanelTop,
	List,
	ListOrdered,
	Minus,
	Quote,
	Table,
	Type,
} from "lucide-react";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { createRoot } from "react-dom/client";

// ─── Command definitions ─────────────────────────────────────────────────────

export interface SlashCommandItem {
	title: string;
	description: string;
	icon: React.ElementType;
	command: (props: { editor: any; range: any }) => void;
	category: "basic" | "blocks";
}

export function getSlashCommands(
	onInsertBlock?: (type: string) => void,
	getPages?: () => { id: string; name: string; slug: string; icon: string | null }[],
): SlashCommandItem[] {
	return [
		{
			title: "Text",
			description: "Plain text paragraph",
			icon: Type,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setParagraph().run();
			},
		},
		{
			title: "Heading 1",
			description: "Large heading",
			icon: Heading1,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
			},
		},
		{
			title: "Heading 2",
			description: "Medium heading",
			icon: Heading2,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
			},
		},
		{
			title: "Heading 3",
			description: "Small heading",
			icon: Heading3,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
			},
		},
		{
			title: "Bullet List",
			description: "Unordered list",
			icon: List,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).toggleBulletList().run();
			},
		},
		{
			title: "Ordered List",
			description: "Numbered list",
			icon: ListOrdered,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).toggleOrderedList().run();
			},
		},
		{
			title: "Quote",
			description: "Block quote",
			icon: Quote,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).toggleBlockquote().run();
			},
		},
		{
			title: "Divider",
			description: "Horizontal line",
			icon: Minus,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setHorizontalRule().run();
			},
		},
		{
			title: "Image",
			description: "Upload or embed an image",
			icon: ImageIcon,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).run();
				// Trigger file picker
				const input = document.createElement("input");
				input.type = "file";
				input.accept = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml";
				input.onchange = async () => {
					const file = input.files?.[0];
					if (!file) return;
					try {
						const res = await api.upload<{ url: string }>("/uploads/image", file);
						editor.chain().focus().setImage({ src: res.url }).run();
					} catch (err) {
						const url = window.prompt("Upload failed. Enter image URL instead:");
						if (url) editor.chain().focus().setImage({ src: url }).run();
					}
				};
				input.click();
			},
		},
		{
			title: "Toggle",
			description: "Collapsible accordion section",
			icon: ChevronRight,
			category: "basic",
			command: ({ editor, range }) => {
				editor
					.chain()
					.focus()
					.deleteRange(range)
					.insertContent({
						type: "details",
						content: [
							{
								type: "detailsSummary",
								content: [{ type: "text", text: "Toggle title" }],
							},
							{
								type: "detailsContent",
								content: [{ type: "paragraph" }],
							},
						],
					})
					.run();
			},
		},
		{
			title: "Page Link",
			description: 'Link to a page (or type "[[" )',
			icon: FileText,
			category: "basic",
			command: ({ editor, range }) => {
				// Delete the slash command range and insert [[ to trigger the page link suggestion
				editor.chain().focus().deleteRange(range).insertContent("[[").run();
			},
		},
		{
			title: "Page Card",
			description: "Card with icon linking to a page",
			icon: LayoutPanelTop,
			category: "basic",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).run();
				// Show a simple prompt to pick from pages
				const pages = getPages?.() ?? [];
				if (pages.length === 0) {
					alert("No pages available");
					return;
				}
				// Create a floating picker
				const popup = document.createElement("div");
				popup.className = "page-card-picker";
				popup.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100;background:var(--color-popover,#fff);border:1px solid var(--color-border,#e5e7eb);border-radius:0.5rem;padding:0.5rem;box-shadow:0 10px 25px rgba(0,0,0,0.15);max-height:300px;overflow-y:auto;min-width:250px;";

				const backdrop = document.createElement("div");
				backdrop.style.cssText = "position:fixed;inset:0;z-index:99;";
				backdrop.onclick = () => { popup.remove(); backdrop.remove(); };

				for (const page of pages) {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.style.cssText = "display:flex;align-items:center;gap:0.5rem;width:100%;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;border-radius:0.375rem;font-size:0.875rem;text-align:left;";
					btn.onmouseenter = () => { btn.style.background = "var(--color-accent,#f3f4f6)"; };
					btn.onmouseleave = () => { btn.style.background = "none"; };
					btn.textContent = `${page.icon || "📄"} ${page.name}`;
					btn.onclick = () => {
						editor
							.chain()
							.focus()
							.insertContent({
								type: "pageCard",
								attrs: {
									pageId: page.id,
									pageName: page.name,
									pageSlug: page.slug,
									pageIcon: page.icon,
								},
							})
							.run();
						popup.remove();
						backdrop.remove();
					};
					popup.appendChild(btn);
				}

				document.body.appendChild(backdrop);
				document.body.appendChild(popup);
			},
		},
		{
			title: "2 Columns",
			description: "Side by side layout",
			icon: Columns2,
			category: "basic",
			command: ({ editor, range }) => {
				editor
					.chain()
					.focus()
					.deleteRange(range)
					.insertContent({
						type: "columns",
						attrs: { count: 2 },
						content: [
							{ type: "column", content: [{ type: "paragraph" }] },
							{ type: "column", content: [{ type: "paragraph" }] },
						],
					})
					.run();
			},
		},
		{
			title: "3 Columns",
			description: "Three column layout",
			icon: Columns3,
			category: "basic",
			command: ({ editor, range }) => {
				editor
					.chain()
					.focus()
					.deleteRange(range)
					.insertContent({
						type: "columns",
						attrs: { count: 3 },
						content: [
							{ type: "column", content: [{ type: "paragraph" }] },
							{ type: "column", content: [{ type: "paragraph" }] },
							{ type: "column", content: [{ type: "paragraph" }] },
						],
					})
					.run();
			},
		},
		// ─── Block commands (database views) ─────────────────────────────────
		{
			title: "Table View",
			description: "Insert a database table",
			icon: Table,
			category: "blocks",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).run();
				onInsertBlock?.("table");
			},
		},
		{
			title: "Form View",
			description: "Insert a database form",
			icon: FormInput,
			category: "blocks",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).run();
				onInsertBlock?.("form");
			},
		},
		{
			title: "Kanban View",
			description: "Insert a kanban board",
			icon: Kanban,
			category: "blocks",
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).run();
				onInsertBlock?.("kanban");
			},
		},
	];
}

// ─── Menu component ──────────────────────────────────────────────────────────

interface CommandMenuProps {
	items: SlashCommandItem[];
	command: (item: SlashCommandItem) => void;
}

export interface CommandMenuRef {
	onKeyDown: (event: KeyboardEvent) => boolean;
}

export const CommandMenu = forwardRef<CommandMenuRef, CommandMenuProps>(
	({ items, command }, ref) => {
		const [selectedIndex, setSelectedIndex] = useState(0);
		const containerRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			setSelectedIndex(0);
		}, [items]);

		useEffect(() => {
			const el = containerRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
			el?.scrollIntoView({ block: "nearest" });
		}, [selectedIndex]);

		useImperativeHandle(ref, () => ({
			onKeyDown: (event: KeyboardEvent) => {
				if (event.key === "ArrowUp") {
					setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
					return true;
				}
				if (event.key === "ArrowDown") {
					setSelectedIndex((prev) => (prev + 1) % items.length);
					return true;
				}
				if (event.key === "Enter") {
					const item = items[selectedIndex];
					if (item) command(item);
					return true;
				}
				return false;
			},
		}));

		if (items.length === 0) {
			return (
				<div className="z-50 rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
					No results
				</div>
			);
		}

		// Group by category
		const basic = items.filter((i) => i.category === "basic");
		const blocks = items.filter((i) => i.category === "blocks");
		let globalIndex = 0;

		function renderGroup(label: string, groupItems: SlashCommandItem[]) {
			if (groupItems.length === 0) return null;
			return (
				<div key={label}>
					<div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{label}
					</div>
					{groupItems.map((item) => {
						const idx = globalIndex++;
						const Icon = item.icon;
						return (
							<button
								key={item.title}
								type="button"
								data-index={idx}
								className={cn(
									"flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm",
									idx === selectedIndex
										? "bg-accent text-accent-foreground"
										: "hover:bg-accent/50",
								)}
								onClick={() => command(item)}
							>
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
									<Icon className="h-4 w-4" />
								</div>
								<div className="text-left">
									<div className="font-medium">{item.title}</div>
									<div className="text-xs text-muted-foreground">{item.description}</div>
								</div>
							</button>
						);
					})}
				</div>
			);
		}

		return (
			<div
				ref={containerRef}
				className="z-50 max-h-72 w-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
			>
				{renderGroup("Basic", basic)}
				{renderGroup("Database Blocks", blocks)}
			</div>
		);
	},
);

CommandMenu.displayName = "CommandMenu";

// ─── TipTap Extension ────────────────────────────────────────────────────────

export function createSlashCommandExtension(
	onInsertBlock?: (type: string) => void,
	getPages?: () => { id: string; name: string; slug: string; icon: string | null }[],
) {
	const items = getSlashCommands(onInsertBlock, getPages);

	return Extension.create({
		name: "slashCommands",

		addOptions() {
			return {
				suggestion: {
					char: "/",
					startOfLine: false,
					items: ({ query }: { query: string }) => {
						return items.filter((item) =>
							item.title.toLowerCase().includes(query.toLowerCase()),
						);
					},
					render: () => {
						let popup: HTMLDivElement | null = null;
						let root: ReturnType<typeof createRoot> | null = null;
						let menuRef: CommandMenuRef | null = null;

						return {
							onStart: (props: any) => {
								popup = document.createElement("div");
								popup.style.position = "absolute";
								popup.style.zIndex = "50";
								document.body.appendChild(popup);

								root = createRoot(popup);
								root.render(
									<CommandMenu
										ref={(r) => { menuRef = r; }}
										items={props.items}
										command={(item) => {
											item.command({ editor: props.editor, range: props.range });
											props.command({});
										}}
									/>,
								);

								updatePosition(popup, props.clientRect);
							},
							onUpdate: (props: any) => {
								root?.render(
									<CommandMenu
										ref={(r) => { menuRef = r; }}
										items={props.items}
										command={(item) => {
											item.command({ editor: props.editor, range: props.range });
											props.command({});
										}}
									/>,
								);

								updatePosition(popup, props.clientRect);
							},
							onKeyDown: (props: any) => {
								if (props.event.key === "Escape") {
									cleanup();
									return true;
								}
								return menuRef?.onKeyDown(props.event) ?? false;
							},
							onExit: () => {
								cleanup();
							},
						};

						function cleanup() {
							if (root) {
								root.unmount();
								root = null;
							}
							if (popup) {
								popup.remove();
								popup = null;
							}
							menuRef = null;
						}

						function updatePosition(
							el: HTMLDivElement | null,
							clientRect: (() => DOMRect | null) | null,
						) {
							if (!el || !clientRect) return;
							const rect = clientRect();
							if (!rect) return;
							el.style.left = `${rect.left}px`;
							el.style.top = `${rect.bottom + 4}px`;
						}
					},
				} satisfies Partial<SuggestionOptions>,
			};
		},

		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					pluginKey: new PluginKey("slashCommandSuggestion"),
					...this.options.suggestion,
				}),
			];
		},
	});
}
