import { RootLayout } from "@/components/layout/root-layout";
import { Toaster } from "@/components/ui/sonner";
import { Dashboard } from "@/pages/dashboard";
import { DatabaseDetail } from "@/pages/database-detail";
import { NotFound } from "@/pages/not-found";
import { PageDetail } from "@/pages/page-detail";
import { PublicPage } from "@/pages/public-page";
import { DatabasesProvider } from "@/providers/databases-provider";
import { PagesProvider } from "@/providers/pages-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { BrowserRouter, Route, Routes } from "react-router";

export function App() {
	return (
		<ThemeProvider>
			<BrowserRouter>
				<DatabasesProvider>
					<PagesProvider>
						<Routes>
							<Route path="/p/:slug" element={<PublicPage />} />
							<Route element={<RootLayout />}>
								<Route path="/" element={<Dashboard />} />
								<Route path="/pages/:pageId" element={<PageDetail />} />
								<Route path="/databases/:databaseId" element={<DatabaseDetail />} />
								<Route path="*" element={<NotFound />} />
							</Route>
						</Routes>
					</PagesProvider>
				</DatabasesProvider>
			</BrowserRouter>
			<Toaster />
		</ThemeProvider>
	);
}
