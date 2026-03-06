import { Bell } from "lucide-react";

interface NotificationBellProps {
	count: number;
	onClick?: () => void;
}

export function NotificationBell({ count, onClick }: NotificationBellProps) {
	return (
		<button
			type="button"
			className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
			onClick={onClick}
			title="Notifications"
		>
			<Bell className="h-5 w-5" />
			{count > 0 && (
				<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
					{count > 99 ? "99+" : count}
				</span>
			)}
		</button>
	);
}
