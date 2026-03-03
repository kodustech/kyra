import { type ReactNode, createContext, useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	resolvedTheme: "light" | "dark";
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "kyra-theme";

function getSystemTheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		return (stored as Theme) || "system";
	});

	const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

	const setTheme = useCallback((t: Theme) => {
		setThemeState(t);
		localStorage.setItem(STORAGE_KEY, t);
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(resolvedTheme);
	}, [resolvedTheme]);

	useEffect(() => {
		if (theme !== "system") return;

		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => setThemeState("system"); // triggers re-render
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}
