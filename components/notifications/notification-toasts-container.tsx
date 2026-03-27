"use client"

import { useNotificationContext } from "@/components/notifications/notification-provider"
import NotificationToast from "@/components/notifications/notification-toast"

export default function NotificationToastsContainer() {
  const { notifications, removeNotification } = useNotificationContext()

  // Show only the last 3 toasts
  const visibleNotifications = notifications.slice(0, 3)

  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2">
      {visibleNotifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}
