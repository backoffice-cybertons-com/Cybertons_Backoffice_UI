import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Offcanvas,
  OffcanvasBody,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
} from "reactstrap";
import Img9 from "../../assets/images/small/img-9.jpg";
import dummyImage from "../../assets/images/users/user-dummy-img.jpg";
import { api as configApi } from "../../config";

const getAttachmentUrl = (fileUrl) => {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const base = (configApi.API_URL || "").replace(/\/$/, "");
  const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${base}${path}`;
};

const Attachements = (props) => {
  const handleDownload = async () => {
    const fileUrl = props.attachement.fileUrl;
    const fileName = props.attachement.foldername;
    if (!fileUrl) return;

    const fullUrl = getAttachmentUrl(fileUrl);

    try {
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fullUrl, "_blank", "noopener,noreferrer");
    }
  };
  return (
    <div className="border rounded border-dashed p-2">
      <div className="d-flex align-items-center">
        <div className="flex-shrink-0 me-3">
          <div className="avatar-xs">
            <div className="avatar-title bg-light text-secondary rounded fs-20">
              <i className={props.attachement.foldericon}></i>
            </div>
          </div>
        </div>
        <div className="flex-grow-1 overflow-hidden">
          <h5 className="fs-13 mb-1">
            <Link to="#" className="text-body text-truncate d-block">
              {props.attachement.foldername}
            </Link>
          </h5>
          <div className="text-muted">{props.attachement.foldersize}</div>
        </div>
        <div className="flex-shrink-0 ms-2">
          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-icon text-muted btn-sm fs-18"
              onClick={handleDownload}
            >
              <i className="ri-download-2-line"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// ── Helper: show "—" when value is null / undefined / empty ──────────────────
const InfoRow = ({ label, value, icon }) => (
  <div className="mb-3">
    <p className="text-muted text-uppercase fw-medium fs-12 mb-1">
      {icon && <i className={`${icon} me-1`}></i>}
      {label}
    </p>
    <h6 className="mb-0">
      {value || <span className="text-muted fst-italic">Not provided</span>}
    </h6>
  </div>
);

// ── Role badge color map ──────────────────────────────────────────────────────
const roleBadgeClass = (roleName) => {
  if (!roleName) return "bg-secondary";
  const r = roleName.toLowerCase();
  if (r.includes("admin")) return "bg-danger";
  if (r.includes("manager")) return "bg-warning text-dark";
  if (r.includes("user")) return "bg-primary";
  return "bg-info";
};

/**
 * PersonalInfo — offcanvas panel showing the selected user's profile.
 *
 * Props:
 *   show          — boolean, controls visibility
 *   onCloseClick  — close handler
 *   currentuser   — display name (string)          [kept for compatibility]
 *   cuurentiseImg — avatar URL (string)             [kept for compatibility]
 *   selectedUser  — full user object from /api/Master/User  ← NEW
 *                   shape: { UserId, CompanyId, Username, FullName,
 *                            Email, Phone, IsActive, RoleId, RoleName, image }
 */
const PersonalInfo = ({
  show,
  onCloseClick,
  currentuser,
  cuurentiseImg,
  selectedUser,
  attachments = [],
}) => {
  const [menu1, setMenu1] = useState(false);
  const [menu2, setMenu2] = useState(false);

  // Resolve fields — fall back gracefully if selectedUser isn't passed yet
  const fullName =
    selectedUser?.FullName ||
    selectedUser?.full_name ||
    currentuser ||
    "Unknown User";
  const email = selectedUser?.Email || selectedUser?.email || null;
  const phone = selectedUser?.Phone || selectedUser?.phone || null;
  const username = selectedUser?.Username || selectedUser?.username || null;
  const roleName = selectedUser?.RoleName || selectedUser?.roleName || null;
  const isActive = selectedUser?.IsActive ?? null; // null = unknown
  const avatar = selectedUser?.image || cuurentiseImg || null;

  // Avatar initials fallback
  const initials = fullName.charAt(0).toUpperCase();

  const getFileIcon = (fileName) => {
    if (!fileName) return "ri-file-line";

    const ext = fileName.split(".").pop().toLowerCase();

    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext))
      return "ri-image-line";

    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext))
      return "ri-video-line";

    if (["pdf"].includes(ext)) return "ri-file-pdf-line";

    if (["zip", "rar"].includes(ext)) return "ri-file-zip-line";

    if (["doc", "docx"].includes(ext)) return "ri-file-word-line";

    if (["xls", "xlsx"].includes(ext)) return "ri-file-excel-line";

    if (["ppt", "pptx"].includes(ext)) return "ri-file-ppt-line";

    return "ri-file-line";
  };
  console.log("attachments render", attachments);

  return (
    <Offcanvas
      isOpen={show}
      direction="end"
      className="offcanvas-end border-0"
      toggle={onCloseClick}
    >
      <OffcanvasBody className="offcanvas-body profile-offcanvas p-0">
        <div className="team-cover">
          <img src={Img9} alt="" className="img-fluid" />
        </div>
        <div className="p-1 pb-4 pt-0">
          <div className="team-settings">
            <div className="row g-0">
              <div className="col">
                <div className="btn nav-btn">
                  <Button
                    onClick={onCloseClick}
                    color=""
                    className="btn-close btn-close-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Avatar + Name ─────────────────────────────────────────────── */}
        <div className="p-3 text-center">
          {avatar ? (
            <img
              src={avatar}
              alt={fullName}
              className="avatar-lg img-thumbnail rounded-circle mx-auto profile-img"
            />
          ) : (
            // Show initials avatar when no image is available
            <div
              className="avatar-lg mx-auto rounded-circle d-flex align-items-center justify-content-center bg-primary"
              style={{
                width: 72,
                height: 72,
                fontSize: 28,
                color: "#fff",
                border: "3px solid #fff",
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              {initials}
            </div>
          )}

          <div className="mt-3">
            <h5 className="fs-16 mb-1">
              <Link to="#" className="link-primary username">
                {fullName}
              </Link>
            </h5>

            {/* Username pill */}
            {username && <p className="text-muted fs-13 mb-1">@{username}</p>}

            {/* Role badge */}
            {roleName && (
              <span
                className={`badge ${roleBadgeClass(roleName)} fs-11 px-2 py-1`}
              >
                {roleName}
              </span>
            )}
          </div>
        </div>

        {/* ── Personal Details ──────────────────────────────────────────── */}
        <div className="border-top border-top-dashed p-3">
          <h5 className="fs-15 mb-3">Personal Details</h5>

          <InfoRow label="Full Name" value={fullName} icon="ri-user-line" />
          <InfoRow
            label="Username"
            value={username ? `@${username}` : null}
            icon="ri-at-line"
          />
          <InfoRow label="Email" value={email} icon="ri-mail-line" />
          <InfoRow label="Phone" value={phone} icon="ri-phone-line" />
          <InfoRow label="Role" value={roleName} icon="ri-shield-user-line" />
        </div>

        <div className="border-top border-top-dashed p-3">
          <h5 className="fs-15 mb-3">Attached Files</h5>
          <div className="vstack gap-2">
            {attachments.length > 0 ? (
              attachments.map((attachment, index) => {
                console.log("attachment object:", attachment); // ← add this
                return (
                  <Attachements
                    key={index}
                    attachement={{
                      foldericon: getFileIcon(
                        attachment.fileName || attachment.FileName,
                      ),
                      foldername: attachment.fileName || attachment.FileName,
                      fileUrl: attachment.fileUrl || attachment.FileUrl,
                      foldersize: new Date(
                        attachment.createdDate || attachment.CreatedDate,
                      ).toLocaleDateString(),
                    }}
                  />
                );
              })
            ) : (
              <div className="text-muted text-center py-3">
                No attachments found
              </div>
            )}
          </div>
        </div>
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default PersonalInfo;
