import React from 'react';
import { Input } from 'reactstrap';

const getInvLink = (row) => {
    const id = row.spUniqueCode || row.invId || row.id;

    if (!id) {
        console.log("❌ Missing ID", row);
        return null;
    }

    const type = (row.invType || '').toLowerCase();

    if (type.includes('sale')) return `/sales-order/edit/${id}?view=true`;
    if (type.includes('purchase')) return `/purchase-transaction/edit/${id}?view=true`;

    console.log("❌ Unknown Type:", row.invType);
    return null;
};

export const getSalePurInvWiseColumns = (columnFilters, setColumnFilters) => {
    const renderHeader = (title, inputNode) => (
        <div className="w-100 px-1">
            <div
                className="fw-medium text-nowrap text-start d-block"
                style={{ minHeight: "20px", lineHeight: "20px" }}
            >
                {title}
            </div>
            <div style={{ minHeight: "32px", marginTop: "4px" }}>
                {inputNode}
            </div>
        </div>
    );

    const defaultColumn = (span, accessor, width, align = 'left', sortable = true) => ({
        name: renderHeader(
            span,
            <Input
                placeholder='Filter...'
                bsSize="sm"
                className="w-100"
                value={columnFilters[accessor] || ""}
                onChange={e => setColumnFilters(prev => ({ ...prev, [accessor]: e.target.value }))}
                onClick={e => e.stopPropagation()}
            />
        ),
        selector: row => row[accessor],
        cell: row => (
            <div className={`w-100 ${align === 'right' ? 'text-end' : 'text-start'}`}>
                {row[accessor]}
            </div>
        ),
        sortable: sortable,
        width: width,
    });

    return [
        {
            name: renderHeader(
                "Date",
                <Input
                    bsSize="sm"
                    className="w-100"
                    value={columnFilters.invDate || ""}
                    placeholder='Filter...'
                    onChange={e => setColumnFilters(prev => ({ ...prev, invDate: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            ),
            selector: row => {
                if (!row.invDate) return '';
                const d = new Date(row.invDate);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.toLocaleString('en-GB', { month: 'short' });
                const year = String(d.getFullYear()).slice(-2);
                return `${day} ${month} ${year}`;
            },
            sortable: true,
            width: '120px'
        },
        {
            name: renderHeader(
                "Invoice No",
                <Input
                    placeholder='Filter...'
                    bsSize="sm"
                    className="w-100"
                    value={columnFilters.invNo || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, invNo: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            ),
            selector: row => row.invNo,
           cell: row => {
                const link = getInvLink(row);

                if (link) {
                    return (
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fw-medium link-primary text-decoration-none"
                        >
                            {row.invNo}
                            <i className="ri-pencil-fill ms-1"></i>
                        </a>
                    );
                }

                return (
                    <span className="fw-medium text-muted">
                        {row.invNo || '-'}
                    </span>
                );
            },
            sortable: true,
            width: '140px'
        },
        {
            name: renderHeader(
                "Type",
                <Input
                    placeholder='Filter...'
                    type="select"
                    bsSize="sm"
                    className="w-100"
                    value={columnFilters.invType || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, invType: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                >
                    <option value="">All</option>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                </Input>
            ),
            selector: row => row.invType,
            sortable: true,
            width: '110px'
        },
        {
            name: renderHeader(
                "Customer",
                <Input
                    placeholder='Filter...'
                    bsSize="sm"
                    className="w-100"
                    value={columnFilters.customerName || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, customerName: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            ),
            selector: row => row.customerName,
            sortable: true,
            wrap: true,
            grow: 2
        },
        defaultColumn("Total Qty", "qty", "110px", "right"),
        defaultColumn("Avg Price", "avgPrice", "110px", "right"),
        defaultColumn("Taxable Amt", "taxableAmount", "120px", "right"),
        defaultColumn("IGST", "igst", "100px", "right"),
        defaultColumn("CGST", "cgst", "100px", "right"),
        defaultColumn("SGST", "sgst", "100px", "right"),
        defaultColumn("Tax Amount", "taxAmount", "110px", "right"),
        defaultColumn("Total Amount", "totalAmount", "120px", "right"),
        defaultColumn("Exp/Discount", "expDiscount", "120px", "right"),
        defaultColumn("Round Off", "roundOff", "110px", "right"),
        defaultColumn("Final Amount", "finalAmount", "120px", "right"),
        defaultColumn("Add Price", "addPrice", "110px", "right"),
        defaultColumn("Add Amount", "addAmount", "110px", "right"),
    ];
};
