import { ColumnSettingsContent } from "@/components/records/column-settings";
import { IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Field, UpdateBlockInput } from "@kyra/shared";
import { Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BlockSettingsProps {
	title: string | null;
	icon: string | null;
	showTitle: boolean;
	showBorder: boolean;
	viewType: string;
	onUpdate: (input: UpdateBlockInput) => void;
	// Column settings (table only)
	fields?: Field[];
	visibleIds?: Set<string>;
	orderedIds?: string[];
	onColumnChange?: (visibleIds: Set<string>, orderedIds: string[]) => void;
}

export function BlockSettings({
	title,
	icon,
	showTitle,
	showBorder,
	viewType,
	onUpdate,
	fields,
	visibleIds,
	orderedIds,
	onColumnChange,
}: BlockSettingsProps) {
	// Local state for title input with debounce to avoid "eating" characters
	const [localTitle, setLocalTitle] = useState(title ?? "");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const onUpdateRef = useRef(onUpdate);
	onUpdateRef.current = onUpdate;

	// Sync from prop only when it changes externally (not from our own typing)
	const isTypingRef = useRef(false);
	useEffect(() => {
		if (!isTypingRef.current) {
			setLocalTitle(title ?? "");
		}
	}, [title]);

	function handleTitleChange(value: string) {
		isTypingRef.current = true;
		setLocalTitle(value);
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			onUpdateRef.current({ title: value || null });
			isTypingRef.current = false;
		}, 500);
	}

	// Cleanup debounce on unmount
	useEffect(() => {
		return () => clearTimeout(debounceRef.current);
	}, []);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
					title="Block settings"
				>
					<Settings2 className="h-4 w-4" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 space-y-3 p-3">
				{/* Title + Icon */}
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Title</Label>
					<div className="flex items-center gap-2">
						<IconPicker
							value={icon}
							onChange={(value) => onUpdate({ icon: value })}
							className="h-8 w-8 shrink-0"
						/>
						<Input
							value={localTitle}
							onChange={(e) => handleTitleChange(e.target.value)}
							placeholder="Block title"
							className="h-8 text-sm"
						/>
					</div>
				</div>

				{/* Toggles */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="show-title" className="text-sm">Show title</Label>
						<Switch
							id="show-title"
							size="sm"
							checked={showTitle}
							onCheckedChange={(checked) => onUpdate({ showTitle: !!checked })}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label htmlFor="show-border" className="text-sm">Show border</Label>
						<Switch
							id="show-border"
							size="sm"
							checked={showBorder}
							onCheckedChange={(checked) => onUpdate({ showBorder: !!checked })}
						/>
					</div>
				</div>

				{/* Column settings for table view */}
				{viewType === "table" && fields && visibleIds && orderedIds && onColumnChange && (
					<>
						<Separator />
						<ColumnSettingsContent
							fields={fields}
							visibleIds={visibleIds}
							orderedIds={orderedIds}
							onChange={onColumnChange}
						/>
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
