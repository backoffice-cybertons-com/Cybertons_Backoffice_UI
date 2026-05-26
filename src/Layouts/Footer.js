import React from 'react';
import { Col, Container, Row } from 'reactstrap';

const Footer = () => {
    return (
        <React.Fragment>
            <footer className="footer" style={{ height: '30px', padding: '5px 12px', display: 'flex', alignItems: 'center' }}>
                <Container fluid>
                    <Row>
                        <Col sm={6}>
                            Powered by SoftOnCloud
                        </Col>
                        
                    </Row>
                </Container>
            </footer>
        </React.Fragment>
    );
};

export default Footer;
