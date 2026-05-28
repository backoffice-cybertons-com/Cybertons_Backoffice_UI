import React from 'react';
import { Modal, ModalBody, Button } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { markAnnouncementSeen } from '../../services/api/announcementService';
import './AnnouncementModal.css';

const AnnouncementModal = ({ isOpen, announcement, onClose }) => {
  const navigate = useNavigate();

  if (!announcement) return null;

  const announcementId =
    announcement.announcementId ?? announcement.AnnouncementId;
  const title = announcement.title ?? announcement.Title ?? '';
  const shortMessage =
    announcement.shortMessage ?? announcement.ShortMessage ?? '';
  const fullMessage =
    announcement.fullMessage ?? announcement.FullMessage ?? '';
  const youtubeUrl =
    announcement.youtubeUrl ?? announcement.YoutubeUrl ?? '';
  const buttonText =
    announcement.buttonText ?? announcement.ButtonText ?? 'Try Now';
  const buttonLink =
    announcement.buttonLink ?? announcement.ButtonLink ?? '';

  const handleMarkSeen = () => {
    if (announcementId) {
      markAnnouncementSeen(announcementId).catch(() => {});
    }
  };

  const handleClose = () => {
    handleMarkSeen();
    onClose?.();
  };

  const handleWatchDemo = () => {
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTryNow = () => {
    handleMarkSeen();
    onClose?.();
    if (buttonLink) {
      if (buttonLink.startsWith('http://') || buttonLink.startsWith('https://')) {
        window.location.href = buttonLink;
      } else {
        navigate(buttonLink.startsWith('/') ? buttonLink : `/${buttonLink}`);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={handleClose}
      centered
      className="announcement-modal"
      backdrop="static"
    >
      <ModalBody>
        <span className="announcement-modal__badge">What&apos;s new</span>
        <h4 className="announcement-modal__title">{title}</h4>
        {shortMessage && (
          <p className="announcement-modal__short">{shortMessage}</p>
        )}
        {fullMessage && (
          <p className="announcement-modal__full">{fullMessage}</p>
        )}

        <div className="announcement-modal__actions">
          {youtubeUrl && (
            <Button color="soft-primary" onClick={handleWatchDemo}>
              <i className="bx bx-play-circle me-1" />
              Watch Demo
            </Button>
          )}
          {buttonLink && (
            <Button color="primary" onClick={handleTryNow}>
              {buttonText}
            </Button>
          )}
          <Button
            className="btn-close-modal"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default AnnouncementModal;
