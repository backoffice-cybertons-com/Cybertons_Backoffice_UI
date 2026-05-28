import React from 'react';
import { Offcanvas, OffcanvasHeader, OffcanvasBody, Button, Spinner } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import './AnnouncementDrawer.css';

const AnnouncementDrawer = ({ isOpen, loading, announcement, onClose }) => {
  const navigate = useNavigate();

  const title = announcement?.title ?? announcement?.Title ?? '';
  const shortMessage =
    announcement?.shortMessage ?? announcement?.ShortMessage ?? '';
  const fullMessage =
    announcement?.fullMessage ?? announcement?.FullMessage ?? '';
  const imageUrl = announcement?.imageUrl ?? announcement?.ImageUrl ?? '';
  const youtubeUrl =
    announcement?.youtubeUrl ?? announcement?.YoutubeUrl ?? '';
  const buttonText =
    announcement?.buttonText ?? announcement?.ButtonText ?? 'Try Now';
  const buttonLink =
    announcement?.buttonLink ?? announcement?.ButtonLink ?? '';

  const handleWatchDemo = () => {
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCta = () => {
    onClose?.();
    if (!buttonLink) return;

    if (
      buttonLink.startsWith('http://') ||
      buttonLink.startsWith('https://')
    ) {
      window.open(buttonLink, '_blank', 'noopener,noreferrer');
    } else {
      navigate(buttonLink.startsWith('/') ? buttonLink : `/${buttonLink}`);
    }
  };

  return (
    <Offcanvas
      isOpen={isOpen}
      toggle={onClose}
      direction="end"
      className="announcement-drawer border-0"
    >
      <OffcanvasHeader toggle={onClose} className="announcement-drawer__header">
        <span className="announcement-drawer__badge">What&apos;s new</span>
      </OffcanvasHeader>
      <OffcanvasBody className="announcement-drawer__body">
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
          </div>
        ) : (
          <>
            {imageUrl && (
              <div className="announcement-drawer__banner mb-3">
                <img src={imageUrl} alt={title} className="img-fluid rounded" />
              </div>
            )}
            <h4 className="announcement-drawer__title">{title}</h4>
            {shortMessage && (
              <p className="announcement-drawer__short">{shortMessage}</p>
            )}
            {fullMessage && (
              <p className="announcement-drawer__full">{fullMessage}</p>
            )}
            <div className="announcement-drawer__actions">
              {youtubeUrl && (
                <Button color="soft-primary" onClick={handleWatchDemo}>
                  <i className="bx bx-play-circle me-1" />
                  Watch Demo
                </Button>
              )}
              {buttonLink && (
                <Button color="primary" onClick={handleCta}>
                  {buttonText}
                </Button>
              )}
            </div>
          </>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default AnnouncementDrawer;
