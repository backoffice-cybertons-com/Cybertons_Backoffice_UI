import React, { useMemo, useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, FormFeedback } from 'reactstrap';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { APIClient } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import { masterConfig } from '../../common/data/masterConfig';
import ResultModal from './ResultModal';

const apiClient = new APIClient();

const GenericMasterModal = ({ isOpen, toggle, masterId, isEdit = false, selectedItem = null, onSuccess }) => {
    const currentConfig = masterConfig[masterId];
    const masterLabel = currentConfig?.label || masterId;

    // State for Result Modal (Centered Popup)
    const [resultModal, setResultModal] = useState({
        show: false,
        title: "",
        message: "",
        type: "error"
    });

    const toggleResultModal = () => setResultModal(prev => ({ ...prev, show: !prev.show }));

    // Validation Schema (reusing logic from GenericMasterList)
    const validationSchema = useMemo(() => {
        if (!currentConfig || !currentConfig.fields) {
            return Yup.object().shape({});
        }

        const isLikelyPhoneField = (fieldName, fieldLabel) => {
            const s = `${fieldName} ${fieldLabel}`.toLowerCase();
            return s.includes("phone") || s.includes("mobile") || s.includes("whatsapp") || s.includes("contact");
        };

        const isLikelyEmailField = (fieldName, fieldLabel) => {
            const s = `${fieldName} ${fieldLabel}`.toLowerCase();
            return s.includes("email");
        };

        const isLikelyPinField = (fieldName, fieldLabel) => {
            const s = `${fieldName} ${fieldLabel}`.toLowerCase();
            return s.includes("pincode") || s.includes("pin code") || s.includes("zip");
        };

        const schema = currentConfig.fields.reduce((acc, field) => {
            const fieldName = field.name;
            const fieldLabel = field.label || field.name;

            let validator;
            if (field.type === 'number') {
                validator = Yup.number().typeError(`Please enter a valid ${fieldLabel}`);
            } else if (field.type === 'date') {
                validator = Yup.date().typeError(`Please enter a valid ${fieldLabel}`);
            } else if (field.type === 'checkbox') {
                validator = Yup.boolean();
            } else if (field.type === 'email' || isLikelyEmailField(fieldName, fieldLabel)) {
                validator = Yup.string().email('Please enter a valid email');
            } else if (field.type === 'password') {
                validator = Yup.string().min(6, 'Password must be at least 6 characters');
            } else {
                validator = Yup.string();
            }

            if (validator && (field.type === 'text' || field.type === 'email' || !field.type)) {
                if (isLikelyPhoneField(fieldName, fieldLabel)) {
                    validator = validator.matches(/^\d{10}$/,
                        { message: 'Please enter a valid 10-digit mobile number', excludeEmptyString: true }
                    );
                }

                if (isLikelyPinField(fieldName, fieldLabel)) {
                    validator = validator.matches(/^\d{6}$/,
                        { message: 'Please enter a valid 6-digit pincode', excludeEmptyString: true }
                    );
                }
            }

            if (field.required) {
                validator = validator.required(`Please enter ${fieldLabel}`);
            }

            acc[fieldName] = validator;
            return acc;
        }, {});

        return Yup.object().shape(schema);
    }, [currentConfig]);

    const formik = useFormik({
        initialValues: currentConfig?.fields.reduce((acc, field) => {
            if (field.type === 'checkbox') acc[field.name] = false;
            else acc[field.name] = '';
            return acc;
        }, {}) || {},
        enableReinitialize: true,
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                const pkName = currentConfig?.pk || 'id';
                const cleanValues = { ...values };

                currentConfig?.fields.forEach(field => {
                    if ((field.type === 'number' || field.type === 'date') && typeof cleanValues[field.name] === 'string' && cleanValues[field.name].trim() === '') {
                        cleanValues[field.name] = null;
                    }
                });

                if (isEdit && selectedItem) {
                    const id = selectedItem[pkName] || selectedItem['id'] || selectedItem['Id'];
                    await apiClient.put(`/api/Master/${masterId}/${id}`, cleanValues);
                    toast.success(`${masterLabel} updated successfully`);
                } else {
                    await apiClient.post(`/api/Master/${masterId}`, cleanValues);
                    toast.success(`${masterLabel} created successfully`);
                }

                toggle();
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error("Error saving data:", error);
                // Trigger centered popup instead of toast
                setResultModal({
                    show: true,
                    title: "Save Failed",
                    message: error || `We couldn't save the ${masterLabel}. Please check for duplicates or referential issues.`,
                    type: "error"
                });
            }
        },
    });

    // Populate form on edit
    useEffect(() => {
        if (isEdit && selectedItem && currentConfig) {
            const editValues = { ...selectedItem };
            currentConfig.fields.forEach(field => {
                if (field.type === 'checkbox') {
                    editValues[field.name] = selectedItem[field.name] === true || selectedItem[field.name] === 'true';
                }
            });
            formik.setValues(editValues);
        } else {
            formik.resetForm();
        }
    }, [isEdit, selectedItem, currentConfig, isOpen]); // Reset or populate when modal opens/closes

    return (
        <React.Fragment>
        <Modal isOpen={isOpen} toggle={toggle} centered>
            <ModalHeader toggle={toggle} className="bg-light p-3">
                {isEdit ? "Edit " + masterLabel : "Add " + masterLabel}
            </ModalHeader>
            <Form onSubmit={(e) => {
                e.preventDefault();
                formik.handleSubmit();
                return false;
            }}>
                <ModalBody>
                    {currentConfig ? (
                        currentConfig.fields.map((field, idx) => (
                            <FormGroup key={idx} check={field.type === 'checkbox'} className={field.type === 'checkbox' ? "mb-3" : "mb-3"}>
                                {field.type !== 'checkbox' && (
                                    <Label htmlFor={field.name} className="form-label">{field.label}</Label>
                                )}

                                <Input
                                    type={field.type || "text"}
                                    className={field.type === 'checkbox' ? "form-check-input" : "form-control"}
                                    id={field.name}
                                    name={field.name}
                                    placeholder={`Enter ${field.label}`}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values[field.name] || ""}
                                    checked={field.type === 'checkbox' ? !!formik.values[field.name] : undefined}
                                    invalid={formik.touched[field.name] && formik.errors[field.name] ? true : false}
                                />

                                {field.type === 'checkbox' && (
                                    <Label htmlFor={field.name} className="form-check-label ms-1">{field.label}</Label>
                                )}

                                {formik.touched[field.name] && formik.errors[field.name] ? (
                                    <FormFeedback type="invalid">{formik.errors[field.name]}</FormFeedback>
                                ) : null}
                            </FormGroup>
                        ))
                    ) : (
                        <div className="alert alert-warning">
                            No configuration found for "{masterId}". Setup 'masterConfig.js' to enable.
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <div className="hstack gap-2 justify-content-end">
                        <button type="button" className="btn btn-light" onClick={toggle}>Close</button>
                        <button type="submit" className="btn btn-success" id="add-btn">
                            {isEdit ? "Update" : "Add"}
                        </button>
                    </div>
                </ModalFooter>
            </Form>
        </Modal>

        {/* Centered Result Popup */}
        <ResultModal
            show={resultModal.show}
            onCloseClick={toggleResultModal}
            title={resultModal.title}
            message={resultModal.message}
            type={resultModal.type}
        />
        </React.Fragment>
    );
};

export default GenericMasterModal;
