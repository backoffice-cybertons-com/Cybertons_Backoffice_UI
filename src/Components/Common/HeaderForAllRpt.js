import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";
import companyLogo from "../../assets/images/softsense.jpg";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import "./HeaderForAllRpt.css";

const api = new APIClient();

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
  layoutModeType: layout.layoutModeType,
}));

const HeaderForAllRpt = ({
  reportName = "Outstanding Comparison Report",
  reportMeta = null,
}) => {
  const { layoutModeType } = useSelector(selectLayoutProperties);
  const isDarkMode = layoutModeType === "dark";
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
      className={`header-for-all-rpt${isDarkMode ? " header-for-all-rpt--dark" : ""}`}
    >
      <div className="rpt-header-inner">
        <div className="rpt-header-left">
          <div className="rpt-header-brand">
            <img
              className="rpt-header-logo"
              src={
                companyInfo?.logoPath
                  ? `${process.env.REACT_APP_API_URL}${companyInfo.logoPath}`
                  : companyLogo
              }
              alt="Company Logo"
            />
            <span className="rpt-header-company-name">{companyName}</span>
          </div>

          <div className="rpt-header-divider" aria-hidden="true" />

          <div className="rpt-header-details">
            <div className="rpt-header-address">{companyAddress}</div>
            <div className="rpt-header-contact">
              <span>
                <strong>Tel:</strong> {companyMobile || "-"}
              </span>
              <span className="rpt-header-sep">|</span>
              <span>
                <strong>Email:</strong> {companyEmail || "-"}
              </span>
            </div>
          </div>
        </div>

        {reportName || reportMeta ? (
          <div className={`rpt-header-right${reportMeta ? " rpt-header-right--with-meta" : ""}`}>
            {reportName ? (
              <div className="rpt-header-badge">
                <h4>{reportName}</h4>
              </div>
            ) : null}
            {reportMeta ? (
              <div className="rpt-header-meta-group">{reportMeta}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HeaderForAllRpt;
