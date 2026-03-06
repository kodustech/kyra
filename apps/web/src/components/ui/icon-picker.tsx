import { cn } from "@/lib/utils";
import {
	AlarmClock,
	Award,
	BookOpen,
	Bookmark,
	Building,
	Calendar,
	Camera,
	ChartBar,
	Circle,
	CircleCheck,
	Clipboard,
	Clock,
	Cloud,
	Code,
	Compass,
	Crown,
	Database,
	Edit,
	File,
	FileText,
	Flag,
	Flame,
	Gift,
	Globe,
	Headphones,
	Heart,
	Home,
	Image,
	Key,
	Lightbulb,
	Loader,
	Lock,
	type LucideIcon,
	Mail,
	MapPin,
	Megaphone,
	MessageCircle,
	MessageSquare,
	Mic,
	Moon,
	Music,
	Newspaper,
	Notebook,
	Pen,
	Pencil,
	Phone,
	Puzzle,
	Rocket,
	Send,
	Server,
	Settings,
	Shield,
	Sliders,
	Smile,
	Sparkles,
	Star,
	Store,
	Sun,
	Target,
	Terminal,
	ThumbsUp,
	Timer,
	TrendingUp,
	Trophy,
	Type,
	User,
	Users,
	Video,
	Wifi,
	Wrench,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const ICON_MAP: Record<string, LucideIcon> = {
	"file-text": FileText,
	file: File,
	notebook: Notebook,
	"book-open": BookOpen,
	bookmark: Bookmark,
	clipboard: Clipboard,
	newspaper: Newspaper,
	pen: Pen,
	pencil: Pencil,
	edit: Edit,
	type: Type,
	mail: Mail,
	"message-circle": MessageCircle,
	"message-square": MessageSquare,
	phone: Phone,
	send: Send,
	megaphone: Megaphone,
	image: Image,
	camera: Camera,
	video: Video,
	music: Music,
	headphones: Headphones,
	mic: Mic,
	star: Star,
	heart: Heart,
	"thumbs-up": ThumbsUp,
	flag: Flag,
	trophy: Trophy,
	award: Award,
	gift: Gift,
	crown: Crown,
	home: Home,
	building: Building,
	store: Store,
	"map-pin": MapPin,
	globe: Globe,
	compass: Compass,
	calendar: Calendar,
	clock: Clock,
	"alarm-clock": AlarmClock,
	timer: Timer,
	settings: Settings,
	sliders: Sliders,
	wrench: Wrench,
	puzzle: Puzzle,
	key: Key,
	loader: Loader,
	lock: Lock,
	shield: Shield,
	user: User,
	users: Users,
	smile: Smile,
	zap: Zap,
	rocket: Rocket,
	flame: Flame,
	sparkles: Sparkles,
	sun: Sun,
	moon: Moon,
	cloud: Cloud,
	code: Code,
	terminal: Terminal,
	database: Database,
	server: Server,
	wifi: Wifi,
	"chart-bar": ChartBar,
	"trending-up": TrendingUp,
	target: Target,
	lightbulb: Lightbulb,
	circle: Circle,
	"circle-check": CircleCheck,
};

const ICON_ENTRIES = Object.entries(ICON_MAP);

interface IconPickerProps {
	value: string | null;
	onChange: (icon: string | null) => void;
	className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const filtered = search
		? ICON_ENTRIES.filter(([name]) => name.includes(search.toLowerCase()))
		: ICON_ENTRIES;

	const CurrentIcon = value && ICON_MAP[value] ? ICON_MAP[value] : FileText;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground",
						className,
					)}
					title="Choose icon"
				>
					<CurrentIcon className="h-4 w-4" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-3" align="start">
				<input
					type="text"
					placeholder="Search icons..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="mb-3 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
				/>
				<div className="grid max-h-60 grid-cols-8 gap-1 overflow-y-auto">
					{filtered.map(([name, Icon]) => (
						<button
							key={name}
							type="button"
							title={name}
							onClick={() => {
								onChange(name);
								setOpen(false);
								setSearch("");
							}}
							className={cn(
								"flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
								value === name && "bg-accent text-accent-foreground ring-1 ring-ring",
							)}
						>
							<Icon className="h-4 w-4" />
						</button>
					))}
					{filtered.length === 0 && (
						<p className="col-span-8 py-4 text-center text-xs text-muted-foreground">
							No icons found
						</p>
					)}
				</div>
				{value && (
					<button
						type="button"
						onClick={() => {
							onChange(null);
							setOpen(false);
							setSearch("");
						}}
						className="mt-2 w-full rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
					>
						Remove icon
					</button>
				)}
			</PopoverContent>
		</Popover>
	);
}

interface PageIconProps {
	name: string | null | undefined;
	className?: string;
}

export function PageIcon({ name, className }: PageIconProps) {
	const Icon = name && ICON_MAP[name] ? ICON_MAP[name] : FileText;
	return <Icon className={className ?? "h-4 w-4"} />;
}
