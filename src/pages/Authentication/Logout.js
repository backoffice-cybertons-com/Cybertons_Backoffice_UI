/**
 * FILE: Logout.js
 * LOCATION: src/pages/Authentication/Logout.js
 * CREATED: 2026-02-06
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Handles user logout process.
 * - Dispatches logoutUser action to clear Redux state and secure storage
 * - Redirects user to the login page
 * 
 * DEPENDENCIES:
 * - Redux: authSlice (logoutUser action)
 * - React Router: Navigate (for redirection)
 */

import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// Helper for router props (if needed by HOCs, though Navigate is preferred in v6)
import withRouter from "../../Components/Common/withRouter";

// Auth action from our custom authSlice
import { logoutUser } from "../../slices/authSlice";

const Logout = (props) => {
  const dispatch = useDispatch();

  // Get auth state to check if logout is complete
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Trigger logout action on mount
    dispatch(logoutUser());
  }, [dispatch]);

  // Once isAuthenticated becomes false (or if it already is), redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Render nothing while logging out
  return <></>;
};

Logout.propTypes = {
  history: PropTypes.object,
};

export default withRouter(Logout);
