import React, { useCallback, useEffect, useState } from 'react';

import {

  Container,

  Card,

  CardBody,

  Table,

  Button,

  Spinner,

  Modal,

  ModalHeader,

  ModalBody,

  ModalFooter,

} from 'reactstrap';

import { toast } from 'react-toastify';

import BreadCrumb from '../../Components/Common/BreadCrumb';

import AnnouncementFormDrawer from './AnnouncementFormDrawer';

import {

  getAllAnnouncements,

  createAnnouncement,

  updateAnnouncement,

  deleteAnnouncement,

  setAnnouncementActive,

  getAnnouncementById,

} from '../../services/api/announcementService';

import './SystemAnnouncements.css';



const getId = (item) => item?.announcementId ?? item?.AnnouncementId ?? null;



const computeAnnouncementStatus = (row) => {

  const status = row?.status ?? row?.Status;

  if (status) return status.toUpperCase();



  // Fallback if status is not returned by DB

  const isDeleted =

    row?.isDeleted ?? row?.IsDeleted ?? row?.deleteFlag ?? row?.DeleteFlag ?? false;

  const isActive = row?.isActive ?? row?.IsActive ?? false;

  const startsAt = row?.startsAt ?? row?.StartsAt ?? null;

  const expiresAt = row?.expiresAt ?? row?.ExpiresAt ?? null;

  const now = new Date();



  if (isDeleted) return 'DELETED';

  if (expiresAt && new Date(expiresAt) < now) return 'EXPIRED';

  if (startsAt && new Date(startsAt) > now) return 'SCHEDULED';

  if (isActive) return 'ACTIVE';



  return 'INACTIVE';

};



const STATUS_META = {

  ACTIVE:    { label: 'Active',    css: 'active' },

  INACTIVE:  { label: 'Inactive',  css: 'inactive' },

  EXPIRED:   { label: 'Expired',   css: 'expired' },

  SCHEDULED: { label: 'Scheduled', css: 'scheduled' },

  DELETED:   { label: 'Deleted',   css: 'deleted' },

};



const formatDate = (value) => {

  if (!value) return '—';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString(undefined, {

    year: 'numeric',

    month: 'short',

    day: 'numeric',

    hour: '2-digit',

    minute: '2-digit',

  });

};



const SystemAnnouncements = () => {

  document.title = 'System Announcements | SoftBook';



  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [drawerMode, setDrawerMode] = useState('create');

  const [editingItem, setEditingItem] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [actionLoadingId, setActionLoadingId] = useState(null);



  const loadAnnouncements = useCallback(async () => {

    setLoading(true);

    try {

      const response = await getAllAnnouncements();

      const data = response?.data?.data ?? response?.data ?? [];

      setAnnouncements(Array.isArray(data) ? data : []);

    } catch (err) {

      const message =

        err.response?.data?.message ||

        err.message ||

        'Failed to load announcements.';

      toast.error(message, { autoClose: 4000 });

      setAnnouncements([]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    loadAnnouncements();

  }, [loadAnnouncements]);



  const openCreateDrawer = () => {

    setDrawerMode('create');

    setEditingItem(null);

    setDrawerOpen(true);

  };



  const openEditDrawer = async (row) => {
    debugger;

    const id = getId(row);

    if (!id) return;



    setDrawerMode('edit');

    setEditingItem(row);

    setDrawerOpen(true);



    try {

      const response = await getAnnouncementById(id);

      const data = response?.data?.data ?? response?.data;

      if (data) setEditingItem(data);

    } catch {

      // Keep list row data if detail fetch fails

    }

  };



  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingItem(null);

  };



  const handleFormSubmit = async (payload) => {

    setSubmitting(true);

    try {

      if (drawerMode === 'edit') {

        const id = getId(editingItem);

        await updateAnnouncement(id, payload);

        toast.success('Announcement updated successfully.', { autoClose: 3000 });

      } else {

        await createAnnouncement(payload);

        toast.success('Announcement created successfully.', { autoClose: 3000 });

      }

      closeDrawer();

      await loadAnnouncements();

    } catch (err) {

      const message =

        err.response?.data?.message ||

        err.message ||

        (drawerMode === 'edit'

          ? 'Failed to update announcement.'

          : 'Failed to create announcement.');

      toast.error(message, { autoClose: 4000 });

    } finally {

      setSubmitting(false);

    }

  };



  const handleToggleActive = async (row) => {

    const id = getId(row);

    if (!id) return;



    const isActive = row?.isActive ?? row?.IsActive ?? false;

    const nextActive = !isActive;



    setActionLoadingId(id);

    try {

      await setAnnouncementActive(id, nextActive);

      toast.success(

        nextActive ? 'Announcement activated.' : 'Announcement deactivated.',

        { autoClose: 3000 }

      );

      await loadAnnouncements();

    } catch (err) {

      const message =

        err.response?.data?.message ||

        err.message ||

        'Failed to update announcement status.';

      toast.error(message, { autoClose: 4000 });

    } finally {

      setActionLoadingId(null);

    }

  };



  const confirmDelete = async () => {

    const id = getId(deleteTarget);

    if (!id) return;



    setActionLoadingId(id);

    try {

      await deleteAnnouncement(id);

      toast.success('Announcement deleted successfully.', { autoClose: 3000 });

      setDeleteTarget(null);

      // Optimistically mark the row as deleted in local state so the
      // "Deleted" status badge shows immediately, even if GET_ALL
      // filters out soft-deleted records.
      setAnnouncements((prev) =>
        prev.map((item) => {
          if (getId(item) !== id) return item;
          return {
            ...item,
            // normalise to camelCase so computeAnnouncementStatus picks it up
            status: 'deleted',
            isDeleted: true,
            isActive: false,
          };
        })
      );

    } catch (err) {

      const message =

        err.response?.data?.message ||

        err.message ||

        'Failed to delete announcement.';

      toast.error(message, { autoClose: 4000 });

    } finally {

      setActionLoadingId(null);

    }

  };



  return (

    <div className="page-content announcement-admin-page">

      <Container fluid>

        <BreadCrumb title="System Announcements" pageTitle="Admin" />



        <div className="page-header-row">

          <div>

            <h4 className="page-title">Announcement Management</h4>

            <p className="page-subtitle">

              Create, edit, and control system-wide announcements and their delivery.

            </p>

          </div>

          <Button color="primary" onClick={openCreateDrawer}>

            <i className="ri-add-line align-middle me-1" />

            Create Announcement

          </Button>

        </div>



        <Card className="announcement-admin-card">

          <CardBody className="p-0">

            {loading ? (

              <div className="text-center py-5">

                <Spinner color="primary" />

              </div>

            ) : announcements.length === 0 ? (

              <div className="announcement-admin-empty">

                <i className="ri-megaphone-line" />

                <p className="mb-2 fw-medium">No announcements yet</p>

                <p className="mb-3 fs-13">

                  Create your first announcement to notify all users.

                </p>

                <Button color="primary" size="sm" onClick={openCreateDrawer}>

                  Create Announcement

                </Button>

              </div>

            ) : (

              <div className="table-responsive">

                <Table className="announcement-admin-table table-hover align-middle mb-0">

                  <thead>

                    <tr>
                      <th >Actions</th>

                      <th>Title</th>

                      <th>Short Message</th>

                      <th>Status</th>

                      <th>Start Date</th>

                      <th>Expiry Date</th>

 

                    </tr>

                  </thead>

                  <tbody>

                    {announcements.map((row) => {

                      const id = getId(row);

                      const isActive = row?.isActive ?? row?.IsActive ?? false;

                      const busy = actionLoadingId === id;

                      const status = computeAnnouncementStatus(row);

                      const { label: statusLabel, css: statusCss } = STATUS_META[status] ?? STATUS_META.INACTIVE;

                      const isDeleted = status === 'DELETED';

                      const canToggle = !isDeleted && status !== 'EXPIRED';



                      return (

                        <tr key={id}>
                               <td  >

<div className="announcement-row-actions  ">

  <Button

    color="link"

    className="text-muted p-1"

    title="Edit"

    disabled={busy || isDeleted}

    onClick={() => openEditDrawer(row)}

  >

    <i className="ri-pencil-line fs-16" />

  </Button>

  <Button

    color="link"

    className={`p-1 ${!canToggle ? 'text-muted' : isActive ? 'text-warning' : 'text-success'}`}

    title={isActive ? 'Deactivate' : 'Activate'}

    disabled={busy || !canToggle}

    onClick={() => handleToggleActive(row)}

  >

    {busy ? (

      <Spinner size="sm" />

    ) : (

      <i

        className={`fs-16 ${isActive ? 'ri-pause-circle-line' : 'ri-play-circle-line'}`}

      />

    )}

  </Button>

  <Button

    color="link"

    className={`p-1 ${isDeleted ? 'text-muted' : 'text-danger'}`}

    title="Delete"

    disabled={busy || isDeleted}

    onClick={() => setDeleteTarget(row)}

  >

    <i className="ri-delete-bin-line fs-16" />

  </Button>

</div>

</td>

                          <td className="fw-medium">

                            {row?.title ?? row?.Title ?? '—'}

                          </td>

                          <td className="col-message">

                            {row?.shortMessage ?? row?.ShortMessage ?? '—'}

                          </td>

                          <td>

                            <span className={`announcement-status-badge ${statusCss}`}>

                              {statusLabel}

                            </span>

                          </td>

                          <td>{formatDate(row?.startsAt ?? row?.StartsAt)}</td>

                          <td>{formatDate(row?.expiresAt ?? row?.ExpiresAt)}</td>

 
                     

                        </tr>

                      );

                    })}

                  </tbody>

                </Table>

              </div>

            )}

          </CardBody>

        </Card>

      </Container>



      <AnnouncementFormDrawer

        isOpen={drawerOpen}

        mode={drawerMode}

        initialData={editingItem}

        submitting={submitting}

        onClose={closeDrawer}

        onSubmit={handleFormSubmit}

      />



      <Modal isOpen={!!deleteTarget} toggle={() => !actionLoadingId && setDeleteTarget(null)} centered>

        <ModalHeader toggle={() => !actionLoadingId && setDeleteTarget(null)}>

          Delete Announcement

        </ModalHeader>

        <ModalBody>

          <p className="mb-0">

            This will deactivate &quot;

            <strong>{deleteTarget?.title ?? deleteTarget?.Title}</strong>

            &quot; and remove it from the notification bell and dropdown.

            The record will be kept for audit purposes.

          </p>

        </ModalBody>

        <ModalFooter>

          <Button

            color="light"

            onClick={() => setDeleteTarget(null)}

            disabled={!!actionLoadingId}

          >

            Cancel

          </Button>

          <Button color="danger" onClick={confirmDelete} disabled={!!actionLoadingId}>

            {actionLoadingId ? 'Deleting...' : 'Delete'}

          </Button>

        </ModalFooter>

      </Modal>

    </div>

  );

};



export default SystemAnnouncements;


