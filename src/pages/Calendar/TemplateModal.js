import React, { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Form,
  FormFeedback,
  Input,
  Label,
  Button,
} from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import { useDispatch } from "react-redux";
import { addNewTemplate } from "../../slices/calendar/thunk";
import Select from "react-select";

const TemplateModal = ({ isOpen, toggle, users }) => {
  const dispatch = useDispatch();

  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      template_name: "",
      description: "",
      default_priority: "Medium",
      default_status: "Pending",
      default_assigned_user_id: null,
      template_color: "bg-info-subtle",
    },
    validationSchema: Yup.object({
      template_name: Yup.string().required("Please enter template name"),
    }),
    onSubmit: (values) => {
      const newTemplate = {
        template_name: values.template_name,
        description: values.description,
        default_priority: values.default_priority,
        default_status: values.default_status,
        default_assigned_user_id: values.default_assigned_user_id ? values.default_assigned_user_id.value : null,
        template_color: values.template_color,
      };
      dispatch(addNewTemplate(newTemplate));
      validation.resetForm();
      toggle();
    },
  });

  const priorityOptions = [
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
    { label: "Done", value: "Done" },
  ];


  const statusOptions = [
    { label: "Pending", value: "Pending" },
    { label: "Completed", value: "Completed" },
    { label: "Canceled", value: "Canceled" },
  ];

  const colorOptions = [
    { label: "Primary", value: "bg-primary-subtle" },
    { label: "Success", value: "bg-success-subtle" },
    { label: "Info", value: "bg-info-subtle" },
    { label: "Warning", value: "bg-warning-subtle" },
    { label: "Danger", value: "bg-danger-subtle" },
  ];

  const userOptions = (users || []).map((user) => ({
    label: user.fullName,
    value: user.userId,
  }));

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered modalClassName="zoomIn">
      <ModalHeader toggle={toggle} className="p-3 bg-info-subtle modal-title">
        Add Task Template
      </ModalHeader>
      <ModalBody>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            validation.handleSubmit();
            return false;
          }}
        >
          <div className="row">
            <div className="col-12">
              <div className="mb-3">
                <Label className="form-label">Template Name</Label>
                <Input
                  name="template_name"
                  type="text"
                  placeholder="Insert Template Name"
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.template_name || ""}
                  invalid={
                    validation.touched.template_name && validation.errors.template_name ? true : false
                  }
                />
                {validation.touched.template_name && validation.errors.template_name ? (
                  <FormFeedback type="invalid">{validation.errors.template_name}</FormFeedback>
                ) : null}
              </div>
            </div>

            <div className="col-12">
              <div className="mb-3">
                <Label className="form-label">Description</Label>
                <Input
                  name="description"
                  type="textarea"
                  placeholder="Insert Description"
                  rows="3"
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.description || ""}
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <Label className="form-label">Default Priority</Label>
                <Input
                  name="default_priority"
                  type="select"
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.default_priority || "Medium"}
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Input>
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <Label className="form-label">Default Status</Label>
                <Input
                  name="default_status"
                  type="select"
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.default_status || "Pending"}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Input>
              </div>
            </div>

            <div className="col-12">
              <div className="mb-3">
                <Label className="form-label">Default Assigned User</Label>
                <Select
                  name="default_assigned_user_id"
                  options={userOptions}
                  onChange={(option) => validation.setFieldValue("default_assigned_user_id", option)}
                  value={validation.values.default_assigned_user_id}
                  isClearable
                />
              </div>
            </div>

            <div className="col-12">
              <div className="mb-3">
                <Label className="form-label">Template Color</Label>
                <Input
                  name="template_color"
                  type="select"
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.template_color || "bg-info-subtle"}
                >
                  {colorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Input>
              </div>
            </div>
          </div>
          <div className="hstack gap-2 justify-content-end">
            <Button type="button" color="light" onClick={toggle}>
              Close
            </Button>
            <Button type="submit" color="success">
              Add Template
            </Button>
          </div>
        </Form>
      </ModalBody>
    </Modal>
  );
};

export default TemplateModal;
