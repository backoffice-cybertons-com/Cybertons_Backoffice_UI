import React, { useMemo } from 'react';
import ReactApexChart from "react-apexcharts";
import CountUp from "react-countup";
import { Card, CardBody, CardHeader, Col, UncontrolledTooltip } from 'reactstrap';
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

const SalesTrendChart = ({ dataColors, seriesData, filter }) => {
    const chartColors = getChartColorsArray(dataColors);

    // Group daily data into months for THIS_YEAR to avoid duplicate labels
    const processedData = useMemo(() => {
        if (!seriesData) return [];
        // Only aggregate for THIS_YEAR or when filter is missing (default yearly)
        if (filter !== "THIS_YEAR" && filter !== undefined) return seriesData;

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const grouped = {};

        // Initialize all 12 months with zero values to ensure they always show up
        months.forEach(m => {
            grouped[m] = { label: m, sales: 0, purchase: 0, expense: 0 };
        });

        seriesData.forEach(item => {
            let monthName = "";

            // 1. Search EVERY value in the object for a month name or abbreviation
            for (const key in item) {
                const val = (item[key] || '').toString();
                if (!val) continue;

                // Check for month abbreviation (Jan, Feb...)
                const found = months.find(m => val.toLowerCase().includes(m.toLowerCase()));
                if (found) {
                    monthName = found;
                    break;
                }

                // Check for month number (1-12) - only if key looks like a month field
                if (['month', 'period', 'm'].includes(key.toLowerCase())) {
                    if (!isNaN(val) && Number(val) >= 1 && Number(val) <= 12) {
                        monthName = months[Number(val) - 1];
                        break;
                    }
                }

                // Try date parsing
                const date = new Date(val);
                if (!isNaN(date.getTime()) && val.length > 5) { // length > 5 to avoid parsing simple numbers as years
                    monthName = date.toLocaleString('en-US', { month: 'short' });
                    break;
                }
            }

            if (monthName && grouped[monthName]) {
                grouped[monthName].sales += (item.sales || item.total_sales || item.Total_Sales || 0);
                grouped[monthName].purchase += (item.purchase || item.total_purchase || item.Total_Purchase || 0);
                grouped[monthName].expense += (item.expense || item.total_expense || item.Total_Expense || 0);
            }
        });

        // Always return all 12 months for the yearly view to keep the axis clean
        return months.map(m => grouped[m]);
    }, [seriesData, filter]);

    // Prepare series for ApexCharts with defensive mapping
    const series = [
        {
            name: 'Total Sales',
            data: processedData?.map(item => item.sales || item.total_sales || 0) || []
        },
        {
            name: 'Total Purchase',
            data: processedData?.map(item => item.purchase || item.total_purchase || 0) || []
        },
        {
            name: 'Total Expense',
            data: processedData?.map(item => item.expense || item.total_expense || 0) || []
        }
    ];

    const options = {
        chart: {
            height: 350,
            type: 'area',
            toolbar: {
                show: false,
            },
        },
        colors: chartColors,
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: 'smooth',
            width: 2,
        },
        fill: {
            opacity: 0.06,
            colors: chartColors,
            type: 'solid'
        },
        xaxis: {
            type: 'category',
            categories: processedData?.map((item, index) => {
                if (item.period_label) return item.period_label;
                if (item.label && (filter === "THIS_YEAR" || !filter)) return item.label;

                const rawLabel = (item.period || item.date || item.hour || '').toString();

                // If it's a date string, format based on filter
                if (rawLabel.includes('-') || rawLabel.includes('T')) {
                    const date = new Date(rawLabel);
                    if (!isNaN(date.getTime())) {
                        if (filter === "TODAY") return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                        
                        // Show "DD MMM" for any filter that results in a daily list (This Week, This Month, Prev Month, Custom)
                        if (filter === "THIS_WEEK" || filter === "THIS_MONTH" || filter === "PREV_MONTH" || filter === "CUSTOM") {
                            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        }
                    }
                }

                // If filter is TODAY and rawLabel is an hour number
                if (filter === "TODAY" && !isNaN(rawLabel) && rawLabel !== '') {
                    const hour = parseInt(rawLabel);
                    return hour >= 12 ? (hour === 12 ? "12 PM" : (hour - 12) + " PM") : (hour === 0 ? "12 AM" : hour + " AM");
                }

                return rawLabel || (index + 1).toString();
            }) || [],
            axisTicks: {
                show: true,
            },
            axisBorder: {
                show: true,
            },
            labels: {
                show: true,
                rotate: 0,
                rotateAlways: false,
                hideOverlappingLabels: true,
                minHeight: 30,
                style: {
                    colors: '#878a99',
                    fontSize: '12px',
                },
            }
        },
        yaxis: {
            labels: {
                show: true,
                minWidth: 40,
                formatter: function (value) {
                    if (value >= 10000000) return (value / 10000000).toFixed(1) + " Cr";
                    if (value >= 100000) return (value / 100000).toFixed(1) + " L";
                    if (value >= 1000) return (value / 1000).toFixed(1) + " K";
                    return value;
                }
            },
            tickAmount: 5,
        },
        tooltip: {
            shared: true,
            intersect: false,
            x: {
                show: true
            },
            y: {
                formatter: function (y) {
                    if (typeof y !== "undefined") {
                        return "₹ " + y.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    }
                    return y;
                }
            },
        },

        legend: {
            show: true,
            position: 'bottom',
            horizontalAlign: 'center',
            fontWeight: 500,
            offsetX: 0,
            offsetY: 10,
            itemMargin: {
                horizontal: 25,
                vertical: 5
            },
            markers: {
                width: 12,
                height: 12,
                radius: 12,
            }
        },
        markers: {
            size: 0,
        }
    };

    // Calculate totals for the header
    const totals = useMemo(() => {
        const totalSales = seriesData?.reduce((acc, curr) => acc + (curr.sales || curr.total_sales || 0), 0) || 0;
        const totalPurchase = seriesData?.reduce((acc, curr) => acc + (curr.purchase || curr.total_purchase || 0), 0) || 0;
        const totalExpense = seriesData?.reduce((acc, curr) => acc + (curr.expense || curr.total_expense || 0), 0) || 0;
        return { totalSales, totalPurchase, totalExpense };
    }, [seriesData]);

    const formatHeaderValue = (val) => {
        const absVal = Math.abs(val);
        if (absVal >= 10000000) return (val / 10000000).toFixed(2) + "Cr";
        if (absVal >= 100000) return (val / 100000).toFixed(2) + "L";
        if (absVal >= 1000) return (val / 1000).toFixed(2) + "K";
        return val.toFixed(2);
    };

    const formatFullCurrency = (val) => {
        return "₹ " + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <Col xl={6}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Financial Overview</h4>
                </CardHeader>
                <CardBody className="px-0">
                    <ul className="list-inline main-chart text-center mb-0">
                        <li className="list-inline-item chart-border-left me-0 border-0">
                            <h4 className="text-primary" id="total-sales-header">₹
                                <CountUp
                                    start={0}
                                    end={totals.totalSales}
                                    duration={3}
                                    formattingFn={formatHeaderValue}
                                />
                                <span className="text-muted d-inline-block fs-13 align-middle ms-2">Sales</span></h4>
                            <UncontrolledTooltip placement="top" target="total-sales-header">
                                {formatFullCurrency(totals.totalSales)}
                            </UncontrolledTooltip>
                        </li>
                        <li className="list-inline-item chart-border-left me-0">
                            <h4 id="total-purchase-header">₹
                                <CountUp
                                    start={0}
                                    end={totals.totalPurchase}
                                    duration={3}
                                    formattingFn={formatHeaderValue}
                                />
                                <span className="text-muted d-inline-block fs-13 align-middle ms-2">Purchase</span></h4>
                            <UncontrolledTooltip placement="top" target="total-purchase-header">
                                {formatFullCurrency(totals.totalPurchase)}
                            </UncontrolledTooltip>
                        </li>
                        <li className="list-inline-item chart-border-left me-0">
                            <h4 id="total-expense-header">₹
                                <CountUp
                                    start={0}
                                    end={totals.totalExpense}
                                    duration={3}
                                    formattingFn={formatHeaderValue}
                                />
                                <span className="text-muted d-inline-block fs-13 align-middle ms-2">Expense</span></h4>
                            <UncontrolledTooltip placement="top" target="total-expense-header">
                                {formatFullCurrency(totals.totalExpense)}
                            </UncontrolledTooltip>
                        </li>
                    </ul>

                    <div id="sales-trend-charts" dir="ltr">
                        <ReactApexChart
                            key={`sales-trend-${filter}`}
                            options={options}
                            series={series}
                            type="area"
                            height="350"
                            className="apex-charts"
                        />
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default SalesTrendChart;
