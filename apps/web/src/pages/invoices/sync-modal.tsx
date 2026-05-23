import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface SyncModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSync: (startDate: string, endDate: string) => Promise<void>;
}

export function SyncModal({ open, onOpenChange, onSync }: SyncModalProps) {
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSync() {
		if (!startDate || !endDate) return;
		setLoading(true);
		try {
			await onSync(startDate, endDate);
			onOpenChange(false);
			setStartDate("");
			setEndDate("");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Sync Invoices from Stripe</DialogTitle>
					<DialogDescription>
						Pulls invoices created within the selected range and adds new ones as "Pending".
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="startDate">Start Date</Label>
						<Input
							id="startDate"
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="endDate">End Date</Label>
						<Input
							id="endDate"
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSync} disabled={loading || !startDate || !endDate}>
						{loading ? "Syncing..." : "Sync"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
