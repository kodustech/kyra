import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FIELD_TYPES, LOOKUP_OPERATORS, toSlug, type Database, type Field, type FieldType, type KanbanStatusOption, type LookupFilter, type LookupOperator, type LookupSettings } from "@kyra/shared";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const STATUS_COLORS = [
	{ id: "gray", label: "Gray" },
	{ id: "red", label: "Red" },
	{ id: "orange", label: "Orange" },
	{ id: "yellow", label: "Yellow" },
	{ id: "green", label: "Green" },
	{ id: "blue", label: "Blue" },
	{ id: "purple", label: "Purple" },
	{ id: "pink", label: "Pink" },
] as const;

const DEFAULT_KANBAN_OPTIONS: KanbanStatusOption[] = [
	{ id: "todo", label: "To-do", color: "gray", icon: "circle" },
	{ id: "in-progress", label: "In Progress", color: "blue", icon: "loader" },
	{ id: "done", label: "Done", color: "green", icon: "circle-check" },
];

const DEFAULT_LABEL_OPTIONS: KanbanStatusOption[] = [
	{ id: "bug", label: "Bug", color: "red", icon: null },
	{ id: "feature", label: "Feature", color: "blue", icon: null },
	{ id: "improvement", label: "Improvement", color: "green", icon: null },
];

const COLOR_DOT: Record<string, string> = {
	gray: "bg-gray-400",
	red: "bg-red-500",
	orange: "bg-orange-500",
	yellow: "bg-yellow-500",
	green: "bg-green-500",
	blue: "bg-blue-500",
	purple: "bg-purple-500",
	pink: "bg-pink-500",
};

const OPERATOR_LABELS: Record<LookupOperator, string> = {
	eq: "Equal to",
	neq: "Not equal to",
	gt: "Greater than",
	lt: "Less than",
	gte: "Greater or equal",
	lte: "Less or equal",
	contains: "Contains",
	is_null: "Is empty",
	is_not_null: "Is not empty",
};

interface FieldFormDialogProps {
	field?: Field | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasKanbanStatus?: boolean;
	defaultType?: FieldType;
	databases?: Database[];
	currentDatabaseId?: string;
	onSubmit: (data: {
		name: string;
		slug?: string;
		type: FieldType;
		required: boolean;
		mask: string | null;
		options: string[] | null;
		settings?: { options: KanbanStatusOption[] } | null;
		lookupSettings?: LookupSettings | null;
		highlight?: boolean;
	}) => Promise<void>;
}

export function FieldFormDialog({ field, open, onOpenChange, hasKanbanStatus, defaultType, databases, currentDatabaseId, onSubmit }: FieldFormDialogProps) {
	const isEdit = !!field;
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugManual, setSlugManual] = useState(false);
	const [type, setType] = useState<FieldType>("text");
	const [required, setRequired] = useState(false);
	const [mask, setMask] = useState("");
	const [optionsText, setOptionsText] = useState("");
	const [loading, setLoading] = useState(false);
	const [kanbanOptions, setKanbanOptions] = useState<KanbanStatusOption[]>(DEFAULT_KANBAN_OPTIONS);
	const [labelOptions, setLabelOptions] = useState<KanbanStatusOption[]>(DEFAULT_LABEL_OPTIONS);
	const [highlight, setHighlight] = useState(false);

	// Lookup state
	const [lookupSourceDbId, setLookupSourceDbId] = useState("");
	const [lookupDisplayFieldId, setLookupDisplayFieldId] = useState("");
	const [lookupValueFieldId, setLookupValueFieldId] = useState("");
	const [lookupFilters, setLookupFilters] = useState<LookupFilter[]>([]);
	const [sourceFields, setSourceFields] = useState<Field[]>([]);

	// Fetch source database fields when lookup source changes
	const fetchSourceFields = useCallback(async (dbId: string) => {
		if (!dbId) {
			setSourceFields([]);
			return;
		}
		try {
			const data = await api.get<Field[]>(`/databases/${dbId}/fields`);
			setSourceFields(data);
		} catch {
			setSourceFields([]);
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset form when dialog opens
	useEffect(() => {
		if (field) {
			setName(field.name);
			setSlug(field.slug || toSlug(field.name));
			setSlugManual(true);
			setType(field.type);
			setRequired(field.required);
			setMask(field.mask || "");
			setOptionsText(field.options?.join(", ") || "");
			setKanbanOptions(field.type === "kanban_status" ? (field.settings?.options ?? DEFAULT_KANBAN_OPTIONS) : DEFAULT_KANBAN_OPTIONS);
			setLabelOptions(field.type === "label" ? (field.settings?.options ?? DEFAULT_LABEL_OPTIONS) : DEFAULT_LABEL_OPTIONS);
			setHighlight(field.highlight ?? false);
			// Lookup
			if (field.type === "lookup" && field.lookupSettings) {
				setLookupSourceDbId(field.lookupSettings.sourceDatabaseId);
				setLookupDisplayFieldId(field.lookupSettings.displayFieldId);
				setLookupValueFieldId(field.lookupSettings.valueFieldId ?? "");
				setLookupFilters(field.lookupSettings.filters);
				fetchSourceFields(field.lookupSettings.sourceDatabaseId);
			} else {
				setLookupSourceDbId("");
				setLookupDisplayFieldId("");
				setLookupValueFieldId("");
				setLookupFilters([]);
				setSourceFields([]);
			}
		} else {
			setName("");
			setSlug("");
			setSlugManual(false);
			setType(defaultType ?? "text");
			setRequired(false);
			setMask("");
			setOptionsText("");
			setKanbanOptions(DEFAULT_KANBAN_OPTIONS);
			setLabelOptions(DEFAULT_LABEL_OPTIONS);
			setHighlight(false);
			setLookupSourceDbId("");
			setLookupDisplayFieldId("");
			setLookupValueFieldId("");
			setLookupFilters([]);
			setSourceFields([]);
		}
	}, [field, open]);

	function resetForm() {
		setName("");
		setSlug("");
		setSlugManual(false);
		setType("text");
		setRequired(false);
		setMask("");
		setOptionsText("");
		setKanbanOptions(DEFAULT_KANBAN_OPTIONS);
		setLabelOptions(DEFAULT_LABEL_OPTIONS);
		setHighlight(false);
		setLookupSourceDbId("");
		setLookupDisplayFieldId("");
		setLookupValueFieldId("");
		setLookupFilters([]);
		setSourceFields([]);
	}

	async function handleSubmit(e: React.FormEvent, addAnother = false) {
		e.preventDefault();
		if (!name.trim()) return;

		setLoading(true);
		try {
			const options =
				type === "select"
					? optionsText
							.split(",")
							.map((o) => o.trim())
							.filter(Boolean)
					: null;

			// Derive stable IDs from labels at submit time
			const deriveIds = (opts: KanbanStatusOption[]) =>
				opts.map((opt) => ({
					...opt,
					id: opt.label ? opt.label.toLowerCase().replace(/\s+/g, "-") : opt.id,
				}));

			let finalSettings: { options: KanbanStatusOption[] } | null = null;
			if (type === "kanban_status") {
				finalSettings = { options: deriveIds(kanbanOptions) };
			} else if (type === "label") {
				finalSettings = { options: deriveIds(labelOptions) };
			}

			let lookupSettings: LookupSettings | null = null;
			if (type === "lookup" && lookupSourceDbId && lookupDisplayFieldId) {
				lookupSettings = {
					sourceDatabaseId: lookupSourceDbId,
					displayFieldId: lookupDisplayFieldId,
					valueFieldId: lookupValueFieldId || undefined,
					filters: lookupFilters,
				};
			}

			await onSubmit({
				name: name.trim(),
				...(isEdit && slug.trim() ? { slug: slug.trim() } : {}),
				type,
				required: type === "kanban_status" || type === "label" || type === "assignee" || type === "lookup" ? false : required,
				mask: type === "kanban_status" || type === "label" || type === "assignee" || type === "lookup" ? null : mask.trim() || null,
				options,
				settings: finalSettings,
				lookupSettings,
				highlight,
			});

			if (addAnother) {
				resetForm();
				toast.success("Field added");
			} else {
				onOpenChange(false);
			}
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEdit ? "Edit Field" : "Add Field"}</DialogTitle>
						<DialogDescription>
							{isEdit ? "Update field properties." : "Define a new field for this database."}
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
						<div className="space-y-2">
							<Label htmlFor="field-name">Name</Label>
							<Input
								id="field-name"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									if (!slugManual) {
										setSlug(toSlug(e.target.value));
									}
								}}
								placeholder="e.g. Full Name"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="field-slug">Slug</Label>
							<Input
								id="field-slug"
								value={slug}
								onChange={(e) => {
									setSlug(e.target.value);
									setSlugManual(true);
								}}
								placeholder="e.g. full-name"
							/>
							<p className="text-xs text-muted-foreground">
								Used as key in API integrations (e.g. n8n, webhooks)
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="field-type">Type</Label>
							<Select value={type} onValueChange={(v) => setType(v as FieldType)}>
								<SelectTrigger id="field-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									\{[...FIELD_TYPES].sort((a, b) => a.localeCompare(b)).map((t) => (
										<SelectItem key={t} value={t}>
											{t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{type === "select" && (
							<div className="space-y-2">
								<Label htmlFor="field-options">Options (comma separated)</Label>
								<Input
									id="field-options"
									value={optionsText}
									onChange={(e) => setOptionsText(e.target.value)}
									placeholder="e.g. Active, Inactive, Pending"
								/>
							</div>
						)}
						{type === "kanban_status" && (
							<div className="space-y-2">
								<Label>Status Options</Label>
								<div className="space-y-2 rounded-md border border-border p-3">
									{kanbanOptions.map((opt, idx) => (
										<div key={idx} className="flex items-center gap-2">
											<IconPicker
												value={opt.icon}
												onChange={(icon) => {
													const next = [...kanbanOptions];
													next[idx] = { ...opt, icon: icon ?? "circle" };
													setKanbanOptions(next);
												}}
												className="h-8 w-8 shrink-0"
											/>
											<Input
												className="flex-1"
												value={opt.label}
												onChange={(e) => {
													const next = [...kanbanOptions];
													next[idx] = {
														...opt,
														label: e.target.value,
													};
													setKanbanOptions(next);
												}}
												placeholder="Status label"
											/>
											<Select
												value={opt.color}
												onValueChange={(color) => {
													const next = [...kanbanOptions];
													next[idx] = { ...opt, color };
													setKanbanOptions(next);
												}}
											>
												<SelectTrigger className="w-[4.5rem] shrink-0">
													<span className={`inline-block h-3 w-3 shrink-0 rounded-full ${COLOR_DOT[opt.color] || "bg-gray-400"}`} />
												</SelectTrigger>
												<SelectContent position="popper">
													{STATUS_COLORS.map((c) => (
														<SelectItem key={c.id} value={c.id}>
															<div className="flex items-center gap-2">
																<span className={`inline-block h-3 w-3 shrink-0 rounded-full ${COLOR_DOT[c.id]}`} />
																<span>{c.label}</span>
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{kanbanOptions.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 shrink-0"
													onClick={() => setKanbanOptions(kanbanOptions.filter((_, i) => i !== idx))}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											)}
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full"
										onClick={() =>
											setKanbanOptions([
												...kanbanOptions,
												{
													id: `status-${Date.now()}`,
													label: "",
													color: "gray",
													icon: "circle",
												},
											])
										}
									>
										<Plus className="mr-1 h-3.5 w-3.5" /> Add status
									</Button>
								</div>
							</div>
						)}
						{type === "label" && (
							<div className="space-y-2">
								<Label>Label Options</Label>
								<div className="space-y-2 rounded-md border border-border p-3">
									{labelOptions.map((opt, idx) => (
										<div key={idx} className="flex items-center gap-2">
											<Input
												className="flex-1"
												value={opt.label}
												onChange={(e) => {
													const next = [...labelOptions];
													next[idx] = { ...opt, label: e.target.value };
													setLabelOptions(next);
												}}
												placeholder="Label name"
											/>
											<Select
												value={opt.color}
												onValueChange={(color) => {
													const next = [...labelOptions];
													next[idx] = { ...opt, color };
													setLabelOptions(next);
												}}
											>
												<SelectTrigger className="w-[4.5rem] shrink-0">
													<span className={`inline-block h-3 w-3 shrink-0 rounded-full ${COLOR_DOT[opt.color] || "bg-gray-400"}`} />
												</SelectTrigger>
												<SelectContent position="popper">
													{STATUS_COLORS.map((c) => (
														<SelectItem key={c.id} value={c.id}>
															<div className="flex items-center gap-2">
																<span className={`inline-block h-3 w-3 shrink-0 rounded-full ${COLOR_DOT[c.id]}`} />
																<span>{c.label}</span>
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{labelOptions.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 shrink-0"
													onClick={() => setLabelOptions(labelOptions.filter((_, i) => i !== idx))}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											)}
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full"
										onClick={() =>
											setLabelOptions([
												...labelOptions,
												{ id: `label-${Date.now()}`, label: "", color: "gray", icon: null },
											])
										}
									>
										<Plus className="mr-1 h-3.5 w-3.5" /> Add label
									</Button>
								</div>
							</div>
						)}
						{type === "lookup" && (
							<div className="space-y-4">
								<div className="space-y-2">
									<Label>Source Database</Label>
									<Select
										value={lookupSourceDbId}
										onValueChange={(v) => {
											setLookupSourceDbId(v);
											setLookupDisplayFieldId("");
											setLookupValueFieldId("");
											setLookupFilters([]);
											fetchSourceFields(v);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a database" />
										</SelectTrigger>
										<SelectContent>
											{(databases || [])
												.filter((d) => d.id !== currentDatabaseId)
												.map((d) => (
													<SelectItem key={d.id} value={d.id}>
														{d.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</div>
								{sourceFields.length > 0 && (
									<>
										<div className="space-y-2">
											<Label>Display Field</Label>
											<Select value={lookupDisplayFieldId} onValueChange={setLookupDisplayFieldId}>
												<SelectTrigger>
													<SelectValue placeholder="Field to show as label" />
												</SelectTrigger>
												<SelectContent>
													{sourceFields.map((f) => (
														<SelectItem key={f.id} value={f.id}>
															{f.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Value Field (optional)</Label>
											<Select value={lookupValueFieldId || "id"} onValueChange={(v) => setLookupValueFieldId(v === "id" ? "" : v)}>
												<SelectTrigger>
													<SelectValue placeholder="Record ID (default)" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="id">Record ID (default)</SelectItem>
													{sourceFields.map((f) => (
														<SelectItem key={f.id} value={f.id}>
															{f.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Filters (optional)</Label>
											<div className="space-y-2 rounded-md border border-border p-3">
												{lookupFilters.map((filter, idx) => (
													<div key={idx} className="flex items-center gap-2">
														<Select
															value={filter.fieldId}
															onValueChange={(v) => {
																const next = [...lookupFilters];
																next[idx] = { ...filter, fieldId: v };
																setLookupFilters(next);
															}}
														>
															<SelectTrigger className="flex-1">
																<SelectValue placeholder="Field" />
															</SelectTrigger>
															<SelectContent>
																{sourceFields.map((f) => (
																	<SelectItem key={f.id} value={f.id}>
																		{f.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														<Select
															value={filter.operator}
															onValueChange={(v) => {
																const next = [...lookupFilters];
																next[idx] = { ...filter, operator: v as LookupOperator };
																setLookupFilters(next);
															}}
														>
															<SelectTrigger className="w-[140px] shrink-0">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{LOOKUP_OPERATORS.map((op) => (
																	<SelectItem key={op} value={op}>
																		{OPERATOR_LABELS[op]}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														{filter.operator !== "is_null" && filter.operator !== "is_not_null" && (
															<Input
																className="flex-1"
																value={filter.value}
																onChange={(e) => {
																	const next = [...lookupFilters];
																	next[idx] = { ...filter, value: e.target.value };
																	setLookupFilters(next);
																}}
																placeholder="Value"
															/>
														)}
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-8 w-8 shrink-0"
															onClick={() => setLookupFilters(lookupFilters.filter((_, i) => i !== idx))}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												))}
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="w-full"
													onClick={() =>
														setLookupFilters([
															...lookupFilters,
															{ fieldId: sourceFields[0]?.id || "", operator: "eq", value: "" },
														])
													}
												>
													<Plus className="mr-1 h-3.5 w-3.5" /> Add filter
												</Button>
											</div>
										</div>
									</>
								)}
							</div>
						)}
					{type !== "kanban_status" && type !== "label" && type !== "assignee" && type !== "lookup" && (
							<>
								<div className="space-y-2">
									<Label htmlFor="field-mask">Mask (regex, optional)</Label>
									<Input
										id="field-mask"
										value={mask}
										onChange={(e) => setMask(e.target.value)}
										placeholder="e.g. ^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$"
									/>
								</div>
								<div className="flex items-center gap-3">
									<Switch id="field-required" checked={required} onCheckedChange={setRequired} />
									<Label htmlFor="field-required">Required</Label>
								</div>
							</>
						)}
						{hasKanbanStatus && (
							<div className="flex items-center gap-3">
								<Switch id="field-highlight" checked={highlight} onCheckedChange={setHighlight} />
								<Label htmlFor="field-highlight">Highlight on cards</Label>
							</div>
						)}
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						{!isEdit && (
							<Button
								type="button"
								variant="outline"
								disabled={!name.trim() || loading}
								onClick={(e) => handleSubmit(e, true)}
							>
								Add & Add Another
							</Button>
						)}
						<Button type="submit" disabled={!name.trim() || loading}>
							{loading ? "Saving..." : isEdit ? "Save" : "Add Field"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
