import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Col, Dropdown, DropdownMenu, DropdownToggle, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import { toast } from "react-toastify";

//SimpleBar
import SimpleBar from "simplebar-react";

// Import Thunks
import { getUnreadNotifications, markNotificationRead, markToastShown } from "../../slices/notifications/thunk";

//import bell
import bell from "../../assets/images/svg/bell.svg";

const NotificationDropdown = () => {
    const dispatch = useDispatch();
    const { notifications, unreadCount } = useSelector((state) => state.Notifications);

    // Get Auth User
    const [authUser, setAuthUser] = useState(null);
    useEffect(() => {
        const raw = localStorage.getItem("authUser");
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.user) {
                    const u = parsed.user;
                    // Normalize: ensure 'id' is always populated (handles JWT claim variations)
                    if (!u.id && u.userId) u.id = u.userId;
                    console.log("[NotificationDropdown] authUser loaded:", u);
                    setAuthUser(u);
                }
            } catch (e) {
                console.error("[NotificationDropdown] Failed to parse authUser:", e);
            }
        }
    }, []);

    // Fetch Notifications
    const fetchNotifications = useCallback(() => {
        const userId = authUser?.id || authUser?.userId;
        const companyId = authUser?.companyId;
        if (authUser && companyId && userId) {
            dispatch(getUnreadNotifications({ 
                companyId: Number(companyId), 
                userId: Number(userId) 
            }));
        } else {
            console.warn("[NotificationDropdown] Missing authUser fields. companyId:", companyId, "userId:", userId);
        }
    }, [authUser, dispatch]);

    // Initial Fetch & Polling
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000); // 30 seconds polling

        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Track notifications that have already been toasted in this session
    const toastedIds = useRef(new Set());

    // Toast for new notifications
    useEffect(() => {
        if (Array.isArray(notifications) && notifications.length > 0 && authUser) {
            // Only show toast for notifications where toastShown is false AND we haven't toasted it in this session
            const unshownNotifications = notifications.filter(n => 
                (n.toastShown === false || n.ToastShown === false) && 
                !toastedIds.current.has(n.notificationId)
            );
            
            if (unshownNotifications.length > 0) {
                unshownNotifications.forEach(n => {
                    // Mark as toasted in the ref immediately to prevent duplicate toasts
                    // from subsequent renders before the Redux state is updated
                    toastedIds.current.add(n.notificationId);

                    toast.info(`🔔 ${n.title}: ${n.message}`, {
                        position: "top-right",
                        autoClose: 6000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    });

                    // Mark as toast shown in backend
                    dispatch(markToastShown({ 
                        notificationId: n.notificationId, 
                        companyId: authUser.companyId 
                    }));
                });
            }
        }
    }, [notifications, authUser, dispatch]);

    //Dropdown Toggle
    const [isNotificationDropdown, setIsNotificationDropdown] = useState(false);
    const toggleNotificationDropdown = () => {
        setIsNotificationDropdown(!isNotificationDropdown);
    };

    //Tab 
    const [activeTab, setActiveTab] = useState('1');
    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    const handleMarkAsRead = (notificationId) => {
        if (authUser && authUser.companyId) {
            dispatch(markNotificationRead({ 
                notificationId, 
                companyId: authUser.companyId 
            }));
        }
    };

    const handleNotificationClick = (notification) => {
        handleMarkAsRead(notification.notificationId);
        // Navigation logic later based on referenceType/referenceId
        console.log("Navigating to:", notification.referenceType, notification.referenceId);
    };



    return (
        <React.Fragment>
            <Dropdown isOpen={isNotificationDropdown} toggle={toggleNotificationDropdown} className="topbar-head-dropdown ms-1 header-item">
                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle">
                    <i className='bx bx-bell fs-22'></i>
                    {unreadCount > 0 && (
                        <span
                            className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">
                            {unreadCount}
                            <span className="visually-hidden">unread messages</span>
                        </span>
                    )}
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-lg dropdown-menu-end p-0">
                    <div className="dropdown-head bg-primary bg-pattern rounded-top">
                        <div className="p-3">
                            <Row className="align-items-center">
                                <Col>
                                    <h6 className="m-0 fs-16 fw-semibold text-white"> Notifications </h6>
                                </Col>
                                <div className="col-auto dropdown-tabs">
                                    <span className="badge bg-light-subtle text-body fs-13"> {unreadCount || 0} New</span>
                                </div>
                            </Row>
                        </div>

                        <div className="px-2 pt-2">
                            <Nav className="nav-tabs dropdown-tabs nav-tabs-custom">
                                <NavItem>
                                    <NavLink
                                        href="#"
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={() => { toggleTab('1'); }}
                                    >
                                        All ({Array.isArray(notifications) ? notifications.length : 0})
                                    </NavLink>
                                </NavItem>

                            </Nav>
                        </div>
                    </div>

                    <TabContent activeTab={activeTab}>
                        <TabPane tabId="1" className="py-2 ps-2">
                            <SimpleBar style={{ maxHeight: "300px" }} className="pe-2">
                                {Array.isArray(notifications) && notifications.length > 0 ? (
                                    notifications.map((notification, index) => (
                                        <div 
                                            key={index} 
                                            className="text-reset notification-item d-block dropdown-item position-relative"
                                            onClick={() => handleNotificationClick(notification)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex">
                                                <div className="avatar-xs me-3">
                                                    <span className="avatar-title bg-info-subtle text-info rounded-circle fs-16">
                                                        <i className={notification.referenceType === 'TASK' || notification.referenceType === 'Task' ? "bx bx-task" : "bx bx-bell"}></i>
                                                    </span>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="mt-0 mb-1 fs-13 fw-semibold">{notification.title}</h6>
                                                    <div className="fs-13 text-muted">
                                                        <p className="mb-1">{notification.message}</p>
                                                    </div>
                                                    <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                                        <span><i className="mdi mdi-clock-outline"></i> {moment(notification.createdDate).fromNow()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center pb-5 mt-2">
                                        <div className="avatar-lg mx-auto">
                                            <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                                                <i className="ri-notification-off-line"></i>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-2">
                                            <h6 className="fs-18 fw-semibold lh-base">Hey! You have no any notifications </h6>
                                        </div>
                                    </div>
                                )}
                            </SimpleBar>
                        </TabPane>


                    </TabContent>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default NotificationDropdown;
