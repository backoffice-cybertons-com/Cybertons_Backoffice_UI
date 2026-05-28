import apiClient from './apiClient';



export const getAuthUserId = () => {

  const authUser = localStorage.getItem('authUser');

  if (authUser) {

    try {

      const parsed = JSON.parse(authUser);

      const userObj = parsed.user || parsed.User || parsed;

      return userObj.id || userObj.Id || userObj.ID || null;

    } catch {

      return null;

    }

  }

  return null;

};



export const getAllAnnouncements = () =>

  apiClient.get('/api/announcements/all');



export const createAnnouncement = (payload) =>

  apiClient.post('/api/announcements/create', payload);



export const updateAnnouncement = (announcementId, payload) =>

  apiClient.put(`/api/announcements/${announcementId}`, payload);



export const deleteAnnouncement = (announcementId) =>

  apiClient.delete(`/api/announcements/${announcementId}`);



export const setAnnouncementActive = (announcementId, isActive) =>

  apiClient.patch(`/api/announcements/${announcementId}/active`, { isActive });



export const getAnnouncementById = (announcementId) =>

  apiClient.get(`/api/announcements/${announcementId}`);



export const getLatestAnnouncement = () => {

  const userId = getAuthUserId();

  return apiClient.get('/api/announcements/latest', {

    params: userId ? { userId } : {},

  });

};



export const markAnnouncementSeen = (announcementId) => {

  const userId = getAuthUserId();

  return apiClient.post(

    '/api/announcements/seen',

    { announcementId },

    { params: userId ? { userId } : {} }

  );

};


