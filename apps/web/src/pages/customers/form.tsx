import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateCustomerInput, createCustomerSchema } from "@kyra/shared";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link } from "react-router";

interface CustomerFormProps {
	defaultValues?: Partial<CreateCustomerInput>;
	onSubmit: (data: CreateCustomerInput) => Promise<void>;
	isLoading: boolean;
	submitLabel: string;
}

export function CustomerForm({ defaultValues, onSubmit, isLoading, submitLabel }: CustomerFormProps) {
	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
		setValue,
		watch,
	} = useForm({
		resolver: zodResolver(createCustomerSchema),
		defaultValues: {
			invoiceEmails: [] as string[],
			contacts: [] as { name?: string; phone?: string; email?: string }[],
			...defaultValues,
		} as CreateCustomerInput,
	});

	const {
		fields: contactFields,
		append: addContact,
		remove: removeContact,
	} = useFieldArray({ control, name: "contacts" });

	const invoiceEmails = watch("invoiceEmails") || [];

	function addInvoiceEmail() {
		setValue("invoiceEmails", [...invoiceEmails, ""]);
	}

	function removeInvoiceEmail(index: number) {
		setValue(
			"invoiceEmails",
			invoiceEmails.filter((_, i) => i !== index),
		);
	}

	function updateInvoiceEmail(index: number, value: string) {
		const updated = [...invoiceEmails];
		updated[index] = value;
		setValue("invoiceEmails", updated);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
			<section className="rounded-xl border border-border p-6 space-y-4">
				<h3 className="text-lg font-medium">Company Info</h3>
				<div className="space-y-2">
					<Label htmlFor="companyName">Company Name *</Label>
					<Input id="companyName" {...register("companyName")} />
					{errors.companyName && (
						<p className="text-sm text-destructive">{errors.companyName.message}</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="tradeName">Trade Name</Label>
					<Input id="tradeName" {...register("tradeName")} />
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="cnpj">CNPJ</Label>
						<Input id="cnpj" {...register("cnpj")} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="stateRegistration">State Registration</Label>
						<Input id="stateRegistration" {...register("stateRegistration")} />
					</div>
				</div>
			</section>

			<section className="rounded-xl border border-border p-6 space-y-4">
				<h3 className="text-lg font-medium">Address</h3>
				<div className="space-y-2">
					<Label htmlFor="address">Street</Label>
					<Input id="address" {...register("address")} />
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="number">Number</Label>
						<Input id="number" {...register("number")} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="district">District</Label>
						<Input id="district" {...register("district")} />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="city">City</Label>
						<Input id="city" {...register("city")} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="state">State</Label>
						<Input id="state" {...register("state")} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="zipCode">Zip Code</Label>
						<Input id="zipCode" {...register("zipCode")} />
					</div>
				</div>
			</section>

			<section className="rounded-xl border border-border p-6 space-y-4">
				<h3 className="text-lg font-medium">Details</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="purchasedLicenses">Purchased Licenses</Label>
						<Input
							id="purchasedLicenses"
							type="number"
							{...register("purchasedLicenses")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="totalDevs">Total Devs</Label>
						<Input id="totalDevs" type="number" {...register("totalDevs")} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="dueDay">Due Day</Label>
						<Input id="dueDay" type="number" min={1} max={31} {...register("dueDay")} />
						{errors.dueDay && (
							<p className="text-sm text-destructive">{errors.dueDay.message}</p>
						)}
					</div>
				</div>
			</section>

			<section className="rounded-xl border border-border p-6 space-y-4">
				<h3 className="text-lg font-medium">Stripe</h3>
				<div className="space-y-2">
					<Label htmlFor="stripeCustomerId">Stripe Customer ID</Label>
					<Input id="stripeCustomerId" {...register("stripeCustomerId")} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="stripeSubscriptionId">Stripe Subscription ID</Label>
					<Input id="stripeSubscriptionId" {...register("stripeSubscriptionId")} />
				</div>
			</section>

			<section className="rounded-xl border border-border p-6 space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-medium">Invoice Emails</h3>
					<Button type="button" variant="outline" size="sm" onClick={addInvoiceEmail}>
						<Plus className="mr-1 h-4 w-4" /> Add Email
					</Button>
				</div>
				{invoiceEmails.length === 0 ? (
					<p className="text-sm text-muted-foreground">No emails added.</p>
				) : (
					invoiceEmails.map((email, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: emails order is stable within this list
						<div key={index} className="flex gap-2">
							<Input
								type="email"
								placeholder="email@example.com"
								value={email}
								onChange={(e) => updateInvoiceEmail(index, e.target.value)}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-destructive shrink-0"
								onClick={() => removeInvoiceEmail(index)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))
				)}
				{errors.invoiceEmails && (
					<p className="text-sm text-destructive">
						{errors.invoiceEmails.message?.toString()}
					</p>
				)}
			</section>

			<section className="rounded-xl border border-border p-6 space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-medium">Contacts</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => addContact({ name: "", phone: "", email: "" })}
					>
						<Plus className="mr-1 h-4 w-4" /> Add Contact
					</Button>
				</div>
				{contactFields.length === 0 ? (
					<p className="text-sm text-muted-foreground">No contacts added.</p>
				) : (
					contactFields.map((field, index) => (
						<div key={field.id} className="rounded-lg border border-border p-4 space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Contact {index + 1}</span>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="text-destructive"
									onClick={() => removeContact(index)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
							<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
								<div className="space-y-2">
									<Label>Name</Label>
									<Input {...register(`contacts.${index}.name`)} />
								</div>
								<div className="space-y-2">
									<Label>Phone</Label>
									<Input {...register(`contacts.${index}.phone`)} />
								</div>
								<div className="space-y-2">
									<Label>Email</Label>
									<Input type="email" {...register(`contacts.${index}.email`)} />
								</div>
							</div>
						</div>
					))
				)}
			</section>

			<Separator />

			<div className="flex gap-3">
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "Saving..." : submitLabel}
				</Button>
				<Button type="button" variant="outline" asChild>
					<Link to="/administrative/customers">Cancel</Link>
				</Button>
			</div>
		</form>
	);
}
