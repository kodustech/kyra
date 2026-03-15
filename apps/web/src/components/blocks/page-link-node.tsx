import { cn } from "@/lib/utils";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { FileText } from "lucide-react";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { createRoot } from "react-dom/client";
import { PageIcon } from "@/components/ui/icon-picker";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PageItem {
	id: string;
	name: string;
	slug: string;
	icon: string | null;
}

// ─── PageLink TipTap Node ────────────────────────────────────────────────────

export const PageLinkNode = Node.create({
	name: "pageLink",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			pageId: { default: null },
			pageName: { default: "" },
			pageSlug: { default: "" },
			pageIcon: { default: null },
		};
	},

	parseHTML() {
		return [{ tag: 'a[data-page-link]' }];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
		return [
			"a",
			mergeAttributes(HTMLAttributes, {
				"data-page-link": "",
				href: `/pages/${HTMLAttributes.pageId}`,
				class: "page-link-chip",
			}),
			HTMLAttributes.pageName || "Untitled",
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(PageLinkChip);
	},
});

// ─── Inline chip (editor mode) ──────────────────────────────────────────────

function PageLinkChip({ node, editor }: { node: any; editor: any }) {
	const { pageId, pageName, pageIcon } = node.attrs;

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		if (!editor.isEditable) {
			window.location.href = `/pages/${pageId}`;
		}
	};

	return (
		<NodeViewWrapper as="span" className="inline">
			<span
				className={`inline-flex items-center gap-1 rounded bg-accent/60 px-1.5 py-0.5 text-sm font-medium text-accent-foreground ${editor.isEditable ? "cursor-default" : "cursor-pointer hover:bg-accent"}`}
				onClick={handleClick}
				role={editor.isEditable ? undefined : "link"}
			>
				<PageIcon name={pageIcon} className="h-3.5 w-3.5 shrink-0" />
				<span>{pageName || "Untitled"}</span>
			</span>
		</NodeViewWrapper>
	);
}

// ─── Suggestion menu component ──────────────────────────────────────────────

interface PageMenuProps {
	items: PageItem[];
	command: (item: PageItem) => void;
	onCreate: (query: string) => void;
	query: string;
}

export interface PageMenuRef {
	onKeyDown: (event: KeyboardEvent) => boolean;
}

export const PageMenu = forwardRef<PageMenuRef, PageMenuProps>(
	({ items, command, onCreate, query }, ref) => {
		const [selectedIndex, setSelectedIndex] = useState(0);
		const containerRef = useRef<HTMLDivElement>(null);

		// items + 1 for "create new" option
		const totalItems = items.length + 1;

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
					setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
					return true;
				}
				if (event.key === "ArrowDown") {
					setSelectedIndex((prev) => (prev + 1) % totalItems);
					return true;
				}
				if (event.key === "Enter") {
					if (selectedIndex < items.length) {
						command(items[selectedIndex]);
					} else {
						onCreate(query);
					}
					return true;
				}
				return false;
			},
		}));

		return (
			<div
				ref={containerRef}
				className="z-50 max-h-60 w-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
			>
				{items.length > 0 && (
					<div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Pages
					</div>
				)}
				{items.map((item, idx) => (
					<button
						key={item.id}
						type="button"
						data-index={idx}
						className={cn(
							"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
							idx === selectedIndex
								? "bg-accent text-accent-foreground"
								: "hover:bg-accent/50",
						)}
						onClick={() => command(item)}
					>
						<PageIcon name={item.icon} className="h-4 w-4 shrink-0" />
						<span className="truncate">{item.name}</span>
					</button>
				))}
				{/* Create new page option */}
				<button
					type="button"
					data-index={items.length}
					className={cn(
						"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm border-t border-border mt-1 pt-1.5",
						selectedIndex === items.length
							? "bg-accent text-accent-foreground"
							: "hover:bg-accent/50",
					)}
					onClick={() => onCreate(query)}
				>
					<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
					<span className="truncate">
						Create{query ? ` "${query}"` : " new page"}
					</span>
				</button>
			</div>
		);
	},
);

PageMenu.displayName = "PageMenu";

// ─── [[ Suggestion Extension ────────────────────────────────────────────────

export function createPageLinkExtension(
	getPages: () => PageItem[],
	onCreatePage: (name: string) => Promise<PageItem | null>,
) {
	return PageLinkNode.extend({
		name: "pageLink",

		addOptions() {
			return {
				suggestion: {
					char: "[[",
					allowSpaces: true,
					items: ({ query }: { query: string }) => {
						const pages = getPages();
						if (!query) return pages;
						return pages.filter((p) =>
							p.name.toLowerCase().includes(query.toLowerCase()),
						);
					},
					render: () => {
						let popup: HTMLDivElement | null = null;
						let root: ReturnType<typeof createRoot> | null = null;
						let menuRef: PageMenuRef | null = null;

						return {
							onStart: (props: any) => {
								popup = document.createElement("div");
								popup.style.position = "absolute";
								popup.style.zIndex = "50";
								document.body.appendChild(popup);

								root = createRoot(popup);
								root.render(
									<PageMenu
										ref={(r) => { menuRef = r; }}
										items={props.items}
										query={props.query}
										command={(page) => {
											props.command({
												pageId: page.id,
												pageName: page.name,
												pageSlug: page.slug,
												pageIcon: page.icon,
											});
										}}
										onCreate={async (query) => {
											const page = await onCreatePage(query || "Untitled");
											if (page) {
												props.command({
													pageId: page.id,
													pageName: page.name,
													pageSlug: page.slug,
													pageIcon: page.icon,
												});
											}
										}}
									/>,
								);

								updatePosition(popup, props.clientRect);
							},
							onUpdate: (props: any) => {
								root?.render(
									<PageMenu
										ref={(r) => { menuRef = r; }}
										items={props.items}
										query={props.query}
										command={(page) => {
											props.command({
												pageId: page.id,
												pageName: page.name,
												pageSlug: page.slug,
												pageIcon: page.icon,
											});
										}}
										onCreate={async (query) => {
											const page = await onCreatePage(query || "Untitled");
											if (page) {
												props.command({
													pageId: page.id,
													pageName: page.name,
													pageSlug: page.slug,
													pageIcon: page.icon,
												});
											}
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
							if (root) { root.unmount(); root = null; }
							if (popup) { popup.remove(); popup = null; }
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
					command: ({ editor, range, props }: any) => {
						editor
							.chain()
							.focus()
							.deleteRange(range)
							.insertContent({
								type: "pageLink",
								attrs: props,
							})
							.run();
					},
				} satisfies Partial<SuggestionOptions>,
			};
		},

		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					pluginKey: new PluginKey("pageLinkSuggestion"),
					...this.options.suggestion,
				}),
			];
		},
	});
}

// ─── Static PageLink node for renderer (read-only, uses same chip with navigation) ─

export const PageLinkRendererNode = Node.create({
	name: "pageLink",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			pageId: { default: null },
			pageName: { default: "" },
			pageSlug: { default: "" },
			pageIcon: { default: null },
		};
	},

	parseHTML() {
		return [{ tag: 'a[data-page-link]' }];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
		return [
			"a",
			mergeAttributes(HTMLAttributes, {
				"data-page-link": "",
				href: `/pages/${HTMLAttributes.pageId}`,
				class: "page-link-chip",
			}),
			HTMLAttributes.pageName || "Untitled",
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(PageLinkChip);
	},
});
