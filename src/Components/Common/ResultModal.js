import React from 'react';
import { Modal, ModalBody, Button } from 'reactstrap';

const ResultModal = ({ show, onCloseClick, title, message, type = "error" }) => {
    // Select icon based on type
    const iconSrc = type === "success" 
        ? "https://cdn.lordicon.com/lupuorrc.json" // Success checkmark
        : "https://cdn.lordicon.com/tdrtiskw.json"; // Error cross

    const iconColors = type === "success"
        ? "primary:#10c469,secondary:#0ab39c"
        : "primary:#f06548,secondary:#f7b84b";

    return (
        <Modal fade={true} isOpen={show} toggle={onCloseClick} centered modalClassName="zoomIn">
            <ModalBody className="text-center p-5">
                <lord-icon
                    src={iconSrc}
                    trigger="loop"
                    colors={iconColors}
                    style={{ width: "120px", height: "120px" }}
                ></lord-icon>
                <div className="mt-4">
                    <h4 className="mb-3">{title || (type === "success" ? "Success!" : "Error!")}</h4>
                    <p className="text-muted mb-4 fs-14">
                        {message}
                    </p>
                    <div className="hstack gap-2 justify-content-center">
                        <Button
                            color={type === "success" ? "success" : "danger"}
                            className="btn w-sm"
                            onClick={onCloseClick}
                        >
                            {type === "success" ? "Great!" : "Close"}
                        </Button>
                    </div>
                </div>
            </ModalBody>
        </Modal>
    );
};

export default ResultModal;
