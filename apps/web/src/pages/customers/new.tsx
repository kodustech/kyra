import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { CreateCustomerInput } from "@kyra/shared";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { CustomerForm } from "./form";

export function NewCustomerPage() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);

	async function onSubmit(data: CreateCustomerInput) {
		setIsLoading(true);
		try {
			await api.post("/customers", data);
			toast.success("Customer created");
			navigate("/administrative/customers");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div>
			<div className="mb-6 flex items-center gap-3">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/administrative/customers">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<h2 className="text-2xl font-semibold">New Customer</h2>
			</div>
			<CustomerForm onSubmit={onSubmit} isLoading={isLoading} submitLabel="Create Customer" />
		</div>
	);
}
