import { UserAvatar } from "@/components/ui/user-avatar";
import { timeAgo } from "@/lib/format-time";
import type { UserInfo } from "@/lib/users-cache";
import type { CommentWithAuthor } from "@kyra/shared";
import { Trash2 } from "lucide-react";

interface CommentItemProps {
	comment: CommentWithAuthor;
	usersMap: Map<string, UserInfo>;
	currentUserId: string;
	currentUserRole: string;
	onDelete: (commentId: string) => void;
}

function parseContent(content: string, usersMap: Map<string, UserInfo>) {
	const parts: { type: "text" | "mention"; value: string; user?: UserInfo }[] = [];
	const regex = /@\[([0-9a-f-]{36})\]/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(content)) !== null) {
		if (match.index > lastIndex) {
			parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
		}
		const user = usersMap.get(match[1]);
		parts.push({
			type: "mention",
			value: user ? `@${user.name}` : `@unknown`,
			user,
		});
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < content.length) {
		parts.push({ type: "text", value: content.slice(lastIndex) });
	}

	return parts;
}

function renderMarkdown(text: string) {
	// Simple markdown: **bold**, *italic*, `code`, [text](url)
	return text
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
		.replace(
			/\[(.+?)\]\((.+?)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>',
		);
}

export function CommentItem({
	comment,
	usersMap,
	currentUserId,
	currentUserRole,
	onDelete,
}: CommentItemProps) {
	const parts = parseContent(comment.content, usersMap);
	const canDelete =
		comment.authorId === currentUserId ||
		currentUserRole === "owner" ||
		currentUserRole === "admin";

	return (
		<div className="group flex gap-2.5 py-2">
			<UserAvatar name={comment.author.name} color={comment.author.color} size="sm" />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{comment.author.name}</span>
					<span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
					{canDelete && (
						<button
							type="button"
							className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
							onClick={() => onDelete(comment.id)}
							title="Delete comment"
						>
							<Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
						</button>
					)}
				</div>
				<div className="mt-0.5 text-sm leading-relaxed">
					{parts.map((part, i) =>
						part.type === "mention" ? (
							<span
								key={i}
								className="rounded px-1 py-0.5 font-medium"
								style={{
									backgroundColor: part.user
										? `${part.user.color}20`
										: "var(--muted)",
									color: part.user?.color,
								}}
							>
								{part.value}
							</span>
						) : (
							<span
								key={i}
								dangerouslySetInnerHTML={{ __html: renderMarkdown(part.value) }}
							/>
						),
					)}
				</div>
			</div>
		</div>
	);
}
