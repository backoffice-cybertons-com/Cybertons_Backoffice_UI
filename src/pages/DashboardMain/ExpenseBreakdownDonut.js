import React, { useState, useMemo } from 'react';
import ReactApexChart from "react-apexcharts";
import { Card, CardBody, CardHeader, Col } from 'reactstrap';
import Select from "react-select";
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

const ExpenseBreakdownDonut = ({ expenseData, partyTypesList, selectedPartyTypes, onPartyTypesChange, dataColors, loading }) => {
    const [viewMode, setViewMode] = useState("chart"); // "chart" or "list"
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
        <Col xl={4}>
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
                                            <th scope="col">Category</th>
                                            <th scope="col" className="text-end">Amount</th>
                                            <th scope="col" className="text-end">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenseData && expenseData.length > 0 ? (
                                            (() => {
                                                const total = series.reduce((a, b) => a + Math.abs(b), 0);
                                                const rows = expenseData.map((item, index) => {
                                                    const amount = parseFloat(item.total_amount || item.TotalAmount || 0);
                                                    const percentage = total > 0 ? ((Math.abs(amount) / total) * 100).toFixed(1) : 0;
                                                    const label = item.category || item.Category || item.party_type || item.PartyType || 'Unknown';
                                                    return (
                                                        <tr key={index}>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    <div className="flex-shrink-0 me-2" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: chartColors[index % chartColors.length] }}></div>
                                                                    <span className="flex-grow-1">{label}</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-end fw-medium">
                                                                ₹{Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                {amount < 0 && <span className="text-danger ms-1">(Dr)</span>}
                                                            </td>
                                                            <td className="text-end text-muted">{percentage}%</td>
                                                        </tr>
                                                    );
                                                });
                                                // Add Total row
                                                rows.push(
                                                    <tr key="total" className="table-light fw-bold border-top-dashed">
                                                        <td className="ps-4">Total</td>
                                                        <td className="text-end">
                                                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="text-end"></td>
                                                    </tr>
                                                );
                                                return rows;
                                            })()
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="text-center py-4 text-muted">No data found</td>
                                            </tr>
                                        )}
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
