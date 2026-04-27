/**
 * FILE: AuthProtected.js
 * LOCATION: src/Routes/AuthProtected.js
 * CREATED: 2026-02-06
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Wraps protected routes (like Dashboard).
 * - Checks if user is authenticated (Redux state + Token)
 * - Redirects to /login if not authenticated
 * - Sets default API authorization header
 */

import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../slices/authSlice";
import FiscalYearGate from "../Components/Common/FiscalYearGate";

const AuthProtected = (props) => {
  const dispatch = useDispatch();

  // Get auth state from Redux
  const { user, token, isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // If not authenticated and not loading, we might need to verify token or logout
    // Our authSlice initializes state from secureStorage on load, so if token exists, isAuthenticated is true.
    
    // If we wanted to validate token expiry here, we could.
    // For now, if no token, ensure logout cleanup is consistent
    if (!token && !loading) {
        // Ensure state is cleared
        // dispatch(logoutUser()); // Optional, but usually Navigate handles the UI switch
    }
  }, [token, loading, dispatch]);

  // If loading (e.g. verifying token), show loader (optional)
  // if (loading) return <div>Loading...</div>;

  // If not authenticated, redirect to Login
  if (!isAuthenticated && !loading) {
    return (
      <Navigate to={{ pathname: "/login", state: { from: props.location } }} />
    );
  }

  // Render children (Protected Content)
  return <FiscalYearGate>{props.children}</FiscalYearGate>;
};

const AccessRoute = ({ component: Component, ...rest }) => {
  return (
    <Route
      {...rest}
      render={(props) => {
        return (
          <>
            {" "}
            <Component {...props} />{" "}
          </>
        );
      }}
    />
  );
};

export { AuthProtected, AccessRoute };
