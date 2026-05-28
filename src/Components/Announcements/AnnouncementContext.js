import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  getAnnouncementById,
  markAnnouncementSeen,
} from '../../services/api/announcementService';
import AnnouncementDrawer from './AnnouncementDrawer';

const AnnouncementContext = createContext(null);

export const useAnnouncement = () => {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) {
    throw new Error('useAnnouncement must be used within AnnouncementProvider');
  }
  return ctx;
};

const getAnnouncementId = (item) =>
  item?.announcementId ?? item?.AnnouncementId ?? null;

export const AnnouncementProvider = ({ children }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const openAnnouncement = useCallback(async (announcementId) => {
    if (!announcementId) return;

    setLoading(true);
    setIsOpen(true);

    try {
      const response = await getAnnouncementById(announcementId);
      const data = response.data?.data;
      if (data) {
        setAnnouncement(data);
        const id = getAnnouncementId(data);
        if (id) {
          markAnnouncementSeen(id).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to load announcement:', err);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeAnnouncement = useCallback(() => {
    setIsOpen(false);
    setAnnouncement(null);
  }, []);

  return (
    <AnnouncementContext.Provider
      value={{ openAnnouncement, closeAnnouncement, isOpen }}
    >
      {children}
      <AnnouncementDrawer
        isOpen={isOpen}
        loading={loading}
        announcement={announcement}
        onClose={closeAnnouncement}
      />
    </AnnouncementContext.Provider>
  );
};

export default AnnouncementContext;
