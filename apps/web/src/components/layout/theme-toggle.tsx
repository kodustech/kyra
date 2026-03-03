import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
	const { resolvedTheme, setTheme, theme } = useTheme();

	function cycle() {
		const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
		const idx = order.indexOf(theme);
		setTheme(order[(idx + 1) % order.length]);
	}

	return (
		<button
			type="button"
			onClick={cycle}
			className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
			title={`Theme: ${theme}`}
		>
			{resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
		</button>
	);
}
