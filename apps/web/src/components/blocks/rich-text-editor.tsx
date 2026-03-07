import { Button } from "@/components/ui/button";
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
	Minus,
	Quote,
	Redo,
	Strikethrough,
	UnderlineIcon,
	Undo,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface RichTextEditorProps {
	content: string;
	onChange: (content: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const userEditedRef = useRef(false);

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
			Link.configure({ openOnClick: false, autolink: true }),
			Image,
			Placeholder.configure({ placeholder: "Start writing…" }),
		],
		content,
		onUpdate: ({ editor }) => {
			userEditedRef.current = true;
			onChangeRef.current(editor.getHTML());
		},
	});

	// Sync external content only on initial load (before user starts editing)
	useEffect(() => {
		if (!editor || userEditedRef.current) return;
		const currentHTML = editor.getHTML();
		if (content !== currentHTML) {
			editor.commands.setContent(content, { emitUpdate: false });
		}
	}, [content, editor]);

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

	const addImage = useCallback(() => {
		if (!editor) return;
		const url = window.prompt("Image URL");
		if (url) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	}, [editor]);

	if (!editor) return null;

	return (
		<div className="rounded-md border border-border">
			{/* Toolbar */}
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
				<ToolbarButton onClick={addImage} title="Insert Image">
					<ImageIcon className="h-4 w-4" />
				</ToolbarButton>
			</div>

			{/* Editor area */}
			<EditorContent editor={editor} className="tiptap-editor" />
		</div>
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
