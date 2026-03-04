import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface RichTextRendererProps {
	content: string;
}

/**
 * Detect if a string looks like raw Markdown rather than HTML.
 * Used to provide backwards-compatibility with old Markdown content.
 */
function looksLikeMarkdown(text: string): boolean {
	return /^#{1,6}\s|^\*\*|^\- |\*\*|__|\[.*\]\(.*\)/m.test(text);
}

/**
 * Very basic Markdown-to-HTML conversion for legacy content.
 * Handles headings, bold, italic, links, and lists.
 */
function markdownToHtml(md: string): string {
	let html = md
		// Headings
		.replace(/^### (.+)$/gm, "<h3>$1</h3>")
		.replace(/^## (.+)$/gm, "<h2>$1</h2>")
		.replace(/^# (.+)$/gm, "<h1>$1</h1>")
		// Bold & italic
		.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		// Links
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

	// Convert line breaks to paragraphs (simple approach)
	const lines = html.split("\n");
	const result: string[] = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("<h")) {
			result.push(trimmed);
		} else if (trimmed.startsWith("- ")) {
			result.push(`<li>${trimmed.slice(2)}</li>`);
		} else {
			result.push(`<p>${trimmed}</p>`);
		}
	}

	// Wrap consecutive <li> in <ul>
	return result
		.join("\n")
		.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
}

export function RichTextRenderer({ content }: RichTextRendererProps) {
	const htmlContent = content && looksLikeMarkdown(content) ? markdownToHtml(content) : content;

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
			}),
			Underline,
			TextStyle,
			Color,
			Highlight.configure({ multicolor: true }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Link.configure({ openOnClick: true }),
			Image,
		],
		content: htmlContent || "",
		editable: false,
	});

	if (!content) {
		return <p className="text-sm text-muted-foreground">No content yet.</p>;
	}

	if (!editor) return null;

	return (
		<div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-blockquote:my-2 prose-hr:my-3 prose-pre:my-2">
			<EditorContent editor={editor} />
		</div>
	);
}
