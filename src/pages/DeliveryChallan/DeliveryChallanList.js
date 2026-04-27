import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    CardBody,
    Row,
    Col,
    Card,
    Container,
    CardHeader,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
} from "reactstrap";
import { Link } from "react-router-dom";
import * as moment from "moment";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import TableContainer from "../../Components/Common/TableContainer";
import DeleteModal from "../../Components/Common/DeleteModal";

//Import actions
import {
    getDeliveryChallans as onGetDeliveryChallans,
    deleteDeliveryChallan as onDeleteDeliveryChallan,
} from "../../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";

import Loader from "../../Components/Common/Loader";

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createSelector } from "reselect";

const DeliveryChallanList = () => {
    const dispatch = useDispatch();

    const selectLayoutState = (state) => state.DeliveryChallan;
    const selectChallanProperties = createSelector(
        selectLayoutState,
        (state) => ({
            deliveryChallans: state.deliveryChallans,
            isDeliveryChallanSuccess: state.isDeliveryChallanSuccess,
            error: state.error,
        })
    );

    const {
        deliveryChallans, isDeliveryChallanSuccess, error
    } = useSelector(selectChallanProperties);

    //delete 
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedChallan, setSelectedChallan] = useState(null);

    useEffect(() => {
        dispatch(onGetDeliveryChallans());
    }, [dispatch]);

    // Delete Data
    const onClickDelete = (challan) => {
        setSelectedChallan(challan);
        setDeleteModal(true);
    };

    const handleDeleteChallan = () => {
        if (selectedChallan) {
            dispatch(onDeleteDeliveryChallan(selectedChallan.deliveryChallanId || selectedChallan.delivery_challan_id));
            setDeleteModal(false);
        }
    };

    const handleValidDate = date => {
        return moment(new Date(date)).format("DD MMM Y");
    };

    //Column
    const columns = useMemo(
        () => [
            {
                header: "Challan No",
                accessorKey: "challan_number",
                enableColumnFilter: true,
                cell: (cell) => {
                    const id = cell.row.original.delivery_challan_id || cell.row.original.deliveryChallanId;
                    return <Link to={`/delivery-challan/edit/${id}`} className="fw-medium link-primary">{cell.getValue() || "N/A"}</Link>;
                },
            },
            {
                header: "Date",
                accessorKey: "challan_date",
                enableColumnFilter: true,
                cell: (cell) => handleValidDate(cell.getValue()),
            },
            {
                header: "Customer",
                accessorKey: "customer_name", // From fn_delivery_challan_get_with_items
                enableColumnFilter: true,
            },
            {
                header: "Product",
                accessorKey: "product_name", // From fn_delivery_challan_get_with_items
                enableColumnFilter: true,
            },
            {
                header: "Quantity",
                accessorKey: "quantity",
                enableColumnFilter: true,
            },
            {
                header: "Rate",
                accessorKey: "rate",
                enableColumnFilter: true,
                cell: (cell) => (cell.getValue() || 0).toFixed(2),
            },
            {
                header: "Action",
                enableColumnFilter: false,
                enableSorting: false,
                cell: (cellProps) => {
                    const id = cellProps.row.original.delivery_challan_id || cellProps.row.original.deliveryChallanId;
                    return (
                        <UncontrolledDropdown >
                            <DropdownToggle
                                href="#"
                                className="btn btn-soft-secondary btn-sm dropdown"
                                tag="button"
                            >
                                <i className="ri-more-fill align-middle"></i>
                            </DropdownToggle>
                            <DropdownMenu className="dropdown-menu-end">
                                <DropdownItem href={`/delivery-challan/edit/${id}`}>
                                    <i className="ri-pencil-fill align-bottom me-2 text-muted"></i>{" "}
                                    Edit
                                </DropdownItem>
                                <DropdownItem
                                    href="#"
                                    onClick={() => onClickDelete(cellProps.row.original)}
                                >
                                    <i className="ri-delete-bin-fill align-bottom me-2 text-muted"></i>{" "}
                                    Delete
                                </DropdownItem>
                            </DropdownMenu>
                        </UncontrolledDropdown>
                    );
                },
            },
        ],
        []
    );

    document.title = "Delivery Challans | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <DeleteModal
                    show={deleteModal}
                    onDeleteClick={() => handleDeleteChallan()}
                    onCloseClick={() => setDeleteModal(false)}
                />
                <Container fluid>
                    <BreadCrumb title="Delivery Challan List (Detailed)" pageTitle="Sales" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <h5 className="card-title mb-0 flex-grow-1">Delivery Challans</h5>
                                        <div className="flex-shrink-0">
                                            <Link
                                                to="/delivery-challan/create"
                                                className="btn btn-danger"
                                            >
                                                <i className="ri-add-line align-bottom me-1"></i> New Delivery Challan
                                            </Link>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody className="pt-0">
                                    <div>
                                        {isDeliveryChallanSuccess ? (
                                            <TableContainer
                                                columns={columns}
                                                data={(deliveryChallans || [])}
                                                isGlobalFilter={true}
                                                customPageSize={100}
                                                className="custom-header-css"
                                                theadClass="text-muted text-uppercase"
                                                SearchPlaceholder='Search for challan, customer...'
                                            />
                                        ) : (<Loader error={error} />)
                                        }
                                        <ToastContainer closeButton={false} limit={1} />
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DeliveryChallanList;
