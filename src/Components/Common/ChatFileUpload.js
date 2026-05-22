import React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "reactstrap";

const ChatFileUpload = ({ showModal, setShowModal }) => {
  return (
    <Modal isOpen={showModal} toggle={() => setShowModal(false)}>
      <ModalHeader toggle={() => setShowModal(false)}>
        File Too Large
      </ModalHeader>

      <ModalBody>
        File size exceeds 2MB limit.
      </ModalBody>

      <ModalFooter>
        <Button color="primary" onClick={() => setShowModal(false)}>
          OK
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ChatFileUpload;