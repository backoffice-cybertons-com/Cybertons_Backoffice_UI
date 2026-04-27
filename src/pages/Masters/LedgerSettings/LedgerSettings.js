import React, { useState, useEffect } from "react";
import {
    Container,
    Row,
    Col,
    Card,
    CardBody,
    CardHeader,
    Form,
    Input,
    Label,
    Button,
    FormFeedback,
    Spinner
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import { toast, ToastContainer } from "react-toastify";
import { APIClient } from "../../../helpers/api_helper";
import { useFormik } from "formik";
import * as Yup from "yup";

const apiClient = new APIClient();

const LedgerSettings = () => {
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: {
            settingId: 0,
            companyId: 0,
            autoNumbering: true,
            defaultCurrency: "INR",
            enableTcs: false,
            enableTds: false,
            salesRevenueAccountId: "",
            purchaseExpenseAccountId: "",
            cgstOutputAccountId: "",
            sgstOutputAccountId: "",
            igstOutputAccountId: "",
            cgstInputAccountId: "",
            sgstInputAccountId: "",
            igstInputAccountId: "",
            roundOffAccountId: "",
            discountAccountId: ""
        },
        validationSchema: Yup.object({
            salesRevenueAccountId: Yup.number().required("Sales Revenue Account is required"),
            purchaseExpenseAccountId: Yup.number().required("Purchase Expense Account is required")
        }),
        onSubmit: async (values) => {
            try {
                // Ensure IDs are numbers or null
                const payload = { ...values };
                Object.keys(payload).forEach(key => {
                    if (key.endsWith('AccountId') && payload[key] === "") {
                        payload[key] = null;
                    }
                });

                if (payload.settingId > 0) {
                    await apiClient.put(`/api/ledgersetting/${payload.settingId}`, payload);
                } else {
                    await apiClient.post(`/api/ledgersetting`, payload);
                }
                toast.success("Ledger Settings updated successfully");
            } catch (err) {
                console.error("Failed to update ledger settings", err);
                toast.error("Failed to update Ledger Settings");
            }
        }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Accounts for dropdowns
                const accountsRes = await apiClient.get("/api/Master/account");
                setAccounts(accountsRes.data || accountsRes || []);

                // 2. Fetch Ledger Settings
                const settingsRes = await apiClient.get("/api/ledgersetting");
                const settings = settingsRes.data || settingsRes || [];
                
                const normalize = (obj) => {
                    const result = {};
                    Object.keys(obj).forEach(key => {
                        const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
                        result[camelKey] = obj[key];
                    });
                    return result;
                };

                if (Array.isArray(settings) && settings.length > 0) {
                    validation.setValues(normalize(settings[0]));
                } else if (!Array.isArray(settings) && (settings.settingId || settings.SettingId)) {
                    validation.setValues(normalize(settings));
                }
            } catch (err) {
                console.error("Failed to fetch settings data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    document.title = "Ledger Settings | SoftBook";

    const renderAccountSelect = (name, label) => (
        <Col md={4} className="mb-3">
            <Label htmlFor={name} className="form-label">{label}</Label>
            <Input
                name={name}
                type="select"
                className="form-control"
                id={name}
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values[name] || ""}
                invalid={validation.touched[name] && validation.errors[name] ? true : false}
            >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                    <option key={acc.partyId || acc.PartyId || acc.party_id} value={acc.partyId || acc.PartyId || acc.party_id}>
                        {acc.companyName || acc.CompanyName || acc.company_name} ({acc.displayName || acc.DisplayName || acc.display_name})
                    </option>
                ))}
            </Input>
            {validation.touched[name] && validation.errors[name] ? (
                <FormFeedback type="invalid">{validation.errors[name]}</FormFeedback>
            ) : null}
        </Col>
    );

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Ledger Settings" pageTitle="Accounting" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h5 className="card-title mb-0">Accounting Configuration</h5>
                                </CardHeader>
                                <CardBody>
                                    {loading ? (
                                        <div className="text-center py-5">
                                            <Spinner color="primary" />
                                            <p className="mt-2">Loading settings...</p>
                                        </div>
                                    ) : (
                                        <Form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                validation.handleSubmit();
                                                return false;
                                            }}
                                        >
                                            <h6 className="text-primary mb-3">Revenue & Expense Mappings</h6>
                                            <Row>
                                                {renderAccountSelect("salesRevenueAccountId", "Sales Revenue Account")}
                                                {renderAccountSelect("purchaseExpenseAccountId", "Purchase Expense Account")}
                                                {renderAccountSelect("roundOffAccountId", "Round Off Account")}
                                                {renderAccountSelect("discountAccountId", "Discount Account")}
                                            </Row>

                                            <h6 className="text-primary mb-3 mt-4">GST Output Mappings (Sales)</h6>
                                            <Row>
                                                {renderAccountSelect("cgstOutputAccountId", "CGST Output")}
                                                {renderAccountSelect("sgstOutputAccountId", "SGST Output")}
                                                {renderAccountSelect("igstOutputAccountId", "IGST Output")}
                                            </Row>

                                            <h6 className="text-primary mb-3 mt-4">GST Input Mappings (Purchase)</h6>
                                            <Row>
                                                {renderAccountSelect("cgstInputAccountId", "CGST Input")}
                                                {renderAccountSelect("sgstInputAccountId", "SGST Input")}
                                                {renderAccountSelect("igstInputAccountId", "IGST Input")}
                                            </Row>

                                            <h6 className="text-primary mb-3 mt-4">General Settings</h6>
                                            <Row>
                                                <Col md={3}>
                                                    <div className="form-check form-switch mt-4">
                                                        <Input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id="autoNumbering"
                                                            name="autoNumbering"
                                                            checked={validation.values.autoNumbering}
                                                            onChange={validation.handleChange}
                                                        />
                                                        <Label className="form-check-label" htmlFor="autoNumbering">Auto-Numbering</Label>
                                                    </div>
                                                </Col>
                                                <Col md={3}>
                                                    <div className="form-check form-switch mt-4">
                                                        <Input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id="enableTcs"
                                                            name="enableTcs"
                                                            checked={validation.values.enableTcs}
                                                            onChange={validation.handleChange}
                                                        />
                                                        <Label className="form-check-label" htmlFor="enableTcs">Enable TCS</Label>
                                                    </div>
                                                </Col>
                                                <Col md={3}>
                                                    <div className="form-check form-switch mt-4">
                                                        <Input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id="enableTds"
                                                            name="enableTds"
                                                            checked={validation.values.enableTds}
                                                            onChange={validation.handleChange}
                                                        />
                                                        <Label className="form-check-label" htmlFor="enableTds">Enable TDS</Label>
                                                    </div>
                                                </Col>
                                            </Row>

                                            <div className="text-end mt-4">
                                                <Button type="submit" color="success">Save Settings</Button>
                                            </div>
                                        </Form>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
                <ToastContainer />
            </div>
        </React.Fragment>
    );
};

export default LedgerSettings;
