/**
 * FILE: Logout.js
 * LOCATION: src/pages/Authentication/Logout.js
 * CREATED: 2026-02-06
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Handles user logout process.
 * - Calls backend logout API (system log)
 * - Dispatches logoutUser action to clear Redux state and secure storage
 * - Redirects user to the login page
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import withRouter from "../../Components/Common/withRouter";
import { logoutUser } from "../../slices/authSlice";
import { callLogoutApi } from "../../utils/performLogout";

const Logout = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      await callLogoutApi();
      dispatch(logoutUser());
      setDone(true);
    };
    run();
  }, [dispatch]);

  if (done || !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <></>;
};

Logout.propTypes = {
  history: PropTypes.object,
};

export default withRouter(Logout);
