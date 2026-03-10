import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Extension } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
	AlignLeft,
	FormInput,
	Heading1,
	Heading2,
	Heading3,
	ImageIcon,
	Kanban,
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

export function getSlashCommands(onInsertBlock?: (type: string) => void): SlashCommandItem[] {
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
) {
	const items = getSlashCommands(onInsertBlock);

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
					...this.options.suggestion,
				}),
			];
		},
	});
}
