import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTemplates, deleteTemplate } from "../../slices/calendar/thunk";
import { Draggable } from "@fullcalendar/interaction";
import { Button } from "reactstrap";
import TemplateModal from "./TemplateModal";
import DeleteModal from "../../Components/Common/DeleteModal";

const TaskTemplates = ({ onDrag }) => {
  const dispatch = useDispatch();
  const { templates, users } = useSelector((state) => state.Calendar);
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const externalEventsRef = useRef(null);
  const draggableRef = useRef(null);

  // Initialize FullCalendar Draggable on the external-events container
  useEffect(() => {
    if (externalEventsRef.current && !draggableRef.current) {
      draggableRef.current = new Draggable(externalEventsRef.current, {
        itemSelector: ".external-event",
      });
    }
    return () => {
      if (draggableRef.current) {
        draggableRef.current.destroy();
        draggableRef.current = null;
      }
    };
  }, []);

  const toggleModal = () => setModal(!modal);

  const handleDelete = (id) => {
    setTemplateToDelete(id);
    setDeleteModal(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      dispatch(deleteTemplate(templateToDelete));
      setDeleteModal(false);
      setTemplateToDelete(null);
    }
  };


  const getBadgeColor = (colorClass) => {
    if (!colorClass) return "info";
    return colorClass.replace("bg-", "").replace("-subtle", "");
  };

  return (
    <React.Fragment>
      <div className="mt-4">
        <div className="d-flex align-items-center mb-3">
          <h5 className="flex-grow-1 mb-0">Task Templates</h5>
          <button
            className="btn btn-soft-info btn-sm"
            onClick={toggleModal}
          >
            <i className="mdi mdi-plus me-1"></i> Add
          </button>
        </div>

        <p className="text-muted mb-3">Drag and drop your event or click in the calendar</p>

        <div 
            id="external-events" 
            ref={externalEventsRef}
            style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}
            className="custom-scrollbar"
        >
          {templates && templates.length > 0 ? (
            templates.map((template) => {
              const color = template.template_color || template.templateColor || 'bg-info-subtle';
              const textColor = getBadgeColor(color);
              
              return (
                <div
                  className={`${color} external-event p-2 px-3 mb-2 rounded cursor-move text-${textColor} d-flex align-items-center justify-content-between`}
                  key={"template-" + (template.template_id || template.templateId)}
                  draggable
                  data-template={JSON.stringify(template)}
                  onDrag={(event) => {
                    onDrag(event);
                  }}
                  style={{ border: 'none', transition: 'all 0.2s ease' }}
                >

                  <div className="text-truncate fw-medium">
                    <i className={`mdi mdi-checkbox-blank-circle font-size-11 me-2 text-${textColor}`} />
                    {template.template_name || template.templateName}
                  </div>
                  <i 
                    className="mdi mdi-delete-outline text-danger cursor-pointer ms-2 fs-16 delete-btn"
                    style={{ opacity: 0.6 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(template.template_id || template.templateId);
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-center py-3 text-muted">
              <p className="mb-0">No templates found.</p>
              <small>Create one to speed up your workflow.</small>
            </div>
          )}
        </div>
      </div>

      <TemplateModal 
        isOpen={modal} 
        toggle={toggleModal} 
        users={users} 
      />

      <DeleteModal
        show={deleteModal}
        onDeleteClick={confirmDelete}
        onCloseClick={() => setDeleteModal(false)}
      />
    </React.Fragment>
  );
};


export default TaskTemplates;
