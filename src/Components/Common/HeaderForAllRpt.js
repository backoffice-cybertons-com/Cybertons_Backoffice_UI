import React, { useState, useEffect } from "react";
import companyLogo from "../../assets/images/softsense.jpg";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";

const api = new APIClient();

const HeaderForAllRpt = ({ reportName = "Outstanding Comparison Report" }) => {
  const [companyInfo, setCompanyInfo] = useState(null);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const response = await api.get(url.GET_COMPANY_PROFILE);
        setCompanyInfo(response?.data || response);
      } catch (err) {
        console.error("HeaderForAllRpt: Error fetching company profile:", err);
      }
    };
    fetchCompanyProfile();
  }, []);

  const companyName = companyInfo?.companyName || "";
  const companyAddress = companyInfo?.companyAddress || "";
  const companyMobile = companyInfo?.mobile || companyInfo?.phone || "";
  const companyEmail = companyInfo?.email || "";

  return (
    <>
      <style>
        {`
        @media print {
            .header-for-all-rpt {
                background: #fff !important;
                border-bottom: 1px solid #e9ebec !important;
            }
            .rpt-header-badge {
                background: #eff6ff !important;
                border: 1px solid #bfdbfe !important;
            }
            .rpt-header-badge h4 {
                color: #1e3a8a !important;
            }
        }
        `}
      </style>
      <div
        className="border-bottom mb-1 pb-1 header-for-all-rpt"
        style={{
          background: "var(--vz-card-bg, #fff)",
          borderBottom: "1px solid var(--vz-border-color, #e9ebec)",
          padding: "10px 18px",
        }}
      >
        <div className="d-flex justify-content-between align-items-start flex-wrap">

          {/* Left Side */}
          <div className="d-flex align-items-start">

            {/* Logo */}
            <img
              src={
                companyInfo?.logoPath
                  ? `${process.env.REACT_APP_API_URL}${companyInfo.logoPath}`
                  : companyLogo
              }
              alt="Company Logo"
              style={{
                width: "95px",
                height: "95px",
                objectFit: "contain",
                marginRight: "14px",
              }}
            />

            {/* Company Details */}
            <div
              style={{
                height: "95px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingBottom: "2px",
              }}
            >
              <h5
                style={{
                  margin: 0,
                  fontWeight: "700",
                  color: "var(--vz-heading-color, #111)",
                  fontSize: "16px",
                }}
              >
                {companyName}
              </h5>

              <div
                style={{
                  fontSize: "11px",
                  color: "var(--vz-secondary-color, #444)",
                  lineHeight: "1.4",
                }}
              >
                <div>{companyAddress}</div>

                <div>
                  <strong>Tel:</strong> {companyMobile}
                </div>

                <div>
                  <strong>Email:</strong> {companyEmail}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div
            className="rpt-header-badge"
            style={{
              background: "var(--vz-light, #eff6ff)",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--vz-border-color, #bfdbfe)",
              minWidth: "240px",
              textAlign: "center",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "700",
                color: "var(--vz-primary, #1e3a8a)",
              }}
            >
              {reportName}
            </h4>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderForAllRpt;