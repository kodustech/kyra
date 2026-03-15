import { PageIcon } from "@/components/ui/icon-picker";
import { mergeAttributes, Node } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useNavigate } from "react-router";

// ─── PageCard TipTap Node ───────────────────────────────────────────────────

export const PageCardNode = Node.create({
	name: "pageCard",
	group: "block",
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
		return [{ tag: 'div[data-page-card]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-page-card": "",
				class: "page-card",
			}),
			HTMLAttributes.pageName || "Untitled",
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(PageCardView);
	},
});

// ─── Card component (editor mode) ──────────────────────────────────────────

function PageCardView({ node }: { node: any }) {
	const { pageId, pageName, pageIcon } = node.attrs;
	const navigate = useNavigate();

	return (
		<NodeViewWrapper as="div" data-page-card="">
			<div
				className="page-card"
				onClick={() => navigate(`/pages/${pageId}`)}
				onKeyDown={(e) => e.key === "Enter" && navigate(`/pages/${pageId}`)}
				role="button"
				tabIndex={0}
			>
				<PageIcon name={pageIcon} className="h-4 w-4 shrink-0" />
				<span className="truncate">{pageName || "Untitled"}</span>
			</div>
		</NodeViewWrapper>
	);
}

// ─── Static renderer node (read-only / preview) ────────────────────────────

export const PageCardRendererNode = Node.create({
	name: "pageCard",
	group: "block",
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
		return [{ tag: 'div[data-page-card]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-page-card": "",
				class: "page-card",
			}),
			HTMLAttributes.pageName || "Untitled",
		];
	},
});
