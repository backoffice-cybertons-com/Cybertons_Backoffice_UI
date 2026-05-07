/**
 * FILE: Login.js
 * LOCATION: src/pages/Authentication/Login.js
 * CREATED: 2026-02-04
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Main Login Page for the application.
 * - Handles user authentication via Redux authSlice
 * - Uses Formik for form handling and Yup for validation
 * - Displays loading state and error messages form API
 * - Redirects to dashboard upon successful login
 * 
 * DEPENDENCIES:
 * - Redux: authSlice (loginUser action)
 * - Components: ParticlesAuth (Background), Reactstrap UI
 * - Libraries: Formik, Yup
 * 
 * HOW TO MODIFY:
 * - Change validation: Update 'validationSchema' object
 * - Change UI: Modify JSX in the return statement
 * - Handle success redirect: Update 'navigate' call in onSubmit
 */

import React, { useEffect, useState } from 'react';
import { Card, CardBody, Col, Container, Input, Label, Row, Button, Form, FormFeedback, Alert, Spinner } from 'reactstrap';
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";

// Redux hooks for state management
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom"; // Use useNavigate instead of withRouter (React Router v6)

// Form validation libraries
import * as Yup from "yup";
import { useFormik } from "formik";

// Auth action from our custom authSlice
import { loginUser, clearError } from "../../slices/authSlice";

// Assets
import logoLight from "../../assets/images/logo-light.png";
import "./login.css"; // Custom styles for the login page   

const Login = () => {
    // REDUX HOOKS
    const dispatch = useDispatch();
    const navigate = useNavigate(); // Hook for navigation

    // Get auth state from Redux store
    // State structure matches what we defined in authSlice.js
    const { user, error, loading, isAuthenticated } = useSelector(state => state.auth);

    // COMPONENT STATE
    const [passwordShow, setPasswordShow] = useState(false); // Toggle password visibility
    const [sessionExpired, setSessionExpired] = useState(false);

    // LIFECYCLE: Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated && user) {
            navigate("/dashboard"); // Redirect to dashboard
        }
    }, [isAuthenticated, user, navigate]);

    // [ADDED 2026-05-07] Check for session expiration query param
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('expired') === 'true') {
            setSessionExpired(true);
        }
    }, []);

    // LIFECYCLE: Set document title
    useEffect(() => {
        document.title = "Login | Books by SoftSense";
    }, []);

    // FORMIK SETUP: Form handling and validation
    const validation = useFormik({
        // Initial form values
        initialValues: {
            email: "", // User ID / Email
            password: "",
            companyId: "1" // Default company ID (could be a dropdown later)
        },
        
        // Validation rules using Yup
        validationSchema: Yup.object({
            email: Yup.string().required("Please Enter Your Email / User ID"),
            password: Yup.string().required("Please Enter Your Password"),
        }),
        
        // Form submission handler
        onSubmit: (values) => {
            // clear previous errors
            dispatch(clearError());
            
            // Dispatch login action
            // We pass values directly to the thunk
            // 'navigate' can be handled here or in the thunk payload if needed, 
            // but typical pattern is to let component handle redirect via useEffect (see above)
            // or pass navigate function callback. 
            // Our authSlice returns promise, so we can unwrap it.
            
            dispatch(loginUser({
                username: values.email, // Mapping email field to username expected by API
                password: values.password,
                companyId: values.companyId || "1"
            }));
        }
    });

    return (
        <React.Fragment>
            {/* ParticlesAuth: Animated background component */}
            <ParticlesAuth>
                <div className="auth-page-content">
                    <Container>
                        {/* LOGO SECTION */}
                        <Row>
                            <Col lg={12}>
                                <div className="text-center mb-4 text-white-50 auth-hero-title">
                                    <div>
                                        <Link to="/" className="d-inline-block auth-logo">
                                            <img src={logoLight} alt="" className="auth-logo-img" />
                                        </Link>
                                    </div>
                                    <p className="auth-tagline fs-15 fw-medium">Accounting Software by SoftSense</p>
                                </div>
                            </Col>
                        </Row>

                        {/* LOGIN CARD SECTION */}
                        <Row className="justify-content-center">
                            <Col md={8} lg={6} xl={5}>
                                <Card className="mt-4">
                                    <CardBody className="p-4">
                                        <div className="text-center mt-2">
                                            <h5 className="text-primary">Welcome to Books</h5>
                                            <p className="text-muted">
                                            Sign in to access your accounting dashboard.
                                            </p>

                                        </div>
                                        
                                        {/* ERROR ALERT */}
                                        {error ? (
                                            <Alert color="danger">
                                                {typeof error === 'string' ? error : 'Login failed'}
                                            </Alert>
                                        ) : null}

                                        {/* SESSION EXPIRED ALERT */}
                                        {sessionExpired ? (
                                            <Alert color="warning">
                                                Your session has expired due to inactivity. Please sign in again.
                                            </Alert>
                                        ) : null}
                                        
                                        <div className="p-2 mt-4">
                                            <Form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    validation.handleSubmit();
                                                    return false;
                                                }}
                                                action="#">

                                                {/* COMPANY ID INPUT (Temporary until we have proper selection) */}
                                                 <div className="mb-3">
                                                    <Label htmlFor="companyId" className="form-label">Company ID</Label>
                                                    <Input
                                                        name="companyId"
                                                        className="form-control"
                                                        placeholder="Enter Company ID"
                                                        type="text"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.companyId || "1"}
                                                    />
                                                </div>

                                                {/* EMAIL INPUT */}
                                                <div className="mb-3">
                                                    <Label htmlFor="email" className="form-label">Email / User ID</Label>
                                                    <Input
                                                        name="email"
                                                        className="form-control"
                                                        placeholder="Enter email or user ID"
                                                        type="text"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.email || ""}
                                                        invalid={
                                                            validation.touched.email && validation.errors.email ? true : false
                                                        }
                                                    />
                                                    {validation.touched.email && validation.errors.email ? (
                                                        <FormFeedback type="invalid">{validation.errors.email}</FormFeedback>
                                                    ) : null}
                                                </div>

                                                {/* PASSWORD INPUT */}
                                                <div className="mb-3">
                                                    <div className="float-end">
                                                        <Link to="/forgot-password" className="text-muted">Forgot password?</Link>
                                                    </div>
                                                    <Label className="form-label" htmlFor="password-input">Password</Label>
                                                    <div className="position-relative auth-pass-inputgroup mb-3">
                                                        <Input
                                                            name="password"
                                                            value={validation.values.password || ""}
                                                            type={passwordShow ? "text" : "password"}
                                                            className="form-control pe-5"
                                                            placeholder="Enter Password"
                                                            onChange={validation.handleChange}
                                                            onBlur={validation.handleBlur}
                                                            invalid={
                                                                validation.touched.password && validation.errors.password ? true : false
                                                            }
                                                        />
                                                        {validation.touched.password && validation.errors.password ? (
                                                            <FormFeedback type="invalid">{validation.errors.password}</FormFeedback>
                                                        ) : null}
                                                        
                                                        {/* Password visibility toggle */}
                                                        <button 
                                                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted" 
                                                            type="button" 
                                                            id="password-addon" 
                                                            onClick={() => setPasswordShow(!passwordShow)}
                                                        >
                                                            <i className="ri-eye-fill align-middle"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                                                               

                                                {/* REMEMBER ME CHECKBOX */}
                                                <div className="form-check">
                                                    <Input className="form-check-input" type="checkbox" value="" id="auth-remember-check" />
                                                    <Label className="form-check-label" htmlFor="auth-remember-check">Remember me</Label>
                                                </div>

                                                {/* SUBMIT BUTTON */}
                                                <div className="mt-4">
                                                    <Button color="success" disabled={loading} className="btn btn-success w-100" type="submit">
                                                        {loading ? <Spinner size="sm" className='me-2' /> : null}
                                                        {loading ? 'Logging In...' : 'Sign In'}
                                                    </Button>
                                                </div>
                                            </Form>

                                            <div className="text-center mt-4 text-muted fs-13">
                                            Powered by SoftSense 
                                            </div>

                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </ParticlesAuth>
        </React.Fragment>
    );
};

export default Login;
