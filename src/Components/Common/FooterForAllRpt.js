// src/Components/Common/FooterForAllRpt.js

import React from "react";

const FooterForAllRpt = () => {
    const generatedOn = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    return (
        <div
            className="  mt-3 py-2 mx-3"
            style={{
                fontSize: "12px"

            }}
        >
            <div className="d-flex justify-content-between align-items-center flex-wrap">

                {/* Left Side */}
                <div style={{ fontWeight: "500" }}>
                    Powered by <strong>SoftOnCloud</strong>
                </div>

                {/* Right Side */}
                <div>
                    Generated On : <strong>{generatedOn}</strong>
                </div>

            </div>
        </div>
    );
};

export default FooterForAllRpt;