import { ThemeToggle } from "./theme-toggle";

export function Header() {
	return (
		<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<h1 className="text-lg font-semibold text-primary">Kyra</h1>
			<ThemeToggle />
		</header>
	);
}
