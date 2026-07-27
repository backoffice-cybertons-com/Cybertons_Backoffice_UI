import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    getCompanyProfile,
    getSalesTransactionDetails,
    getPartyDetails
} from "../../helpers/fakebackend_helper";
import { APIClient } from "../../helpers/api_helper";
import "./SalesInvoiceUpdated.css";

const apiClient = new APIClient();
const fmt2 = (n) => Number(n || 0).toFixed(2);
const fmt4 = (n) => Number(n || 0).toFixed(4);

const formatDate = (d) => {
    if (!d) return "-";
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split("-");
        return `${day}/${m}/${y}`;
    }
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
};

const calcLine = (line) => {
    const qty      = Number(line.crt ?? line.Crt ?? line.quantity ?? line.Quantity ?? 0);
    const rate     = Number(line.rate ?? line.Rate ?? 0);
    const rateDiff = Number(line.rateDiff ?? line.RateDiff ?? 0);
    const mrp      = Number(line.mrp ?? line.Mrp ?? 0);
    const cogs     = Number(line.cogs ?? line.Cogs ?? 0);
    const dealerPrice    = Number(line.dealerPrice ?? line.DealerPrice ?? (rate - rateDiff));
    const spCommUnit     = Number(line.spCommUnit ?? line.SpCommUnit ?? 0);
    const companyCommUnit = mrp - rate - spCommUnit;          // MRP − SalePrice − SPComm
    const invAmountMrp   = qty * mrp;
    const spCommTotal    = qty * spCommUnit;
    const companyCommTotal = qty * companyCommUnit;
    const billAmount     = Number(line.totalAmount ?? line.TotalAmount ?? 0);
    return {
        product: line.productDetails || line.ProductDetails || "-",
        qty, cogs, mrp, dealerPrice,
        adjPrice: rateDiff,
        salePrice: rate,
        spCommUnit,
        companyCommUnit,
        invAmountMrp,
        spCommTotal,
        companyCommTotal,
        billAmount
    };
};

const SalesInvoiceUpdated = () => {
    document.title = "MRP Profit Statement | SoftBook";
    const { id } = useParams();
    const navigate = useNavigate();

    const [company,         setCompany]         = useState(null);
    const [header,          setHeader]          = useState(null);
    const [lines,           setLines]           = useState([]);
    const [party,           setParty]           = useState(null);
    const [partyBanks,      setPartyBanks]      = useState([]);
    const [salespersonName, setSalespersonName] = useState("");
    const [loading,         setLoading]         = useState(true);
    const [error,           setError]           = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Company profile
            const cpRaw = await getCompanyProfile();
            const cpData = Array.isArray(cpRaw) ? cpRaw[0]
                : cpRaw?.data ? (Array.isArray(cpRaw.data) ? cpRaw.data[0] : cpRaw.data) : cpRaw;
            setCompany(cpData);

            // Invoice header + lines
            const txRaw = await getSalesTransactionDetails(id);
            const tx = txRaw?.data || txRaw;
            if (!tx?.header) { setError("Invoice data not found."); return; }

            setHeader(tx.header);
            setLines(tx.lines || tx.Lines || []);

            // Party details
            const partyId = tx.header.partyId || tx.header.PartyId;
            if (partyId) {
                const partyRes = await getPartyDetails(partyId);
                setParty(partyRes?.party || partyRes?.Party || {});
                setPartyBanks(partyRes?.bankDetails || partyRes?.BankDetails || []);
            }

            // Salesperson
            const spId = tx.header.salespersonId || tx.header.SalespersonId;
            if (spId) {
                try {
                    const spList = await apiClient.get("/api/salesperson");
                    const arr = Array.isArray(spList) ? spList : (spList?.data || []);
                    const found = arr.find(s =>
                        String(s.salespersonId ?? s.SalespersonId ?? s.salesperson_id) === String(spId));
                    setSalespersonName(found?.salespersonName || found?.SalespersonName || found?.salesperson_name || "");
                } catch (_) { /* optional */ }
            }
        } catch (e) {
            console.error("SalesInvoiceUpdated fetch error", e);
            setError("Failed to load MRP statement.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const calcLines = useMemo(() => lines.map(calcLine), [lines]);

    const totals = useMemo(() => calcLines.reduce((acc, r) => {
        acc.qty             += r.qty;
        acc.invAmountMrp    += r.invAmountMrp;
        acc.spCommTotal     += r.spCommTotal;
        acc.companyCommTotal += r.companyCommTotal;
        acc.billAmount      += r.billAmount;
        return acc;
    }, { qty: 0, invAmountMrp: 0, spCommTotal: 0, companyCommTotal: 0, billAmount: 0 }), [calcLines]);

    const grandTotal = header?.grandTotal || header?.GrandTotal || 0;

    if (loading) return (
        <div className="siu-loading-wrap">
            <div className="siu-spinner" />
            <p className="siu-loading-text">Loading MRP Statement…</p>
        </div>
    );

    if (error) return (
        <div className="siu-error-wrap">
            <div className="siu-error-icon">⚠</div>
            <h4>{error}</h4>
            <button onClick={() => navigate(-1)} className="siu-btn-back">← Go Back</button>
        </div>
    );

    const buyerName = party?.displayName || party?.DisplayName || "-";
    const invNo     = header?.invNo || header?.InvNo || "-";
    const invDate   = formatDate(header?.invDate || header?.InvDate);

    return (
        <div className="page-content">
            {/* ── Toolbar (hidden on print) ── */}
            <div className="siu-toolbar si-no-print">
                <div className="siu-toolbar-left">
                    <button onClick={() => navigate(-1)} className="siu-btn siu-btn-ghost">
                        ← Back
                    </button>
                    <Link to={`/sales-order/invoice/${id}`} className="siu-btn siu-btn-outline">
                        📄 Standard Invoice
                    </Link>
                </div>
                <div className="siu-toolbar-right">
                    <button onClick={() => window.print()} className="siu-btn siu-btn-primary">
                        🖨 Print Statement
                    </button>
                </div>
            </div>

            {/* ── Document ── */}
            <div className="siu-document">

                {/* Header band */}
                <div className="siu-doc-header">
                    <div className="siu-doc-company">
                        <div className="siu-doc-company-name">
                            {company?.companyName || company?.CompanyName || "Company"}
                        </div>
                        <div className="siu-doc-company-sub">
                            {company?.address || company?.Address || ""}
                            {(company?.gstno || company?.gstNo) && (
                                <span className="siu-doc-gst"> · GST: {company.gstno || company.gstNo}</span>
                            )}
                        </div>
                    </div>
                    <div className="siu-doc-title-block">
                        <div className="siu-doc-title">MRP Profit Statement</div>
                        <div className="siu-doc-subtitle">Internal Use Only</div>
                    </div>
                    <div className="siu-doc-ref">
                        <div className="siu-doc-ref-row">
                            <span className="siu-doc-ref-label">Invoice No</span>
                            <span className="siu-doc-ref-value">{invNo}</span>
                        </div>
                        <div className="siu-doc-ref-row">
                            <span className="siu-doc-ref-label">Date</span>
                            <span className="siu-doc-ref-value">{invDate}</span>
                        </div>
                    </div>
                </div>

                {/* Meta info grid */}
                <div className="siu-meta-grid">
                    <div className="siu-meta-cell">
                        <div className="siu-meta-label">Customer</div>
                        <div className="siu-meta-value siu-meta-prominent">{buyerName}</div>
                        {(party?.retailerCode || party?.RetailerCode) && (
                            <div className="siu-meta-sub">
                                Retailer: {party.retailerCode || party.RetailerCode}
                                {(party?.sumulDepoCode || party?.SumulDepoCode) &&
                                    <> &nbsp;·&nbsp; Sumul: {party.sumulDepoCode || party.SumulDepoCode}</>}
                            </div>
                        )}
                    </div>
                    <div className="siu-meta-cell">
                        <div className="siu-meta-label">Salesperson</div>
                        <div className="siu-meta-value siu-meta-prominent">{salespersonName || "-"}</div>
                        <div className="siu-meta-sub">
                            KAM: {party?.kamMobile || party?.KamMobile || "-"} &nbsp;·&nbsp;
                            Recovery: {party?.recoveryMobile || party?.RecoveryMobile || "-"}
                        </div>
                    </div>
                    <div className="siu-meta-cell siu-meta-cell-right">
                        <div className="siu-meta-label">Invoice Total (Bill)</div>
                        <div className="siu-meta-grand">₹ {fmt2(grandTotal)}</div>
                        <div className="siu-meta-sub">MRP Inv: ₹ {fmt2(totals.invAmountMrp)}</div>
                    </div>
                </div>

                {/* ── Main profit table (Excel layout) ── */}
                <div className="siu-table-wrap">
                    <table className="siu-table">
                        <thead>
                            <tr className="siu-thead-group">
                                <th rowSpan={2} className="siu-th-center siu-col-sr">#</th>
                                <th rowSpan={2} className="siu-th-left siu-col-product">Product</th>
                                <th rowSpan={2} className="siu-th-center siu-col-num">Carat<br/><span className="siu-th-unit">(Qty)</span></th>
                                <th rowSpan={2} className="siu-th-center siu-col-num">COGS</th>
                                <th rowSpan={2} className="siu-th-center siu-col-num">MRP</th>
                                <th rowSpan={2} className="siu-th-center siu-col-num">Dealer<br/>Price</th>
                                <th rowSpan={2} className="siu-th-center siu-col-num">Adj<br/>Price</th>
                                <th rowSpan={2} className="siu-th-center siu-col-num">Sale<br/>Price</th>
                                <th colSpan={2} className="siu-th-center siu-th-group-comm">Commission (per unit)</th>
                                <th colSpan={3} className="siu-th-center siu-th-group-total">Totals</th>
                            </tr>
                            <tr className="siu-thead-sub">
                                <th className="siu-th-center siu-col-num siu-th-sp">SP Comm</th>
                                <th className="siu-th-center siu-col-num siu-th-co">Co. Comm</th>
                                <th className="siu-th-center siu-col-num siu-th-inv">Inv Amt<br/>(MRP)</th>
                                <th className="siu-th-center siu-col-num siu-th-sp">SP Comm<br/>Total</th>
                                <th className="siu-th-center siu-col-num siu-th-co">Co. Comm<br/>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calcLines.map((r, i) => (
                                <tr key={i} className={i % 2 === 0 ? "siu-row-even" : "siu-row-odd"}>
                                    <td className="siu-td-center siu-td-sr">{i + 1}</td>
                                    <td className="siu-td-left">{r.product}</td>
                                    <td className="siu-td-right">{fmt4(r.qty)}</td>
                                    <td className="siu-td-right">{fmt2(r.cogs)}</td>
                                    <td className="siu-td-right siu-col-mrp">{fmt2(r.mrp)}</td>
                                    <td className="siu-td-right">{fmt2(r.dealerPrice)}</td>
                                    <td className="siu-td-right siu-col-adj">{fmt2(r.adjPrice)}</td>
                                    <td className="siu-td-right siu-col-sale">{fmt2(r.salePrice)}</td>
                                    <td className="siu-td-right siu-td-sp">{fmt2(r.spCommUnit)}</td>
                                    <td className="siu-td-right siu-td-co">{fmt2(r.companyCommUnit)}</td>
                                    <td className="siu-td-right siu-td-inv"><strong>{fmt2(r.invAmountMrp)}</strong></td>
                                    <td className="siu-td-right siu-td-sp">{fmt2(r.spCommTotal)}</td>
                                    <td className="siu-td-right siu-td-co">{fmt2(r.companyCommTotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="siu-tfoot-row">
                                <td colSpan={2} className="siu-td-left"><strong>Grand Total</strong></td>
                                <td className="siu-td-right"><strong>{fmt4(totals.qty)}</strong></td>
                                <td colSpan={5}></td>
                                <td colSpan={2}></td>
                                <td className="siu-td-right siu-td-inv"><strong>{fmt2(totals.invAmountMrp)}</strong></td>
                                <td className="siu-td-right siu-td-sp"><strong>{fmt2(totals.spCommTotal)}</strong></td>
                                <td className="siu-td-right siu-td-co"><strong>{fmt2(totals.companyCommTotal)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* ── Summary bar ── */}
                <div className="siu-summary">
                    <div className="siu-summary-cards">
                        <div className="siu-sum-card siu-sum-card-inv">
                            <div className="siu-sum-label">Total Invoice Amt (MRP basis)</div>
                            <div className="siu-sum-amount">₹ {fmt2(totals.invAmountMrp)}</div>
                        </div>
                        <div className="siu-sum-card siu-sum-card-sp">
                            <div className="siu-sum-label">Total SP Commission</div>
                            <div className="siu-sum-amount">₹ {fmt2(totals.spCommTotal)}</div>
                        </div>
                        <div className="siu-sum-card siu-sum-card-co">
                            <div className="siu-sum-label">Total Company Commission</div>
                            <div className="siu-sum-amount">₹ {fmt2(totals.companyCommTotal)}</div>
                        </div>
                        <div className="siu-sum-card siu-sum-card-bill">
                            <div className="siu-sum-label">Customer Bill Total</div>
                            <div className="siu-sum-amount siu-sum-amount-bill">₹ {fmt2(grandTotal)}</div>
                        </div>
                    </div>

                    {/* Formula legend */}
                    <div className="siu-legend si-no-print">
                        <div className="siu-legend-title">Calculation Reference</div>
                        <div className="siu-legend-grid">
                            <div><span className="siu-legend-key">Sale Price</span> = Dealer Price + Adj Price</div>
                            <div><span className="siu-legend-key">Inv Amt (MRP)</span> = Carat × MRP</div>
                            <div><span className="siu-legend-key">Co. Comm</span> = MRP − Sale Price − SP Comm</div>
                            <div><span className="siu-legend-key">SP/Co Comm Total</span> = unit × Carat</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="siu-doc-footer">
                    <div>Generated: {new Date().toLocaleString("en-IN")}</div>
                    <div className="siu-footer-confidential">CONFIDENTIAL — Internal Use Only</div>
                </div>

            </div>{/* /siu-document */}
        </div>
    );
};

export default SalesInvoiceUpdated;
