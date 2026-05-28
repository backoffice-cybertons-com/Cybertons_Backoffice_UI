import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import { useLocation } from 'react-router-dom';
import classnames from 'classnames';
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";

import SimpleBar from "simplebar-react";

import { getUnreadNotifications, markNotificationRead, markToastShown } from "../../slices/notifications/thunk";
import signalRService from "../../services/signalrService";
import { useAnnouncement } from "../Announcements/AnnouncementContext";
import NotificationItem from "./NotificationItem";
import useNotificationActions from "./useNotificationActions";
import {
    getNotificationConfig,
    isReferenceType,
    NOTIFICATION_TYPES,
} from "./notificationConfig";

import "../Announcements/AnnouncementDrawer.css";
import "./NotificationDropdown.css";

const NOTIFICATION_HUB_KEY = "notifications";
const POLL_INTERVAL_MS = 300000;
const DROPDOWN_PREVIEW_LIMIT = 5;

const isChatRoute = (pathname) =>
    pathname === "/apps-chat" || pathname.startsWith("/apps-chat/");

const AnnouncementToastContent = ({ headline, title, onView }) => (
    <div className="announcement-toast">
        <span className="announcement-toast__icon" aria-hidden="true">🚀</span>
        <div className="announcement-toast__content">
            <div className="announcement-toast__headline">{headline}</div>
            <div className="announcement-toast__title">{title}</div>
            <button type="button" className="announcement-toast__view" onClick={onView}>
                View
            </button>
        </div>
    </div>
);

const NotificationDropdown = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const { openAnnouncement } = useAnnouncement();
    const isChatPage = isChatRoute(location.pathname);
    const { notifications, unreadCount } = useSelector((state) => state.Notifications);

    const visibleNotifications = Array.isArray(notifications)
        ? isChatPage
            ? notifications.filter((n) => !isReferenceType(n, NOTIFICATION_TYPES.CHAT))
            : notifications
        : [];
    const visibleUnreadCount = isChatPage ? visibleNotifications.length : unreadCount;

    const [authUser, setAuthUser] = useState(null);
    useEffect(() => {
        const raw = localStorage.getItem("authUser");
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.user) {
                    const u = parsed.user;
                    if (!u.id && u.userId) u.id = u.userId;
                    setAuthUser(u);
                }
            } catch (e) {
                console.error("[NotificationDropdown] Failed to parse authUser:", e);
            }
        }
    }, []);

    const fetchNotifications = useCallback(() => {
        const userId = authUser?.id || authUser?.userId;
        const companyId = authUser?.companyId;
        if (authUser && companyId && userId) {
            dispatch(getUnreadNotifications({
                companyId: Number(companyId),
                userId: Number(userId),
            }));
        }
    }, [authUser, dispatch]);

    useEffect(() => {
        let isMounted = true;

        const handleReceiveNotification = () => {
            if (isMounted) fetchNotifications();
        };

        signalRService.setLifecycleCallbacks(NOTIFICATION_HUB_KEY, {
            onConnected: () => {
                if (isMounted) fetchNotifications();
            },
            onDisconnected: () => {
                if (isMounted && document.visibilityState === "visible") {
                    fetchNotifications();
                }
            },
            onReconnected: () => {
                if (isMounted) fetchNotifications();
            },
        });

        signalRService.on(
            NOTIFICATION_HUB_KEY,
            "ReceiveNotification",
            handleReceiveNotification
        );

        signalRService
            .startHub(NOTIFICATION_HUB_KEY, () => localStorage.getItem("authToken"))
            .catch((err) => {
                console.warn("[NotificationDropdown] SignalR hub failed to start:", err);
            });

        return () => {
            isMounted = false;
            signalRService.off(
                NOTIFICATION_HUB_KEY,
                "ReceiveNotification",
                handleReceiveNotification
            );
        };
    }, [fetchNotifications]);

    useEffect(() => {
        let intervalId = null;

        const pollIfVisible = () => {
            if (document.visibilityState !== "visible") return;
            fetchNotifications();
        };

        const startPolling = () => {
            if (intervalId) clearInterval(intervalId);
            if (document.visibilityState === "visible") {
                pollIfVisible();
                intervalId = setInterval(pollIfVisible, POLL_INTERVAL_MS);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                startPolling();
            } else if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        if (document.visibilityState === "visible") {
            startPolling();
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            if (intervalId) clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchNotifications]);

    const toastedIds = useRef(new Set());

    useEffect(() => {
        if (!isChatPage || !authUser || !Array.isArray(notifications)) return;

        notifications
            .filter(
                (n) =>
                    isReferenceType(n, NOTIFICATION_TYPES.CHAT) &&
                    (n.toastShown === false || n.ToastShown === false) &&
                    !toastedIds.current.has(n.notificationId)
            )
            .forEach((n) => {
                toastedIds.current.add(n.notificationId);
                dispatch(
                    markToastShown({
                        notificationId: n.notificationId,
                        companyId: authUser.companyId,
                    })
                );
            });
    }, [notifications, authUser, dispatch, isChatPage]);

    const { handleNotificationClick, openAnnouncementFromNotification } =
        useNotificationActions({
            dispatch,
            markNotificationRead,
            authUser,
            openAnnouncement,
        });

    useEffect(() => {
        if (!Array.isArray(notifications) || notifications.length === 0 || !authUser) {
            return;
        }

        const isUnshown = (n) =>
            (n.toastShown === false || n.ToastShown === false) &&
            !toastedIds.current.has(n.notificationId) &&
            !(isChatPage && isReferenceType(n, NOTIFICATION_TYPES.CHAT));

        const unshownAnnouncements = notifications
            .filter((n) => isReferenceType(n, NOTIFICATION_TYPES.ANNOUNCEMENT) && isUnshown(n))
            .sort(
                (a, b) =>
                    new Date(b.createdDate || b.CreatedDate) -
                    new Date(a.createdDate || a.CreatedDate)
            );

        if (unshownAnnouncements.length > 0) {
            const latest = unshownAnnouncements[0];
            const config = getNotificationConfig(latest);
            toastedIds.current.add(latest.notificationId);

            const toastId = toast(
                () => (
                    <AnnouncementToastContent
                        headline={config.toastHeadline || "New Feature Released"}
                        title={latest.title}
                        onView={() => {
                            toast.dismiss(toastId);
                            openAnnouncementFromNotification(latest);
                        }}
                    />
                ),
                {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: true,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    className: "announcement-toast-container",
                    onClick: () => openAnnouncementFromNotification(latest),
                }
            );

            dispatch(
                markToastShown({
                    notificationId: latest.notificationId,
                    companyId: authUser.companyId,
                })
            );

            unshownAnnouncements.slice(1).forEach((n) => {
                toastedIds.current.add(n.notificationId);
                dispatch(
                    markToastShown({
                        notificationId: n.notificationId,
                        companyId: authUser.companyId,
                    })
                );
            });

            return;
        }

        const unshownNotifications = notifications.filter(
            (n) =>
                isUnshown(n) &&
                !isReferenceType(n, NOTIFICATION_TYPES.ANNOUNCEMENT)
        );

        unshownNotifications.forEach((n) => {
            toastedIds.current.add(n.notificationId);

            toast.info(`🔔 ${n.title}: ${n.message}`, {
                position: "top-right",
                autoClose: 6000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });

            dispatch(
                markToastShown({
                    notificationId: n.notificationId,
                    companyId: authUser.companyId,
                })
            );
        });
    }, [
        notifications,
        authUser,
        dispatch,
        isChatPage,
        openAnnouncementFromNotification,
    ]);

    const [isNotificationDropdown, setIsNotificationDropdown] = useState(false);

    const [activeTab, setActiveTab] = useState('1');
    const [showAllNotifications, setShowAllNotifications] = useState(false);

    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    const hasMoreThanPreview = visibleNotifications.length > DROPDOWN_PREVIEW_LIMIT;
    const listNotifications = showAllNotifications
        ? visibleNotifications
        : visibleNotifications.slice(0, DROPDOWN_PREVIEW_LIMIT);

    const handleViewAllToggle = (e) => {
        e.preventDefault();
        setShowAllNotifications((prev) => !prev);
    };

    const handleDropdownToggle = () => {
        if (isNotificationDropdown) {
            setShowAllNotifications(false);
        }
        setIsNotificationDropdown(!isNotificationDropdown);
    };

    return (
        <React.Fragment>
            <Dropdown isOpen={isNotificationDropdown} toggle={handleDropdownToggle} className="topbar-head-dropdown ms-1 header-item">
                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle">
                    <i className='bx bx-bell fs-22'></i>
                    {visibleUnreadCount > 0 && (
                        <span
                            className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">
                            {visibleUnreadCount}
                            <span className="visually-hidden">unread messages</span>
                        </span>
                    )}
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-lg dropdown-menu-end notification-dropdown-menu">
                    <div className="notification-dropdown__head">
                        <div className="notification-dropdown__head-inner">
                            <div className="notification-dropdown__title-row">
                                <h6 className="notification-dropdown__title">
                                    Notifications
                                    <span className="notification-dropdown__live-dot" aria-hidden="true" />
                                </h6>
                                <span className="notification-dropdown__count-badge">
                                    {visibleUnreadCount || 0} New
                                </span>
                            </div>
                        </div>

                        <div className="notification-dropdown__tabs">
                            <Nav className="nav-tabs">
                                <NavItem>
                                    <NavLink
                                        href="#"
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleTab('1');
                                        }}
                                    >
                                        All ({visibleNotifications.length})
                                    </NavLink>
                                </NavItem>
                            </Nav>
                        </div>
                    </div>

                    <TabContent activeTab={activeTab} className="notification-dropdown__body">
                        <TabPane tabId="1">
                            <SimpleBar className="notification-dropdown__list">
                                {listNotifications.length > 0 ? (
                                    listNotifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.notificationId ?? notification.NotificationId}
                                            notification={notification}
                                            onClick={handleNotificationClick}
                                        />
                                    ))
                                ) : (
                                    <div className="notification-dropdown__empty">
                                        <div className="notification-dropdown__empty-icon">
                                            <i className="ri-notification-off-line" />
                                        </div>
                                        <p className="notification-dropdown__empty-text">
                                            No notifications yet
                                        </p>
                                    </div>
                                )}
                            </SimpleBar>

                            {hasMoreThanPreview && (
                                <div className="notification-dropdown__footer">
                                    <button
                                        type="button"
                                        className="notification-dropdown__view-all"
                                        onClick={handleViewAllToggle}
                                    >
                                        {showAllNotifications
                                            ? 'Show less'
                                            : `View all notifications (${visibleNotifications.length}) >`}
                                    </button>
                                </div>
                            )}
                        </TabPane>
                    </TabContent>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default NotificationDropdown;
