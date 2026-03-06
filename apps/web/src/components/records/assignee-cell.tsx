import { fetchUsers, type UserInfo } from "@/lib/users-cache";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useEffect, useState } from "react";

// Re-export for backwards compatibility
export { invalidateUsersCache } from "@/lib/users-cache";

interface AssigneeCellProps {
	userId: string;
}

export function AssigneeCell({ userId }: AssigneeCellProps) {
	const [user, setUser] = useState<UserInfo | null>(null);

	useEffect(() => {
		fetchUsers().then((users) => {
			const found = users.find((u) => u.id === userId);
			setUser(found ?? null);
		});
	}, [userId]);

	if (!user) return <span className="text-muted-foreground">—</span>;

	return (
		<div className="flex items-center gap-1.5">
			<UserAvatar name={user.name} color={user.color} size="sm" />
			<span className="truncate text-sm">{user.name}</span>
		</div>
	);
}
