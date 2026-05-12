import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Label,
  Input,
  Row,
  Col
} from 'reactstrap';

const AdvancedFilterModal = ({ isOpen, toggle, filters, setFilters, users }) => {
  const handleChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      user: "",
      priority: "",
      status: "",
      quick: "All",
      category: "",
      dateRange: "All",
      sortBy: "DateAsc"
    });
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="md">
      <ModalHeader toggle={toggle}>
        <i className="ri-filter-2-line align-bottom me-1"></i> Advanced Task Filters
      </ModalHeader>
      <ModalBody>
        <Row>
          <Col md={12}>
            <FormGroup>
              <Label for="filterUser">Assigned User</Label>
              <Input
                type="select"
                id="filterUser"
                value={filters.user}
                onChange={(e) => handleChange("user", e.target.value)}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.userId} value={user.userId?.toString()}>
                    {user.fullName}
                  </option>
                ))}
              </Input>
            </FormGroup>
          </Col>
        </Row>

        <Row className="mt-2">
          <Col md={6}>
            <FormGroup>
              <Label for="filterStatus">Status</Label>
              <Input
                type="select"
                id="filterStatus"
                value={filters.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Canceled">Canceled</option>
              </Input>
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="filterPriority">Priority</Label>
              <Input
                type="select"
                id="filterPriority"
                value={filters.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </Input>
            </FormGroup>
          </Col>
        </Row>

        <Row className="mt-2">
          <Col md={6}>
            <FormGroup>
              <Label for="filterDate">Date Range</Label>
              <Input
                type="select"
                id="filterDate"
                value={filters.dateRange}
                onChange={(e) => handleChange("dateRange", e.target.value)}
              >
                <option value="All">All Time</option>
                <option value="Upcoming">Upcoming Only</option>
                <option value="Overdue">Overdue Only</option>
              </Input>
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="filterSort">Sort By</Label>
              <Input
                type="select"
                id="filterSort"
                value={filters.sortBy}
                onChange={(e) => handleChange("sortBy", e.target.value)}
              >
                <option value="DateAsc">Date (Oldest First)</option>
                <option value="DateDesc">Date (Newest First)</option>
                <option value="Priority">Priority (Highest First)</option>
              </Input>
            </FormGroup>
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={resetFilters}>Reset All</Button>
        <Button color="primary" onClick={toggle}>Apply Filters</Button>
      </ModalFooter>
    </Modal>
  );
};

export default AdvancedFilterModal;
