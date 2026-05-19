import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Select from "react-select";
import {
  Col,
  Form,
  FormFeedback,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Button,
  Row,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import { toast } from "react-toastify";
import { api } from "../../../config";
import { getUsers } from "../../../helpers/taskApi";
import {
  uploadKanbanCover,
  uploadKanbanAttachment,
  getKanbanChecklist,
  saveKanbanChecklistItem,
  deleteKanbanChecklistItem,
  deleteKanbanChecklistGroup
} from "../../../helpers/fakebackend_helper";
import { updateCardChecklist } from "../../../slices/tasks/reducer";

const parseAttachments = (pathsStr, namesStr) => {
  let paths = [];
  let names = [];

  if (pathsStr) {
    if (typeof pathsStr === "string") {
      if (pathsStr.trim().startsWith("[")) {
        try {
          paths = JSON.parse(pathsStr);
        } catch (e) {
          paths = pathsStr.split(",").map(p => p.trim());
        }
      } else {
        paths = pathsStr.split(",").map(p => p.trim()).filter(Boolean);
      }
    } else if (Array.isArray(pathsStr)) {
      paths = pathsStr;
    }
  }

  if (namesStr) {
    if (typeof namesStr === "string") {
      if (namesStr.trim().startsWith("[")) {
        try {
          names = JSON.parse(namesStr);
        } catch (e) {
          names = namesStr.split(",").map(n => n.trim());
        }
      } else {
        names = namesStr.split(",").map(n => n.trim()).filter(Boolean);
      }
    } else if (Array.isArray(namesStr)) {
      names = namesStr;
    }
  }

  const attachments = [];
  const length = Math.max(paths.length, names.length);
  for (let i = 0; i < length; i++) {
    if (paths[i]) {
      attachments.push({
        path: paths[i] || "",
        name: names[i] || paths[i]?.split("/").pop() || "Attachment",
      });
    }
  }
  return attachments;
};

const priorityOptions = [
  { label: "High", value: "High", color: "#dc3545" },
  { label: "Medium", value: "Medium", color: "#3577f1" },
  { label: "Low", value: "Low", color: "#6c757d" },
];

const moduleOptions = [
  { label: "Sales", value: "Sales", color: "#0dcaf0" },
  { label: "Purchase", value: "Purchase", color: "#6f42c1" },
  { label: "Accounts", value: "Accounts", color: "#405189" },
  { label: "Payment", value: "Payment", color: "#0ab39c" },
  { label: "GST", value: "GST", color: "#d63384" },
  { label: "Inventory", value: "Inventory", color: "#20c997" },
];

const labelOptions = [
  { label: "Follow Up", value: "Follow Up", color: "#f7b84b" },
  { label: "Pending Approval", value: "Pending Approval", color: "#f1c40f" },
  { label: "Need Review", value: "Need Review", color: "#6f42c1" },
  { label: "Call Customer", value: "Call Customer", color: "#3577f1" },
  { label: "Verify Payment", value: "Verify Payment", color: "#0ab39c" },
  { label: "Send Invoice", value: "Send Invoice", color: "#0dcaf0" },
  { label: "Waiting Customer", value: "Waiting Customer", color: "#6c757d" },
  { label: "Recheck", value: "Recheck", color: "#dc3545" },
];

const toDateValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
};

const toInputDate = (dates) => {
  if (!dates || !dates[0]) return "";
  return dates[0].toISOString().slice(0, 10);
};

const getLabelValues = (card) => {
  const labels = card?.labels || [];
  const allowedLabels = labelOptions.map((option) => option.value);
  return Array.isArray(labels) ? labels.filter((label) => allowedLabels.includes(label)) : [];
};

const getCoverImageSrc = (coverImage) => {
  if (!coverImage) return "";
  if (coverImage.startsWith("data:") || coverImage.startsWith("http")) return coverImage;
  return `${api.API_URL}${coverImage}`;
};

const normalizeUser = (user) => {
  const id = user.userId || user.UserId || user.user_id || user.User_Id || user.id || user.Id;
  const name =
    user.fullName ||
    user.FullName ||
    user.full_name ||
    user.Username ||
    user.username ||
    user.email ||
    user.Email ||
    "User";

  return id ? { value: id.toString(), label: name } : null;
};

const KanbanTaskDetailsModal = ({ isOpen, toggle, card, columnId, onSave }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    title: "",
    text: "",
    priority: "Medium",
    module: "",
    assignedUserId: "",
    dueDate: "",
    startDate: "",
    labels: [],
    isPinned: false,
    coverImage: "",
    attachmentPaths: "",
    attachmentNames: "",
  });
  const [titleTouched, setTitleTouched] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [memberOptions, setMemberOptions] = useState([]);
  const [isUserLoading, setUserLoading] = useState(false);

  const [checklistItems, setChecklistItems] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newItemText, setNewItemText] = useState({});
  const [hideCompletedGroups, setHideCompletedGroups] = useState({});
  const [localGroups, setLocalGroups] = useState([]);

  useEffect(() => {
    if (!isOpen || !card?.id) {
      setChecklistItems([]);
      return;
    }

    const fetchChecklist = async () => {
      setLoadingChecklist(true);
      try {
        const response = await getKanbanChecklist(card.id);
        setChecklistItems(response || []);
      } catch (error) {
        toast.error("Unable to load checklist items.");
      } finally {
        setLoadingChecklist(false);
      }
    };

    fetchChecklist();
  }, [isOpen, card]);

  useEffect(() => {
    const uniqueGroups = Array.from(
      new Set(
        checklistItems
          .map((item) => item.checklistGroup)
          .filter(Boolean)
      )
    );
    setLocalGroups(uniqueGroups);
  }, [checklistItems]);

  useEffect(() => {
    if (!card?.id) return;
    const total = checklistItems.length;
    const completed = checklistItems.filter((i) => i.isCompleted).length;
    dispatch(
      updateCardChecklist({
        cardId: card.id,
        completedCount: completed,
        totalCount: total,
      })
    );
  }, [checklistItems, card?.id, dispatch]);

  const handleAddGroup = (e) => {
    e.preventDefault();
    const title = newGroupTitle.trim();
    if (!title) return;
    if (localGroups.includes(title)) {
      toast.warning("Checklist group already exists.");
      return;
    }
    setLocalGroups([...localGroups, title]);
    setNewGroupTitle("");
    setIsAddingGroup(false);
  };

  const handleAddItem = async (groupName) => {
    const text = newItemText[groupName]?.trim();
    if (!text) return;

    try {
      const payload = {
        kanbanTaskId: Number(card.id),
        checklistGroup: groupName,
        itemText: text,
        isCompleted: false,
        positionOrder: checklistItems.filter(
          (i) => i.checklistGroup === groupName
        ).length,
      };

      const saved = await saveKanbanChecklistItem(payload);
      setChecklistItems([...checklistItems, saved]);
      setNewItemText({ ...newItemText, [groupName]: "" });
    } catch (error) {
      toast.error("Unable to add checklist item.");
    }
  };

  const handleToggleItem = async (item) => {
    try {
      const updated = {
        ...item,
        isCompleted: !item.isCompleted,
        completedDate: !item.isCompleted ? new Date().toISOString() : null,
      };
      const saved = await saveKanbanChecklistItem(updated);
      setChecklistItems(
        checklistItems.map((i) =>
          i.checklistItemId === item.checklistItemId ? saved : i
        )
      );
    } catch (error) {
      toast.error("Unable to update checklist item.");
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteKanbanChecklistItem(itemId);
      setChecklistItems(
        checklistItems.filter((i) => i.checklistItemId !== itemId)
      );
    } catch (error) {
      toast.error("Unable to delete checklist item.");
    }
  };

  const handleDeleteGroup = async (groupName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the checklist "${groupName}" and all its items?`
      )
    ) {
      return;
    }

    try {
      await deleteKanbanChecklistGroup(card.id, groupName);
      setChecklistItems(
        checklistItems.filter((i) => i.checklistGroup !== groupName)
      );
      setLocalGroups(localGroups.filter((g) => g !== groupName));
    } catch (error) {
      toast.error("Unable to delete checklist group.");
    }
  };

  const toggleHideCompleted = (groupName) => {
    setHideCompletedGroups({
      ...hideCompletedGroups,
      [groupName]: !hideCompletedGroups[groupName],
    });
  };

  const calculateProgress = (groupName) => {
    const items = checklistItems.filter(
      (i) => i.checklistGroup === groupName
    );
    if (items.length === 0) return 0;
    const completed = items.filter((i) => i.isCompleted).length;
    return Math.round((completed / items.length) * 100);
  };

  const getProgressBarColorClass = (progress) => {
    if (progress === 100) return "bg-success";
    if (progress >= 40) return "bg-warning";
    return "bg-danger";
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setUserLoading(true);
      try {
        const companyId = localStorage.getItem("companyId");
        const response = await getUsers(companyId);
        const normalizedUsers = (response || []).map(normalizeUser).filter(Boolean);
        setMemberOptions(normalizedUsers);
      } catch (error) {
        toast.error(error || "Unable to load users.");
      } finally {
        setUserLoading(false);
      }
    };

    loadUsers();
  }, [isOpen]);

  useEffect(() => {
    if (!card) return;
    console.log("card data:👈", card); //  check what keys exist

    setForm({
      title: card.title || "",
      text: card.text || card.description || "",
      priority: card.priority || "Medium",
      module: card.module || "",
      assignedUserId: card.assignedUserId || card.userImages?.[0]?.id || "",
      dueDate: card.dueDate || card.botId || "",
      startDate: card.startDate || "",
      labels: getLabelValues(card),
      isPinned: Boolean(card.isPinned),
      coverImage: card.coverImage || "",
      attachmentPaths: card.attachmentPaths || "",
      attachmentNames: card.attachmentNames || "",
    });
    setTitleTouched(false);
    setCoverFile(null);
  }, [card]);

  const selectedMember = memberOptions.find(
    (member) => member.value?.toString() === form.assignedUserId?.toString()
  );

  const selectedLabels = labelOptions.filter((option) =>
    form.labels.includes(option.value)
  );
  const coverImageSrc = getCoverImageSrc(form.coverImage);

  const setValue = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleCoverUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setValue("coverImage", reader.result);
    reader.readAsDataURL(file);
  };

  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const handleAttachmentUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    const currentAttachments = parseAttachments(form.attachmentPaths, form.attachmentNames);

    try {
      const newPaths = [...currentAttachments.map(a => a.path)];
      const newNames = [...currentAttachments.map(a => a.name)];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const uploadResult = await uploadKanbanAttachment(formData);
        const url = uploadResult?.url || uploadResult?.Url;
        const name = uploadResult?.name || uploadResult?.Name || file.name;

        if (url) {
          newPaths.push(url);
          newNames.push(name);
        }
      }

      setForm((current) => ({
        ...current,
        attachmentPaths: JSON.stringify(newPaths),
        attachmentNames: JSON.stringify(newNames),
      }));

      toast.success("Attachment(s) uploaded successfully.");
    } catch (error) {
      toast.error(error?.message || error || "Failed to upload attachments.");
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    const currentAttachments = parseAttachments(form.attachmentPaths, form.attachmentNames);
    const updated = currentAttachments.filter((_, idx) => idx !== indexToRemove);

    const paths = updated.map(a => a.path);
    const names = updated.map(a => a.name);

    setForm((current) => ({
      ...current,
      attachmentPaths: JSON.stringify(paths),
      attachmentNames: JSON.stringify(names),
    }));

    toast.info("Attachment removed.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTitleTouched(true);

    if (!form.title.trim()) return;

    setIsSaving(true);

    try {
      let coverImageUrl = form.coverImage;

      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);

        const uploadResult = await uploadKanbanCover(formData);
        coverImageUrl = uploadResult?.url || uploadResult?.Url;

        if (!coverImageUrl) {
          throw new Error("Cover upload did not return a URL.");
        }
      } else if (coverImageUrl?.startsWith("data:image/")) {
        coverImageUrl = card?.coverImage?.startsWith("data:image/") ? "" : card?.coverImage || "";
      }

      const total = checklistItems.length;
      const completed = checklistItems.filter((i) => i.isCompleted).length;

      onSave({
        ...card,
        kanId: columnId || card?.kanId,
        title: form.title.trim(),
        text: form.text.trim(),
        priority: form.priority,
        module: form.module,
        assignedUserId: form.assignedUserId || null,
        dueDate: form.dueDate,
        startDate: form.startDate,
        labels: form.labels,
        isPinned: form.isPinned,
        coverImage: coverImageUrl,
        attachmentPaths: form.attachmentPaths,
        attachmentNames: form.attachmentNames,
        completedChecklistCount: completed,
        totalChecklistCount: total,
      });
    } catch (error) {
      toast.error(error?.message || error || "Unable to save task cover.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="xl">
      <Form onSubmit={handleSubmit} className="mb-0" id="form-task">
        <div className="modal-header p-3 bg-info-subtle d-flex align-items-center justify-content-between">

          {/* Left — Title */}
          <h5 className="modal-title mb-0 fw-semibold">Task Details</h5>

          {/* Right — Save Button + Close */}
          <div className="d-flex align-items-center gap-2">
            <Button
              type="submit"
              form="form-task"
              color="success"
              size="sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="ri-save-line align-bottom me-1"></i> Save Task
                </>
              )}
            </Button>

            <button
              type="button"
              className="btn-close m-0"
              onClick={toggle}
              aria-label="Close"
            ></button>
          </div>

        </div>

        <ModalBody>
          <Row className="g-4">
            <Col lg={8}>
              {coverImageSrc ? (
                <div className="mb-3">
                  <img
                    src={coverImageSrc}
                    alt="Task cover"
                    className="img-fluid rounded border"
                    style={{ maxHeight: "220px", width: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : null}

              <div className="mb-3">
                <Label htmlFor="kanban-task-title">Title</Label>
                <Input
                  id="kanban-task-title"
                  value={form.title}
                  invalid={titleTouched && !form.title.trim()}
                  onBlur={() => setTitleTouched(true)}
                  onChange={(event) => setValue("title", event.target.value)}
                />
                {titleTouched && !form.title.trim() ? (
                  <FormFeedback>Title is required</FormFeedback>
                ) : null}
              </div>

              <div className="mb-3">
                <Label htmlFor="kanban-task-description">Description</Label>
                <Input
                  id="kanban-task-description"
                  type="textarea"
                  rows="7"
                  value={form.text}
                  onChange={(event) => setValue("text", event.target.value)}
                />
              </div>

              {/* Checklist Section */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <i className="ri-checkbox-multiple-line text-success fs-18"></i>
                    Checklists
                  </h5>
                  {!isAddingGroup ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-soft-primary d-flex align-items-center gap-1"
                      onClick={() => setIsAddingGroup(true)}
                    >
                      <i className="ri-add-line"></i> Add Checklist Group
                    </button>
                  ) : null}
                </div>

                {isAddingGroup ? (
                  <div className="card border shadow-none mb-3 p-3 bg-light">
                    <h6 className="mb-2">Create New Checklist Group</h6>
                    <div className="d-flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. Verification, Payment, GST..."
                        value={newGroupTitle}
                        onChange={(e) => setNewGroupTitle(e.target.value)}
                        className="form-control-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={handleAddGroup}
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => {
                          setIsAddingGroup(false);
                          setNewGroupTitle("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {loadingChecklist ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <span className="ms-2 small text-muted">Loading checklists...</span>
                  </div>
                ) : localGroups.length === 0 ? (
                  <div className="text-center py-4 border border-dashed rounded bg-light text-muted">
                    <i className="ri-checkbox-blank-line fs-24 mb-2 d-block opacity-50"></i>
                    <span className="small">No checklists added yet. Create a checklist group to get started.</span>
                  </div>
                ) : (
                  localGroups.map((groupName) => {
                    const items = checklistItems.filter((i) => i.checklistGroup === groupName);
                    const progress = calculateProgress(groupName);
                    const progressBarColor = getProgressBarColorClass(progress);
                    const isHidden = hideCompletedGroups[groupName] || false;
                    const displayedItems = isHidden
                      ? items.filter((i) => !i.isCompleted)
                      : items;

                    return (
                      <div key={groupName} className="card border shadow-sm mb-4">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between py-2 px-3">
                          <h6 className="mb-0 text-dark fw-semibold d-flex align-items-center gap-2">
                            <i className="ri-list-check text-muted"></i>
                            {groupName}
                          </h6>
                          <div className="d-flex align-items-center gap-2">
                            {items.length > 0 ? (
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-decoration-none p-0 text-muted fs-12"
                                onClick={() => toggleHideCompleted(groupName)}
                              >
                                {isHidden ? "Show checked items" : "Hide checked items"}
                              </button>
                            ) : null}
                            {items.length > 0 ? <span className="text-muted mx-1">|</span> : null}
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-decoration-none p-0 text-danger fs-12"
                              onClick={() => handleDeleteGroup(groupName)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="card-body p-3">
                          {/* Progress bar */}
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="small fw-semibold text-muted" style={{ minWidth: "35px" }}>
                              {progress}%
                            </span>
                            <div className="progress progress-sm flex-grow-1 mb-0" style={{ height: "6px" }}>
                              <div
                                className={`progress-bar progress-bar-striped progress-bar-animated ${progressBarColor}`}
                                role="progressbar"
                                style={{ width: `${progress}%` }}
                                aria-valuenow={progress}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>

                          {/* Checklist items */}
                          <div className="checklist-items-list mb-3">
                            {displayedItems.length === 0 ? (
                              <div className="text-muted small py-2 px-1 font-italic">
                                {items.length === 0 ? "No tasks in this checklist." : "All tasks completed (hidden)."}
                              </div>
                            ) : (
                              displayedItems.map((item) => (
                                <div
                                  key={item.checklistItemId}
                                  className="d-flex align-items-center justify-content-between py-2 border-bottom border-light checklist-item-row"
                                >
                                  <div className="form-check d-flex align-items-center mb-0 gap-2">
                                    <input
                                      type="checkbox"
                                      id={`check-item-${item.checklistItemId}`}
                                      className="form-check-input cursor-pointer"
                                      checked={item.isCompleted}
                                      onChange={() => handleToggleItem(item)}
                                      style={{ width: "16px", height: "16px", marginTop: 0 }}
                                    />
                                    <label
                                      htmlFor={`check-item-${item.checklistItemId}`}
                                      className={`form-check-label cursor-pointer fs-13 mb-0 ${item.isCompleted ? "text-decoration-line-through text-muted" : "text-dark"
                                        }`}
                                    >
                                      {item.itemText}
                                    </label>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-ghost-danger btn-icon btn-sm rounded-circle"
                                    onClick={() => handleDeleteItem(item.checklistItemId)}
                                    style={{ width: "24px", height: "24px", padding: 0 }}
                                  >
                                    <i className="ri-delete-bin-line fs-12"></i>
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add Checklist Item form */}
                          <div className="d-flex gap-2 align-items-center">
                            <Input
                              type="text"
                              placeholder="Add an item..."
                              value={newItemText[groupName] || ""}
                              onChange={(e) =>
                                setNewItemText({
                                  ...newItemText,
                                  [groupName]: e.target.value,
                                })
                              }
                              className="form-control-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddItem(groupName);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAddItem(groupName)}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>


            </Col>

            <Col lg={4}>
              <div className="border rounded p-3 mb-3">
                <div className="fw-semibold mb-3">Properties</div>

                <div className="mb-3">
                  <Label>Priority</Label>
                  <Input
                    type="select"
                    value={form.priority}
                    onChange={(event) => setValue("priority", event.target.value)}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </Input>
                </div>

                <div className="mb-3">
                  <Label>Module</Label>
                  <Input
                    type="select"
                    value={form.module}
                    onChange={(event) => setValue("module", event.target.value)}
                  >
                    <option value="">Select module</option>
                    {moduleOptions.map((module) => (
                      <option key={module.value} value={module.value}>
                        {module.label}
                      </option>
                    ))}
                  </Input>
                </div>

                <div className="mb-3">
                  <Label>Assigned User</Label>
                  <Select
                    isClearable
                    isLoading={isUserLoading}
                    options={memberOptions}
                    value={selectedMember || null}
                    onChange={(option) => setValue("assignedUserId", option?.value || "")}
                  />
                </div>

                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <Label>Start Date</Label>
                      <Flatpickr
                        className="form-control"
                        value={toDateValue(form.startDate)}
                        options={{ dateFormat: "Y-m-d" }}
                        onChange={(dates) => setValue("startDate", toInputDate(dates))}
                      />
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <Label>Due Date</Label>
                      <Flatpickr
                        className="form-control"
                        value={toDateValue(form.dueDate)}
                        options={{ dateFormat: "Y-m-d" }}
                        onChange={(dates) => setValue("dueDate", toInputDate(dates))}
                      />
                    </div>
                  </Col>
                </Row>

                <div className="mb-3">
                  <Label>Labels</Label>
                  <Select
                    isMulti
                    options={labelOptions}
                    styles={{
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "transparent",
                        border: "1px solid var(--vz-border-color, #e9ebec)",
                        borderRadius: "4px",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        backgroundColor: "transparent",
                        color: "var(--vz-body-color, #495057)",
                      }),
                      multiValueRemove: (base) => ({
                        ...base,
                        backgroundColor: "transparent",
                        color: "var(--vz-body-color, #495057)",
                        ':hover': {
                          backgroundColor: "rgba(0, 0, 0, 0.05)",
                          color: "var(--vz-danger, #f06548)",
                        },
                      }),
                    }}
                    formatOptionLabel={(option) => (
                      <span className="d-flex align-items-center gap-2">
                        <span
                          className="rounded-circle"
                          style={{ backgroundColor: option.color, height: 8, width: 8 }}
                        ></span>
                        {option.label}
                      </span>
                    )}
                    value={selectedLabels}
                    onChange={(options) =>
                      setValue("labels", (options || []).map((option) => option.value))
                    }
                  />
                </div>

                <div className="form-check form-switch mb-3">
                  <Input
                    id="kanban-task-pinned"
                    type="switch"
                    checked={form.isPinned}
                    onChange={(event) => setValue("isPinned", event.target.checked)}
                  />
                  <Label htmlFor="kanban-task-pinned" className="form-check-label">
                    Pinned
                  </Label>
                </div>

                <div>
                  <Label>Cover Image</Label>
                  <Input type="file" accept="image/*" onChange={handleCoverUpload} />
                  {form.coverImage ? (
                    <button
                      type="button"
                      className="btn btn-link text-danger p-0 mt-2"
                      onClick={() => {
                        setCoverFile(null);
                        setValue("coverImage", "");
                      }}
                    >
                      Remove cover
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="border rounded p-3 bg-light">
                <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
                  <div className="fw-semibold text-muted d-flex align-items-center gap-2">
                    <i className="ri-attachment-2 text-primary fs-18"></i>
                    Attachments ({parseAttachments(form.attachmentPaths, form.attachmentNames).length})
                  </div>
                  <div>
                    <label htmlFor="kanban-attachment-upload" className="btn btn-sm btn-soft-primary mb-0 cursor-pointer d-flex align-items-center gap-1 py-1 px-2">
                      <i className="ri-upload-2-line"></i> Upload
                    </label>
                    <input
                      type="file"
                      id="kanban-attachment-upload"
                      className="d-none"
                      onChange={handleAttachmentUpload}
                      multiple
                    />
                  </div>
                </div>

                {isUploadingAttachment && (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <span className="ms-2 small text-muted">Uploading...</span>
                  </div>
                )}

                {parseAttachments(form.attachmentPaths, form.attachmentNames).length === 0 ? (
                  <div className="small text-muted mt-2">No attachments yet. Upload invoice, receipt or screenshot.</div>
                ) : (
                  <div className="mt-2" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    {parseAttachments(form.attachmentPaths, form.attachmentNames).map((att, idx) => {
                      const fileExt = att.name.split(".").pop().toLowerCase();
                      let iconClass = "ri-file-line text-muted";
                      if (["jpg", "jpeg", "png", "webp", "gif"].includes(fileExt)) {
                        iconClass = "ri-image-line text-success";
                      } else if (fileExt === "pdf") {
                        iconClass = "ri-file-pdf-line text-danger";
                      } else if (["doc", "docx"].includes(fileExt)) {
                        iconClass = "ri-file-word-line text-primary";
                      } else if (["xls", "xlsx"].includes(fileExt)) {
                        iconClass = "ri-file-excel-line text-success";
                      } else if (["zip", "rar"].includes(fileExt)) {
                        iconClass = "ri-file-zip-line text-warning";
                      }

                      return (
                        <div key={idx} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-white rounded border shadow-none">
                          <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                            <i className={`${iconClass} fs-18 flex-shrink-0`}></i>
                            <a
                              href={att.path.startsWith("http") || att.path.startsWith("data:") ? att.path : `${api.API_URL}${att.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-body fw-medium text-truncate fs-13 hover-primary"
                              title={att.name}
                            >
                              {att.name}
                            </a>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost-danger btn-icon btn-sm flex-shrink-0"
                            onClick={() => handleRemoveAttachment(idx)}
                            style={{ width: "24px", height: "24px", padding: 0 }}
                            title="Remove attachment"
                          >
                            <i className="ri-close-line fs-14"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </ModalBody>
      </Form>
    </Modal>
  );
};

export default KanbanTaskDetailsModal;
