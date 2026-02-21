import React from 'react';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Input } from 'reactstrap';

export const getProductColumns = (handleEdit, handleDelete, columnFilters, setColumnFilters) => [
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
        sortable: true,
        wrap: true,
        grow: 2
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Base Unit</span>
                <Input
                    bsSize="sm"
                    className="mt-1"
                    value={columnFilters.baseUnit || ""}
                    onChange={e => setColumnFilters(prev => ({ ...prev, baseUnit: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        ),
        selector: row => row.baseUnit,
        sortable: true,
        width: '110px'
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
        width: '130px'
    },
    {
        name: (
            <div className="d-flex flex-column">
                <span>Tax Group</span>
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
        width: '130px'
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
        width: '110px'
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
        format: row => row.sellingPrice ? `₹${parseFloat(row.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00',
        width: '120px',
        right: true
    },
    {
        name: "Actions",
        cell: (row) => (
            <UncontrolledDropdown>
                <DropdownToggle
                    href="#"
                    className="btn btn-soft-secondary btn-sm"
                    tag="button"
                >
                    <i className="ri-more-fill" />
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <DropdownItem onClick={() => handleEdit(row)}>
                        <i className="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                    </DropdownItem>
                    <DropdownItem divider />
                    <DropdownItem
                        onClick={() => handleDelete(row.productId)}
                        className="text-danger"
                    >
                        <i className="ri-delete-bin-fill align-bottom me-2 text-danger"></i> Delete
                    </DropdownItem>
                </DropdownMenu>
            </UncontrolledDropdown>
        ),
        width: '80px'
    }
];
