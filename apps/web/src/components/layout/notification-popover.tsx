import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useNotifications } from "@/hooks/use-notifications";
import { timeAgo } from "@/lib/format-time";
import { Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { NotificationBell } from "./notification-bell";

export function NotificationPopover() {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const {
		unreadCount,
		notifications,
		loading,
		fetchNotifications,
		markAsRead,
		markAllAsRead,
	} = useNotifications();

	const handleOpen = (isOpen: boolean) => {
		setOpen(isOpen);
		if (isOpen) {
			fetchNotifications();
		}
	};

	const handleClick = async (notif: (typeof notifications)[0]) => {
		if (!notif.read) {
			await markAsRead(notif.id);
		}
		if (notif.databaseId) {
			navigate(`/databases/${notif.databaseId}`);
		}
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={handleOpen}>
			<PopoverTrigger asChild>
				<div>
					<NotificationBell count={unreadCount} />
				</div>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex items-center justify-between border-b border-border px-4 py-3">
					<h4 className="text-sm font-medium">Notifications</h4>
					{unreadCount > 0 && (
						<button
							type="button"
							className="flex items-center gap-1 text-xs text-primary hover:underline"
							onClick={markAllAsRead}
						>
							<Check className="h-3 w-3" />
							Mark all as read
						</button>
					)}
				</div>

				<div className="max-h-80 overflow-y-auto">
					{loading ? (
						<p className="py-6 text-center text-xs text-muted-foreground">Loading...</p>
					) : notifications.length === 0 ? (
						<p className="py-6 text-center text-xs text-muted-foreground">
							No notifications
						</p>
					) : (
						notifications.map((notif) => (
							<button
								key={notif.id}
								type="button"
								className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent ${
									!notif.read ? "bg-accent/50" : ""
								}`}
								onClick={() => handleClick(notif)}
							>
								<UserAvatar
									name={notif.actor.name}
									color={notif.actor.color}
									size="sm"
								/>
								<div className="min-w-0 flex-1">
									<p className="text-sm">
										<span className="font-medium">{notif.actor.name}</span>{" "}
										mentioned you
										{notif.recordTitle && (
											<>
												{" "}
												in{" "}
												<span className="font-medium">{notif.recordTitle}</span>
											</>
										)}
									</p>
									<p className="mt-0.5 text-xs text-muted-foreground">
										{timeAgo(notif.createdAt)}
									</p>
								</div>
								{!notif.read && (
									<span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
								)}
							</button>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
