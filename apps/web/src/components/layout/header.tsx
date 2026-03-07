import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/providers/auth-provider";
import { canManageUsers } from "@kyra/shared";
import { Key, LogOut, Users } from "lucide-react";
import { Link } from "react-router";
import { NotificationPopover } from "./notification-popover";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
	const { user, logout } = useAuth();

	return (
		<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<h1 className="text-lg font-semibold text-primary">Kyra</h1>
			<div className="flex items-center gap-2">
				<ThemeToggle />
				{user && <NotificationPopover />}
				{user && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button type="button" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
								<UserAvatar name={user.name} color={user.color} size="sm" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel>
								<p className="text-sm font-medium">{user.name}</p>
								<p className="text-xs text-muted-foreground">{user.email}</p>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{canManageUsers(user.role) && (
								<DropdownMenuItem asChild>
									<Link to="/settings/users">
										<Users className="mr-2 h-4 w-4" />
										User Management
									</Link>
								</DropdownMenuItem>
							)}
							<DropdownMenuItem asChild>
								<Link to="/settings/api-keys">
									<Key className="mr-2 h-4 w-4" />
									API Keys
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={logout}>
								<LogOut className="mr-2 h-4 w-4" />
								Sign Out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</header>
	);
}
