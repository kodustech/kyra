import { api } from "@/lib/api";
import type { NotificationWithActor } from "@kyra/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export function useNotifications() {
	const [unreadCount, setUnreadCount] = useState(0);
	const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
	const [loading, setLoading] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchUnreadCount = useCallback(async () => {
		try {
			const data = await api.get<{ count: number }>("/notifications/unread-count");
			setUnreadCount(data.count);
		} catch {
			// ignore
		}
	}, []);

	const fetchNotifications = useCallback(async () => {
		setLoading(true);
		try {
			const data = await api.get<NotificationWithActor[]>("/notifications");
			setNotifications(data);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, []);

	const markAsRead = useCallback(async (id: string) => {
		await api.patch(`/notifications/${id}/read`, {});
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
		setUnreadCount((prev) => Math.max(0, prev - 1));
	}, []);

	const markAllAsRead = useCallback(async () => {
		await api.patch("/notifications/mark-all-read", {});
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
		setUnreadCount(0);
	}, []);

	// Poll unread count every 30s
	useEffect(() => {
		fetchUnreadCount();
		intervalRef.current = setInterval(fetchUnreadCount, 30000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [fetchUnreadCount]);

	return {
		unreadCount,
		notifications,
		loading,
		fetchNotifications,
		markAsRead,
		markAllAsRead,
		refetchCount: fetchUnreadCount,
	};
}
