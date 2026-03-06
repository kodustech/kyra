import { useComments } from "@/hooks/use-comments";
import { fetchUsers, type UserInfo } from "@/lib/users-cache";
import { useAuth } from "@/providers/auth-provider";
import { MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CommentInput } from "./comment-input";
import { CommentItem } from "./comment-item";

interface CommentSectionProps {
	databaseId: string;
	recordId: string;
}

export function CommentSection({ databaseId, recordId }: CommentSectionProps) {
	const { user } = useAuth();
	const { comments, loading, create, remove } = useComments(databaseId, recordId);
	const [users, setUsers] = useState<UserInfo[]>([]);
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetchUsers().then(setUsers);
	}, []);

	const usersMap = useMemo(() => {
		const map = new Map<string, UserInfo>();
		for (const u of users) {
			map.set(u.id, u);
		}
		return map;
	}, [users]);

	// Auto-scroll when new comments arrive
	const prevCountRef = useRef(comments.length);
	useEffect(() => {
		if (comments.length > prevCountRef.current && listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
		prevCountRef.current = comments.length;
	}, [comments.length]);

	const handleSubmit = async (content: string) => {
		try {
			await create(content);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const handleDelete = async (commentId: string) => {
		try {
			await remove(commentId);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div>
			<div className="mb-3 flex items-center gap-2">
				<MessageSquare className="h-4 w-4 text-muted-foreground" />
				<h3 className="text-sm font-medium">Comments</h3>
			</div>

			{loading ? (
				<p className="py-3 text-center text-xs text-muted-foreground">Loading...</p>
			) : comments.length === 0 ? (
				<p className="py-3 text-center text-xs text-muted-foreground">
					No comments yet
				</p>
			) : (
				<div ref={listRef} className="mb-3 max-h-64 overflow-y-auto">
					{comments.map((comment) => (
						<CommentItem
							key={comment.id}
							comment={comment}
							usersMap={usersMap}
							currentUserId={user?.id ?? ""}
							currentUserRole={user?.role ?? "viewer"}
							onDelete={handleDelete}
						/>
					))}
				</div>
			)}

			<CommentInput onSubmit={handleSubmit} users={users} />
		</div>
	);
}
