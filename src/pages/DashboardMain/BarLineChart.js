import React, { useMemo } from 'react';
import ReactApexChart from "react-apexcharts";
import CountUp from "react-countup";
import { Card, CardBody, CardHeader, Col, UncontrolledTooltip } from 'reactstrap';
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

const BarLineChart = ({ dataColors, seriesData, filter }) => {
    const chartColors = getChartColorsArray(dataColors);

    // ─── Aggregate monthly data for THIS_YEAR (same logic as SalesTrendChart) ───
    const processedData = useMemo(() => {
        if (!seriesData) return [];
        if (filter !== "THIS_YEAR" && filter !== undefined) return seriesData;

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const grouped = {};

        // Pre-fill all 12 months with zeros
        months.forEach(m => {
            grouped[m] = { label: m, total_sales: 0, total_purchase: 0, total_expense: 0, profit_loss: 0 };
        });

        seriesData.forEach(item => {
            let monthName = "";

            for (const key in item) {
                const val = (item[key] || '').toString();
                if (!val) continue;

                const found = months.find(m => val.toLowerCase().includes(m.toLowerCase()));
                if (found) { monthName = found; break; }

                if (['month', 'period', 'm'].includes(key.toLowerCase())) {
                    if (!isNaN(val) && Number(val) >= 1 && Number(val) <= 12) {
                        monthName = months[Number(val) - 1];
                        break;
                    }
                }

                const date = new Date(val);
                if (!isNaN(date.getTime()) && val.length > 5) {
                    monthName = date.toLocaleString('en-US', { month: 'short' });
                    break;
                }
            }

            if (monthName && grouped[monthName]) {
                grouped[monthName].total_sales += (item.total_sales || item.sales || 0);
                grouped[monthName].total_purchase += (item.total_purchase || item.purchase || 0);
                grouped[monthName].total_expense += (item.total_expense || item.expense || 0);
                grouped[monthName].profit_loss += (item.profit_loss || 0);
            }
        });

        return months.map(m => grouped[m]);
    }, [seriesData, filter]);

    // ─── Build xAxis categories (mirrors SalesTrendChart logic) ────────────────
    const categories = useMemo(() => {
        if (!processedData || processedData.length === 0) return [];

        if (filter === "THIS_YEAR" || !filter) {
            return processedData.map(item => item.label || '');
        }

        return processedData.map((item, index) => {
            if (item.period_label) return item.period_label;

            const rawLabel = (item.period_date || item.period_start || item.period || item.date || item.hour || '').toString();

            if (rawLabel.includes('-') || rawLabel.includes('T')) {
                const date = new Date(rawLabel);
                if (!isNaN(date.getTime())) {
                    if (filter === "TODAY") return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    if (filter === "THIS_WEEK" || filter === "THIS_MONTH") {
                        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    }
                }
            }

            if (filter === "TODAY" && !isNaN(rawLabel) && rawLabel !== '') {
                const hour = parseInt(rawLabel);
                return hour >= 12
                    ? (hour === 12 ? "12 PM" : (hour - 12) + " PM")
                    : (hour === 0 ? "12 AM" : hour + " AM");
            }

            return rawLabel || (index + 1).toString();
        });
    }, [processedData, filter]);

    // ─── Series ────────────────────────────────────────────────────────────────
    const series = [
        {
            name: 'Total Sales',
            type: 'bar',
            data: processedData?.map(item => item.total_sales || item.sales || 0) || []
        },
        {
            name: 'Total Purchase',
            type: 'bar',
            data: processedData?.map(item => item.total_purchase || item.purchase || 0) || []
        },
        {
            name: 'Total Expense',
            type: 'line',
            data: processedData?.map(item => item.total_expense || item.expense || 0) || []
        },
        {
            name: 'Profit / Loss',
            type: 'line',
            data: processedData?.map(item => item.profit_loss || 0) || []
        }
    ];

    // ─── ApexCharts options (mirrors ProjectsOverview design) ─────────────────
    const options = {
        chart: {
            height: 374,
            type: 'line',
            toolbar: { show: false },
            animations: { enabled: true, easing: 'easeinout', speed: 600 }
        },
        stroke: {
            curve: 'smooth',
            dashArray: [0, 0, 4, 4],   // bars have 0, lines are dashed
            width: [0, 0, 2, 2],   // bars inherit bar width, lines = 2px
        },
        fill: {
            opacity: [0.85, 0.85, 0.12, 0.12],
            type: ['solid', 'solid', 'gradient', 'gradient'],
        },
        markers: {
            size: [0, 0, 0, 0],
            strokeWidth: 0,
            hover: { size: 0 }
        },
        plotOptions: {
            bar: {
                columnWidth: '30%',
                barHeight: '70%',
                borderRadius: 3,
            }
        },
        colors: chartColors,
        xaxis: {
            type: 'category',
            categories: categories,
            axisTicks: { show: false },
            axisBorder: { show: false },
            labels: {
                show: true,
                rotate: 0,
                hideOverlappingLabels: true,
                style: {
                    colors: '#878a99',
                    fontSize: '12px',
                }
            }
        },
        yaxis: {
            labels: {
                formatter: function (value) {
                    if (value >= 10000000) return (value / 10000000).toFixed(1) + " Cr";
                    if (value >= 100000) return (value / 100000).toFixed(1) + " L";
                    if (value >= 1000) return (value / 1000).toFixed(1) + " K";
                    return value;
                },
                style: {
                    colors: '#878a99',
                    fontSize: '11px',
                }
            },
            tickAmount: 5,
        },
        grid: {
            show: true,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } },
            padding: { top: 0, right: -2, bottom: 15, left: 10 }
        },
        legend: {
            show: true,
            horizontalAlign: 'center',
            offsetX: 0,
            offsetY: 10,
            markers: {
                width: 9,
                height: 9,
                radius: 6,
            },
            itemMargin: { horizontal: 20, vertical: 5 }
        },
        tooltip: {
            shared: true,
            y: [
                {
                    formatter: y =>
                        typeof y !== "undefined"
                            ? "₹ " + y.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                            : y
                },
                {
                    formatter: y =>
                        typeof y !== "undefined"
                            ? "₹ " + y.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                            : y
                },
                {
                    formatter: y =>
                        typeof y !== "undefined"
                            ? "₹ " + y.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                            : y
                },
                {
                    formatter: y =>
                        typeof y !== "undefined"
                            ? "₹ " + y.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                            : y
                },
            ]
        }
    };

    // ─── Header totals ─────────────────────────────────────────────────────────
    const totals = useMemo(() => {
        const src = seriesData || [];
        return {
            totalSales: src.reduce((a, c) => a + (c.total_sales || c.sales || 0), 0),
            totalPurchase: src.reduce((a, c) => a + (c.total_purchase || c.purchase || 0), 0),
            totalExpense: src.reduce((a, c) => a + (c.total_expense || c.expense || 0), 0),
            totalPL: src.reduce((a, c) => a + (c.profit_loss || 0), 0),
        };
    }, [seriesData]);

    const fmt = (val) => {
        const abs = Math.abs(val);
        if (abs >= 10000000) return (val / 10000000).toFixed(2) + "Cr";
        if (abs >= 100000) return (val / 100000).toFixed(2) + "L";
        if (abs >= 1000) return (val / 1000).toFixed(2) + "K";
        return val.toFixed(2);
    };

    const fullCurrency = val =>
        "₹ " + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <Col xl={6}>
            <Card className="card-height-100">
                {/* ── Title ── */}
                <CardHeader className="border-0 align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Financial Comparison</h4>
                </CardHeader>

                {/* ── KPI sub-header row (mirrors ProjectsOverview style) ── */}
                <CardHeader className="p-0 border-0 bg-light-subtle">
                    <div className="row g-0 text-center">

                        <div className="col-6 col-sm-3">
                            <div className="p-3 border border-dashed border-start-0">
                                <h5 className="mb-1 text-primary" id="bl-sales-header">
                                    ₹<CountUp start={0} end={totals.totalSales} duration={3} formattingFn={fmt} />
                                </h5>
                                <p className="text-muted mb-0 fs-13">Sales</p>
                                <UncontrolledTooltip placement="top" target="bl-sales-header">
                                    {fullCurrency(totals.totalSales)}
                                </UncontrolledTooltip>
                            </div>
                        </div>

                        <div className="col-6 col-sm-3">
                            <div className="p-3 border border-dashed border-start-0">
                                <h5 className="mb-1" id="bl-purchase-header">
                                    ₹<CountUp start={0} end={totals.totalPurchase} duration={3} formattingFn={fmt} />
                                </h5>
                                <p className="text-muted mb-0 fs-13">Purchase</p>
                                <UncontrolledTooltip placement="top" target="bl-purchase-header">
                                    {fullCurrency(totals.totalPurchase)}
                                </UncontrolledTooltip>
                            </div>
                        </div>

                        <div className="col-6 col-sm-3">
                            <div className="p-3 border border-dashed border-start-0">
                                <h5 className="mb-1 text-danger" id="bl-expense-header">
                                    ₹<CountUp start={0} end={totals.totalExpense} duration={3} formattingFn={fmt} />
                                </h5>
                                <p className="text-muted mb-0 fs-13">Expense</p>
                                <UncontrolledTooltip placement="top" target="bl-expense-header">
                                    {fullCurrency(totals.totalExpense)}
                                </UncontrolledTooltip>
                            </div>
                        </div>

                        <div className="col-6 col-sm-3">
                            <div className="p-3 border border-dashed border-start-0 border-end-0">
                                <h5
                                    className={`mb-1 ${totals.totalPL >= 0 ? 'text-success' : 'text-danger'}`}
                                    id="bl-pl-header"
                                >
                                    ₹<CountUp start={0} end={Math.abs(totals.totalPL)} duration={3} formattingFn={fmt} />
                                    {totals.totalPL < 0 && <span className="fs-12 ms-1">(Loss)</span>}
                                </h5>
                                <p className="text-muted mb-0 fs-13">Profit / Loss</p>
                                <UncontrolledTooltip placement="top" target="bl-pl-header">
                                    {fullCurrency(totals.totalPL)}
                                </UncontrolledTooltip>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                {/* ── Chart ── */}
                <CardBody className="p-0 pb-2">
                    <div dir="ltr" className="apex-charts">
                        <ReactApexChart
                            key={filter}        // force re-render on filter change
                            dir="ltr"
                            options={options}
                            series={series}
                            type="line"
                            height="374"
                            className="apex-charts"
                        />
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default BarLineChart;
