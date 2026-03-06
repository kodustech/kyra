import { api } from "@/lib/api";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

interface UserInfo {
	id: string;
	name: string;
	color: string;
}

interface AssigneeSelectProps {
	value: string;
	onChange: (value: unknown) => void;
	placeholder?: string;
}

export function AssigneeSelect({ value, onChange, placeholder }: AssigneeSelectProps) {
	const [users, setUsers] = useState<UserInfo[]>([]);

	useEffect(() => {
		api.get<UserInfo[]>("/auth/users/list").then(setUsers);
	}, []);

	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger>
				<SelectValue placeholder={placeholder ?? "Select assignee"} />
			</SelectTrigger>
			<SelectContent>
				{users.map((u) => (
					<SelectItem key={u.id} value={u.id}>
						<div className="flex items-center gap-2">
							<UserAvatar name={u.name} color={u.color} size="sm" />
							<span>{u.name}</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
