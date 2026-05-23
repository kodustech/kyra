import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { CreateCustomerInput, CustomerWithContacts } from "@kyra/shared";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { CustomerForm } from "./form";

export function EditCustomerPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [customer, setCustomer] = useState<CustomerWithContacts | null>(null);
	const [fetching, setFetching] = useState(true);

	useEffect(() => {
		if (!id) return;
		api
			.get<CustomerWithContacts>(`/customers/${id}`)
			.then(setCustomer)
			.catch((err) => {
				toast.error((err as Error).message);
				navigate("/administrative/customers");
			})
			.finally(() => setFetching(false));
	}, [id, navigate]);

	async function onSubmit(data: CreateCustomerInput) {
		if (!id) return;
		setIsLoading(true);
		try {
			await api.patch(`/customers/${id}`, data);
			toast.success("Customer updated");
			navigate("/administrative/customers");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	if (fetching) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!customer) return null;

	const defaultValues: Partial<CreateCustomerInput> = {
		companyName: customer.companyName,
		tradeName: customer.tradeName || undefined,
		cnpj: customer.cnpj || undefined,
		stateRegistration: customer.stateRegistration || undefined,
		address: customer.address || undefined,
		number: customer.number || undefined,
		district: customer.district || undefined,
		city: customer.city || undefined,
		state: customer.state || undefined,
		zipCode: customer.zipCode || undefined,
		purchasedLicenses: customer.purchasedLicenses ?? undefined,
		totalDevs: customer.totalDevs ?? undefined,
		dueDay: customer.dueDay ?? undefined,
		stripeCustomerId: customer.stripeCustomerId || undefined,
		stripeSubscriptionId: customer.stripeSubscriptionId || undefined,
		invoiceEmails: customer.invoiceEmails || [],
		contacts: customer.contacts.map((c) => ({
			name: c.name || "",
			phone: c.phone || "",
			email: c.email || "",
		})),
	};

	return (
		<div>
			<div className="mb-6 flex items-center gap-3">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/administrative/customers">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<h2 className="text-2xl font-semibold">Edit Customer</h2>
			</div>
			<CustomerForm
				defaultValues={defaultValues}
				onSubmit={onSubmit}
				isLoading={isLoading}
				submitLabel="Save Changes"
			/>
		</div>
	);
}
