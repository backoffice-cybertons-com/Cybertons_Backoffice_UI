import React from 'react';
import { Container } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import ProductForm from './ProductForm';

const ProductCreate = () => {
    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Create Product" pageTitle="Product Master" />
                <ProductForm isEdit={false} />
            </Container>
        </div>
    );
};

export default ProductCreate;
