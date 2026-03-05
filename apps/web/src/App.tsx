import { ProtectedRoute } from "@/components/auth/protected-route";
import { SetupGuard } from "@/components/auth/setup-guard";
import { RootLayout } from "@/components/layout/root-layout";
import { Toaster } from "@/components/ui/sonner";
import { AcceptInvitePage } from "@/pages/accept-invite";
import { Dashboard } from "@/pages/dashboard";
import { DatabaseDetail } from "@/pages/database-detail";
import { LoginPage } from "@/pages/login";
import { NotFound } from "@/pages/not-found";
import { PageDetail } from "@/pages/page-detail";
import { PublicPage } from "@/pages/public-page";
import { SetupPage } from "@/pages/setup";
import { UserManagement } from "@/pages/user-management";
import { AuthProvider } from "@/providers/auth-provider";
import { DatabasesProvider } from "@/providers/databases-provider";
import { PagesProvider } from "@/providers/pages-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { BrowserRouter, Route, Routes } from "react-router";

export function App() {
	return (
		<ThemeProvider>
			<BrowserRouter>
				<AuthProvider>
					<Routes>
						{/* Public routes */}
						<Route path="/p/:slug" element={<PublicPage />} />
						<Route path="/setup" element={<SetupPage />} />
						<Route path="/invite/:token" element={<AcceptInvitePage />} />

						{/* Login — redirect to setup if needed */}
						<Route element={<SetupGuard />}>
							<Route path="/login" element={<LoginPage />} />
						</Route>

						{/* Protected routes */}
						<Route element={<SetupGuard />}>
							<Route element={<ProtectedRoute />}>
								<Route
									element={
										<DatabasesProvider>
											<PagesProvider>
												<RootLayout />
											</PagesProvider>
										</DatabasesProvider>
									}
								>
									<Route path="/" element={<Dashboard />} />
									<Route path="/pages/:pageId" element={<PageDetail />} />
									<Route path="/databases/:databaseId" element={<DatabaseDetail />} />
									<Route path="/settings/users" element={<UserManagement />} />
									<Route path="*" element={<NotFound />} />
								</Route>
							</Route>
						</Route>
					</Routes>
				</AuthProvider>
			</BrowserRouter>
			<Toaster />
		</ThemeProvider>
	);
}
