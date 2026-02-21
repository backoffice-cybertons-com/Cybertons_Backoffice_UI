import React from 'react';
import { useParams } from 'react-router-dom';
import { Container } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import ProductForm from './ProductForm';

const ProductEdit = () => {
    const { id } = useParams();

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Edit Product" pageTitle="Product Master" />
                <ProductForm isEdit={true} productId={id} />
            </Container>
        </div>
    );
};

export default ProductEdit;
