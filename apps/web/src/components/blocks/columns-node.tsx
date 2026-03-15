import { mergeAttributes, Node } from "@tiptap/react";

// ─── Column (single column inside columns wrapper) ──────────────────────────

export const ColumnNode = Node.create({
	name: "column",
	group: "",
	content: "block+",
	isolating: true,
	selectable: false,

	addKeyboardShortcuts() {
		return {
			// Prevent Tab from leaving the column
			Tab: () => true,
		};
	},

	parseHTML() {
		return [{ tag: "div[data-column]" }];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-column": "",
				class: "columns-col",
			}),
			0,
		];
	},
});

// ─── Columns wrapper ────────────────────────────────────────────────────────

export const ColumnsNode = Node.create({
	name: "columns",
	group: "block",
	content: "column{2,3}",
	defining: true,
	isolating: true,
	selectable: false,

	addAttributes() {
		return {
			count: { default: 2 },
		};
	},

	parseHTML() {
		return [
			{
				tag: "div[data-columns]",
				getAttrs: (dom: any) => ({
					count: Number((dom as HTMLElement).getAttribute("data-count")) || 2,
				}),
			},
		];
	},

	renderHTML({ node, HTMLAttributes }: { node: any; HTMLAttributes: Record<string, any> }) {
		const count = node?.attrs?.count || HTMLAttributes.count || 2;
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-columns": "",
				"data-count": String(count),
				class: `columns-wrapper columns-${count}`,
			}),
			0,
		];
	},
});
