// // src/Components/Common/FooterForAllRpt.js

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
        <>
            <style>
                {`
                @media print {
                    /* Try to make the parent container take full height so footer can go to bottom */
                    .card {
                        display: flex !important;
                        flex-direction: column !important;
                        min-height: 95vh !important;
                        border: none !important;
                    }
                    .card-body {
                        flex: 1 0 auto !important;
                    }
                    .footer-print-sticky {
                        position: relative !important;
                        margin-top: auto !important;
                        background: white !important;
                        padding: 20px 0 10px !important;
                        border-top: 1px solid #eee !important;
                        page-break-inside: avoid !important;
                        width: 100% !important;
                    }
                }
                `}
            </style>
            <div
                className="footer-print-sticky mt-3 py-2 mx-3"
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
        </>
    );
};

export default FooterForAllRpt;