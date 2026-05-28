import React, { useEffect, useState } from 'react';

import {

  Offcanvas,

  OffcanvasHeader,

  OffcanvasBody,

  Form,

  FormGroup,

  Label,

  Input,

  Button,

  FormFeedback,

  Row,

  Col,

} from 'reactstrap';



export const INITIAL_ANNOUNCEMENT_FORM = {

  title: '',

  shortMessage: '',

  fullMessage: '',

  youtubeUrl: '',

  buttonText: '',

  buttonLink: '',

  startsAt: '',

  expiresAt: '',

  isActive: true,

};



const toDatetimeLocal = (value) => {

  if (!value) return '';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

};



export const mapAnnouncementToForm = (item) => ({

  title: item?.title ?? item?.Title ?? '',

  shortMessage: item?.shortMessage ?? item?.ShortMessage ?? '',

  fullMessage: item?.fullMessage ?? item?.FullMessage ?? '',

  youtubeUrl: item?.youtubeUrl ?? item?.YoutubeUrl ?? '',

  buttonText: item?.buttonText ?? item?.ButtonText ?? '',

  buttonLink: item?.buttonLink ?? item?.ButtonLink ?? '',

  startsAt: toDatetimeLocal(item?.startsAt ?? item?.StartsAt),

  expiresAt: toDatetimeLocal(item?.expiresAt ?? item?.ExpiresAt),

  isActive: item?.isActive ?? item?.IsActive ?? true,

});



export const buildAnnouncementPayload = (form) => ({

  title: form.title.trim(),

  shortMessage: form.shortMessage.trim() || null,

  fullMessage: form.fullMessage.trim() || null,

  youtubeUrl: form.youtubeUrl.trim() || null,

  buttonText: form.buttonText.trim() || null,

  buttonLink: form.buttonLink.trim() || null,

  startsAt: new Date(form.startsAt).toISOString(),

  expiresAt: new Date(form.expiresAt).toISOString(),

  isActive: form.isActive,

});



const AnnouncementFormDrawer = ({

  isOpen,

  mode,

  initialData,

  submitting,

  onClose,

  onSubmit,

}) => {

  const [form, setForm] = useState(INITIAL_ANNOUNCEMENT_FORM);

  const [errors, setErrors] = useState({});



  useEffect(() => {

    if (!isOpen) return;

    if (mode === 'edit' && initialData) {

      setForm(mapAnnouncementToForm(initialData));

    } else {

      setForm(INITIAL_ANNOUNCEMENT_FORM);

    }

    setErrors({});

  }, [isOpen, mode, initialData]);



  const handleChange = (e) => {

    const { name, value, type, checked } = e.target;

    setForm((prev) => ({

      ...prev,

      [name]: type === 'checkbox' ? checked : value,

    }));

    if (errors[name]) {

      setErrors((prev) => ({ ...prev, [name]: '' }));

    }

  };



  const validate = () => {

    const next = {};

    if (!form.title.trim()) next.title = 'Title is required.';

    if (!form.startsAt) next.startsAt = 'Start date is required.';

    if (!form.expiresAt) next.expiresAt = 'Expiry date is required.';

    if (form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {

      next.expiresAt = 'Expiry must be after start date.';

    }

    setErrors(next);

    return Object.keys(next).length === 0;

  };



  const handleSubmit = (e) => {

    e.preventDefault();

    if (!validate()) return;

    onSubmit(buildAnnouncementPayload(form));

  };



  const title = mode === 'edit' ? 'Edit Announcement' : 'Create Announcement';



  return (

    <Offcanvas

      isOpen={isOpen}

      toggle={onClose}

      direction="end"

      className="announcement-admin-drawer border-0"

    >

      <OffcanvasHeader toggle={onClose} className="border-bottom">

        <span className="fw-semibold">{title}</span>

      </OffcanvasHeader>

      <OffcanvasBody className="d-flex flex-column">

        <Form onSubmit={handleSubmit} className="flex-grow-1 d-flex flex-column">

          <div className="flex-grow-1">

            <FormGroup>

              <Label for="ann-title">Title *</Label>

              <Input

                id="ann-title"

                name="title"

                value={form.title}

                onChange={handleChange}

                invalid={!!errors.title}

                placeholder="Announcement title"

              />

              {errors.title && <FormFeedback>{errors.title}</FormFeedback>}

            </FormGroup>



            <FormGroup>

              <Label for="ann-shortMessage">Short Message</Label>

              <Input

                id="ann-shortMessage"

                name="shortMessage"

                type="textarea"

                rows={2}

                value={form.shortMessage}

                onChange={handleChange}

                placeholder="Brief summary shown in notifications"

              />

            </FormGroup>



            <FormGroup>

              <Label for="ann-fullMessage">Full Message</Label>

              <Input

                id="ann-fullMessage"

                name="fullMessage"

                type="textarea"

                rows={4}

                value={form.fullMessage}

                onChange={handleChange}

                placeholder="Optional detailed message"

              />

            </FormGroup>



            <Row>

              <Col md={6}>

                {/* <FormGroup>

                  <Label for="ann-youtubeUrl">YouTube URL</Label>

                  <Input

                    id="ann-youtubeUrl"

                    name="youtubeUrl"

                    value={form.youtubeUrl}

                    onChange={handleChange}

                    placeholder="https://youtube.com/..."

                  />

                </FormGroup> */}
                <Label for="ann-buttonLink">Button Link</Label>

                <Input

                  id="ann-buttonLink"

                  name="buttonLink"

                  value={form.buttonLink}

                  onChange={handleChange}

                  placeholder="/dashboard or /sales-order"

                />

              </Col>

              <Col md={6}>

                <FormGroup>

                  <Label for="ann-buttonText">Button Text</Label>

                  <Input

                    id="ann-buttonText"

                    name="buttonText"

                    value={form.buttonText}

                    onChange={handleChange}

                    placeholder="Try Now"

                  />

                </FormGroup>

              </Col>

            </Row>



            <FormGroup>
              <FormGroup>

                <Label for="ann-youtubeUrl">YouTube URL</Label>

                <Input

                  id="ann-youtubeUrl"

                  name="youtubeUrl"

                  value={form.youtubeUrl}

                  onChange={handleChange}

                  placeholder="https://youtube.com/..."

                />

              </FormGroup>
              {/* <Label for="ann-buttonLink">Button Link</Label>

              <Input

                id="ann-buttonLink"

                name="buttonLink"

                value={form.buttonLink}

                onChange={handleChange}

                placeholder="/dashboard or /sales-order"

              /> */}

            </FormGroup>



            <Row>

              <Col md={6}>

                <FormGroup>

                  <Label for="ann-startsAt">Start Date *</Label>

                  <Input

                    id="ann-startsAt"

                    name="startsAt"

                    type="datetime-local"

                    value={form.startsAt}

                    onChange={handleChange}

                    invalid={!!errors.startsAt}

                  />

                  {errors.startsAt && (

                    <FormFeedback>{errors.startsAt}</FormFeedback>

                  )}

                </FormGroup>

              </Col>

              <Col md={6}>

                <FormGroup>

                  <Label for="ann-expiresAt">Expiry Date *</Label>

                  <Input

                    id="ann-expiresAt"

                    name="expiresAt"

                    type="datetime-local"

                    value={form.expiresAt}

                    onChange={handleChange}

                    invalid={!!errors.expiresAt}

                  />

                  {errors.expiresAt && (

                    <FormFeedback>{errors.expiresAt}</FormFeedback>

                  )}

                </FormGroup>

              </Col>

            </Row>



            <FormGroup check className="mb-3">

              <Input

                id="ann-isActive"

                name="isActive"

                type="checkbox"

                checked={form.isActive}

                onChange={handleChange}

              />

              <Label check for="ann-isActive" className="ms-1">

                Active

              </Label>

            </FormGroup>

          </div>



          <div className="d-flex gap-2 pt-3 border-top mt-auto">

            <Button color="light" type="button" onClick={onClose} disabled={submitting}>

              Cancel

            </Button>

            <Button color="primary" type="submit" disabled={submitting}>

              {submitting

                ? 'Saving...'

                : mode === 'edit'

                  ? 'Save Changes'

                  : 'Create Announcement'}

            </Button>

          </div>

        </Form>

      </OffcanvasBody>

    </Offcanvas>

  );

};



export default AnnouncementFormDrawer;


