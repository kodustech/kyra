import { getInitials } from "@kyra/shared";

interface UserAvatarProps {
	name: string;
	color: string;
	size?: "sm" | "md" | "lg";
}

const sizes = {
	sm: "h-7 w-7 text-xs",
	md: "h-9 w-9 text-sm",
	lg: "h-12 w-12 text-base",
};

export function UserAvatar({ name, color, size = "md" }: UserAvatarProps) {
	return (
		<div
			className={`inline-flex items-center justify-center rounded-full font-medium text-white ${sizes[size]}`}
			style={{ backgroundColor: color }}
			title={name}
		>
			{getInitials(name)}
		</div>
	);
}
