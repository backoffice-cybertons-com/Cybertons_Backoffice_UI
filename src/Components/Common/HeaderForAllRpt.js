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
    <div
      className="border-bottom mb-3 pb-2"
      style={{
        background: "#fff",
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
                color: "#111",
                fontSize: "16px",
              }}
            >
              {companyName}
            </h5>

            <div
              style={{
                fontSize: "11px",
                color: "#444",
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

        {/* Right Side Report Name */}
        {/* Right Side */}
        <div
          style={{
            background: "#eff6ff",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #bfdbfe",
            minWidth: "240px",
            textAlign: "center",
          }}
        >
          {/* <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              Report
            </div> */}

          <h4
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "700",
              color: "#1e3a8a",
            }}
          >
            {reportName}
          </h4>
        </div>
      </div>
    </div >
  );
};

export default HeaderForAllRpt;