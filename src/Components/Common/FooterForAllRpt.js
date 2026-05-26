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
                /* Hide the global theme footer when viewing reports to save space */
                footer.footer {
                    display: none !important;
                }

                /* Reduce page-content padding to allow the card to take more space */
                .page-content {
                    padding-bottom: 5px !important;
                }

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
                    .footer-print-sticky .text-muted,
                    .footer-print-sticky div {
                        color: #6c757d !important;
                    }
                    .footer-print-sticky strong {
                        color: #405189 !important;
                    }
                }
                `}
            </style>
            <div
                className="footer-print-sticky py-2 px-3"
                style={{
                    fontSize: "11px",
                    borderTop: "1px solid var(--vz-border-color, #e9ebec)",
                    background: "var(--vz-card-bg, #fff)"
                }}
            >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">

                    {/* Left Side */}
                    <div style={{ fontWeight: "500", color: "var(--vz-muted-color, #6c757d)" }}>
                        Powered by <strong style={{ color: "var(--vz-primary, #405189)" }}>SoftOnCloud</strong>
                    </div>

                    {/* Right Side */}
                    <div className="text-muted">
                        Generated On : <strong style={{ color: "var(--vz-body-color)" }}>{generatedOn}</strong>
                    </div>

                </div>
            </div>
        </>
    );
};

export default FooterForAllRpt;