import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Highlighter,
	ImageIcon,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Loader2,
	Minus,
	Quote,
	Redo,
	Strikethrough,
	UnderlineIcon,
	Undo,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DetailsNode, DetailsSummaryNode, DetailsContentNode } from "./details-node";
import { createPageLinkExtension, PageLinkNode, type PageItem } from "./page-link-node";
import { createSlashCommandExtension } from "./slash-commands";

/**
 * Very basic Markdown-to-HTML conversion for legacy content.
 */
function looksLikeMarkdown(text: string): boolean {
	const trimmed = text.trim();
	if (trimmed.startsWith("<")) return false;
	return /^#{1,6}\s|^\*\*|^\- |\*\*|__|\[.*\]\(.*\)/m.test(text);
}

function markdownToHtml(md: string): string {
	let html = md
		.replace(/^### (.+)$/gm, "<h3>$1</h3>")
		.replace(/^## (.+)$/gm, "<h2>$1</h2>")
		.replace(/^# (.+)$/gm, "<h1>$1</h1>")
		.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

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

	return result
		.join("\n")
		.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
}

interface RichTextEditorProps {
	content: string;
	onChange: (content: string) => void;
	editable?: boolean;
	onInsertBlock?: (type: string) => void;
	pages?: PageItem[];
	onCreatePage?: (name: string) => Promise<PageItem | null>;
	placeholder?: string;
}

export function RichTextEditor({
	content,
	onChange,
	editable = true,
	onInsertBlock,
	pages,
	onCreatePage,
	placeholder,
}: RichTextEditorProps) {
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const userEditedRef = useRef(false);
	const onInsertBlockRef = useRef(onInsertBlock);
	onInsertBlockRef.current = onInsertBlock;
	const pagesRef = useRef(pages ?? []);
	pagesRef.current = pages ?? [];
	const onCreatePageRef = useRef(onCreatePage);
	onCreatePageRef.current = onCreatePage;

	const slashCommands = useMemo(
		() => createSlashCommandExtension((...args) => onInsertBlockRef.current?.(...args)),
		[],
	);

	const pageLinkExt = useMemo(
		() =>
			createPageLinkExtension(
				() => pagesRef.current,
				async (name) => onCreatePageRef.current?.(name) ?? null,
			),
		[],
	);

	const htmlContent = content && looksLikeMarkdown(content) ? markdownToHtml(content) : content;

	const extensions = useMemo(() => {
		const base: any[] = [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
			}),
			Underline,
			TextStyle,
			Color,
			Highlight.configure({ multicolor: true }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Link.configure({ openOnClick: !editable, autolink: true }),
			Image,
			DetailsNode,
			DetailsSummaryNode,
			DetailsContentNode,
		];

		if (editable) {
			base.push(
				Placeholder.configure({ placeholder: placeholder ?? 'Type "/" for commands…' }),
				slashCommands,
				pageLinkExt,
			);
		} else {
			base.push(PageLinkNode);
		}

		return base;
	}, [editable, placeholder, slashCommands, pageLinkExt]);

	const editor = useEditor({
		extensions,
		content: htmlContent || "",
		editable,
		onUpdate: editable
			? ({ editor }) => {
					userEditedRef.current = true;
					onChangeRef.current(editor.getHTML());
				}
			: undefined,
	});

	// Sync external content
	useEffect(() => {
		if (!editor) return;
		if (editable && userEditedRef.current) return;
		const newHtml = content && looksLikeMarkdown(content) ? markdownToHtml(content) : content;
		const currentHTML = editor.getHTML();
		if (newHtml !== currentHTML) {
			editor.commands.setContent(newHtml || "", { emitUpdate: false });
		}
	}, [content, editor, editable]);

	const setLink = useCallback(() => {
		if (!editor) return;
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	const insertImage = useCallback(
		(url: string) => {
			if (!editor || !url) return;
			editor.chain().focus().setImage({ src: url }).run();
		},
		[editor],
	);

	if (!editable && !content) {
		return <p className="text-sm text-muted-foreground">No content yet.</p>;
	}

	if (!editor) return null;

	if (!editable) {
		return (
			<div className="tiptap-content">
				<EditorContent editor={editor} />
			</div>
		);
	}

	return (
		<div className="rounded-md border border-border">
			{/* Fixed Toolbar */}
			<div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/50 p-1">
				{/* Undo / Redo */}
				<ToolbarButton
					onClick={() => editor.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
					title="Undo"
				>
					<Undo className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() => editor.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
					title="Redo"
				>
					<Redo className="h-4 w-4" />
				</ToolbarButton>

				<ToolbarSeparator />

				{/* Text formatting */}
				<ToolbarButton
					active={editor.isActive("bold")}
					onClick={() => editor.chain().focus().toggleBold().run()}
					title="Bold"
				>
					<Bold className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("italic")}
					onClick={() => editor.chain().focus().toggleItalic().run()}
					title="Italic"
				>
					<Italic className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("underline")}
					onClick={() => editor.chain().focus().toggleUnderline().run()}
					title="Underline"
				>
					<UnderlineIcon className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("strike")}
					onClick={() => editor.chain().focus().toggleStrike().run()}
					title="Strikethrough"
				>
					<Strikethrough className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("code")}
					onClick={() => editor.chain().focus().toggleCode().run()}
					title="Inline Code"
				>
					<Code className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("highlight")}
					onClick={() => editor.chain().focus().toggleHighlight().run()}
					title="Highlight"
				>
					<Highlighter className="h-4 w-4" />
				</ToolbarButton>

				<ToolbarSeparator />

				{/* Headings */}
				<ToolbarButton
					active={editor.isActive("heading", { level: 1 })}
					onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
					title="Heading 1"
				>
					<Heading1 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("heading", { level: 2 })}
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
					title="Heading 2"
				>
					<Heading2 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("heading", { level: 3 })}
					onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
					title="Heading 3"
				>
					<Heading3 className="h-4 w-4" />
				</ToolbarButton>

				<ToolbarSeparator />

				{/* Lists & Blockquote */}
				<ToolbarButton
					active={editor.isActive("bulletList")}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					title="Bullet List"
				>
					<List className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("orderedList")}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					title="Ordered List"
				>
					<ListOrdered className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("blockquote")}
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
					title="Blockquote"
				>
					<Quote className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() => editor.chain().focus().setHorizontalRule().run()}
					title="Horizontal Rule"
				>
					<Minus className="h-4 w-4" />
				</ToolbarButton>

				<ToolbarSeparator />

				{/* Alignment */}
				<ToolbarButton
					active={editor.isActive({ textAlign: "left" })}
					onClick={() => editor.chain().focus().setTextAlign("left").run()}
					title="Align Left"
				>
					<AlignLeft className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive({ textAlign: "center" })}
					onClick={() => editor.chain().focus().setTextAlign("center").run()}
					title="Align Center"
				>
					<AlignCenter className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive({ textAlign: "right" })}
					onClick={() => editor.chain().focus().setTextAlign("right").run()}
					title="Align Right"
				>
					<AlignRight className="h-4 w-4" />
				</ToolbarButton>

				<ToolbarSeparator />

				{/* Link & Image */}
				<ToolbarButton
					active={editor.isActive("link")}
					onClick={setLink}
					title="Link"
				>
					<LinkIcon className="h-4 w-4" />
				</ToolbarButton>
				<ImageInsertPopover onInsert={insertImage} />
			</div>

			{/* BubbleMenu — floating toolbar on text selection */}
			<BubbleMenu
				editor={editor}
				className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
			>
				<ToolbarButton
					active={editor.isActive("bold")}
					onClick={() => editor.chain().focus().toggleBold().run()}
					title="Bold"
				>
					<Bold className="h-3.5 w-3.5" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("italic")}
					onClick={() => editor.chain().focus().toggleItalic().run()}
					title="Italic"
				>
					<Italic className="h-3.5 w-3.5" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("underline")}
					onClick={() => editor.chain().focus().toggleUnderline().run()}
					title="Underline"
				>
					<UnderlineIcon className="h-3.5 w-3.5" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("strike")}
					onClick={() => editor.chain().focus().toggleStrike().run()}
					title="Strikethrough"
				>
					<Strikethrough className="h-3.5 w-3.5" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("code")}
					onClick={() => editor.chain().focus().toggleCode().run()}
					title="Code"
				>
					<Code className="h-3.5 w-3.5" />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive("link")}
					onClick={setLink}
					title="Link"
				>
					<LinkIcon className="h-3.5 w-3.5" />
				</ToolbarButton>
			</BubbleMenu>

			{/* Editor area */}
			<EditorContent editor={editor} className="tiptap-content" />
		</div>
	);
}

function ImageInsertPopover({ onInsert }: { onInsert: (url: string) => void }) {
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<"upload" | "url">("upload");
	const [url, setUrl] = useState("");
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function reset() {
		setTab("upload");
		setUrl("");
		setUploading(false);
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);
		try {
			const res = await api.upload<{ url: string }>("/uploads/image", file);
			onInsert(res.url);
			setOpen(false);
			reset();
		} catch (err) {
			alert((err as Error).message);
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	function handleUrlSubmit() {
		if (!url.trim()) return;
		onInsert(url.trim());
		setOpen(false);
		reset();
	}

	return (
		<Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					title="Insert Image"
				>
					<ImageIcon className="h-4 w-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80" align="start">
				<div className="space-y-3">
					<div className="flex gap-1 rounded-md bg-muted p-1">
						<button
							type="button"
							className={cn(
								"flex-1 rounded-sm px-3 py-1 text-sm font-medium transition-colors",
								tab === "upload" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => setTab("upload")}
						>
							Upload
						</button>
						<button
							type="button"
							className={cn(
								"flex-1 rounded-sm px-3 py-1 text-sm font-medium transition-colors",
								tab === "url" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => setTab("url")}
						>
							URL
						</button>
					</div>

					{tab === "upload" ? (
						<div className="space-y-2">
							<Label>Choose an image</Label>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-full"
									disabled={uploading}
									onClick={() => fileInputRef.current?.click()}
								>
									{uploading ? (
										<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
									) : (
										<><Upload className="mr-2 h-4 w-4" /> Select file</>
									)}
								</Button>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
									className="hidden"
									onChange={handleFileChange}
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								JPG, PNG, GIF, WebP or SVG. Max 5 MB.
							</p>
						</div>
					) : (
						<div className="space-y-2">
							<Label htmlFor="image-url">Image URL</Label>
							<div className="flex gap-2">
								<Input
									id="image-url"
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder="https://..."
									onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
								/>
								<Button type="button" size="sm" onClick={handleUrlSubmit} disabled={!url.trim()}>
									Insert
								</Button>
							</div>
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function ToolbarButton({
	active,
	children,
	...props
}: React.ComponentProps<typeof Button> & { active?: boolean }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
			{...props}
		>
			{children}
		</Button>
	);
}

function ToolbarSeparator() {
	return <div className="mx-1 h-8 w-px bg-border" />;
}
