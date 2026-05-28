import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	type CompanySettings,
	FOCUS_NFE_ENVIRONMENTS,
	type FocusNfeEnvironment,
	type UpsertCompanySettingsInput,
	upsertCompanySettingsSchema,
} from "@kyra/shared";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export function CompanySettingsPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState<CompanySettings | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		control,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(upsertCompanySettingsSchema),
		defaultValues: { focusNfeEnvironment: "sandbox" as FocusNfeEnvironment } as UpsertCompanySettingsInput,
	});

	useEffect(() => {
		api
			.get<CompanySettings | null>("/company-settings")
			.then((data) => {
				setSettings(data);
				if (data) {
					reset({
						cnpj: data.cnpj,
						companyName: data.companyName,
						tradeName: data.tradeName,
						municipalRegistration: data.municipalRegistration,
						stateRegistration: data.stateRegistration,
						address: data.address,
						number: data.number,
						complement: data.complement,
						district: data.district,
						city: data.city,
						state: data.state,
						zipCode: data.zipCode,
						cityCode: data.cityCode,
						serviceItemCode: data.serviceItemCode,
						municipalServiceCode: data.municipalServiceCode,
						issAliquot: data.issAliquot ? Number.parseFloat(data.issAliquot) : null,
						defaultDiscrimination: data.defaultDiscrimination,
						focusNfeToken: data.focusNfeToken,
						focusNfeEnvironment: data.focusNfeEnvironment,
					});
				}
			})
			.catch((err) => toast.error((err as Error).message))
			.finally(() => setLoading(false));
	}, [reset]);

	async function onSubmit(data: UpsertCompanySettingsInput) {
		setSaving(true);
		try {
			const updated = await api.put<CompanySettings>("/company-settings", data);
			setSettings(updated);
			toast.success("Settings saved");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
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
			<div className="mb-6">
				<h2 className="text-2xl font-semibold">Company Settings</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Issuer data used when generating NFS-e via Focus NFe.
				</p>
			</div>

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
				<section className="rounded-xl border border-border p-6 space-y-4">
					<h3 className="text-lg font-medium">Issuer</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="cnpj">CNPJ *</Label>
							<Input id="cnpj" {...register("cnpj")} />
							{errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
						</div>
						<div className="space-y-2">
							<Label htmlFor="companyName">Company Name *</Label>
							<Input id="companyName" {...register("companyName")} />
							{errors.companyName && (
								<p className="text-sm text-destructive">{errors.companyName.message}</p>
							)}
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="tradeName">Trade Name</Label>
							<Input id="tradeName" {...register("tradeName")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="municipalRegistration">Municipal Registration (IM)</Label>
							<Input id="municipalRegistration" {...register("municipalRegistration")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="stateRegistration">State Registration (IE)</Label>
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
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="number">Number</Label>
							<Input id="number" {...register("number")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="complement">Complement</Label>
							<Input id="complement" {...register("complement")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="district">District</Label>
							<Input id="district" {...register("district")} />
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
						<div className="space-y-2">
							<Label htmlFor="city">City</Label>
							<Input id="city" {...register("city")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="state">State (UF)</Label>
							<Input id="state" maxLength={2} {...register("state")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="zipCode">Zip Code</Label>
							<Input id="zipCode" {...register("zipCode")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="cityCode">City Code (IBGE)</Label>
							<Input id="cityCode" {...register("cityCode")} />
						</div>
					</div>
				</section>

				<section className="rounded-xl border border-border p-6 space-y-4">
					<h3 className="text-lg font-medium">Tax Defaults</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="serviceItemCode">Service Item (LC 116)</Label>
							<Input id="serviceItemCode" {...register("serviceItemCode")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="municipalServiceCode">Municipal Service Code</Label>
							<Input id="municipalServiceCode" {...register("municipalServiceCode")} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="issAliquot">ISS Aliquot (%)</Label>
							<Input
								id="issAliquot"
								type="number"
								step="0.01"
								min={0}
								max={100}
								{...register("issAliquot")}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="defaultDiscrimination">Default Discrimination</Label>
						<Textarea
							id="defaultDiscrimination"
							rows={3}
							{...register("defaultDiscrimination")}
						/>
						<p className="text-xs text-muted-foreground">
							Fallback service description when neither the invoice nor the issue request has one.
						</p>
					</div>
				</section>

				<section className="rounded-xl border border-border p-6 space-y-4">
					<h3 className="text-lg font-medium">Focus NFe</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="focusNfeToken">API Token</Label>
							<Input id="focusNfeToken" type="password" {...register("focusNfeToken")} />
							<p className="text-xs text-muted-foreground">
								Get it at the Focus NFe dashboard (sandbox or production).
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="focusNfeEnvironment">Environment</Label>
							<Controller
								control={control}
								name="focusNfeEnvironment"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger id="focusNfeEnvironment">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FOCUS_NFE_ENVIRONMENTS.map((env) => (
												<SelectItem key={env} value={env}>
													{env === "sandbox" ? "Sandbox (homologation)" : "Production"}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
					</div>
				</section>

				<Separator />

				<div className="flex items-center justify-between">
					<p className="text-xs text-muted-foreground">
						{settings
							? `Last updated ${new Date(settings.updatedAt).toLocaleString()}`
							: "Not configured yet."}
					</p>
					<Button type="submit" disabled={saving}>
						{saving ? "Saving..." : "Save Settings"}
					</Button>
				</div>
			</form>
		</div>
	);
}
