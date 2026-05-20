import React from 'react'

import { Container } from 'reactstrap'
import BreadCrumb from '../../../Components/Common/BreadCrumb'
import TasksKanban from './MainPage'




const Kanbanboard = () => {

    document.title = "Sticky Notes | SoftBook - React Admin & Dashboard Template";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Sticky Notes" pageTitle="Tasks" />
                    <TasksKanban />
                </Container>
            </div>
        </React.Fragment>


    )
}

export default Kanbanboard
