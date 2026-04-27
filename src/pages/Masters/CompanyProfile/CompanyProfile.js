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
    FormFeedback
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import { getCompanyProfile, updateCompanyProfile, uploadCompanyLogo } from "../../../helpers/fakebackend_helper";
import { toast, ToastContainer } from "react-toastify";
import { api } from "../../../config";
import { useFormik } from "formik";
import * as Yup from "yup";

const CompanyProfile = () => {
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: {
            companyId: 0,
            companyName: "",
            companyAddress: "",
            mobile: "",
            phone: "",
            email: "",
            gstin: "",
            pan: "",
            state: "",
            bankName: "",
            bankBranch: "",
            accountNumber: "",
            ifscCode: "",
            logoPath: ""
        },
        validationSchema: Yup.object({
            companyName: Yup.string().required("Company Name is required"),
            email: Yup.string().email("Invalid email").required("Email is required"),
            mobile: Yup.string().required("Mobile number is required"),
            gstin: Yup.string().required("GSTIN is required")
        }),
        onSubmit: (values) => {
            updateCompanyProfile(values)
                .then(res => {
                    toast.success("Company Profile updated successfully", { autoClose: 3000 });
                })
                .catch(err => {
                    toast.error("Failed to update Company Profile", { autoClose: 3000 });
                });
        }
    });

    useEffect(() => {
        getCompanyProfile()
            .then(res => {
                if (res) {
                    validation.setValues(res);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch company profile", err);
                setLoading(false);
            });
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadLogo = async () => {
        if (!selectedFile) {
            toast.warn("Please select a file to upload first.", { autoClose: 3000 });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const res = await uploadCompanyLogo(formData);
            if (res && res.url) {
                validation.setFieldValue("logoPath", res.url);
                setSelectedFile(null);
                toast.success("Logo uploaded successfully", { autoClose: 3000 });
            }
        } catch (err) {
            console.error("Upload error", err);
            toast.error("Failed to upload logo", { autoClose: 3000 });
        } finally {
            setIsUploading(false);
        }
    };

    const handleClearLogo = () => {
        setSelectedFile(null);
        validation.setFieldValue("logoPath", "");
    };

    document.title = "Company Profile | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Company Profile" pageTitle="Masters" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h5 className="card-title mb-0">Company Details</h5>
                                </CardHeader>
                                <CardBody>
                                    <Form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            validation.handleSubmit();
                                            return false;
                                        }}
                                    >
                                        <Row>
                                            <Col md={6}>
                                                <div className="mb-3">
                                                    <Label htmlFor="companyName" className="form-label">Company Name</Label>
                                                    <Input
                                                        name="companyName"
                                                        placeholder="Enter Company Name"
                                                        type="text"
                                                        className="form-control"
                                                        id="companyName"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.companyName || ""}
                                                        invalid={validation.touched.companyName && validation.errors.companyName ? true : false}
                                                    />
                                                    {validation.touched.companyName && validation.errors.companyName ? (
                                                        <FormFeedback type="invalid">{validation.errors.companyName}</FormFeedback>
                                                    ) : null}
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="mb-3">
                                                    <Label htmlFor="gstin" className="form-label">GSTIN</Label>
                                                    <Input
                                                        name="gstin"
                                                        placeholder="Enter GSTIN"
                                                        type="text"
                                                        className="form-control"
                                                        id="gstin"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.gstin || ""}
                                                        invalid={validation.touched.gstin && validation.errors.gstin ? true : false}
                                                    />
                                                    {validation.touched.gstin && validation.errors.gstin ? (
                                                        <FormFeedback type="invalid">{validation.errors.gstin}</FormFeedback>
                                                    ) : null}
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="mb-3">
                                                    <Label htmlFor="pan" className="form-label">PAN</Label>
                                                    <Input
                                                        name="pan"
                                                        placeholder="Enter PAN"
                                                        type="text"
                                                        className="form-control"
                                                        id="pan"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.pan || ""}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={12}>
                                                <div className="mb-3">
                                                    <Label htmlFor="companyAddress" className="form-label">Company Address</Label>
                                                    <Input
                                                        name="companyAddress"
                                                        placeholder="Enter Address"
                                                        type="textarea"
                                                        rows="3"
                                                        className="form-control"
                                                        id="companyAddress"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.companyAddress || ""}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={4}>
                                                <div className="mb-3">
                                                    <Label htmlFor="mobile" className="form-label">Mobile</Label>
                                                    <Input
                                                        name="mobile"
                                                        placeholder="Enter Mobile"
                                                        type="text"
                                                        className="form-control"
                                                        id="mobile"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.mobile || ""}
                                                        invalid={validation.touched.mobile && validation.errors.mobile ? true : false}
                                                    />
                                                    {validation.touched.mobile && validation.errors.mobile ? (
                                                        <FormFeedback type="invalid">{validation.errors.mobile}</FormFeedback>
                                                    ) : null}
                                                </div>
                                            </Col>
                                            <Col md={4}>
                                                <div className="mb-3">
                                                    <Label htmlFor="phone" className="form-label">Phone</Label>
                                                    <Input
                                                        name="phone"
                                                        placeholder="Enter Phone"
                                                        type="text"
                                                        className="form-control"
                                                        id="phone"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.phone || ""}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={4}>
                                                <div className="mb-3">
                                                    <Label htmlFor="email" className="form-label">Email</Label>
                                                    <Input
                                                        name="email"
                                                        placeholder="Enter Email"
                                                        type="email"
                                                        className="form-control"
                                                        id="email"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.email || ""}
                                                        invalid={validation.touched.email && validation.errors.email ? true : false}
                                                    />
                                                    {validation.touched.email && validation.errors.email ? (
                                                        <FormFeedback type="invalid">{validation.errors.email}</FormFeedback>
                                                    ) : null}
                                                </div>
                                            </Col>
                                            <Col md={4}>
                                                <div className="mb-3">
                                                    <Label htmlFor="state" className="form-label">State</Label>
                                                    <Input
                                                        name="state"
                                                        placeholder="Enter State"
                                                        type="text"
                                                        className="form-control"
                                                        id="state"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.state || ""}
                                                    />
                                                </div>
                                            </Col>
                                        </Row>

                                        <CardHeader className="px-0 py-3 border-0">
                                            <h5 className="card-title mb-0">Bank Details</h5>
                                        </CardHeader>
                                        
                                        <Row>
                                            <Col md={3}>
                                                <div className="mb-3">
                                                    <Label htmlFor="bankName" className="form-label">Bank Name</Label>
                                                    <Input
                                                        name="bankName"
                                                        placeholder="Enter Bank Name"
                                                        type="text"
                                                        className="form-control"
                                                        id="bankName"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.bankName || ""}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="mb-3">
                                                    <Label htmlFor="bankBranch" className="form-label">Branch</Label>
                                                    <Input
                                                        name="bankBranch"
                                                        placeholder="Enter Branch"
                                                        type="text"
                                                        className="form-control"
                                                        id="bankBranch"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.bankBranch || ""}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="mb-3">
                                                    <Label htmlFor="accountNumber" className="form-label">Account No</Label>
                                                    <Input
                                                        name="accountNumber"
                                                        placeholder="Enter Account No"
                                                        type="text"
                                                        className="form-control"
                                                        id="accountNumber"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.accountNumber || ""}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="mb-3">
                                                    <Label htmlFor="ifscCode" className="form-label">IFSC Code</Label>
                                                    <Input
                                                        name="ifscCode"
                                                        placeholder="Enter IFSC Code"
                                                        type="text"
                                                        className="form-control"
                                                        id="ifscCode"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.ifscCode || ""}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={12}>
                                                <div className="mb-3">
                                                    <Label htmlFor="logoPath" className="form-label font-weight-bold">Logo URL</Label>
                                                    
                                                    <Row>
                                                        <Col md={7}>
                                                            <Input
                                                                name="logoPath"
                                                                placeholder="Paste public image URL, or upload below"
                                                                type="text"
                                                                className="form-control mb-3"
                                                                id="logoPath"
                                                                onChange={validation.handleChange}
                                                                onBlur={validation.handleBlur}
                                                                value={validation.values.logoPath || ""}
                                                            />
                                                            
                                                            <div className="d-flex align-items-center mb-3 group-input">
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

                                                            <div className="d-flex gap-2 mb-2">
                                                                <Button 
                                                                    type="button" 
                                                                    color="primary" 
                                                                    outline 
                                                                    onClick={handleUploadLogo}
                                                                    disabled={isUploading || !selectedFile}
                                                                >
                                                                    {isUploading ? "Uploading..." : "Upload Logo"}
                                                                </Button>
                                                                <Button 
                                                                    type="button" 
                                                                    color="light" 
                                                                    onClick={handleClearLogo}
                                                                >
                                                                    Clear
                                                                </Button>
                                                            </div>
                                                            <p className="text-muted small mb-0 mt-3" style={{ maxWidth: '400px' }}>
                                                                Upload a logo, or paste a public image URL. Recommended: square logo (512x512). PNG/JPG/WEBP up to 10MB.
                                                            </p>
                                                        </Col>
                                                        
                                                        <Col md={5}>
                                                            <Card className="bg-light border shadow-none mb-0 h-100 d-flex justify-content-center align-items-center p-3">
                                                                {selectedFile ? (
                                                                    <img 
                                                                        src={URL.createObjectURL(selectedFile)} 
                                                                        alt="Company Logo Preview" 
                                                                        style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }}
                                                                    />
                                                                ) : validation.values.logoPath ? (
                                                                    <img 
                                                                        src={validation.values.logoPath.startsWith("http") 
                                                                            ? validation.values.logoPath 
                                                                            : `${api.API_URL || 'http://localhost:5248'}${validation.values.logoPath.startsWith('/') ? '' : '/'}${validation.values.logoPath}`} 
                                                                        alt="Company Logo Preview" 
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
                                        <div className="text-end">
                                            <Button type="submit" color="primary">Update Profile</Button>
                                        </div>
                                    </Form>
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

export default CompanyProfile;
