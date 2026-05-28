import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getReferenceType,
  getReferenceId,
  getSenderUserId,
  NOTIFICATION_TYPES,
} from "./notificationConfig";

/**
 * Central click routing by reference_type.
 */
export const useNotificationActions = ({
  dispatch,
  markNotificationRead,
  authUser,
  openAnnouncement,
}) => {
  const navigate = useNavigate();

  const markRead = useCallback(
    (notificationId) => {
      if (authUser?.companyId && notificationId) {
        dispatch(
          markNotificationRead({
            notificationId,
            companyId: authUser.companyId,
          })
        );
      }
    },
    [authUser, dispatch, markNotificationRead]
  );

  const openAnnouncementFromNotification = useCallback(
    (notification) => {
      const announcementId = getReferenceId(notification);
      if (!announcementId) return;

      markRead(notification.notificationId ?? notification.NotificationId);
      openAnnouncement(announcementId);
    },
    [markRead, openAnnouncement]
  );

  const handleNotificationClick = useCallback(
    (notification) => {
      const refType = getReferenceType(notification);
      const notificationId =
        notification.notificationId ?? notification.NotificationId;

      const clickByType = {
        [NOTIFICATION_TYPES.ANNOUNCEMENT]: () =>
          openAnnouncementFromNotification(notification),
        [NOTIFICATION_TYPES.CHAT]: () => {
          const senderUserId = getSenderUserId(notification);
          markRead(notificationId);
          if (senderUserId) {
            navigate(`/apps-chat?openUserId=${senderUserId}`);
          }
        },
        [NOTIFICATION_TYPES.TASK]: () => {
          const taskId = getReferenceId(notification);
          markRead(notificationId);
          if (taskId) {
            navigate(`/apps-calendar?taskId=${taskId}`);
          } else {
            navigate("/apps-calendar");
          }
        },
      };

      const handler = clickByType[refType];
      if (handler) {
        handler();
        return;
      }

      markRead(notificationId);
    },
    [markRead, navigate, openAnnouncementFromNotification]
  );

  return {
    handleNotificationClick,
    openAnnouncementFromNotification,
    markRead,
  };
};

export default useNotificationActions;
