import React, { useState, useEffect, useMemo } from 'react';
import { 
    Modal, ModalHeader, ModalBody, ModalFooter, Button, 
    Row, Col, Nav, NavItem, NavLink, TabContent, TabPane, 
    Form, FormGroup, Label, Input, FormFeedback, Card, CardBody 
} from 'reactstrap';
import classnames from 'classnames';
import { APIClient } from '../../../helpers/api_helper';
import { uploadPartyProfile } from '../../../helpers/fakebackend_helper';
import { api } from "../../../config";
import { toast } from 'react-toastify';
import ResultModal from '../../../Components/Common/ResultModal';

const apiClient = new APIClient();

const PartyMasterModal = ({ isOpen, toggle, partyId, isEdit, onSuccess, defaultType }) => {
    const [activeTab, setActiveTab] = useState('1');
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dropdowns, setDropdowns] = useState({
        partyTypes: [],
        currencies: [],
        accounts: [],
        paymentTerms: [],
        banks: [],
        branches: [],
        gstTreatments: [
            { id: 'Registered Business - Regular', name: 'Registered Business - Regular' },
            { id: 'Registered Business - Composition', name: 'Registered Business - Composition' },
            { id: 'Unregistered Business', name: 'Unregistered Business' },
            { id: 'Consumer', name: 'Consumer' },
            { id: 'Overseas', name: 'Overseas' },
            { id: 'Special Economic Zone', name: 'Special Economic Zone' },
            { id: 'Deemed Export', name: 'Deemed Export' }
        ],
        salutations: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.']
    });

    const initialPartyState = {
        Party: {
            PartyType: defaultType || '',
            Salutation: '',
            FirstName: '',
            LastName: '',
            CompanyName: '',
            DisplayName: '',
            Email: '',
            PhoneWork: '',
            PhoneMobile: '',
            PreferredLanguage: 'English',
            GSTTreatment: '',
            PlaceOfSupply: '',
            PAN: '',
            GSTNO: '',
            TaxPreference: 'Taxable',
            Currency: null,
            AccountsReceivableAccount: null,
            AccountsPayableAccount: null,
            OpeningBalance: 0,
            OpeningBalanceType: 'Dr',
            PaymentTerms: '',
            EnablePortal: false,
            WebsiteURL: '',
            Department: '',
            Remarks: '',
            PartyProfile: '',
            RateDiff: 0
        },
        Addresses: [
            { AddressType: 'Billing', Attention: '', Country: 'India', Street1: '', Street2: '', City: '', State: '', PinCode: '', Phone: '', FaxNumber: '', IsDefault: true },
            { AddressType: 'Shipping', Attention: '', Country: 'India', Street1: '', Street2: '', City: '', State: '', PinCode: '', Phone: '', FaxNumber: '', IsDefault: false }
        ],
        BankDetails: [],
        ContactPersons: [],
        ReportingTags: []
    };

    const [form, setForm] = useState(initialPartyState);
    const [validationErrors, setValidationErrors] = useState({});
    
    // Result Modal State (Artistic Popup)
    const [resultModal, setResultModal] = useState({
        show: false,
        title: "",
        message: "",
        type: "error"
    });

    const toggleResultModal = () => setResultModal(prev => ({ ...prev, show: !prev.show }));

    const toggleTab = (tab) => {
        if (activeTab !== tab) setActiveTab(tab);
    };

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [pTypes, currs, accs, pTerms, banks, branches] = await Promise.all([
                    apiClient.get('/api/partytypemaster'),
                    apiClient.get('/api/currency'),
                    apiClient.get('/api/account'),
                    apiClient.get('/api/paymentterm'),
                    apiClient.get('/api/bank'),
                    apiClient.get('/api/branch')
                ]);
                setDropdowns(prev => ({
                    ...prev,
                    partyTypes: Array.isArray(pTypes) ? pTypes : [],
                    currencies: Array.isArray(currs) ? currs : [],
                    accounts: Array.isArray(accs) ? accs : [],
                    paymentTerms: Array.isArray(pTerms) ? pTerms : [],
                    banks: Array.isArray(banks) ? banks : [],
                    branches: Array.isArray(branches) ? branches : [],
                }));
            } catch (err) {
                console.error("Error fetching dropdowns:", err);
            }
        };

        if (isOpen) {
            setSelectedFile(null);
            fetchDropdowns();
            if (isEdit && partyId) {
                fetchPartyData(partyId);
            } else {
                setForm({
                    ...initialPartyState,
                    Party: { ...initialPartyState.Party, PartyType: defaultType || '' }
                });
                setActiveTab('1');
            }
        }
    }, [isOpen, isEdit, partyId, defaultType]);

    const fetchPartyData = async (id) => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/api/party/composite/${id}`);
            if (response) {
                const p = response.Party || response.party || {};
                const rawAddr = response.Addresses || response.addresses || [];
                const bnk = response.BankDetails || response.bankDetails || [];
                const cp = response.ContactPersons || response.contactPersons || [];
                const tags = response.ReportingTags || response.reportingTags || [];
                
                // Ensure we always have at least one Billing and one Shipping address for the form
                const finalAddresses = ['Billing', 'Shipping'].map(type => {
                    const existing = rawAddr.find(a => (a.AddressType || a.addressType) === type);
                    if (existing) {
                        return {
                            AddressId: existing.AddressId ?? existing.addressId ?? 0,
                            AddressType: existing.AddressType ?? existing.addressType ?? type,
                            Attention: existing.Attention ?? existing.attention ?? '',
                            Country: existing.Country ?? existing.country ?? 'India',
                            Street1: existing.Street1 ?? existing.street1 ?? '',
                            Street2: existing.Street2 ?? existing.street2 ?? '',
                            City: existing.City ?? existing.city ?? '',
                            State: existing.State ?? existing.state ?? '',
                            PinCode: existing.PinCode ?? existing.pinCode ?? '',
                            Phone: existing.Phone ?? existing.phone ?? '',
                            FaxNumber: existing.FaxNumber ?? existing.faxNumber ?? '',
                            IsDefault: existing.IsDefault ?? existing.isDefault ?? (type === 'Billing')
                        };
                    }
                    return {
                        AddressType: type,
                        Attention: '',
                        Country: 'India',
                        Street1: '',
                        Street2: '',
                        City: '',
                        State: '',
                        PinCode: '',
                        Phone: '',
                        FaxNumber: '',
                        IsDefault: type === 'Billing'
                    };
                });

                setForm({
                    Party: {
                        PartyId: p.PartyId ?? p.partyId ?? 0,
                        PartyType: p.PartyType ?? p.partyType ?? '',
                        Salutation: p.Salutation ?? p.salutation ?? '',
                        FirstName: p.FirstName ?? p.firstName ?? '',
                        LastName: p.LastName ?? p.lastName ?? '',
                        CompanyName: p.CompanyName ?? p.companyName ?? '',
                        DisplayName: p.DisplayName ?? p.displayName ?? '',
                        Email: p.Email ?? p.email ?? '',
                        PhoneWork: p.PhoneWork ?? p.phoneWork ?? '',
                        PhoneMobile: p.PhoneMobile ?? p.phoneMobile ?? '',
                        PreferredLanguage: p.PreferredLanguage ?? p.preferredLanguage ?? 'English',
                        GSTTreatment: p.GSTTreatment ?? p.gstTreatment ?? '',
                        PlaceOfSupply: p.PlaceOfSupply ?? p.placeOfSupply ?? '',
                        PAN: p.PAN ?? p.pan ?? '',
                        GSTNO: p.GSTNO ?? p.gstNo ?? p.gstno ?? '',
                        TaxPreference: p.TaxPreference ?? p.taxPreference ?? 'Taxable',
                        Currency: p.Currency ?? p.currency ?? null,
                        AccountsReceivableAccount: p.AccountsReceivableAccount ?? p.accountsReceivableAccount ?? null,
                        AccountsPayableAccount: p.AccountsPayableAccount ?? p.accountsPayableAccount ?? null,
                        OpeningBalance: p.OpeningBalance ?? p.openingBalance ?? 0,
                        OpeningBalanceType: p.OpeningBalanceType ?? p.openingBalanceType ?? 'Dr',
                        PaymentTerms: p.PaymentTerms ?? p.paymentTerms ?? '',
                        EnablePortal: p.EnablePortal ?? p.enablePortal ?? false,
                        WebsiteURL: p.WebsiteURL ?? p.websiteURL ?? '',
                        Department: p.Department ?? p.department ?? '',
                        Remarks: p.Remarks ?? p.remarks ?? '',
                        PartyProfile: p.PartyProfile ?? p.partyProfile ?? '',
                        RateDiff: p.RateDiff ?? p.rateDiff ?? 0
                    },
                    Addresses: finalAddresses,
                    BankDetails: bnk.map(b => ({
                        BankDetailId: b.BankDetailId ?? b.bankDetailId ?? 0,
                        AccountHolderName: b.AccountHolderName ?? b.accountHolderName ?? '',
                        BankName: b.BankName ?? b.bankName ?? '',
                        AccountNumber: b.AccountNumber ?? b.accountNumber ?? '',
                        IFSC: b.IFSC ?? b.ifsc ?? '',
                        Branch: b.Branch ?? b.branch ?? '',
                        MICR: b.MICR ?? b.micr ?? '',
                        IsDefault: b.IsDefault ?? b.isDefault ?? false
                    })),
                    ContactPersons: cp.map(c => ({
                        ContactPersonId: c.ContactPersonId ?? c.contactPersonId ?? 0,
                        Salutation: c.Salutation ?? c.salutation ?? '',
                        FirstName: c.FirstName ?? c.firstName ?? '',
                        LastName: c.LastName ?? c.lastName ?? '',
                        EmailAddress: c.EmailAddress ?? c.emailAddress ?? '',
                        WorkPhone: c.WorkPhone ?? c.workPhone ?? '',
                        Mobile: c.Mobile ?? c.mobile ?? '',
                        IsPrimary: c.IsPrimary ?? c.isPrimary ?? false
                    })),
                    ReportingTags: tags
                });
            }
        } catch (error) {
            console.error("Fetch Party Error:", error);
            toast.error("Failed to load party details");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadProfile = async () => {
        if (!selectedFile) {
            toast.warn("Please select a file to upload first.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const res = await uploadPartyProfile(formData);
            if (res && res.filePath) {
                setForm(prev => ({
                    ...prev,
                    Party: { ...prev.Party, PartyProfile: res.filePath }
                }));
                setSelectedFile(null);
                toast.success("Profile image uploaded successfully");
            }
        } catch (err) {
            console.error("Upload error", err);
            toast.error("Failed to upload profile image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClearProfile = () => {
        setSelectedFile(null);
        setForm(prev => ({
            ...prev,
            Party: { ...prev.Party, PartyProfile: '' }
        }));
    };

    const handlePartyChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            Party: {
                ...prev.Party,
                [name]: type === 'checkbox' ? checked : value
            }
        }));
    };

    const handleAddressChange = (index, e) => {
        const { name, value } = e.target;
        const newAddresses = [...form.Addresses];
        newAddresses[index] = { ...newAddresses[index], [name]: value };
        setForm(prev => ({ ...prev, Addresses: newAddresses }));
    };

    const copyBillingAddress = () => {
        const billing = form.Addresses.find(a => a.AddressType === 'Billing');
        if (billing) {
            const newAddresses = [...form.Addresses];
            const shippingIndex = newAddresses.findIndex(a => a.AddressType === 'Shipping');
            if (shippingIndex !== -1) {
                newAddresses[shippingIndex] = { 
                    ...billing, 
                    AddressType: 'Shipping', 
                    AddressId: newAddresses[shippingIndex].AddressId, // Preserve ID if editing
                    IsDefault: false 
                };
                setForm(prev => ({ ...prev, Addresses: newAddresses }));
                toast.info("Copied Billing to Shipping");
            }
        }
    };

    const addBankDetail = () => {
        setForm(prev => ({
            ...prev,
            BankDetails: [...prev.BankDetails, { AccountHolderName: '', BankName: '', AccountNumber: '', IFSC: '', Branch: '', MICR: '', IsDefault: false }]
        }));
    };

    const removeBankDetail = (index) => {
        setForm(prev => ({
            ...prev,
            BankDetails: prev.BankDetails.filter((_, i) => i !== index)
        }));
    };

    const handleBankChange = (index, e) => {
        const { name, value } = e.target;
        const newList = [...form.BankDetails];
        newList[index] = { ...newList[index], [name]: value };
        setForm(prev => ({ ...prev, BankDetails: newList }));
    };

    const addContactPerson = () => {
        setForm(prev => ({
            ...prev,
            ContactPersons: [...prev.ContactPersons, { Salutation: '', FirstName: '', LastName: '', EmailAddress: '', WorkPhone: '', Mobile: '', IsPrimary: false }]
        }));
    };

    const removeContactPerson = (index) => {
        setForm(prev => ({
            ...prev,
            ContactPersons: prev.ContactPersons.filter((_, i) => i !== index)
        }));
    };

    const handleContactChange = (index, e) => {
        const { name, value } = e.target;
        const newList = [...form.ContactPersons];
        newList[index] = { ...newList[index], [name]: value };
        setForm(prev => ({ ...prev, ContactPersons: newList }));
    };

    const validate = () => {
        const errors = {};
        if (!form.Party.PartyType) errors.PartyType = "Party Type is required";
        if (!form.Party.DisplayName) errors.DisplayName = "Display Name is required";
        if (!form.Party.GSTTreatment) errors.GSTTreatment = "GST Treatment is required";
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            setActiveTab('1');
            return;
        }

        setLoading(true);
        try {
            // Sanitize payload for backend (ensure correct types)
            const payload = {
                ...form,
                Party: {
                    ...form.Party,
                    Currency: form.Party.Currency ? parseInt(form.Party.Currency) : null,
                    AccountsReceivableAccount: form.Party.AccountsReceivableAccount ? parseInt(form.Party.AccountsReceivableAccount) : null,
                    AccountsPayableAccount: form.Party.AccountsPayableAccount ? parseInt(form.Party.AccountsPayableAccount) : null,
                    OpeningBalance: parseFloat(form.Party.OpeningBalance) || 0,
                    PartyId: parseInt(form.Party.PartyId) || 0,
                    RateDiff: parseFloat(form.Party.RateDiff) || 0
                },
                Addresses: form.Addresses.map(a => ({
                    ...a,
                    AddressId: parseInt(a.AddressId) || 0,
                    IsDefault: !!a.IsDefault
                })),
                BankDetails: form.BankDetails.map(b => ({
                    ...b,
                    BankDetailId: parseInt(b.BankDetailId) || 0,
                    IsDefault: !!b.IsDefault
                })),
                ContactPersons: form.ContactPersons.map(c => ({
                    ...c,
                    ContactPersonId: parseInt(c.ContactPersonId) || 0,
                    IsPrimary: !!c.IsPrimary
                }))
            };

            if (isEdit) {
                await apiClient.put('/api/party/composite', payload);
                toast.success("Party updated successfully");
            } else {
                await apiClient.post('/api/party/composite', payload);
                toast.success("Party created successfully");
            }
            onSuccess();
            toggle();
        } catch (error) {
            const errorMsg = typeof error === 'string' ? error : (error?.message || "Error saving party");
            const isDuplicate = errorMsg.toLowerCase().includes("duplicate") || errorMsg.toLowerCase().includes("already exists");
            
            setResultModal({
                show: true,
                title: isDuplicate ? "Duplicate Entry" : "Save Failed",
                message: errorMsg,
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" centered>
            <ModalHeader toggle={toggle}>
                {isEdit ? "Edit Party" : "New " + (defaultType || "Party")}
            </ModalHeader>
            <ModalBody className="p-0">
                <Nav tabs className="nav-tabs-custom nav-success px-4 pt-2">
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '1' })} onClick={() => toggleTab('1')}>General</NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '2' })} onClick={() => toggleTab('2')}>Address</NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '3' })} onClick={() => toggleTab('3')}>Contact Persons</NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '4' })} onClick={() => toggleTab('4')}>Bank Details</NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '5' })} onClick={() => toggleTab('5')}>Remarks</NavLink>
                    </NavItem>
                </Nav>

                <TabContent activeTab={activeTab} className="p-4">
                    <TabPane tabId="1">
                        <Row className="g-3">
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Party Type <span className="text-danger">*</span></Label>
                                    <Input type="select" name="PartyType" value={form.Party.PartyType} onChange={handlePartyChange} invalid={!!validationErrors.PartyType}>
                                        <option value="">Select Category</option>
                                        <option value="Customer">Customer</option>
                                        <option value="Vendor">Vendor</option>
                                        <option value="Trader">Trader</option>
                                    </Input>
                                    <FormFeedback>{validationErrors.PartyType}</FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Display Name <span className="text-danger">*</span></Label>
                                    <Input name="DisplayName" value={form.Party.DisplayName} onChange={handlePartyChange} invalid={!!validationErrors.DisplayName} />
                                    <FormFeedback>{validationErrors.DisplayName}</FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={2}>
                                <FormGroup>
                                    <Label>Salutation</Label>
                                    <Input type="select" name="Salutation" value={form.Party.Salutation} onChange={handlePartyChange}>
                                        <option value="">None</option>
                                        {dropdowns.salutations.map(s => <option key={s} value={s}>{s}</option>)}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={5}>
                                <FormGroup>
                                    <Label>First Name</Label>
                                    <Input name="FirstName" value={form.Party.FirstName} onChange={handlePartyChange} />
                                </FormGroup>
                            </Col>
                            <Col md={5}>
                                <FormGroup>
                                    <Label>Last Name</Label>
                                    <Input name="LastName" value={form.Party.LastName} onChange={handlePartyChange} />
                                </FormGroup>
                            </Col>
                            <Col md={12}>
                                <FormGroup>
                                    <Label>Company Name</Label>
                                    <Input name="CompanyName" value={form.Party.CompanyName} onChange={handlePartyChange} />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Email</Label>
                                    <Input type="email" name="Email" value={form.Party.Email} onChange={handlePartyChange} />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Mobile</Label>
                                    <Input name="PhoneMobile" value={form.Party.PhoneMobile} onChange={handlePartyChange} />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>GST Treatment <span className="text-danger">*</span></Label>
                                    <Input type="select" name="GSTTreatment" value={form.Party.GSTTreatment} onChange={handlePartyChange} invalid={!!validationErrors.GSTTreatment}>
                                        <option value="">Select Treatment</option>
                                        {dropdowns.gstTreatments.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </Input>
                                    <FormFeedback>{validationErrors.GSTTreatment}</FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>GSTIN</Label>
                                    <Input name="GSTNO" value={form.Party.GSTNO} onChange={handlePartyChange} placeholder="22AAAAA0000A1Z5" />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>PAN</Label>
                                    <Input name="PAN" value={form.Party.PAN} onChange={handlePartyChange} />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Currency</Label>
                                    <Input type="select" name="Currency" value={form.Party.Currency || ''} onChange={handlePartyChange}>
                                        <option value="">Select Currency</option>
                                        {dropdowns.currencies.map(c => {
                                            const id = c.currencyId || c.CurrencyId;
                                            const name = c.currencyCode || c.CurrencyCode || c.currencyName || c.CurrencyName;
                                            return <option key={`curr-${id || Math.random()}`} value={id}>{name}</option>;
                                        })}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Payment Terms</Label>
                                    <Input type="select" name="PaymentTerms" value={form.Party.PaymentTerms || ''} onChange={handlePartyChange}>
                                        <option value="">Select Payment Terms</option>
                                        {dropdowns.paymentTerms.map(p => {
                                            const id = p.paymentTermId || p.PaymentTermId;
                                            const name = p.paymentTermName || p.PaymentTermName;
                                            return <option key={`pt-${id || Math.random()}`} value={id}>{name}</option>;
                                        })}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Receivable Account</Label>
                                    <Input type="select" name="AccountsReceivableAccount" value={form.Party.AccountsReceivableAccount || ''} onChange={handlePartyChange}>
                                        <option value="">Select Account</option>
                                        {dropdowns.accounts.map(a => {
                                            const id = a.accountId || a.AccountId;
                                            const name = a.accountName || a.AccountName;
                                            return <option key={`ar-${id || Math.random()}`} value={id}>{name}</option>;
                                        })}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Payable Account</Label>
                                    <Input type="select" name="AccountsPayableAccount" value={form.Party.AccountsPayableAccount || ''} onChange={handlePartyChange}>
                                        <option value="">Select Account</option>
                                        {dropdowns.accounts.map(a => {
                                            const id = a.accountId || a.AccountId;
                                            const name = a.accountName || a.AccountName;
                                            return <option key={`ap-${id || Math.random()}`} value={id}>{name}</option>;
                                        })}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Opening Balance</Label>
                                    <Row className="g-0">
                                        <Col xs={4}>
                                            <Input type="select" name="OpeningBalanceType" value={form.Party.OpeningBalanceType || 'Dr'} onChange={handlePartyChange}>
                                                <option value="Dr">Debit (Receivable)</option>
                                                <option value="Cr">Credit (Payable)</option>
                                            </Input>
                                        </Col>
                                        <Col xs={8}>
                                            <Input type="number" name="OpeningBalance" value={form.Party.OpeningBalance || 0} onChange={handlePartyChange} />
                                        </Col>
                                    </Row>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Default Rate Adjustment (±)</Label>
                                    <Input 
                                        type="number" 
                                        name="RateDiff" 
                                        value={form.Party.RateDiff ?? 0} 
                                        onChange={handlePartyChange} 
                                        placeholder="e.g. 5 or -5"
                                        className="no-spin-input"
                                    />
                                    <p className="text-muted small">This amount will be added (positive) or subtracted (negative) from item rates in Sales.</p>
                                </FormGroup>
                            </Col>
                            <Col md={12}>
                                <div className="p-3 border rounded bg-light bg-opacity-10">
                                    <h6 className="mb-3 text-primary">Party Profile / Logo</h6>
                                    <Row className="g-3">
                                        <Col md={7}>
                                            <FormGroup className="mb-3">
                                                <Label>Profile Image URL</Label>
                                                <Input 
                                                    name="PartyProfile" 
                                                    value={form.Party.PartyProfile} 
                                                    onChange={handlePartyChange} 
                                                    placeholder="Paste public image URL, or upload below"
                                                />
                                            </FormGroup>
                                            
                                            <div className="d-flex align-items-center mb-3">
                                                <Label className="btn btn-light border m-0" style={{ cursor: 'pointer', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                                                    Choose File
                                                    <Input type="file" hidden accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                                                </Label>
                                                <Input 
                                                    type="text" 
                                                    readOnly 
                                                    className="form-control" 
                                                    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, backgroundColor: "#fff" }}
                                                    value={selectedFile ? selectedFile.name : ""} 
                                                />
                                            </div>

                                            <div className="d-flex gap-2">
                                                <Button 
                                                    type="button" 
                                                    color="primary" 
                                                    outline 
                                                    size="sm"
                                                    onClick={handleUploadProfile}
                                                    disabled={isUploading || !selectedFile}
                                                >
                                                    {isUploading ? "Uploading..." : "Upload Profile"}
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    color="light" 
                                                    size="sm"
                                                    onClick={handleClearProfile}
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                            <p className="text-muted small mb-0 mt-3">
                                                Upload a profile image, or paste a public URL. PNG/JPG/WEBP supported.
                                            </p>
                                        </Col>
                                        
                                        <Col md={5}>
                                            <Card className="bg-light border shadow-none mb-0 h-100 d-flex justify-content-center align-items-center p-3" style={{ minHeight: '150px' }}>
                                                {selectedFile ? (
                                                    <img 
                                                        src={URL.createObjectURL(selectedFile)} 
                                                        alt="Profile Preview" 
                                                        style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }}
                                                    />
                                                ) : form.Party.PartyProfile ? (
                                                    <img 
                                                        src={form.Party.PartyProfile.startsWith("http") 
                                                            ? form.Party.PartyProfile 
                                                            : `${api.API_URL || 'http://localhost:5248'}${form.Party.PartyProfile.startsWith('/') ? '' : '/'}${form.Party.PartyProfile}`} 
                                                        alt="Profile Preview" 
                                                        style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }}
                                                        onError={(e) => {
                                                            e.target.onerror = null; 
                                                            e.target.src = "https://via.placeholder.com/150/EEEEEE/999999?text=No+Image";
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-muted">No Image</span>
                                                )}
                                            </Card>
                                        </Col>
                                    </Row>
                                </div>
                            </Col>
                        </Row>
                    </TabPane>

                    <TabPane tabId="2">
                        <Row>
                            {form.Addresses.map((addr, idx) => (
                                <Col md={6} key={idx}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="mb-0 text-primary">{addr.AddressType} Address</h5>
                                        {addr.AddressType === 'Shipping' && (
                                            <Button color="soft-info" size="sm" onClick={copyBillingAddress}>
                                                <i className="ri-file-copy-line me-1"></i> Copy Billing
                                            </Button>
                                        )}
                                    </div>
                                    <Row className="g-2">
                                        <Col md={12}><FormGroup><Label size="sm">Attention</Label><Input bsSize="sm" name="Attention" value={addr.Attention} onChange={(e) => handleAddressChange(idx, e)} /></FormGroup></Col>
                                        <Col md={12}><FormGroup><Label size="sm">Street 1</Label><Input bsSize="sm" type="textarea" rows="2" name="Street1" value={addr.Street1} onChange={(e) => handleAddressChange(idx, e)} /></FormGroup></Col>
                                        <Col md={12}><FormGroup><Label size="sm">Street 2</Label><Input bsSize="sm" type="textarea" rows="2" name="Street2" value={addr.Street2} onChange={(e) => handleAddressChange(idx, e)} /></FormGroup></Col>
                                        <Col md={6}><FormGroup><Label size="sm">City</Label><Input bsSize="sm" name="City" value={addr.City} onChange={(e) => handleAddressChange(idx, e)} /></FormGroup></Col>
                                        <Col md={6}><FormGroup><Label size="sm">State</Label><Input bsSize="sm" name="State" value={addr.State} onChange={(e) => handleAddressChange(idx, e)} /></FormGroup></Col>
                                        <Col md={6}><FormGroup><Label size="sm">Pin Code</Label><Input bsSize="sm" name="PinCode" value={addr.PinCode} onChange={(e) => handleAddressChange(idx, e)} /></FormGroup></Col>
                                        <Col md={6}><FormGroup><Label size="sm">Phone</Label><Input bsSize="sm" name="Phone" value={addr.Phone} onChange={(e) => handleAddressChange(idx, e)} /></FormGroup></Col>
                                    </Row>
                                </Col>
                            ))}
                        </Row>
                    </TabPane>

                    <TabPane tabId="3">
                        <div className="table-responsive">
                            <table className="table align-middle table-nowrap table-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>Salutation</th>
                                        <th>First Name</th>
                                        <th>Last Name</th>
                                        <th>Email</th>
                                        <th>Mobile</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.ContactPersons.map((cp, idx) => (
                                        <tr key={idx}>
                                            <td><Input bsSize="sm" type="select" name="Salutation" value={cp.Salutation} onChange={(e) => handleContactChange(idx, e)}>
                                                <option value="">-</option>
                                                {dropdowns.salutations.map(s => <option key={s} value={s}>{s}</option>)}
                                            </Input></td>
                                            <td><Input bsSize="sm" name="FirstName" value={cp.FirstName} onChange={(e) => handleContactChange(idx, e)} /></td>
                                            <td><Input bsSize="sm" name="LastName" value={cp.LastName} onChange={(e) => handleContactChange(idx, e)} /></td>
                                            <td><Input bsSize="sm" type="email" name="EmailAddress" value={cp.EmailAddress} onChange={(e) => handleContactChange(idx, e)} /></td>
                                            <td><Input bsSize="sm" name="Mobile" value={cp.Mobile} onChange={(e) => handleContactChange(idx, e)} /></td>
                                            <td><Button color="soft-danger" size="sm" onClick={() => removeContactPerson(idx)}><i className="ri-delete-bin-line"></i></Button></td>
                                        </tr>
                                    ))}
                                    {!form.ContactPersons.length && <tr><td colSpan="6" className="text-center text-muted">No contact persons added</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <Button color="soft-success" size="sm" className="mt-2" onClick={addContactPerson}><i className="ri-add-line"></i> Add Person</Button>
                    </TabPane>

                    <TabPane tabId="4">
                        {form.BankDetails.map((bank, idx) => (
                            <Card key={idx} className="mb-3 border border-dashed">
                                <CardBody>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0">Bank #{idx + 1}</h6>
                                        <Button color="soft-danger" size="sm" onClick={() => removeBankDetail(idx)}><i className="ri-delete-bin-line"></i></Button>
                                    </div>
                                    <Row className="g-2">
                                        <Col md={4}>
                                            <FormGroup>
                                                <Label size="sm">Bank Name</Label>
                                                <Input type="select" bsSize="sm" name="BankName" value={bank.BankName} onChange={(e) => handleBankChange(idx, e)}>
                                                    <option value="">Select Bank</option>
                                                    {dropdowns.banks.map((b, i) => (
                                                        <option key={`bank-${b.BankMasterId || b.bankMasterId || i}`} value={b.BankName || b.bankName}>
                                                            {b.BankName || b.bankName}
                                                        </option>
                                                    ))}
                                                </Input>
                                            </FormGroup>
                                        </Col>
                                        <Col md={4}><FormGroup><Label size="sm">Account Holder</Label><Input bsSize="sm" name="AccountHolderName" value={bank.AccountHolderName} onChange={(e) => handleBankChange(idx, e)} /></FormGroup></Col>
                                        <Col md={4}><FormGroup><Label size="sm">Account Number</Label><Input bsSize="sm" name="AccountNumber" value={bank.AccountNumber} onChange={(e) => handleBankChange(idx, e)} /></FormGroup></Col>
                                        <Col md={4}><FormGroup><Label size="sm">IFSC</Label><Input bsSize="sm" name="IFSC" value={bank.IFSC} onChange={(e) => handleBankChange(idx, e)} /></FormGroup></Col>
                                        <Col md={4}>
                                            <FormGroup>
                                                <Label size="sm">Branch</Label>
                                                <Input type="select" bsSize="sm" name="Branch" value={bank.Branch} onChange={(e) => handleBankChange(idx, e)}>
                                                    <option value="">Select Branch</option>
                                                    {dropdowns.branches.map((br, i) => (
                                                        <option key={`branch-${br.BranchId || br.branchId || i}`} value={br.BranchName || br.branchName}>
                                                            {br.BranchName || br.branchName}
                                                        </option>
                                                    ))}
                                                </Input>
                                            </FormGroup>
                                        </Col>
                                        <Col md={4} className="d-flex align-items-end"><FormGroup check className="mb-2"><Label check><Input type="checkbox" name="IsDefault" checked={bank.IsDefault} onChange={(e) => handleBankChange(idx, e)} /> Default Bank</Label></FormGroup></Col>
                                    </Row>
                                </CardBody>
                            </Card>
                        ))}
                        <Button color="soft-success" size="sm" onClick={addBankDetail}><i className="ri-add-line"></i> Add Bank Details</Button>
                    </TabPane>

                    <TabPane tabId="5">
                        <FormGroup>
                            <Label>Internal Remarks</Label>
                            <Input type="textarea" rows="10" name="Remarks" value={form.Party.Remarks} onChange={handlePartyChange} placeholder="Add any internal notes about this party..." />
                        </FormGroup>
                    </TabPane>
                </TabContent>
            </ModalBody>
            <ModalFooter className="bg-light">
                <Button color="dark" outline onClick={toggle} disabled={loading}>Cancel</Button>
                <Button color="success" onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : isEdit ? "Update Party" : "Save Party"}
                </Button>
            </ModalFooter>

            <ResultModal
                show={resultModal.show}
                onCloseClick={toggleResultModal}
                title={resultModal.title}
                message={resultModal.message}
                type={resultModal.type}
            />
        </Modal>
    );
};

export default PartyMasterModal;
