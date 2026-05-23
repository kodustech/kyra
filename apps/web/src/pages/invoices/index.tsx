import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { InvoiceStatus, InvoiceWithCustomer } from "@kyra/shared";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SyncModal } from "./sync-modal";

const COLUMNS: { status: InvoiceStatus; label: string }[] = [
	{ status: "pending", label: "Pending" },
	{ status: "issued", label: "Issued" },
	{ status: "sent", label: "Sent" },
];

const STATUS_LABELS: Record<InvoiceStatus, string> = {
	pending: "Pending",
	issued: "Issued",
	sent: "Sent",
};

function nextStatus(current: InvoiceStatus): InvoiceStatus | null {
	if (current === "pending") return "issued";
	if (current === "issued") return "sent";
	return null;
}

function prevStatus(current: InvoiceStatus): InvoiceStatus | null {
	if (current === "sent") return "issued";
	if (current === "issued") return "pending";
	return null;
}

export function InvoicesPage() {
	const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([]);
	const [loading, setLoading] = useState(true);
	const [syncOpen, setSyncOpen] = useState(false);

	function loadInvoices() {
		setLoading(true);
		api
			.get<InvoiceWithCustomer[]>("/invoices")
			.then(setInvoices)
			.catch((err) => toast.error((err as Error).message))
			.finally(() => setLoading(false));
	}

	useEffect(() => {
		loadInvoices();
	}, []);

	async function handleSync(startDate: string, endDate: string) {
		try {
			const result = await api.post<{ synced: number }>("/invoices/sync", {
				startDate,
				endDate,
			});
			toast.success(`${result.synced} new invoice(s) synced`);
			loadInvoices();
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	async function handleMoveStatus(invoiceId: string, newStatus: InvoiceStatus) {
		try {
			await api.patch(`/invoices/${invoiceId}`, { status: newStatus });
			setInvoices((prev) =>
				prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv)),
			);
			toast.success("Status updated");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	function formatDate(date: string | null) {
		if (!date) return "—";
		return new Date(date).toLocaleDateString();
	}

	function formatCurrency(value: string | null) {
		if (!value) return "—";
		const num = Number.parseFloat(value);
		return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-semibold">Invoices</h2>
				<Button onClick={() => setSyncOpen(true)}>
					<RefreshCw className="mr-2 h-4 w-4" /> Sync Stripe
				</Button>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{COLUMNS.map((col) => {
						const columnInvoices = invoices.filter((inv) => inv.status === col.status);
						return (
							<div key={col.status} className="rounded-xl border border-border bg-muted/30 p-4">
								<div className="mb-4 flex items-center gap-2">
									<h3 className="font-medium">{col.label}</h3>
									<Badge variant="secondary">{columnInvoices.length}</Badge>
								</div>
								<div className="space-y-3">
									{columnInvoices.length === 0 ? (
										<p className="text-sm text-muted-foreground">No invoices.</p>
									) : (
										columnInvoices.map((inv) => {
											const np = nextStatus(inv.status);
											const pp = prevStatus(inv.status);
											return (
												<div
													key={inv.id}
													className="rounded-lg border border-border bg-background p-3 space-y-2"
												>
													<div className="flex items-start justify-between gap-2">
														<p className="text-sm font-medium truncate">
															{inv.customerName || "Unknown customer"}
														</p>
														<span className="text-sm font-medium whitespace-nowrap">
															{formatCurrency(inv.amount)}
														</span>
													</div>
													<p className="text-xs text-muted-foreground">
														{formatDate(inv.invoiceDate)}
													</p>
													{inv.description && (
														<p className="text-xs text-muted-foreground">{inv.description}</p>
													)}
													<div className="flex gap-2 pt-1">
														{pp && (
															<Button
																variant="outline"
																size="sm"
																className="flex-1 text-xs"
																onClick={() => handleMoveStatus(inv.id, pp)}
															>
																<ArrowLeft className="mr-1 h-3 w-3" /> {STATUS_LABELS[pp]}
															</Button>
														)}
														{np && (
															<Button
																variant="outline"
																size="sm"
																className="flex-1 text-xs"
																onClick={() => handleMoveStatus(inv.id, np)}
															>
																{STATUS_LABELS[np]} <ArrowRight className="ml-1 h-3 w-3" />
															</Button>
														)}
													</div>
												</div>
											);
										})
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<SyncModal open={syncOpen} onOpenChange={setSyncOpen} onSync={handleSync} />
		</div>
	);
}
