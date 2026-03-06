import type { UserInfo } from "@/lib/users-cache";
import { Send } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface CommentInputProps {
	onSubmit: (content: string) => Promise<void>;
	users: UserInfo[];
}

export function CommentInput({ onSubmit, users }: CommentInputProps) {
	const [value, setValue] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [showMentions, setShowMentions] = useState(false);
	const [mentionFilter, setMentionFilter] = useState("");
	const [mentionMap] = useState<Map<string, string>>(() => new Map());
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const filteredUsers = users.filter((u) =>
		u.name.toLowerCase().includes(mentionFilter.toLowerCase()),
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const val = e.target.value;
			setValue(val);

			// Detect @ trigger
			const cursorPos = e.target.selectionStart;
			const textBeforeCursor = val.slice(0, cursorPos);
			const atIndex = textBeforeCursor.lastIndexOf("@");

			if (atIndex !== -1) {
				const textAfterAt = textBeforeCursor.slice(atIndex + 1);
				// Only show if no space before the mention part (or at start)
				const charBefore = atIndex > 0 ? val[atIndex - 1] : " ";
				if ((charBefore === " " || charBefore === "\n" || atIndex === 0) && !textAfterAt.includes(" ")) {
					setShowMentions(true);
					setMentionFilter(textAfterAt);
					return;
				}
			}
			setShowMentions(false);
		},
		[],
	);

	const selectMention = useCallback(
		(user: UserInfo) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const cursorPos = textarea.selectionStart;
			const textBeforeCursor = value.slice(0, cursorPos);
			const atIndex = textBeforeCursor.lastIndexOf("@");

			if (atIndex === -1) return;

			const before = value.slice(0, atIndex);
			const after = value.slice(cursorPos);
			const mentionText = `@${user.name}`;
			const newValue = `${before}${mentionText} ${after}`;

			mentionMap.set(user.name, user.id);
			setValue(newValue);
			setShowMentions(false);

			// Set cursor after the mention
			requestAnimationFrame(() => {
				const newPos = before.length + mentionText.length + 1;
				textarea.focus();
				textarea.setSelectionRange(newPos, newPos);
			});
		},
		[value, mentionMap],
	);

	const handleSubmit = useCallback(async () => {
		if (!value.trim() || submitting) return;

		// Convert @NomeDaPessoa → @[userId]
		let content = value;
		for (const [name, userId] of mentionMap) {
			content = content.replaceAll(`@${name}`, `@[${userId}]`);
		}

		setSubmitting(true);
		try {
			await onSubmit(content);
			setValue("");
			mentionMap.clear();
		} finally {
			setSubmitting(false);
		}
	}, [value, submitting, onSubmit, mentionMap]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				handleSubmit();
			}
			if (e.key === "Escape" && showMentions) {
				setShowMentions(false);
			}
		},
		[handleSubmit, showMentions],
	);

	return (
		<div className="relative">
			<div className="flex items-end gap-2">
				<textarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					placeholder="Write a comment... Use @ to mention"
					className="min-h-[72px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					rows={2}
				/>
				<button
					type="button"
					disabled={!value.trim() || submitting}
					onClick={handleSubmit}
					className="mb-1 rounded-md p-2 text-primary hover:bg-accent disabled:opacity-50"
					title="Send (Ctrl+Enter)"
				>
					<Send className="h-4 w-4" />
				</button>
			</div>

			{showMentions && filteredUsers.length > 0 && (
				<div className="absolute bottom-full left-0 z-50 mb-1 max-h-40 w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
					{filteredUsers.map((user) => (
						<button
							key={user.id}
							type="button"
							className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
							onClick={() => selectMention(user)}
						>
							<span
								className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium text-white"
								style={{ backgroundColor: user.color }}
							>
								{user.name[0]?.toUpperCase()}
							</span>
							<span>{user.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
