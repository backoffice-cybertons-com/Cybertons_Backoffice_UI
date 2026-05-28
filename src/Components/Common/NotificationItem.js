import React from "react";
import moment from "moment";
import classnames from "classnames";
import {
  getNotificationConfig,
  getReferenceType,
  isNotificationUnread,
  notificationConfig,
} from "./notificationConfig";

const NotificationItem = ({ notification, onClick }) => {
  const config = getNotificationConfig(notification);
  const refType = getReferenceType(notification);
  const badgeKey = notificationConfig[refType] ? refType : "DEFAULT";

  const title = notification.title ?? notification.Title ?? "";
  const message = notification.message ?? notification.Message ?? "";
  const createdDate = notification.createdDate ?? notification.CreatedDate;
  const count =
    notification.notificationCount ?? notification.NotificationCount ?? 1;
  const unread = isNotificationUnread(notification);

  const showNewOnIcon =
    config.showNewChip && config.newChipOnIcon && unread;

  return (
    <div
      role="button"
      tabIndex={0}
      className={classnames(
        "notification-item notification-card",
        config.className
      )}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(notification);
        }
      }}
    >
      <div className="notification-card__inner">
        <div className="notification-card__icon-wrap">
          <span
            className={classnames(
              "notification-card__avatar",
              config.avatarClass
            )}
            aria-hidden="true"
          >
            <i className={config.iconClass} />
          </span>
          {showNewOnIcon && (
            <span className="notification-card__icon-new">NEW</span>
          )}
        </div>

        <div className="notification-card__body">
          <div className="notification-card__headline">
            <div className="notification-card__title-row">
              <span className="notification-card__title">{title}</span>
              <span
                className={classnames(
                  "notification-card__badge",
                  `notification-card__badge--${badgeKey.toLowerCase()}`
                )}
              >
                {config.badge}
              </span>
              {count > 1 && (
                <span className="notification-card__count">{count}</span>
              )}
            </div>
            {unread && (
              <span
                className="notification-card__unread-dot"
                aria-label="Unread"
              />
            )}
          </div>

          {message && (
            <p className={classnames("notification-card__message", config.messageClass)}>
              {message}
            </p>
          )}

          {createdDate && (
            <p className="notification-card__meta">
              <i className="mdi mdi-clock-outline" />
              {moment(createdDate).fromNow().toUpperCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
