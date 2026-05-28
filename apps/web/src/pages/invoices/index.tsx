import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { InvoiceStatus, InvoiceWithCustomer, NfseStatus } from "@kyra/shared";
import {
	ArrowLeft,
	ArrowRight,
	Download,
	FileText,
	Loader2,
	RefreshCw,
	Send,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
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

const NFSE_LABELS: Record<NfseStatus, string> = {
	not_issued: "Not issued",
	processing: "Processing",
	authorized: "Authorized",
	error: "Error",
	cancelled: "Cancelled",
};

const NFSE_VARIANTS: Record<NfseStatus, "outline" | "secondary" | "default" | "destructive"> = {
	not_issued: "outline",
	processing: "secondary",
	authorized: "default",
	error: "destructive",
	cancelled: "outline",
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
	const [issuingId, setIssuingId] = useState<string | null>(null);
	const [cancelTarget, setCancelTarget] = useState<InvoiceWithCustomer | null>(null);
	const [justification, setJustification] = useState("");
	const [cancelling, setCancelling] = useState(false);

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

	async function handleIssue(invoiceId: string) {
		setIssuingId(invoiceId);
		try {
			const updated = await api.post<InvoiceWithCustomer>(
				`/invoices/${invoiceId}/issue-nfse`,
				{},
			);
			setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...updated } : inv)));
			if (updated.nfseStatus === "authorized") {
				toast.success(`NFS-e ${updated.nfseNumber ?? ""} authorized`);
			} else if (updated.nfseStatus === "processing") {
				toast.info("NFS-e sent — waiting for authorization");
			} else if (updated.nfseStatus === "error") {
				toast.error(updated.nfseError || "NFS-e error");
			}
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setIssuingId(null);
		}
	}

	async function handleCancelConfirm() {
		if (!cancelTarget) return;
		setCancelling(true);
		try {
			const updated = await api.post<InvoiceWithCustomer>(
				`/invoices/${cancelTarget.id}/cancel-nfse`,
				{ justification },
			);
			setInvoices((prev) =>
				prev.map((inv) => (inv.id === cancelTarget.id ? { ...inv, ...updated } : inv)),
			);
			toast.success("NFS-e cancelled");
			setCancelTarget(null);
			setJustification("");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setCancelling(false);
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
				<div className="flex items-center gap-2">
					<Button variant="outline" asChild>
						<Link to="/administrative/settings">Settings</Link>
					</Button>
					<Button onClick={() => setSyncOpen(true)}>
						<RefreshCw className="mr-2 h-4 w-4" /> Sync Stripe
					</Button>
				</div>
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
											const issuing = issuingId === inv.id;
											const canIssue =
												inv.nfseStatus === "not_issued" || inv.nfseStatus === "error";
											const canCancel = inv.nfseStatus === "authorized";
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
													<div className="flex items-center justify-between text-xs text-muted-foreground">
														<span>{formatDate(inv.invoiceDate)}</span>
														<Badge variant={NFSE_VARIANTS[inv.nfseStatus]} className="text-[10px]">
															NFS-e: {NFSE_LABELS[inv.nfseStatus]}
															{inv.nfseNumber ? ` #${inv.nfseNumber}` : ""}
														</Badge>
													</div>
													{inv.description && (
														<p className="text-xs text-muted-foreground">{inv.description}</p>
													)}
													{inv.nfseError && (
														<p className="text-xs text-destructive">{inv.nfseError}</p>
													)}

													<div className="flex flex-wrap gap-1 pt-1">
														{canIssue && (
															<Button
																size="sm"
																className="flex-1 text-xs"
																onClick={() => handleIssue(inv.id)}
																disabled={issuing}
															>
																{issuing ? (
																	<Loader2 className="mr-1 h-3 w-3 animate-spin" />
																) : (
																	<Send className="mr-1 h-3 w-3" />
																)}
																Issue NFS-e
															</Button>
														)}
														{inv.nfsePdfUrl && (
															<Button
																variant="outline"
																size="sm"
																className="text-xs"
																asChild
															>
																<a href={inv.nfsePdfUrl} target="_blank" rel="noopener noreferrer">
																	<FileText className="mr-1 h-3 w-3" /> PDF
																</a>
															</Button>
														)}
														{inv.nfseXmlUrl && (
															<Button
																variant="outline"
																size="sm"
																className="text-xs"
																asChild
															>
																<a href={inv.nfseXmlUrl} target="_blank" rel="noopener noreferrer">
																	<Download className="mr-1 h-3 w-3" /> XML
																</a>
															</Button>
														)}
														{canCancel && (
															<Button
																variant="outline"
																size="sm"
																className="text-xs text-destructive"
																onClick={() => setCancelTarget(inv)}
															>
																<XCircle className="mr-1 h-3 w-3" /> Cancel
															</Button>
														)}
													</div>

													<div className="flex gap-2 pt-1">
														{pp && (
															<Button
																variant="ghost"
																size="sm"
																className="flex-1 text-xs"
																onClick={() => handleMoveStatus(inv.id, pp)}
															>
																<ArrowLeft className="mr-1 h-3 w-3" /> {STATUS_LABELS[pp]}
															</Button>
														)}
														{np && (
															<Button
																variant="ghost"
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

			<Dialog
				open={!!cancelTarget}
				onOpenChange={(open) => {
					if (!open) {
						setCancelTarget(null);
						setJustification("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel NFS-e</DialogTitle>
						<DialogDescription>
							Cancellation requires a justification with at least 15 characters. This action can not be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Textarea
							rows={4}
							placeholder="Justification..."
							value={justification}
							onChange={(e) => setJustification(e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							{justification.length} characters (min 15)
						</p>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setCancelTarget(null);
								setJustification("");
							}}
						>
							Back
						</Button>
						<Button
							variant="destructive"
							onClick={handleCancelConfirm}
							disabled={cancelling || justification.trim().length < 15}
						>
							{cancelling ? "Cancelling..." : "Cancel NFS-e"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
