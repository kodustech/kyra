import { mergeAttributes, Node } from "@tiptap/react";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import { useState } from "react";

// ─── Details NodeView (React) ────────────────────────────────────────────────

function DetailsNodeView() {
	const [open, setOpen] = useState(false);

	return (
		<NodeViewWrapper
			as="div"
			className={`details-node${open ? " details-node--open" : ""}`}
		>
			<button
				type="button"
				className="details-toggle-btn"
				contentEditable={false}
				suppressContentEditableWarning
				onClick={() => setOpen((prev) => !prev)}
				aria-label={open ? "Collapse" : "Expand"}
			>
				▶
			</button>
			<NodeViewContent className="details-children" />
		</NodeViewWrapper>
	);
}

// ─── Details (wrapper) ───────────────────────────────────────────────────────

export const DetailsNode = Node.create({
	name: "details",
	group: "block",
	content: "detailsSummary detailsContent",
	defining: true,

	parseHTML() {
		return [{ tag: "details" }];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
		return ["details", mergeAttributes(HTMLAttributes, { class: "details-node" }), 0];
	},

	addNodeView() {
		return ReactNodeViewRenderer(DetailsNodeView);
	},
});

// ─── Details Summary ─────────────────────────────────────────────────────────

export const DetailsSummaryNode = Node.create({
	name: "detailsSummary",
	group: "",
	content: "inline*",
	defining: true,

	parseHTML() {
		return [{ tag: "summary" }];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
		return ["div", mergeAttributes(HTMLAttributes, { class: "details-summary" }), 0];
	},
});

// ─── Details Content ─────────────────────────────────────────────────────────

export const DetailsContentNode = Node.create({
	name: "detailsContent",
	group: "",
	content: "block+",
	defining: true,

	parseHTML() {
		return [{ tag: "div[data-details-content]" }];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { "data-details-content": "" }),
			0,
		];
	},
});
