import React from 'react';
import { Input } from 'reactstrap';
import { formatToTwoDecimals } from '../../utils/numberUtils';

export const PRODUCT_EXPORT_COLUMNS = [
    { label: "Product ID", accessor: "productId" },
    { label: "Type", accessor: "type" },
    { label: "Product Name", accessor: "name" },
    { label: "Group", accessor: "productGroupName" },
    {
        label: "HSN/SAC",
        accessor: (row) => (row?.type === 'Goods' ? row?.hsnCode : row?.sacCode) || ""
    },
    { label: "Cost Price", accessor: "costPrice" },
    { label: "Sell Price", accessor: "sellingPrice" },
    { label: "MRP", accessor: "mrp" },
    { label: "GST", accessor: "taxGroupName" },
];

export const getProductColumns = (handleEdit, handleDelete, columnFilters, setColumnFilters, pagePermissions = { canEdit: false, canDelete: false }) => [
    {
        name: "Actions",
        cell: (row) => (
            <div className="d-flex align-items-center gap-1">
                {pagePermissions.canEdit && (
                    <button
                        type="button"
                        className="btn btn-sm btn-soft-info"
                        onClick={() => handleEdit(row)}
                        title="Edit"
                    >
                        <i className="ri-pencil-fill" />
                    </button>
                )}
                {pagePermissions.canDelete && (
                    <button
                        type="button"
                        className="btn btn-sm btn-soft-danger"
                        onClick={() => handleDelete(row.productId)}
                        title="Delete"
                    >
                        <i className="ri-delete-bin-fill" />
                    </button>
                )}
            </div>
        ),
        width: '110px',
        grow: 0
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Product ID</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.productId || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, productId: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.productId,
        sortable: true,
        width: '120px'
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Type</span>
                <Input
                    type="select"
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.type || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, type: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                >
                    <option value="">All</option>
                    <option value="Goods">Goods</option>
                    <option value="Service">Service</option>
                </Input>
            </div>
        ),
        selector: row => row.type,
        sortable: true,
        width: '120px'
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Product Name</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.name || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, name: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.name,
        cell: row => <div>{row.name || row.Name || row.productName}</div>,
        sortable: true,
        wrap: true,
        grow: 3
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Group</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.productGroupName || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, productGroupName: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.productGroupName,
        sortable: true,
        width: '150px'
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>HSN/SAC</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.hsnSac || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, hsnSac: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => (row.type === 'Goods' ? row.hsnCode : row.sacCode) || 'N/A',
        sortable: true,
        width: '120px'
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Cost Price</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.costPrice || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, costPrice: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.costPrice,
        sortable: true,
        format: row => formatToTwoDecimals(row.costPrice),
        width: '130px',
        style: { justifyContent: 'flex-end' }
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Sell Price</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.sellingPrice || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, sellingPrice: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.sellingPrice,
        sortable: true,
        format: row => formatToTwoDecimals(row.sellingPrice),
        width: '130px',
        style: { justifyContent: 'flex-end' }
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>MRP</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.mrp || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, mrp: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.mrp,
        sortable: true,
        format: row => formatToTwoDecimals(row.mrp),
        width: '130px',
        style: { justifyContent: 'flex-end' }
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>GST</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.taxGroupName || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, taxGroupName: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.taxGroupName,
        sortable: true,
        width: '140px'
    },
];
