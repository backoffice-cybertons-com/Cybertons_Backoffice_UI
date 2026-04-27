import React, { useEffect, useState } from 'react';
import PropTypes from "prop-types";
import withRouter from '../Components/Common/withRouter';

//import Components
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import RightSidebar from '../Components/Common/RightSidebar';

//import actions
import {
    changeLayout,
    changeSidebarTheme,
    changeLayoutMode,
    changeLayoutWidth,
    changeLayoutPosition,
    changeTopbarTheme,
    changeLeftsidebarSizeType,
    changeLeftsidebarViewType,
    changeSidebarImageType,
    changeSidebarVisibility,
    changeBodyImage
} from "../slices/thunks";

import { logoutUser } from "../slices/authSlice";

//redux
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from 'reselect';

const Layout = (props) => {
    const [headerClass, setHeaderClass] = useState("");
    const dispatch = useDispatch();

    const selectLayoutState = (state) => state.Layout;
    const selectLayoutProperties = createSelector(
        selectLayoutState,
        (layout) => ({
            layoutType: layout.layoutType,
            leftSidebarType: layout.leftSidebarType,
            layoutModeType: layout.layoutModeType,
            layoutWidthType: layout.layoutWidthType,
            layoutPositionType: layout.layoutPositionType,
            topbarThemeType: layout.topbarThemeType,
            leftsidbarSizeType: layout.leftsidbarSizeType,
            leftSidebarViewType: layout.leftSidebarViewType,
            leftSidebarImageType: layout.leftSidebarImageType,
            preloader: layout.preloader,
            bodyImageType: layout.bodyImageType,
            sidebarVisibilitytype: layout.sidebarVisibilitytype,
        })
    );
    // Inside your component
    const {
        layoutType,
        leftSidebarType,
        layoutModeType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        preloader,
        bodyImageType,
        sidebarVisibilitytype
    } = useSelector(selectLayoutProperties);

    /*
    layout settings
    */
    useEffect(() => {
        if (
            layoutType ||
            leftSidebarType ||
            layoutModeType ||
            layoutWidthType ||
            layoutPositionType ||
            topbarThemeType ||
            leftsidbarSizeType ||
            leftSidebarViewType ||
            leftSidebarImageType ||
            bodyImageType ||
            sidebarVisibilitytype
        ) {
            window.dispatchEvent(new Event('resize'));
            dispatch(changeLeftsidebarViewType(leftSidebarViewType));
            dispatch(changeLeftsidebarSizeType(leftsidbarSizeType));
            dispatch(changeSidebarTheme(leftSidebarType));
            dispatch(changeLayoutMode(layoutModeType));
            dispatch(changeLayoutWidth(layoutWidthType));
            dispatch(changeLayoutPosition(layoutPositionType));
            dispatch(changeTopbarTheme(topbarThemeType));
            dispatch(changeLayout(layoutType));
            dispatch(changeSidebarImageType(leftSidebarImageType));
            dispatch(changeSidebarVisibility(sidebarVisibilitytype));
            dispatch(changeBodyImage(bodyImageType));
        }
    }, [layoutType,
        leftSidebarType,
        layoutModeType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        bodyImageType,
        sidebarVisibilitytype,
        dispatch]);
    /*
    call dark/light mode
    */
    const onChangeLayoutMode = (value) => {
        if (changeLayoutMode) {
            dispatch(changeLayoutMode(value));
        }
    };

    // class add remove in header 
    useEffect(() => {
        window.addEventListener("scroll", scrollNavigation, true);
    });

    function scrollNavigation() {
        var scrollup = document.documentElement.scrollTop;
        if (scrollup > 50) {
            setHeaderClass("topbar-shadow");
        } else {
            setHeaderClass("");
        }
    }

    useEffect(() => {
        if (sidebarVisibilitytype === 'show' || layoutType === "vertical" || layoutType === "twocolumn") {
            document.querySelector(".hamburger-icon").classList.remove('open');
        } else {
            document.querySelector(".hamburger-icon") && document.querySelector(".hamburger-icon").classList.add('open');
        }
    }, [sidebarVisibilitytype, layoutType]);


        /*
    Idle Timeout Implementation (1 Hour)
    */
    useEffect(() => {
        let timeout;

        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);

            // 1 Hour = 3,600,000 ms
            timeout = setTimeout(() => {
                console.log("[Idle Timeout] User inactive for 1 hour. Logging out.");
                dispatch(logoutUser());
            }, 3600000);
        };

        // Events to watch for activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (timeout) clearTimeout(timeout);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [dispatch]);


    return (
        <React.Fragment>
            <div id="layout-wrapper">
                <Header
                    headerClass={headerClass}
                    layoutModeType={layoutModeType}
                    onChangeLayoutMode={onChangeLayoutMode} />
                <Sidebar
                    layoutType={layoutType}
                />
                <div className="main-content">
                    {props.children}
                    <Footer />
                </div>
            </div>
            <RightSidebar />
        </React.Fragment>

    );
};

Layout.propTypes = {
    children: PropTypes.object,
};

export default withRouter(Layout);
