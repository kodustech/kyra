import { RootLayout } from "@/components/layout/root-layout";
import { Toaster } from "@/components/ui/sonner";
import { Dashboard } from "@/pages/dashboard";
import { DatabaseDetail } from "@/pages/database-detail";
import { NotFound } from "@/pages/not-found";
import { DatabasesProvider } from "@/providers/databases-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { BrowserRouter, Route, Routes } from "react-router";

export function App() {
	return (
		<ThemeProvider>
			<BrowserRouter>
				<DatabasesProvider>
					<Routes>
						<Route element={<RootLayout />}>
							<Route path="/" element={<Dashboard />} />
							<Route path="/databases/:databaseId" element={<DatabaseDetail />} />
							<Route path="*" element={<NotFound />} />
						</Route>
					</Routes>
				</DatabasesProvider>
			</BrowserRouter>
			<Toaster />
		</ThemeProvider>
	);
}
