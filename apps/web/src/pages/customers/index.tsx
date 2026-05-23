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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Customer } from "@kyra/shared";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export function CustomersPage() {
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		api
			.get<Customer[]>("/customers")
			.then(setCustomers)
			.catch((err) => toast.error((err as Error).message))
			.finally(() => setLoading(false));
	}, []);

	async function handleDelete() {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await api.delete(`/customers/${deleteTarget.id}`);
			setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
			toast.success("Customer removed");
			setDeleteTarget(null);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setDeleting(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-semibold">Customers</h2>
				<Button asChild>
					<Link to="/administrative/customers/new">
						<Plus className="mr-2 h-4 w-4" /> New Customer
					</Link>
				</Button>
			</div>

			{customers.length === 0 ? (
				<div className="rounded-xl border border-border p-12 text-center">
					<p className="text-muted-foreground">No customers yet.</p>
				</div>
			) : (
				<div className="rounded-xl border border-border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Company</TableHead>
								<TableHead>CNPJ</TableHead>
								<TableHead>City / State</TableHead>
								<TableHead>Licenses</TableHead>
								<TableHead>Devs</TableHead>
								<TableHead>Due Day</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{customers.map((customer) => (
								<TableRow key={customer.id}>
									<TableCell>
										<div className="font-medium">{customer.companyName}</div>
										{customer.tradeName && (
											<div className="text-xs text-muted-foreground">{customer.tradeName}</div>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground">{customer.cnpj || "—"}</TableCell>
									<TableCell className="text-muted-foreground">
										{customer.city && customer.state
											? `${customer.city}/${customer.state}`
											: customer.city || customer.state || "—"}
									</TableCell>
									<TableCell>
										{customer.purchasedLicenses != null ? (
											<Badge variant="secondary">{customer.purchasedLicenses}</Badge>
										) : (
											"—"
										)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{customer.totalDevs ?? "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{customer.dueDay ? `Day ${customer.dueDay}` : "—"}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
												<Link to={`/administrative/customers/${customer.id}/edit`}>
													<Pencil className="h-4 w-4" />
												</Link>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-destructive hover:text-destructive"
												onClick={() => setDeleteTarget(customer)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<Dialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Customer</DialogTitle>
						<DialogDescription>
							Remove <strong>{deleteTarget?.companyName}</strong>? Contacts, invoices and billing history will be deleted too. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting ? "Removing..." : "Remove"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
