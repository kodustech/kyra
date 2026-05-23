import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { BillingWithCustomer } from "@kyra/shared";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function BillingsPage() {
	const [billings, setBillings] = useState<BillingWithCustomer[]>([]);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);

	function loadBillings() {
		setLoading(true);
		api
			.get<BillingWithCustomer[]>("/billings")
			.then(setBillings)
			.catch((err) => toast.error((err as Error).message))
			.finally(() => setLoading(false));
	}

	useEffect(() => {
		loadBillings();
	}, []);

	async function handleSync() {
		setSyncing(true);
		try {
			const result = await api.post<{ synced: number }>("/billings/sync", {});
			toast.success(`${result.synced} new billing(s) synced`);
			loadBillings();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSyncing(false);
		}
	}

	function formatDate(date: string | null) {
		if (!date) return "—";
		return new Date(date).toLocaleDateString();
	}

	function formatCurrency(value: string | null, currency: string) {
		if (!value) return "—";
		const num = Number.parseFloat(value);
		const locale = currency === "BRL" ? "pt-BR" : "en-US";
		return new Intl.NumberFormat(locale, { style: "currency", currency }).format(num);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-semibold">Billings</h2>
				<Button onClick={handleSync} disabled={syncing}>
					<RefreshCw className="mr-2 h-4 w-4" /> {syncing ? "Syncing..." : "Sync Stripe"}
				</Button>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			) : billings.length === 0 ? (
				<div className="rounded-xl border border-border p-12 text-center">
					<p className="text-muted-foreground">No billings yet. Click "Sync Stripe" to pull paid invoices.</p>
				</div>
			) : (
				<div className="rounded-xl border border-border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Payment Date</TableHead>
								<TableHead>Customer</TableHead>
								<TableHead className="text-right">Amount (BRL)</TableHead>
								<TableHead className="text-right">Amount (USD)</TableHead>
								<TableHead className="text-right">Exchange Rate</TableHead>
								<TableHead>Stripe Invoice</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{billings.map((billing) => (
								<TableRow key={billing.id}>
									<TableCell>{formatDate(billing.paymentDate)}</TableCell>
									<TableCell>{billing.customerName || "—"}</TableCell>
									<TableCell className="text-right">
										{formatCurrency(billing.amountBrl, "BRL")}
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(billing.amountUsd, "USD")}
									</TableCell>
									<TableCell className="text-right text-muted-foreground">
										{billing.exchangeRate || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground text-xs font-mono">
										{billing.stripeInvoiceId || "—"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
