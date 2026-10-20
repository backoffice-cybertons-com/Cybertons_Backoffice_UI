import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getCompanyProfile,
    getPurchaseTransactionDetails,
    getPartyDetails,
    getTransporters,
    getProductsForPurchase,
    getDeliveryChallanDetails
} from "../../helpers/fakebackend_helper";
import { api } from "../../config";
import sumulLogo from "../../assets/images/sumul-logo.png";
import "./PurchaseInvoice.css";

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
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatTime = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    const ss = String(dt.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
};

const PurchaseInvoice = () => {
    document.title = "Purchase Invoice | SoftBook";
    const { id } = useParams();
    const navigate = useNavigate();

    const [company, setCompany] = useState(null);
    const [header, setHeader] = useState(null);
    const [lines, setLines] = useState([]);
    const [party, setParty] = useState(null);
    const [transporterName, setTransporterName] = useState("");
    const [productById, setProductById] = useState(() => new Map());
    const [deliveryChallanNumber, setDeliveryChallanNumber] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            const cpRaw = await getCompanyProfile();
            const cpData = Array.isArray(cpRaw) ? cpRaw[0]
                : cpRaw?.data ? (Array.isArray(cpRaw.data) ? cpRaw.data[0] : cpRaw.data)
                    : cpRaw;
            setCompany(cpData);

            const txRaw = await getPurchaseTransactionDetails(id);
            const tx = txRaw?.data || txRaw;
            if (tx?.header) {
                const hdr = tx.header;
                setHeader(hdr);
                setLines(tx.lines || []);

                // Delivery challan number fallback (header stores delivery challan id)
                try {
                    const dcId = hdr.deliveryNo ?? hdr.DeliveryNo;
                    if (dcId) {
                        const dcResRaw = await getDeliveryChallanDetails(dcId);
                        const dcRes = dcResRaw?.data || dcResRaw;
                        const dcHeader = dcRes?.header || dcRes?.Header || dcRes;
                        const dcNo =
                            dcHeader?.challanNumber ||
                            dcHeader?.ChallanNumber ||
                            dcHeader?.challan_number ||
                            dcHeader?.challanNo ||
                            dcHeader?.ChallanNo ||
                            "";
                        setDeliveryChallanNumber(dcNo ? String(dcNo) : "");
                    } else {
                        setDeliveryChallanNumber("");
                    }
                } catch (de) {
                    console.warn("Failed to resolve delivery challan number for purchase invoice", de);
                    setDeliveryChallanNumber("");
                }

                // Product lookup for HSN fallback (lines may not store hsn_code)
                try {
                    const prodRes = await getProductsForPurchase();
                    const prodList = Array.isArray(prodRes)
                        ? prodRes
                        : (Array.isArray(prodRes?.data) ? prodRes.data : []);
                    const map = new Map();
                    (prodList || []).forEach(p => {
                        const pid = p.productId ?? p.ProductId ?? p.id;
                        if (pid === null || pid === undefined || pid === "") return;
                        map.set(String(pid), p);
                    });
                    setProductById(map);
                } catch (pe) {
                    console.warn("Failed to load products for invoice lookup", pe);
                }

                try {
                    const partyId = hdr.partyId || hdr.PartyId;
                    if (partyId) {
                        const partyResRaw = await getPartyDetails(partyId);
                        console.log("partyResRaw", partyResRaw);

                        const partyRes = partyResRaw?.data || partyResRaw;
                        setParty(partyRes?.party || partyRes?.Party || partyRes || null);
                    }
                } catch (pe) {
                    console.warn("Failed to fetch party details for purchase invoice", pe);
                }

                // Transporter name fallback (API stores transporterId, not always transporterName)
                try {
                    const tName = hdr.transporterName || hdr.TransporterName;
                    if (tName) {
                        setTransporterName(tName);
                    } else {
                        const tId = hdr.transporterId ?? hdr.TransporterId;
                        if (tId) {
                            const tRes = await getTransporters();
                            const tList = Array.isArray(tRes) ? tRes : (Array.isArray(tRes?.data) ? tRes.data : []);
                            const match = (tList || []).find(t => String(t.transporterId ?? t.TransporterId) === String(tId));
                            setTransporterName(match?.transporterName || match?.TransporterName || "");
                        }
                    }
                } catch (te) {
                    console.warn("Failed to resolve transporter name for purchase invoice", te);
                }
            } else {
                setError("Invoice data not found.");
            }
        } catch (e) {
            console.error("PurchaseInvoice: fetch error", e);
            setError("Failed to load invoice. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePrint = () => window.print();

    // Totals and derived values
    const totalQty = lines.reduce((s, l) => s + Number(l.quantity || l.Quantity || 0), 0);
    const totalTaxable = lines.reduce((s, l) => s + Number(l.amount || l.Amount || 0), 0);
    const totalCgst = lines.reduce((s, l) => s + Number(l.cgstAmount || l.CgstAmount || 0), 0);
    const totalSgst = lines.reduce((s, l) => s + Number(l.sgstAmount || l.SgstAmount || 0), 0);
    const grandTotal = header?.grandTotal || header?.GrandTotal || 0;
    const roundOff = header?.roundOff || header?.RoundOff || 0;
    const noOfSkus = header?.totSkuInInvoice || header?.TotSkuInInvoice || lines.length;
    const headerDiscount = Number(header?.totDiscount ?? header?.TotDiscount ?? 0);
    const headerDiscountPercent = Number(header?.discountPercent ?? header?.DiscountPercent ?? 0);
    const netInvoiceAmount = header?.netInvoiceAmount ?? header?.NetInvoiceAmount ?? grandTotal;
    const totalTaxAmount = totalCgst + totalSgst;

    // Company info
    const companyName = company?.companyName || company?.CompanyName || company?.company_name || "Your Company";
    const companyAddress = company?.companyAddress || company?.CompanyAddress || company?.address || company?.Address || "";
    const companyMobile = company?.mobile || company?.Mobile || "";
    const companyPhone = company?.phone || company?.Phone || "";
    const companyEmail = company?.email || company?.Email || "";
    const companyGstin = company?.gstin || company?.GSTIN || company?.gstNo || company?.GSTNO || "";
    const companyPan = company?.pan || company?.PAN || "";
    const companyState = company?.state || company?.State || "";
    const companyLogoPath = company?.logoPath || company?.LogoPath || "";

    // Party / vendor info
    const partyName = party?.displayName || party?.DisplayName || "";
    const placeOfSupply = party?.placeOfSupply || party?.PlaceOfSupply || "";
    const gstNo =
        party?.gstNo ||
        party?.GSTNo ||
        party?.gstno ||
        party?.GSTNO ||
        party?.gstNO ||
        party?.gstin ||
        party?.GSTIN ||
        party?.gst_no ||
        "";
    const partyPan = party?.pan || party?.PAN || "";
    const partyProfile = party?.partyProfile || party?.PartyProfile || party?.party_profile || "";

    const partyBillingAddress = header?.billingAddress || header?.BillingAddress || "-";
    const partyShippingAddress = header?.shippingAddress || header?.ShippingAddress || "-";

    const billNo = header?.billId ?? header?.BillId ?? "-";
    const billDate = header?.invDate || header?.InvDate || header?.createdOn || header?.CreatedOn;
    const billingTime = header?.createdOn || header?.CreatedOn || header?.invDate || header?.InvDate;

    const resolveImageUrl = (path) => {
        if (!path) return "";
        const s = String(path).trim();
        if (!s) return "";
        if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
        const base = (api?.API_URL || "").replace(/\/$/, "");
        if (!base) return s;
        return `${base}${s.startsWith("/") ? "" : "/"}${s}`;
    };
    const partyLogoSrc = resolveImageUrl(partyProfile) || resolveImageUrl(companyLogoPath) || sumulLogo;

    if (loading) {
        return (
            <div className="pi-loading">
                <div className="pi-spinner" />
                <p>Loading purchase invoice…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pi-error">
                <h4>{error}</h4>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Go Back</button>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="pi-no-print pi-actions" style={{ marginBottom: "16px" }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Back to List</button>
                <button onClick={handlePrint} className="btn btn-primary ms-2">🖨 Print / Save PDF</button>
            </div>

            <div className="pi-page">
                {/* Header with logo */}
                <div className="pi-header">
                    <div className="pi-header-top">
                        <img
                            src={partyLogoSrc}
                            alt="Logo"
                            className="pi-logo"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = sumulLogo; }}
                        />
                        <div className="pi-header-center">
                            <div className="pi-company-name">{partyName || companyName}</div>
                            <div className="pi-company-subtitle">
                                {partyBillingAddress || "-"}
                            </div>
                        </div>
                        <div className="pi-header-right">
                            <div><strong>Invoice No.</strong> {header?.invNo || header?.InvNo || "-"}</div>
                            <div><strong>Invoice Date</strong> {formatDate(header?.invDate || header?.InvDate)}</div>
                        </div>
                    </div>
                    <div className="pi-header-bottom">
                        <span><strong>GST No.:</strong> {gstNo || "-"}</span>
                        <span><strong>PAN:</strong> {partyPan || "-"}</span>
                        <span><strong>Place of Supply:</strong> {placeOfSupply || "-"}</span>
                    </div>
                </div>

                {/* Party / Meta section */}
                <div className="pi-meta-section">
                    <div className="pi-party-block">
                        <div className="pi-meta-title">Customer Name & Address</div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Customer Name</span>
                            <span>{companyName || "-"}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Customer Address</span>
                            <span>{companyAddress || "-"}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">GST No</span>
                            <span>{companyGstin || "-"}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">PAN</span>
                            <span>{companyPan || "-"}</span>
                        </div>
                    </div>
                    <div className="pi-ship-block">
                        <div className="pi-meta-title">Ship To Party</div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Name</span>
                            <span>{partyName || "-"}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Address</span>
                            <span>{partyShippingAddress}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">State</span>
                            <span>{companyState || "-"}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Contact</span>
                            <span>{[companyMobile, companyPhone, companyEmail].filter(Boolean).join(" / ") || "-"}</span>
                        </div>
                    </div>
                    <div className="pi-invoice-block">
                        <div className="pi-meta-title">Reference Details</div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Bill No. / Date</span>
                            <span>{billNo} / {formatDate(billDate)}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Billing Time</span>
                            <span>{formatTime(billingTime)}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Sales Order No. / Date</span>
                            <span>{header?.salesOrderNo || header?.SalesOrderNo || "-"} / {formatDate(header?.salesOrderDate || header?.SalesOrderDate)}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">PO Order No. / Date</span>
                            <span>{header?.poOrderNo || header?.PoOrderNo || "-"} / {formatDate(header?.poOrderDate || header?.PoOrderDate)}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Delivery No. / Date</span>
                            <span>{deliveryChallanNumber || "-"} / {formatDate(header?.deliveryDate || header?.DeliveryDate)}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Transporter Name</span>
                            <span>{transporterName || "-"}</span>
                        </div>
                        <div className="pi-meta-row">
                            <span className="pi-label">Vehicle No.</span>
                            <span>{header?.vehicleNo || header?.VehicleNo || "-"}</span>
                        </div>
                    </div>
                </div>

                {/* Items table */}
                <table className="pi-items-table">
                    <thead>
                        <tr>
                            <th>Sr.</th>
                            <th>HSN - Description of Goods</th>
                            <th>Batch No.</th>
                            <th>Batch Date</th>
                            <th>MRP / Unit</th>
                            <th>Unit / Case</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Basic Amount</th>
                            <th>CGST %</th>
                            <th>CGST Amt</th>
                            <th>SGST %</th>
                            <th>SGST Amt</th>
                            <th>Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((ln, idx) => {
                            const qty = Number(ln.quantity || ln.Quantity || 0);
                            const rate = Number(ln.rate || ln.Rate || 0);
                            const basic = Number(ln.amount || ln.Amount || qty * rate);
                            const cgstP = Number(ln.cgstPercent || ln.CgstPercent || 0);
                            const sgstP = Number(ln.sgstPercent || ln.SgstPercent || 0);
                            const cgstAmt = Number(ln.cgstAmount || ln.CgstAmount || (basic * cgstP) / 100);
                            const sgstAmt = Number(ln.sgstAmount || ln.SgstAmount || (basic * sgstP) / 100);
                            const total = Number(ln.totalAmount || ln.TotalAmount || basic + cgstAmt + sgstAmt);
                            const productId = ln.productId ?? ln.ProductId;
                            const prod = productId ? productById.get(String(productId)) : null;
                            const hsnFromProduct =
                                prod?.HSNOrSACCode ||
                                prod?.hsnOrSACCode ||
                                prod?.hsnOrSacCode ||
                                prod?.HSNCode ||
                                prod?.hsnCode ||
                                prod?.HsnCode ||
                                prod?.SACCode ||
                                prod?.sacCode ||
                                "";
                            const hsn = (
                                ln.hsnCode ||
                                ln.HsnCode ||
                                ln.hsn_code ||
                                ln.HSNCode ||
                                hsnFromProduct ||
                                ""
                            ).toString().trim();

                            const descRaw = (ln.productDetails || ln.ProductDetails || "").toString();
                            const desc = descRaw.replace(/\s+/g, " ").trim();
                            const batchNo = ln.batchNo || ln.BatchNo || "";
                            const batchDate = ln.batchDate || ln.BatchDate || "";
                            const mrp = Number(ln.mrp || ln.Mrp || ln.MRP || 0);
                            const unitPerCase = Number(ln.crt || ln.Crt || 0);

                            return (
                                <tr key={idx}>
                                    <td className="pi-text-center">{idx + 1}</td>
                                    <td>{[hsn, desc].filter(Boolean).join(" - ")}</td>
                                    <td className="pi-text-center">{batchNo || "-"}</td>
                                    <td className="pi-text-center">{formatDate(batchDate)}</td>
                                    <td className="pi-text-right">{fmt(mrp)}</td>
                                    <td className="pi-text-right">{unitPerCase ? fmt(unitPerCase) : "-"}</td>
                                    <td className="pi-text-right">{fmt(qty)}</td>
                                    <td className="pi-text-right">{fmt(rate)}</td>
                                    <td className="pi-text-right">{fmt(basic)}</td>
                                    <td className="pi-text-right">{fmt(cgstP)}</td>
                                    <td className="pi-text-right">{fmt(cgstAmt)}</td>
                                    <td className="pi-text-right">{fmt(sgstP)}</td>
                                    <td className="pi-text-right">{fmt(sgstAmt)}</td>
                                    <td className="pi-text-right">{fmt(total)}</td>
                                </tr>
                            );
                        })}
                        {lines.length === 0 && (
                            <tr>
                                <td colSpan={14} style={{ textAlign: "center" }}>No line items</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer summary rows */}
                <div className="pi-footer-row">
                    <div className="pi-footer-left">
                        <div className="pi-meta-title">Crate / Packing Summary</div>
                        <table className="pi-small-table">
                            <tbody>
                                <tr>
                                    <td>No. of Cases / Packs</td>
                                    <td className="pi-text-right">{fmt(totalQty)}</td>
                                </tr>
                                <tr>
                                    <td>No. of SKUs</td>
                                    <td className="pi-text-right">{noOfSkus}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="pi-footer-center">
                        <div className="pi-meta-title">Tax Summary</div>
                        <table className="pi-small-table">
                            <thead>
                                <tr>
                                    <th>Particulars</th>
                                    <th className="pi-text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Taxable Amount</td>
                                    <td className="pi-text-right">{fmt(totalTaxable)}</td>
                                </tr>
                                <tr>
                                    <td>CGST Amount</td>
                                    <td className="pi-text-right">{fmt(totalCgst)}</td>
                                </tr>
                                <tr>
                                    <td>SGST Amount</td>
                                    <td className="pi-text-right">{fmt(totalSgst)}</td>
                                </tr>
                                <tr>
                                    <td>Round Off</td>
                                    <td className="pi-text-right">{fmt(roundOff)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="pi-footer-right">
                        <div className="pi-meta-title">Grand Total</div>
                        <table className="pi-small-table">
                            <tbody>
                                <tr>
                                    <td>Basic Amount</td>
                                    <td className="pi-text-right">{fmt(totalTaxable)}</td>
                                </tr>
                                <tr>
                                    <td>Tax Amount</td>
                                    <td className="pi-text-right">{fmt(totalTaxAmount)}</td>
                                </tr>
                                <tr>
                                    <td>Discount {headerDiscountPercent ? `(${fmt(headerDiscountPercent)}%)` : ""}</td>
                                    <td className="pi-text-right">{fmt(headerDiscount)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Net Invoice Amount</strong></td>
                                    <td className="pi-text-right">
                                        <strong>{Number(netInvoiceAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pi-amount-words">
                    <strong>Amount in Words: </strong>{toWords(Number(netInvoiceAmount) || 0)}
                </div>

                <div className="pi-signature-row">
                    <span>Receiver's Signature</span>
                    <span>Authorised Signatory</span>
                </div>
            </div>
        </div>
    );
};

export default PurchaseInvoice;

