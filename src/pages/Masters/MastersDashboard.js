import React, { useState } from 'react';
import { Card, CardBody, Col, Container, Row, Button } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { Link } from 'react-router-dom';
import GenericMasterModal from '../../Components/Common/GenericMasterModal';
import PartyMasterModal from './Party/PartyMasterModal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MastersDashboard = () => {
    document.title = "Masters Dashboard | SoftBook";

    // Category-wise master definitions (for grouped dashboard)
    const masterCategories = [
        {
            category: "Parties & Finance",
            items: [
                { id: "party", label: "Party Master", customRoute: "/party" },
                { id: "partyTypes", label: "Party Type" },
                { id: "bank", label: "Bank" },
                { id: "fiscalYears", label: "Fiscal Year" },
                { id: "currency", label: "Currency" },
                { id: "paymentMode", label: "Payment Mode" },
                { id: "paymentTerm", label: "Payment Term" },
                { id: "transporters", label: "Transporter" },
                { id: "vehicles", label: "Vehicle" },
                { id: "vouchertype", label: "Voucher Type" },
                { id: "ledgersettings", label: "Ledger Settings", customRoute: "/masters/ledger-settings" }
            ]
        },
        {
            category: "Inventory & Stock",
            items: [
                { id: "products", label: "Product" },
                { id: "units", label: "Unit" },
                { id: "hsn", label: "HSN" },
                { id: "sac", label: "SAC" },
                { id: "godown", label: "Godown" },
                { id: "warehouses", label: "Warehouse" }
            ]
        },
        {
            category: "Taxation & Compliance",
            items: [
                { id: "taxes", label: "Tax" },
                { id: "taxGroups", label: "Tax Group" },
                { id: "configureTax", label: "Configure Tax" },
                { id: "tcs", label: "TCS" },
                { id: "tds", label: "TDS" }
            ]
        },
        {
            category: "Organization Structure",
            items: [
                { id: "branch", label: "Branch" },
                { id: "costCenters", label: "Cost Center" },
                { id: "project", label: "Project" }
            ]
        },
        {
            category: "Access Control",
            items: [
                { id: "users", label: "User" },
                { id: "roles", label: "Role" },
                { id: "permissions", label: "Permissions", customRoute: "/masters/permissions" }
            ]
        },
        {
            category: "Sales",
            items: [
                { id: "salespersons", label: "Salesperson" }
            ]
        }
    ];

    // Descriptions reused from the earlier flat list so cards stay informative
    const masterDescriptions = {
        products: "Maintain items/services including pricing and tax details.",
        party: "Manage all ledgers including Customers, Vendors, and Traders.",
        partyTypes: "Define accounting natures and report mapping for all party classifications.",
        users: "Manage access controls, roles, and user profiles.",
        units: "Define units of measurement for products.",
        taxes: "Configure GST/VAT and other tax rates.",
        hsn: "Capture HSN codes for GST compliant billing.",
        sac: "Service Accounting Codes for service billing.",
        godown: "Manage godown/store locations.",
        warehouses: "Manage warehouse locations.",
        costCenters: "Define cost centers for expense tracking and allocations.",
        roles: "Define user roles and permission sets.",
        salespersons: "Manage sales staff and commission structures.",
        taxGroups: "Group multiple taxes for simplified application.",
        configureTax: "Map individual taxes into tax groups.",
        tcs: "Tax Collected at Source configurations.",
        tds: "Tax Deducted at Source configurations.",
        transporters: "Manage logistics and transporter details.",
        fiscalYears: "Manage fiscal year ranges and the current financial year.",
        bank: "Configure bank profiles for voucher and payment processing.",
        branch: "Keep every branch location, code, and address in sync.",
        currency: "Maintain supported currencies and conversion metadata.",
        paymentMode: "Control available payment modes for vouchers.",
        paymentTerm: "Define due-date rules and credit terms.",
        vehicles: "Manage vehicle fleet for logistics and transportation.",
        project: "Configure job/project codes for tracking.",
        accountgroup: "Define accounting groups for profit/loss and balance sheet structure.",
        vouchertype: "Manage numbering and prefixes for different voucher types.",
        ledgersettings: "Configure default accounts for automated transactions (Sales, Tax, etc.)."
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMasterId, setSelectedMasterId] = useState("");

    const toggleModal = (masterId = "") => {
        if (masterId) setSelectedMasterId(masterId);
        setIsModalOpen(!isModalOpen);
    };

    const isPartyMaster = selectedMasterId === "party";

    return (
        <React.Fragment>
            <div className="page-content">
                <ToastContainer closeButton={false} limit={1} />
                <Container fluid>
                    <BreadCrumb title="Configuration" pageTitle="Masters" />

                    {masterCategories.map((group, gIndex) => (
                        <div key={gIndex} className="mb-5">
                            <Row className="align-items-center mb-3">
                                <Col>
                                    <h5 className="mb-0">{group.category}</h5>
                                </Col>
                            </Row>
                            <Row className="gy-3">
                                {group.items.map((master) => (
                                    <Col xxl={3} md={4} sm={6} key={master.id}>
                                        <Card className="card-animate overflow-hidden h-100">
                                            <CardBody>
                                                <h5 className="card-title mb-3 fs-15">{master.label}</h5>
                                                <p className="text-muted mb-4 text-truncate-two-lines" style={{ minHeight: '40px' }}>
                                                    {masterDescriptions[master.id] || `Manage ${master.label} master data.`}
                                                </p>
                                                <div className="d-flex gap-2">
                                                    <Link to={master.customRoute || `/masters/${master.id}`} className="btn btn-primary btn-sm flex-grow-1">
                                                        <i className="ri-list-check align-bottom me-1"></i> Open List
                                                    </Link>
                                                    <Button
                                                        color="outline-secondary"
                                                        size="sm"
                                                        className="flex-grow-1"
                                                        onClick={() => toggleModal(master.id)}
                                                    >
                                                        <i className="ri-add-line align-bottom me-1"></i> Quick Create
                                                    </Button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ))}
                </Container>
            </div>

            {isPartyMaster ? (
                <PartyMasterModal
                    isOpen={isModalOpen}
                    toggle={() => setIsModalOpen(!isModalOpen)}
                    partyId={null}
                    isEdit={false}
                    defaultType={null}
                    onSuccess={() => {}}
                />
            ) : (
                <GenericMasterModal
                    isOpen={isModalOpen}
                    toggle={() => setIsModalOpen(!isModalOpen)}
                    masterId={selectedMasterId}
                />
            )}
        </React.Fragment>
    );
};

export default MastersDashboard;
