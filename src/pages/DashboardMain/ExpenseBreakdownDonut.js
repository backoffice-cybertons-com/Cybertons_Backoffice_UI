import React, { useState, useMemo } from 'react';
import ReactApexChart from "react-apexcharts";
import { Card, CardBody, CardHeader, Col, UncontrolledTooltip } from 'reactstrap';
import Select from "react-select";
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

const formatAmt = (num) =>
    Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQty = (num) =>
    Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const getItemAmount = (item) =>
    parseFloat(item?.total_amount || item?.Total_Amount || item?.totalAmount || item?.amount || item?.TotalAmount || 0) || 0;

const getSubGroupName = (item) => {
    const raw = item?.sub_group ?? item?.Sub_Group ?? item?.subGroup ?? item?.SubGroup;
    const name = String(raw ?? '').trim();
    return name || 'Ungrouped';
};

const getPartyTypeName = (item) => {
    const raw = item?.party_type ?? item?.PartyType ?? item?.Party_Type ?? item?.partyType;
    const name = String(raw ?? '').trim();
    return name || 'Unknown';
};

const getAccountLabel = (item) =>
    item?.category || item?.Category || item?.party_type || item?.PartyType || 'Unknown';

const sortByAbsAmount = (list) =>
    [...list].sort((a, b) => Math.abs(getItemAmount(b)) - Math.abs(getItemAmount(a)));

const ExpenseBreakdownDonut = ({ expenseData, totalQtySold, partyTypesList, selectedPartyTypes, onPartyTypesChange, dataColors, loading }) => {
    const [viewMode, setViewMode] = useState("chart"); // "chart" or "list" or "group"
    const [expandedGroups, setExpandedGroups] = useState({});
    const chartColors = getChartColorsArray(dataColors);

    // Process data for Donut Chart
    const { series, labels } = useMemo(() => {
        if (!expenseData || !Array.isArray(expenseData)) {
            return { series: [], labels: [] };
        }
        
        return {
            series: expenseData.map(item => {
                const val = item.total_amount || item.Total_Amount || item.totalAmount || item.amount || 0;
                return parseFloat(val) || 0;
            }),
            labels: expenseData.map(item => item.category || item.Category || item.party_type || item.PartyType || 'Unknown')
        };
    }, [expenseData]);

    const nestByPartyType = (selectedPartyTypes?.length || 0) > 1;

    const groupedData = useMemo(() => {
        if (!expenseData || !Array.isArray(expenseData)) return [];
        const groups = new Map();
        expenseData.forEach((item) => {
            const key = getSubGroupName(item);
            if (!groups.has(key)) {
                groups.set(key, { category: key, sub_group: key, total_amount: 0, accounts: [] });
            }
            const group = groups.get(key);
            group.total_amount += getItemAmount(item);
            group.accounts.push(item);
        });
        return sortByAbsAmount(
            Array.from(groups.values()).map((group) => ({
                ...group,
                accounts: sortByAbsAmount(group.accounts),
            }))
        );
    }, [expenseData]);

    const groupedByPartyType = useMemo(() => {
        if (!expenseData || !Array.isArray(expenseData)) return [];
        const types = new Map();
        expenseData.forEach((item) => {
            const typeName = getPartyTypeName(item);
            const subName = getSubGroupName(item);
            if (!types.has(typeName)) {
                types.set(typeName, { party_type: typeName, total_amount: 0, groups: new Map() });
            }
            const type = types.get(typeName);
            const amount = getItemAmount(item);
            type.total_amount += amount;
            if (!type.groups.has(subName)) {
                type.groups.set(subName, { category: subName, sub_group: subName, total_amount: 0, accounts: [] });
            }
            const group = type.groups.get(subName);
            group.total_amount += amount;
            group.accounts.push(item);
        });

        const selectedOrder = (selectedPartyTypes || []).map((pt) => String(pt.value || '').toLowerCase());
        return Array.from(types.values())
            .map((type) => ({
                party_type: type.party_type,
                total_amount: type.total_amount,
                groups: sortByAbsAmount(
                    Array.from(type.groups.values()).map((group) => ({
                        ...group,
                        accounts: sortByAbsAmount(group.accounts),
                    }))
                ),
            }))
            .sort((a, b) => {
                const ia = selectedOrder.indexOf(String(a.party_type).toLowerCase());
                const ib = selectedOrder.indexOf(String(b.party_type).toLowerCase());
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return Math.abs(b.total_amount) - Math.abs(a.total_amount);
            });
    }, [expenseData, selectedPartyTypes]);

    const toggleGroup = (groupName) => {
        setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const options = {
        labels: labels,
        chart: {
            type: "donut",
            height: 333,
        },
        plotOptions: {
            pie: {
                donut: {
                    size: "70%",
                    labels: {
                        show: false,
                    }
                }
            }
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            show: true,
            position: "bottom",
            horizontalAlign: "center",
            fontWeight: 500,
            fontSize: '12px',
            markers: {
                width: 8,
                height: 8,
                radius: 6,
            },
            itemMargin: {
                horizontal: 8,
                vertical: 0
            }
        },
        stroke: {
            show: true,
            width: 2,
            colors: ["#fff"]
        },
        colors: chartColors,
        tooltip: {
            enabled: true,
            y: {
                formatter: (val) => {
                    const total = series.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                    return "₹" + (parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + " (" + percentage + "%)";
                }
            }
        }
    };

    return (
        <Col xl={5}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex border-bottom-dashed">
                    <h4 className="card-title mb-0 flex-grow-1">Expense Breakdown</h4>
                    <div className="flex-shrink-0 d-flex gap-2 align-items-center">
                        <div className="btn-group" role="group">
                            <button
                                type="button"
                                className={`btn btn-sm shadow-none ${viewMode === 'chart' ? 'btn-primary' : 'btn-soft-primary'}`}
                                onClick={() => setViewMode('chart')}
                                title="Chart View"
                            >
                                <i className="ri-donut-chart-fill"></i>
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm shadow-none ${viewMode === 'list' ? 'btn-primary' : 'btn-soft-primary'}`}
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                <i className="ri-list-check"></i>
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm shadow-none ${viewMode === 'group' ? 'btn-primary' : 'btn-soft-primary'}`}
                                onClick={() => setViewMode('group')}
                                title="Group Wise"
                            >
                                <i className="ri-node-tree"></i>
                            </button>
                        </div>
                        <div style={{ minWidth: '130px' }}>
                            <Select
                                isMulti
                                name="partyTypes"
                                options={partyTypesList?.map(pt => ({
                                    label: pt.partyTypeName || pt.PartyTypeName,
                                    value: pt.partyTypeName || pt.PartyTypeName
                                })) || []}
                                value={selectedPartyTypes}
                                onChange={onPartyTypesChange}
                                placeholder="Party Types"
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        minHeight: '30px',
                                        fontSize: '11px',
                                        borderColor: '#e9ebec'
                                    }),
                                    multiValue: (base) => ({
                                        ...base,
                                        backgroundColor: '#eff2f7',
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        zIndex: 9999
                                    })
                                }}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    <div id="expense-breakdown-charts" dir="ltr" style={{ position: 'relative', minHeight: '333px' }}>
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: '333px' }}>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : viewMode === 'chart' ? (
                            series.length > 0 ? (
                                <ReactApexChart
                                    key={`expense-donut-${selectedPartyTypes.length}`}
                                    options={options}
                                    series={series}
                                    type="donut"
                                    height="333"
                                    className="apex-charts"
                                />
                            ) : (
                                <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '333px' }}>
                                    <div className="text-muted">No expense data found for selected filters</div>
                                </div>
                            )
                        ) : (
                            <div className="table-responsive" style={{ height: '333px', overflowY: 'auto' }}>
                                <table className="table table-sm table-nowrap align-middle mb-0">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th scope="col">{viewMode === 'group' ? 'Group' : 'Category'}</th>
                                            <th scope="col" className="text-end">Qty</th>
                                            <th scope="col" className="text-end">Amount</th>
                                            <th scope="col" className="text-end">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const tableData = viewMode === 'group'
                                                ? (nestByPartyType ? groupedByPartyType : groupedData)
                                                : expenseData;
                                            if (!tableData || tableData.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan="4" className="text-center py-4 text-muted">No data found</td>
                                                    </tr>
                                                );
                                            }
                                            const total = tableData.reduce((sum, item) => sum + Math.abs(getItemAmount(item)), 0);
                                            const soldQty = Number(totalQtySold || 0);
                                            const qtyRatio = (amount) =>
                                                soldQty > 0 ? Math.abs(amount) / soldQty : 0;
                                            const amountCells = (amount, tipId, muted) => {
                                                const percentage = total > 0 ? ((Math.abs(amount) / total) * 100).toFixed(1) : 0;
                                                return [
                                                    <td key={`${tipId}-qty`} className={`text-end ${muted ? 'text-muted' : ''}`} id={tipId}>
                                                        {soldQty > 0 ? formatQty(qtyRatio(amount)) : '-'}
                                                        <UncontrolledTooltip placement="top" target={tipId}>
                                                            {formatAmt(Math.abs(amount))} / {formatQty(soldQty)} (amount ÷ total qty sold)
                                                        </UncontrolledTooltip>
                                                    </td>,
                                                    <td key={`${tipId}-amt`} className={`text-end ${muted ? 'text-muted' : 'fw-medium'}`}>
                                                        ₹{formatAmt(Math.abs(amount))}
                                                        {amount < 0 && <span className="text-danger ms-1">(Dr)</span>}
                                                    </td>,
                                                    <td key={`${tipId}-pct`} className="text-end text-muted">{percentage}%</td>
                                                ];
                                            };
                                            const expandBtn = (expanded, onClick, title) => (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-soft-secondary p-0 me-1 d-inline-flex align-items-center justify-content-center"
                                                    style={{ width: '18px', height: '18px', minWidth: '18px' }}
                                                    onClick={onClick}
                                                    title={title}
                                                >
                                                    <i className={expanded ? 'ri-subtract-line' : 'ri-add-line'} style={{ fontSize: '12px' }}></i>
                                                </button>
                                            );
                                            const pushAccountRows = (accounts, keyPrefix) => {
                                                (accounts || []).forEach((account, accIdx) => {
                                                    rows.push(
                                                        <tr key={`${keyPrefix}-acc-${accIdx}`}>
                                                            <td>
                                                                <div className="d-flex align-items-center ps-4">
                                                                    <span className="text-muted">{getAccountLabel(account)}</span>
                                                                </div>
                                                            </td>
                                                            {amountCells(getItemAmount(account), `${keyPrefix}-acc-${accIdx}`, true)}
                                                        </tr>
                                                    );
                                                });
                                            };
                                            const rows = [];

                                            if (viewMode === 'group' && nestByPartyType) {
                                                tableData.forEach((typeItem, typeIdx) => {
                                                    const typeKey = `type:${typeItem.party_type}`;
                                                    const typeExpanded = expandedGroups[typeKey] !== false;
                                                    rows.push(
                                                        <tr key={typeKey} className="table-light fw-bold">
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    {expandBtn(
                                                                        typeExpanded,
                                                                        () => toggleGroup(typeKey),
                                                                        typeExpanded ? 'Hide groups' : 'Show groups'
                                                                    )}
                                                                    <div className="flex-shrink-0 me-2" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: chartColors[typeIdx % chartColors.length] }}></div>
                                                                    <span className="flex-grow-1">{typeItem.party_type}</span>
                                                                </div>
                                                            </td>
                                                            {amountCells(getItemAmount(typeItem), `exp-qty-type-${typeIdx}`, false)}
                                                        </tr>
                                                    );
                                                    if (!typeExpanded) return;
                                                    (typeItem.groups || []).forEach((group, groupIdx) => {
                                                        const groupName = group.sub_group || group.category || 'Ungrouped';
                                                        const groupKey = `group:${typeItem.party_type}|${groupName}`;
                                                        const groupExpanded = !!expandedGroups[groupKey];
                                                        rows.push(
                                                            <tr key={groupKey} className="fw-medium">
                                                                <td>
                                                                    <div className="d-flex align-items-center ps-3">
                                                                        {expandBtn(
                                                                            groupExpanded,
                                                                            () => toggleGroup(groupKey),
                                                                            groupExpanded ? 'Hide accounts' : 'Show accounts'
                                                                        )}
                                                                        <div className="flex-shrink-0 me-2" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: chartColors[(typeIdx + groupIdx + 1) % chartColors.length] }}></div>
                                                                        <span className="flex-grow-1">{groupName}</span>
                                                                    </div>
                                                                </td>
                                                                {amountCells(getItemAmount(group), `exp-qty-type-${typeIdx}-grp-${groupIdx}`, false)}
                                                            </tr>
                                                        );
                                                        if (groupExpanded) {
                                                            pushAccountRows(group.accounts, `exp-qty-type-${typeIdx}-grp-${groupIdx}`);
                                                        }
                                                    });
                                                });
                                            } else {
                                                tableData.forEach((item, index) => {
                                                    const amount = getItemAmount(item);
                                                    const groupName = item.sub_group || item.category || 'Ungrouped';
                                                    const isExpanded = viewMode === 'group' && !!expandedGroups[groupName];
                                                    const label = viewMode === 'group'
                                                        ? groupName
                                                        : getAccountLabel(item);
                                                    rows.push(
                                                        <tr key={index} className={viewMode === 'group' ? 'fw-medium' : ''}>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    {viewMode === 'group' && expandBtn(
                                                                        isExpanded,
                                                                        () => toggleGroup(groupName),
                                                                        isExpanded ? 'Hide accounts' : 'Show accounts'
                                                                    )}
                                                                    <div className="flex-shrink-0 me-2" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: chartColors[index % chartColors.length] }}></div>
                                                                    <span className="flex-grow-1">{label}</span>
                                                                </div>
                                                            </td>
                                                            {amountCells(amount, `exp-qty-${viewMode}-${index}`, false)}
                                                        </tr>
                                                    );
                                                    if (viewMode === 'group' && isExpanded) {
                                                        pushAccountRows(item.accounts, `exp-qty-${viewMode}-${index}`);
                                                    }
                                                });
                                            }
                                            rows.push(
                                                <tr key="total" className="table-light fw-bold border-top-dashed">
                                                    <td className="ps-4">Total</td>
                                                    <td className="text-end" id={`exp-qty-total-${viewMode}`}>
                                                        {soldQty > 0 ? formatQty(qtyRatio(total)) : '-'}
                                                        <UncontrolledTooltip placement="top" target={`exp-qty-total-${viewMode}`}>
                                                            {formatAmt(total)} / {formatQty(soldQty)} (amount ÷ total qty sold)
                                                        </UncontrolledTooltip>
                                                    </td>
                                                    <td className="text-end">
                                                        ₹{formatAmt(total)}
                                                    </td>
                                                    <td className="text-end"></td>
                                                </tr>
                                            );
                                            return rows;
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default ExpenseBreakdownDonut;
