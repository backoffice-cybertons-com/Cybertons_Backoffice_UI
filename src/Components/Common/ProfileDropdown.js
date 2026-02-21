import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';

//import images
import avatar1 from "../../assets/images/users/avatar-1.jpg";

const ProfileDropdown = () => {


    const profiledropdownData = createSelector(
        (state) => state.Profile,
        (state) => ({
            user: state.user
        })
      );
    // Inside your component
    const {user} = useSelector(profiledropdownData);
    
    // Also get user from auth slice (new auth system)
    const authUser = useSelector(state => state.auth?.user);

    const [userName, setUserName] = useState("Admin");

    useEffect(() => {
        // Try to get user name from multiple sources
        let name = "Admin"; // Default fallback
        
        // 1. Check sessionStorage (new auth structure)
        if (sessionStorage.getItem("authUser")) {
            try {
                const obj = JSON.parse(sessionStorage.getItem("authUser"));
                const userObj = obj.user || obj.User || obj;
                
                // Try various name fields
                name = userObj.fullName || userObj.FullName || 
                       userObj.username || userObj.Username || 
                       userObj.first_name || userObj.firstName ||
                       userObj.name || userObj.Name ||
                       userObj.email || userObj.Email ||
                       name;
            } catch (e) {
                console.warn("ProfileDropdown: Failed to parse sessionStorage authUser", e);
            }
        }
        
        // 2. Check Redux auth slice (new auth system)
        if (name === "Admin" && authUser) {
            name = authUser.Name || authUser.username || authUser.email || name;
        }
        
        // 3. Check old Profile Redux state (legacy)
        if (name === "Admin" && user && user.first_name) {
            name = user.first_name;
        }
        
        // 4. Check old sessionStorage structure (legacy fake auth)
        if (name === "Admin" && process.env.REACT_APP_DEFAULTAUTH === "fake") {
            try {
                const obj = JSON.parse(sessionStorage.getItem("authUser") || "{}");
                if (obj.data && obj.data.first_name) {
                    name = obj.data.first_name;
                } else if (obj.username) {
                    name = obj.username;
                }
            } catch (e) {
                // Ignore
            }
        }
        
        // 5. Firebase auth fallback
        if (name === "Admin" && process.env.REACT_APP_DEFAULTAUTH === "firebase") {
            try {
                const obj = JSON.parse(sessionStorage.getItem("authUser") || "{}");
                if (obj.email) {
                    name = obj.email;
                }
            } catch (e) {
                // Ignore
            }
        }
        
        setUserName(name);
    }, [user, authUser]);

    //Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };
    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className="ms-sm-3 header-item topbar-user">
                <DropdownToggle tag="button" type="button" className="btn">
                    <span className="d-flex align-items-center">
                        <img className="rounded-circle header-profile-user" src={avatar1}
                            alt="Header Avatar" />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{userName}</span>
                            <span className="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">Founder</span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">Welcome {userName}!</h6>
                    <DropdownItem className='p-0'>
                        <Link to= "/profile" className="dropdown-item">
                            <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">Profile</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to= "/apps-chat" className="dropdown-item">
                            <i className="mdi mdi-message-text-outline text-muted fs-16 align-middle me-1"></i> <span
                                className="align-middle">Messages</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to="#" className="dropdown-item">
                            <i className="mdi mdi-calendar-check-outline text-muted fs-16 align-middle me-1"></i> <span
                                className="align-middle">Taskboard</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to= "/pages-faqs" className="dropdown-item">
                            <i
                                className="mdi mdi-lifebuoy text-muted fs-16 align-middle me-1"></i> <span
                                    className="align-middle">Help</span>
                        </Link>
                    </DropdownItem>
                    <div className="dropdown-divider"></div>
                    <DropdownItem className='p-0'>
                        <Link to= "/pages-profile" className="dropdown-item">
                            <i
                                className="mdi mdi-wallet text-muted fs-16 align-middle me-1"></i> <span
                                    className="align-middle">Balance : <b>$5971.67</b></span>
                        </Link>
                    </DropdownItem >
                    <DropdownItem className='p-0'>
                        <Link to= "/pages-profile-settings" className="dropdown-item">
                            <span
                                className="badge bg-success-subtle text-success mt-1 float-end">New</span><i
                                    className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i> <span
                                        className="align-middle">Settings</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to= "/auth-lockscreen-basic" className="dropdown-item">
                            <i
                                className="mdi mdi-lock text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Lock screen</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to= "/logout" className="dropdown-item">
                            <i
                                className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span
                                    className="align-middle" data-key="t-logout">Logout</span>
                        </Link>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;
