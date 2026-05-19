import React, { useMemo, useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, FormFeedback } from 'reactstrap';
import Select from "react-select";
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { APIClient } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import { masterConfig } from '../../common/data/masterConfig';
import ResultModal from './ResultModal';
import ProductForm from '../../pages/ProductMaster/ProductForm';
import { formatToTwoDecimals } from '../../utils/numberUtils';

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

    const [selectOptions, setSelectOptions] = useState({});

    // Fetch options for 'select' type fields
    useEffect(() => {
        if (!isOpen || !currentConfig) return;

        const fetchSelectOptions = async () => {
            const selectFields = currentConfig.fields.filter(f => f.type === 'select' && (f.masterName || f.url));
            if (selectFields.length === 0) return;

            const newOptions = { ...selectOptions };
            let hasChanged = false;

            for (const field of selectFields) {
                try {
                    const url = field.url || `/api/Master/${field.masterName}`;
                    const response = await apiClient.get(url);
                    const data = response?.data || response || [];
                    if (Array.isArray(data)) {
                        newOptions[field.name] = data.map(item => ({
                            label: item.partyTypeName || item.PartyTypeName || item.roleName || item.RoleName || item.vehicleNo || item.VehicleNo || item.accountName || item.AccountName || item.groupName || item.GroupName || item.displayName || item.DisplayName || item.transporterName || item.TransporterName || item.name || item.Name || "Option",
                            value: field.valueKey === 'name' ? (item.partyTypeName || item.PartyTypeName || item.name || item.Name) : (item.partyTypeId || item.PartyTypeId || item.roleId || item.RoleId || item.vehicleId || item.VehicleId || item.accountId || item.AccountId || item.groupId || item.GroupId || item.id || item.Id || item.transporterId || item.TransporterId || item.partyId || item.PartyId)
                        }));
                        hasChanged = true;
                    }
                } catch (err) {
                    console.error(`GenericMasterModal: Failed to fetch options for ${field.name}:`, err);
                }
            }

            if (hasChanged) {
                setSelectOptions(newOptions);
            }
        };

        fetchSelectOptions();
    }, [isOpen, currentConfig]);

    const formik = useFormik({
        initialValues: currentConfig?.fields.reduce((acc, field) => {
            if (field.type === 'checkbox') acc[field.name] = false;
            else if (field.type === 'number' || field.type === 'select') acc[field.name] = ''; // Select IDs usually numeric
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
                    // Convert numeric fields from string if needed
                    if ((field.type === 'number' || field.type === 'select') && cleanValues[field.name] !== null && cleanValues[field.name] !== undefined) {
                        const val = String(cleanValues[field.name]);
                        if (val.trim() === '') {
                            cleanValues[field.name] = null;
                        } else if (!isNaN(val)) {
                            cleanValues[field.name] = Number(val);
                        }
                    }
                    if (field.type === 'date' && typeof cleanValues[field.name] === 'string' && cleanValues[field.name].trim() === '') {
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
                // Ensure numeric IDs stay numeric if they come back as strings, or vice versa
            });
            formik.setValues(editValues);
        } else if (!isOpen) {
            formik.resetForm();
        }
    }, [isEdit, selectedItem, currentConfig, isOpen]); // Reset or populate when modal opens/closes

    return (
        <React.Fragment>
            <Modal isOpen={isOpen} toggle={toggle} centered modalClassName="zoomIn" size={masterId === "products" ? "xl" : "lg"}>
                <ModalHeader toggle={toggle} className="p-3 bg-light">
                    {isEdit ? "Edit " + masterLabel : "Add " + masterLabel}
                </ModalHeader>
                {masterId === "products" ? (
                    <ModalBody>
                        <ProductForm
                            isEdit={isEdit}
                            productId={selectedItem ? (selectedItem.productId || selectedItem.ProductId) : null}
                            onSuccess={() => {
                                toggle();
                                if (onSuccess) onSuccess();
                            }}
                            onCancel={toggle}
                        />
                    </ModalBody>
                ) : (
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

                                        {field.type === 'select' ? (
                                            <Select
                                                id={field.name}
                                                name={field.name}
                                                value={(selectOptions[field.name] || []).find(opt => String(opt.value) === String(formik.values[field.name])) || null}
                                                onChange={(opt) => formik.setFieldValue(field.name, opt ? opt.value : '')}
                                                onBlur={formik.handleBlur}
                                                options={selectOptions[field.name] || []}
                                                placeholder={`Select ${field.label}`}
                                                isSearchable
                                                isClearable
                                                className={formik.touched[field.name] && formik.errors[field.name] ? "is-invalid" : ""}
                                                styles={{
                                                    control: (base) => ({
                                                        ...base,
                                                        borderColor: formik.touched[field.name] && formik.errors[field.name] ? "#f06548" : base.borderColor,
                                                        '&:hover': {
                                                            borderColor: formik.touched[field.name] && formik.errors[field.name] ? "#f06548" : base.borderColor
                                                        }
                                                    })
                                                }}
                                            />
                                        ) : (
                                            <Input
                                                type={field.type || "text"}
                                                className={field.type === 'checkbox' ? "form-check-input" : "form-control"}
                                                id={field.name}
                                                name={field.name}
                                                placeholder={`Enter ${field.label}`}
                                                onChange={formik.handleChange}
                                                onBlur={(e) => {
                                                    if (field.type === "number") {
                                                        const val = formatToTwoDecimals(e.target.value);
                                                        formik.setFieldValue(field.name, val);
                                                    }
                                                    formik.handleBlur(e);
                                                }}
                                                value={field.type === "number" ? formatToTwoDecimals(formik.values[field.name]) : (formik.values[field.name] || "")}
                                                checked={field.type === 'checkbox' ? !!formik.values[field.name] : undefined}
                                                invalid={formik.touched[field.name] && formik.errors[field.name] ? true : false}
                                            />
                                        )}

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
                )}
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
