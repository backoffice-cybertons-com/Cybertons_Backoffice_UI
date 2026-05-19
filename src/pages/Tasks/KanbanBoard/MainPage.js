import React, { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Col,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Form,
  FormFeedback,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Row,
  UncontrolledDropdown,
} from "reactstrap";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createSelector } from "reselect";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import SimpleBar from "simplebar-react";

import DeleteModal from "../../../Components/Common/DeleteModal";
import Spinners from "../../../Components/Common/Spinner";
import { api } from "../../../config";
import {
  addCardData as onAddCardData,
  deleteKanban as onDeleteKanban,
  getTasks as onGetTasks,
  updateCardData as onUpdateCardData,
  deleteKanbanColumn as onDeleteKanbanColumn,
} from "../../../slices/thunks";
import KanbanQuickAddCard from "./KanbanQuickAddCard";
import KanbanTaskDetailsModal from "./KanbanTaskDetailsModal";
import avatar1 from "../../../assets/images/users/avatar-1.jpg";
import avatar2 from "../../../assets/images/users/avatar-2.jpg";
import avatar3 from "../../../assets/images/users/avatar-3.jpg";
import avatar4 from "../../../assets/images/users/avatar-4.jpg";
import avatar5 from "../../../assets/images/users/avatar-5.jpg";
import avatar6 from "../../../assets/images/users/avatar-6.jpg";
import avatar7 from "../../../assets/images/users/avatar-7.jpg";
import avatar8 from "../../../assets/images/users/avatar-8.jpg";
import avatar9 from "../../../assets/images/users/avatar-9.jpg";
import avatar10 from "../../../assets/images/users/avatar-10.jpg";

const avatarMap = {
  "avatar-1.jpg": avatar1,
  "avatar-2.jpg": avatar2,
  "avatar-3.jpg": avatar3,
  "avatar-4.jpg": avatar4,
  "avatar-5.jpg": avatar5,
  "avatar-6.jpg": avatar6,
  "avatar-7.jpg": avatar7,
  "avatar-8.jpg": avatar8,
  "avatar-9.jpg": avatar9,
  "avatar-10.jpg": avatar10,
};

const getAvatarImage = (imgSrc) => {
  if (!imgSrc) return "";
  const parts = imgSrc.split("/");
  const filename = parts[parts.length - 1]; // e.g. "avatar-1.jpg"
  return avatarMap[filename] || imgSrc;
};

const getDueDate = (card) => card?.dueDate || card?.botId || "";

const getAttachmentCount = (card) => {
  if (!card?.attachmentPaths) return 0;
  try {
    if (card.attachmentPaths.trim().startsWith("[")) {
      const parsed = JSON.parse(card.attachmentPaths);
      return Array.isArray(parsed) ? parsed.filter(Boolean).length : 0;
    } else {
      return card.attachmentPaths.split(",").map(p => p.trim()).filter(Boolean).length;
    }
  } catch (e) {
    return 0;
  }
};

const priorityStyles = {
  High: { backgroundColor: "#dc3545", color: "#fff" },
  Medium: { backgroundColor: "#3577f1", color: "#fff" },
  Low: { backgroundColor: "#6c757d", color: "#fff" },
};

const moduleStyles = {
  Sales: { backgroundColor: "#0dcaf0", color: "#000" },
  Purchase: { backgroundColor: "#6f42c1", color: "#fff" },
  Accounts: { backgroundColor: "#405189", color: "#fff" },
  Payment: { backgroundColor: "#0ab39c", color: "#fff" },
  GST: { backgroundColor: "#d63384", color: "#fff" },
  Inventory: { backgroundColor: "#20c997", color: "#000" },
};

const labelStyles = {
  "Follow Up": { backgroundColor: "#f7b84b", color: "#000" },
  "Pending Approval": { backgroundColor: "#f1c40f", color: "#000" },
  "Need Review": { backgroundColor: "#6f42c1", color: "#fff" },
  "Call Customer": { backgroundColor: "#3577f1", color: "#fff" },
  "Verify Payment": { backgroundColor: "#0ab39c", color: "#fff" },
  "Send Invoice": { backgroundColor: "#0dcaf0", color: "#000" },
  "Waiting Customer": { backgroundColor: "#6c757d", color: "#fff" },
  Recheck: { backgroundColor: "#dc3545", color: "#fff" },
};

const getLabels = (card) => {
  const labels = card?.labels || [];
  return Array.isArray(labels) ? labels.filter((label) => labelStyles[label]) : [];
};

const getCoverImageSrc = (coverImage) => {
  if (!coverImage) return "";
  if (coverImage.startsWith("data:") || coverImage.startsWith("http")) return coverImage;
  return `${api.API_URL}${coverImage}`;
};

const TasksKanban = () => {
  const dispatch = useDispatch();
  const [cards, setCards] = useState([]);
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const matchesSearch = (card) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    const title = (card.title || "").toLowerCase();
    const description = (card.text || card.description || "").toLowerCase();
    const module = (card.module || "").toLowerCase();
    
    const labels = Array.isArray(card.labels)
      ? card.labels.map((l) => l.toLowerCase())
      : Array.isArray(card.badge1)
      ? card.badge1.map((l) => l.toLowerCase())
      : [];

    return (
      title.includes(query) ||
      description.includes(query) ||
      module.includes(query) ||
      labels.some((l) => l.includes(query))
    );
  };
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(""); // "card" or "column"
  const [itemToDelete, setItemToDelete] = useState(null);

  const selectLayoutState = (state) => state.Tasks;
  const tasksSelector = createSelector(selectLayoutState, (state) => ({
    tasks: state.tasks,
    loading: state.loading,
  }));

  const { tasks, loading } = useSelector(tasksSelector);
  const [isLoading, setLoading] = useState(loading);

  useEffect(() => {
    debugger;
    dispatch(onGetTasks());
  }, [dispatch]);

  useEffect(() => {
    debugger;
    setCards(Array.isArray(tasks) ? tasks : []);
  }, [tasks]);

  const columnFormik = useFormik({
    initialValues: {
      name: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Please enter a column name"),
    }),
    onSubmit: (values) => {
      dispatch(
        onAddCardData({
          name: values.name.trim(),
          color: "primary",
          cards: [],
        })
      );
      columnFormik.resetForm();
      setColumnModalOpen(false);
    },
  });

  const handleQuickAddCard = (card) => {
    dispatch(
      onAddCardData({
        ...card,
        priority: "Medium",
        module: "",
        labels: [],
        userImages: [],
        isPinned: false,
      })
    );
  };

  const handleOpenDetails = (card, column) => {
    setSelectedCard(card);
    setSelectedColumnId(column.id);
    setDetailsOpen(true);
  };

  const handleSaveDetails = (updatedCard) => {
    dispatch(onUpdateCardData(updatedCard));
    setDetailsOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;

    if (deleteType === "card") {
      dispatch(onDeleteKanban(itemToDelete.id));
    } else if (deleteType === "column") {
      dispatch(onDeleteKanbanColumn(itemToDelete.id));
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
    setDeleteType("");
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceLine = cards.find((line) => line.id === source.droppableId);
    const destinationLine = cards.find((line) => line.id === destination.droppableId);

    if (!sourceLine || !destinationLine) return;

    const sourceCards = Array.from(sourceLine.cards || []);
    const destinationCards =
      source.droppableId === destination.droppableId
        ? sourceCards
        : Array.from(destinationLine.cards || []);
    const [movedCard] = sourceCards.splice(source.index, 1);

    if (!movedCard) return;

    destinationCards.splice(destination.index, 0, movedCard);

    const updatedLines = cards.map((line) => {
      if (line.id === source.droppableId) {
        return { ...line, cards: sourceCards };
      }
      if (line.id === destination.droppableId) {
        return { ...line, cards: destinationCards };
      }
      return line;
    });

    setCards(updatedLines);
    dispatch(
      onUpdateCardData({
        ...movedCard,
        kanId: destination.droppableId,
        position: destination.index + 1,
      })
    );
  };

  return (
    <React.Fragment>
      <DeleteModal
        show={deleteModalOpen}
        onDeleteClick={handleDeleteConfirm}
        onCloseClick={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
          setDeleteType("");
        }}
      />

      <Card>
        <CardBody>
          <Row className="g-2 align-items-center">
            <Col lg="auto">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setColumnModalOpen(true)}
              >
                <i className="ri-add-line align-bottom me-1"></i>
                Add Column
              </button>
            </Col>
            <Col lg={4}>
              <div className="search-box">
                <Input
                  type="text"
                  className="form-control search"
                  id="search-task-options"
                  placeholder="Search project tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <i className="ri-search-line search-icon"></i>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <div className="tasks-board mb-3 d-flex" id="kanbanboard">
        {isLoading ? (
          <Spinners setLoading={setLoading} />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {(cards || []).map((line) => (
              <div className="tasks-list" key={line.id}>
                <div className="d-flex mb-3">
                  <div className="flex-grow-1">
                    <h6 className="fs-14 text-uppercase fw-semibold mb-0">
                      {line.name}
                      <small className={`badge bg-${line.color || "primary"} align-bottom ms-1`}>
                        {searchQuery ? (line.cards || []).filter(matchesSearch).length : (line.cards || []).length}
                      </small>
                    </h6>
                  </div>
                  <div className="flex-shrink-0">
                    <UncontrolledDropdown className="card-header-dropdown float-end">
                      <DropdownToggle className="text-reset dropdown-btn" tag="a" style={{ cursor: "pointer" }}>
                        <i className="ri-more-fill fs-17"></i>
                      </DropdownToggle>
                      <DropdownMenu className="dropdown-menu-end">
                        <DropdownItem
                          className="text-danger"
                          onClick={() => {
                            setItemToDelete(line);
                            setDeleteType("column");
                            setDeleteModalOpen(true);
                          }}
                        >
                          <i className="ri-delete-bin-line align-bottom me-1"></i> Delete Column
                        </DropdownItem>
                      </DropdownMenu>
                    </UncontrolledDropdown>
                  </div>
                </div>

                <SimpleBar className="tasks-wrapper px-3 mx-n3">
                  <Droppable droppableId={line.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={(line.cards || []).filter(matchesSearch).length ? "tasks" : "tasks noTask"}
                      >
                        {(line.cards || []).filter(matchesSearch).map((card, index) => {
                          const labels = getLabels(card);
                          const dueDate = getDueDate(card);
                          const coverImageSrc = getCoverImageSrc(card.coverImage);

                          return (
                            <Draggable key={card.id} draggableId={card.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="pb-1 task-list"
                                >
                                  <Card className="task-box shadow-sm">
                                    {coverImageSrc ? (
                                      <img
                                        src={coverImageSrc}
                                        alt="Task cover"
                                        className="card-img-top"
                                        style={{ height: "120px", objectFit: "cover" }}
                                      />
                                    ) : null}
                                    <CardBody
                                      role="button"
                                      onClick={() => handleOpenDetails(card, line)}
                                    >
                                      <div className="d-flex align-items-start mb-2">
                                        <div className="flex-grow-1">
                                          <h6 className="fs-15 mb-1 task-title">
                                            <Link to="#" className="text-body">
                                              {card.title || "Untitled task"}
                                            </Link>
                                          </h6>
                                          {card.isPinned ? (
                                            <span className="badge bg-warning-subtle text-warning">
                                              <i className="ri-pushpin-line align-bottom me-1"></i>
                                              Pinned
                                            </span>
                                          ) : null}
                                        </div>
                                        <UncontrolledDropdown
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <DropdownToggle className="arrow-none" tag="a">
                                            <i className="ri-more-fill"></i>
                                          </DropdownToggle>
                                          <DropdownMenu className="dropdown-menu-end">
                                            <DropdownItem
                                              onClick={() => handleOpenDetails(card, line)}
                                            >
                                              Open Details
                                            </DropdownItem>
                                            <DropdownItem
                                              className="text-danger"
                                              onClick={() => {
                                                setItemToDelete(card);
                                                setDeleteType("card");
                                                setDeleteModalOpen(true);
                                              }}
                                            >
                                              Delete
                                            </DropdownItem>
                                          </DropdownMenu>
                                        </UncontrolledDropdown>
                                      </div>

                                      {card.text ? (
                                        <p className="text-muted mb-2">{card.text}</p>
                                      ) : null}

                                      <div className="d-flex flex-wrap gap-2 mb-2">
                                        {labels.map((label) => {
                                          const styleInfo = labelStyles[label] || labelStyles["Waiting Customer"];
                                          return (
                                            <span
                                              key={label}
                                              className="d-inline-flex align-items-center gap-1 text-muted fs-12 fw-medium"
                                              style={{ background: "none", border: "none", padding: 0 }}
                                            >
                                              <span
                                                className="rounded-circle"
                                                style={{
                                                  backgroundColor: styleInfo.backgroundColor,
                                                  height: "8px",
                                                  width: "8px",
                                                  display: "inline-block",
                                                  flexShrink: 0
                                                }}
                                              ></span>
                                              {label}
                                            </span>
                                          );
                                        })}
                                      </div>

                                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                        <span
                                          className="badge"
                                          style={priorityStyles[card.priority] || priorityStyles.Medium}
                                        >
                                          {card.priority || "Medium"}
                                        </span>
                                        {card.module ? (
                                          <span
                                            className="badge"
                                            style={moduleStyles[card.module] || moduleStyles.Accounts}
                                          >
                                            {card.module}
                                          </span>
                                        ) : null}
                                      </div>

                                      <hr className="my-2" style={{ borderTop: "1px dashed var(--vz-border-color)" }} />

                                      <div className="d-flex align-items-center gap-2 flex-wrap">
                                        {dueDate ? (
                                          <span className="text-muted small" title={`Due Date: ${dueDate}`}>
                                            <i className="ri-calendar-line align-bottom me-1 text-primary"></i>
                                            {dueDate}
                                          </span>
                                        ) : null}
                                        {getAttachmentCount(card) > 0 ? (
                                          <span className="text-muted small" title={`${getAttachmentCount(card)} attachment(s)`}>
                                            <i className="ri-attachment-2 align-bottom me-1 text-info"></i>
                                            {getAttachmentCount(card)}
                                          </span>
                                        ) : null}
                                        {card.totalChecklistCount > 0 ? (
                                          <span
                                            className={`badge fs-11 d-flex align-items-center gap-1 ${
                                              card.completedChecklistCount === card.totalChecklistCount
                                                ? "bg-success-subtle text-success"
                                                : "bg-light text-muted"
                                            }`}
                                            title={`${card.completedChecklistCount}/${card.totalChecklistCount} checklist items completed`}
                                          >
                                            <i className="ri-checkbox-circle-line align-bottom text-success"></i>
                                            {card.completedChecklistCount}/{card.totalChecklistCount} ({Math.round((card.completedChecklistCount / card.totalChecklistCount) * 100)}%)
                                          </span>
                                        ) : null}
                                      </div>
                                    </CardBody>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {(line.cards || []).filter(matchesSearch).length === 0 ? (
                          <div className="text-muted small border rounded bg-light p-3 mb-2">
                            {(line.cards || []).length > 0 ? "No matching tasks." : "No cards yet."}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </Droppable>
                </SimpleBar>

                <div className="my-2 mt-0">
                  <KanbanQuickAddCard columnId={line.id} onAdd={handleQuickAddCard} />
                </div>
              </div>
            ))}
          </DragDropContext>
        )}
      </div>

      <Modal isOpen={columnModalOpen} toggle={() => setColumnModalOpen(false)} centered>
        <ModalHeader toggle={() => setColumnModalOpen(false)}>Add Column</ModalHeader>
        <ModalBody>
          <Form
            onSubmit={(event) => {
              event.preventDefault();
              columnFormik.handleSubmit();
            }}
          >
            <Label htmlFor="boardName">Column Name</Label>
            <Input
              id="boardName"
              name="name"
              placeholder="Enter column name"
              value={columnFormik.values.name}
              invalid={Boolean(columnFormik.touched.name && columnFormik.errors.name)}
              onBlur={columnFormik.handleBlur}
              onChange={columnFormik.handleChange}
            />
            {columnFormik.touched.name && columnFormik.errors.name ? (
              <FormFeedback>{columnFormik.errors.name}</FormFeedback>
            ) : null}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setColumnModalOpen(false)}
              >
                Close
              </button>
              <button type="submit" className="btn btn-success">
                Add Column
              </button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      <KanbanTaskDetailsModal
        isOpen={detailsOpen}
        toggle={() => setDetailsOpen(false)}
        card={selectedCard}
        columnId={selectedColumnId}
        onSave={handleSaveDetails}
      />
    </React.Fragment>
  );
};

export default TasksKanban;
