import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCompanyProfile, getSalesTransactionDetails, getPartyCustomers } from "../../helpers/fakebackend_helper";
import "./SalesInvoice.css";
import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";

/* ─── helpers ─────────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toFixed(2);

const toWords = (n) => {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
        "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
        "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty",
        "Sixty", "Seventy", "Eighty", "Ninety"];
    const convert = (num) => {
        if (num < 20) return a[num];
        if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
        if (num < 1000) return a[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + convert(num % 100) : "");
        if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + convert(num % 1000) : "");
        if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + convert(num % 100000) : "");
        return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + convert(num % 10000000) : "");
    };
    const whole = Math.floor(n);
    const paise = Math.round((n - whole) * 100);
    let words = "INR Rs. " + convert(whole) + " Rupees";
    if (paise > 0) words += " and " + convert(paise) + " Paise";
    words += " Only";
    return words;
};

const formatDate = (d) => {
    if (!d) return "-";
    // If it's a pure "YYYY-MM-DD" string, parse as local parts directly (avoid UTC midnight shift in IST)
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split("-");
        return `${day}/${m}/${y}`;
    }
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
};

/* ─── component ───────────────────────────────────────────────────── */
const SalesInvoice = () => {
    document.title = "Tax Invoice | SoftBook";
    const { id } = useParams();
    const navigate = useNavigate();

    const [company, setCompany] = useState(null);
    const [header, setHeader] = useState(null);
    const [lines, setLines] = useState([]);
    const [partyName, setPartyName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Company profile
            const cpRaw = await getCompanyProfile();
            const cpData = Array.isArray(cpRaw) ? cpRaw[0]
                : cpRaw?.data ? (Array.isArray(cpRaw.data) ? cpRaw.data[0] : cpRaw.data)
                    : cpRaw;
            setCompany(cpData);

            // 2. Sales transaction (header + lines)
            const txRaw = await getSalesTransactionDetails(id);
            const tx = txRaw?.data || txRaw;
            if (tx?.header) {
                setHeader(tx.header);
                setLines(tx.lines || []);

                // 3. Customer name
                const custRaw = await getPartyCustomers();
                const custArr = Array.isArray(custRaw) ? custRaw
                    : (custRaw?.data && Array.isArray(custRaw.data)) ? custRaw.data : [];
                const partyId = tx.header.partyId || tx.header.PartyId;
                const found = custArr.find(c =>
                    String(c.partyId ?? c.PartyId) === String(partyId)
                );
                setPartyName(found?.displayName || found?.DisplayName || `Party ${partyId}`);
            } else {
                setError("Invoice data not found.");
            }
        } catch (e) {
            console.error("SalesInvoice: fetch error", e);
            setError("Failed to load invoice. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePrint = () => {
        const styleId = "si-print-portrait-style";
        const existing = document.getElementById(styleId);
        if (existing) existing.remove();

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            @page { size: A4 portrait !important; margin: 4mm 6mm !important; }
            @media print {
                .si-page {
                    width: 198mm !important;
                    min-height: 287mm !important;
                    height: auto !important;
                    margin: 0 auto !important;
                    padding: 3mm 4mm !important;
                    page-break-after: always !important;
                }
            }
        `;
        document.head.appendChild(style);

        const cleanup = () => {
            const printStyle = document.getElementById(styleId);
            if (printStyle) printStyle.remove();
            window.removeEventListener("afterprint", cleanup);
        };

        window.addEventListener("afterprint", cleanup, { once: true });
        window.print();
        setTimeout(cleanup, 1500);
    };

    /* ─── computed totals ─────────────────────────────────────────── */
    const totCrt = lines.reduce((s, l) => s + Number(l.crt || 0), 0);
    const totPacking = lines.reduce((s, l) => s + Number(l.packing || 0), 0);
    const totTaxable = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
    const totCgst = lines.reduce((s, l) => s + Number(l.cgstAmount || l.CgstAmount || 0), 0);
    const totSgst = lines.reduce((s, l) => s + Number(l.sgstAmount || l.SgstAmount || 0), 0);
    const totIgst = lines.reduce((s, l) => s + Number(l.igstAmount || l.IgstAmount || 0), 0);
    const totGst = totCgst + totSgst + totIgst;
    const grandTotal = header?.grandTotal || header?.GrandTotal || 0;
    const roundOff = header?.roundOff || header?.RoundOff || 0;
    const prevOutstanding = header?.previousOutstanding || header?.PreviousOutstanding || 0;
    const finalOutstanding = header?.finalOutstanding || header?.FinalOutstanding || 0;

    // Company info
    const companyName = company?.companyName || company?.CompanyName || "Your Company";
    const companyAddress = company?.companyAddress || company?.CompanyAddress || company?.address || "";
    const companyCity = company?.city || company?.City || "";
    const companyState = company?.state || company?.State || "";
    const companyPin = company?.pinCode || company?.PinCode || "";
    const companyMobile = company?.mobileNumber || company?.MobileNumber || company?.mobile || "";
    const companyEmail = company?.email || company?.Email || "";
    const companyGstin = company?.gstin || company?.Gstin || company?.gstNo || company?.GstNo || "";
    const bankName = company?.bankName || company?.BankName || "";
    const bankBranch = company?.bankBranch || company?.BankBranch || "";
    const bankAccount = company?.accountNumber || company?.AccountNumber || "";
    const bankIfsc = company?.ifscCode || company?.IfscCode || "";
    const jurisdiction = header?.jurisdiction || header?.Jurisdiction || "";

    if (loading) return (
        <div className="si-loading">
            <div className="si-spinner" />
            <p>Loading invoice…</p>
        </div>
    );

    if (error) return (
        <div className="si-error">
            <h4>{error}</h4>
            <button onClick={() => navigate(-1)} className="si-btn-back">← Go Back</button>
        </div>
    );

    return (
        <div className="page-content">
            {/* ── Print button (hidden on print) ───────────────────── */}
            <div className="si-no-print si-actions" style={{ marginBottom: '16px' }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Back to List</button>
                <button onClick={handlePrint} className="btn btn-primary ms-2">🖨 Print / Save PDF</button>
            </div>

            <div className="si-page" style={{ overflow: "hidden" }}>
                <div className="si-ledger-wrapper">

                    {/* <div className="text-start">
                        <HeaderForAllReport reportName="Sale Invoice" />
                    </div> */}

                    {/* Header Row 1 */}
                    <div className="si-top-header">
                        <div className="si-header-left"></div>
                        <div className="si-header-center">Tax Invoice</div>
                        <div className="si-header-right">
                            <span>DEBIT MEMO</span>
                            <span>ORIGINAL</span>
                        </div>
                    </div>
                    <div className="si-company-block">
                        <div className="si-company-name">{companyName}</div>
                        <div className="si-company-info">
                            {[companyAddress, companyCity, companyState, companyPin].filter(Boolean).join(", ")}<br />
                            Mobile No. : {companyMobile} &nbsp;/&nbsp; E-mail : {companyEmail}<br />
                            GSTIN No. : {companyGstin} &nbsp;/&nbsp; State : {companyState}
                        </div>
                    </div>

                    {/* Buyer + Meta Row 2 */}
                    <div className="si-buyer-meta-row">
                        <div className="si-buyer-col">
                            <div className="si-section-lbl">Details of Buyer's (Billed to)</div>
                            <table className="si-buyer-table">
                                <tbody>
                                    <tr>
                                        <td className="si-lbl-col">Name</td>
                                        <td>: <strong>{partyName}</strong></td>
                                        <td className="si-lbl-col"></td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td className="si-lbl-col" rowSpan={2}>Address</td>
                                        <td rowSpan={2}>: {header?.billingAddress || header?.BillingAddress || ""}</td>
                                        <td className="si-lbl-col">State</td>
                                        <td>: {header?.jurisdiction || "-"}</td>
                                    </tr>
                                    <tr>
                                        <td className="si-lbl-col">PAN No.</td>
                                        <td>: {header?.panNo || ""}</td>
                                    </tr>
                                    <tr>
                                        <td className="si-lbl-col">Mob. No.</td>
                                        <td>: {header?.mobileNo || header?.MobileNo || ""}</td>
                                        <td className="si-lbl-col">GSTIN No.</td>
                                        <td>: {header?.gstin || header?.Gstin || ""}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="si-meta-col">
                            <table className="si-meta-table">
                                <tbody>
                                    <tr>
                                        <td className="si-lbl-col">Invoice No.</td>
                                        <td>: <strong>{header?.invNo || header?.InvNo || "-"}</strong></td>
                                    </tr>
                                    <tr>
                                        <td className="si-lbl-col">Invoice Dt.</td>
                                        <td>: <strong>{formatDate(header?.invDate || header?.InvDate)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="si-items-table">
                        <thead>
                            <tr>
                                <th className="w-sr">Sr.</th>
                                <th className="w-desc">Description of Goods</th>
                                <th className="w-hsn">HSN Code</th>
                                <th className="w-crt">CRT</th>
                                <th className="w-pack">Packing</th>
                                <th className="w-rate si-col-divider">Rate</th>
                                <th className="w-taxable">Taxable Value</th>
                                <th className="w-gstper">GST %</th>
                                <th className="w-gstamt">GST Amount</th>
                                <th className="w-totalamt">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((ln, i) => {
                                const gstPer = Number(ln.cgstPercent || ln.CgstPercent || 0) * 2 +
                                    Number(ln.igstPercent || ln.IgstPercent || 0);
                                const gstAmt = Number(ln.cgstAmount || ln.CgstAmount || 0) +
                                    Number(ln.sgstAmount || ln.SgstAmount || 0) +
                                    Number(ln.igstAmount || ln.IgstAmount || 0);
                                return (
                                    <tr key={i}>
                                        <td className="w-sr">{i + 1}</td>
                                        <td className="w-desc">{ln.productDetails || ln.ProductDetails || ""}</td>
                                        <td className="w-hsn">{ln.hsnCode || ln.HsnCode || ""}</td>
                                        <td className="w-crt">{fmt(ln.crt || ln.Crt)}</td>
                                        <td className="w-pack">{ln.packing || ln.Packing || ""}</td>
                                        <td className="w-rate si-col-divider">{fmt(ln.rate || ln.Rate)}</td>
                                        <td className="w-taxable">{fmt(ln.amount || ln.Amount)}</td>
                                        <td className="w-gstper">{gstPer} %</td>
                                        <td className="w-gstamt">{fmt(gstAmt)}</td>
                                        <td className="w-totalamt">{fmt(ln.totalAmount || ln.TotalAmount)}</td>
                                    </tr>
                                );
                            })}
                            {lines.length < 5 && Array.from({ length: 5 - lines.length }).map((_, i) => (
                                <tr key={`pad-${i}`} className="si-pad-row">
                                    <td className="w-sr"></td>
                                    <td className="w-desc"></td>
                                    <td className="w-hsn"></td>
                                    <td className="w-crt"></td>
                                    <td className="w-pack"></td>
                                    <td className="w-rate si-col-divider"></td>
                                    <td className="w-taxable"></td>
                                    <td className="w-gstper"></td>
                                    <td className="w-gstamt"></td>
                                    <td className="w-totalamt"></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="si-subtotal-row">
                                <td colSpan={3} className="si-subtotal-lbl">Sub Total :</td>
                                <td className="w-crt">{fmt(totCrt)}</td>
                                <td className="w-pack">{totPacking}</td>
                                <td className="w-rate si-col-divider"></td>
                                <td className="w-taxable">{fmt(totTaxable)}</td>
                                <td className="w-gstper"></td>
                                <td className="w-gstamt">{fmt(totGst)}</td>
                                <td className="w-totalamt">{fmt(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Bank + Amount row */}
                    <div className="si-bank-row">
                        <div className="si-bank-col">
                            <table className="si-bank-table">
                                <tbody>
                                    <tr>
                                        <td style={{ width: '70px' }}>Bank Name</td><td>: {bankName}</td>
                                        <td style={{ width: '60px' }}>A/c. No.</td><td>: {bankAccount}</td>
                                    </tr>
                                    <tr>
                                        <td>Branch</td><td>: {bankBranch}</td>
                                        <td>IFSC Code</td><td>: {bankIfsc}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="si-round-col">
                            <span>Round Off</span>
                            <span>{fmt(roundOff)}</span>
                        </div>
                    </div>

                    {/* Words row */}
                    <div className="si-words-total-row">
                        <div className="si-words-col">
                            INR Rs. {toWords(grandTotal)}
                        </div>
                        <div className="si-total-col">
                            <span>TOTAL</span>
                            <span>{Number(grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Outstanding row */}
                    <div className="si-footer-section">
                        <div className="si-outstanding-col">
                            <table className="si-outstanding-gst-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Outstanding Details:-</th>
                                        <th className="gst-hdr text-center">GST %</th>
                                        <th className="gst-hdr text-right">Taxable Amt</th>
                                        <th className="gst-hdr text-right">CGST Amt.</th>
                                        <th className="gst-hdr text-right">SGST Amt.</th>
                                        <th className="gst-hdr text-right" style={{ paddingRight: '6px' }}>Total Amt.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="os-cell">Previous Os : <span className="os-val">{fmt(prevOutstanding)}</span></td>
                                        <td className="gst-cell text-center">.00</td>
                                        <td className="gst-cell text-right">{fmt(prevOutstanding)}</td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right" style={{ paddingRight: '6px' }}>{fmt(prevOutstanding)}</td>
                                    </tr>
                                    <tr>
                                        <td className="os-cell">This Bill &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="os-val">{fmt(grandTotal)}</span></td>
                                        <td className="gst-cell text-center">{lines.find(l => (l.cgstPercent || l.CgstPercent) > 0) ? (Number(lines.find(l => (l.cgstPercent || l.CgstPercent) > 0)?.cgstPercent || 0) * 2).toFixed(2) : "0.00"}</td>
                                        <td className="gst-cell text-right">{fmt(totTaxable)}</td>
                                        <td className="gst-cell text-right">{fmt(totCgst)}</td>
                                        <td className="gst-cell text-right">{fmt(totSgst)}</td>
                                        <td className="gst-cell text-right" style={{ paddingRight: '6px' }}>{fmt(grandTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td className="os-cell">Today's Receipt : <span className="os-val">{fmt(header?.todaysReceipt || header?.TodaysReceipt || 0)}</span></td>
                                        <td className="gst-cell text-center"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                    </tr>
                                    <tr>
                                        <td className="os-cell">Today's O/S &nbsp;&nbsp;: <span className="os-val">{fmt(grandTotal - (header?.todaysReceipt || header?.TodaysReceipt || 0))}</span></td>
                                        <td className="gst-cell text-center"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                    </tr>
                                    <tr>
                                        <td className="os-cell" style={{ borderTop: '1px solid #000' }}>Final O/S &nbsp;&nbsp;&nbsp;&nbsp;: <span className="os-val bold">{fmt(prevOutstanding + grandTotal - (header?.todaysReceipt || header?.TodaysReceipt || 0))}</span></td>
                                        <td className="gst-cell text-center"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                        <td className="gst-cell text-right"></td>
                                    </tr>
                                    <tr>
                                        <td className="juri-cell">Subject To "{jurisdiction}" Jurisdiction.</td>
                                        <td className="gst-cell bottom-total"></td>
                                        <td className="gst-cell bottom-total text-right">{fmt(totTaxable)}</td>
                                        <td className="gst-cell bottom-total text-right">{fmt(totCgst)}</td>
                                        <td className="gst-cell bottom-total text-right">{fmt(totSgst)}</td>
                                        <td className="gst-cell bottom-total"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="si-signature-col">
                            <div className="si-for-trade" style={{ paddingRight: '6px' }}>For, {companyName}</div>
                            <div className="si-sign-labels" style={{ padding: '0 6px' }}>
                                <span>Receiver's Signature</span>
                                <span>Authorised Signatory</span>
                            </div>
                        </div>
                    </div>

                </div>
                <div className="text-start">
                    <FooterForAllRpt />
                </div>
            </div>
        </div>
    );
};

export default SalesInvoice;
