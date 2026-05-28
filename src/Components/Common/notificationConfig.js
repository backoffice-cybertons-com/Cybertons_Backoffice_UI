/**
 * Visual and behavioral mapping by reference_type (tab_notifications.reference_type).
 */

export const NOTIFICATION_TYPES = {
  TASK: "TASK",
  CHAT: "CHAT",
  ANNOUNCEMENT: "ANNOUNCEMENT",
};

export const notificationConfig = {
  [NOTIFICATION_TYPES.TASK]: {
    badge: "TASK",
    className: "notification-card--task",
    iconClass: "bx bx-clipboard",
    avatarClass: "notification-card__avatar--task",
    messageClass: "notification-card__message",
    showNewChip: false,
    toastEnabled: true,
  },
  [NOTIFICATION_TYPES.CHAT]: {
    badge: "CHAT",
    className: "notification-card--chat",
    iconClass: "bx bx-message-rounded-dots",
    avatarClass: "notification-card__avatar--chat",
    messageClass: "notification-card__message",
    showNewChip: false,
    toastEnabled: true,
  },
  [NOTIFICATION_TYPES.ANNOUNCEMENT]: {
    badge: "ANNOUNCEMENT",
    className: "notification-card--announcement",
    iconClass: "ri-megaphone-line",
    avatarClass: "notification-card__avatar--announcement",
    messageClass: "notification-card__message",
    showNewChip: true,
    newChipOnIcon: true,
    toastEnabled: true,
    toastIcon: "📣",
    toastHeadline: "Announcement"
  },
  DEFAULT: {
    badge: "ALERT",
    className: "notification-card--default",
    iconClass: "bx bx-bell",
    avatarClass: "notification-card__avatar--default",
    messageClass: "notification-card__message",
    showNewChip: false,
    toastEnabled: true,
  },
};

export const getReferenceType = (notification) =>
  (
    notification?.referenceType ||
    notification?.ReferenceType ||
    "DEFAULT"
  ).toUpperCase();

export const getNotificationConfig = (notification) => {
  const type = getReferenceType(notification);
  return notificationConfig[type] || notificationConfig.DEFAULT;
};

export const isReferenceType = (notification, type) =>
  getReferenceType(notification) === type;

export const getNotificationId = (notification) =>
  notification?.notificationId ?? notification?.NotificationId;

export const getReferenceId = (notification) =>
  notification?.referenceId ?? notification?.ReferenceId;

export const getSenderUserId = (notification) =>
  notification?.senderUserId ?? notification?.SenderUserId;

export const isNotificationUnread = (notification) =>
  notification?.isRead === false ||
  notification?.IsRead === false ||
  notification?.isRead === undefined;
