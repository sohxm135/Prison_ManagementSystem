# Prison Management System

The Prison Management System is a web-based platform designed to modernize the administration of correctional facilities. It replaces manual record-keeping with a centralized, secure database that supports real-time access, role-based permissions, and efficient facility operations.

## Project Overview

This system allows correctional staff and administrators to manage:
- Inmate registration and profiles
- Sentence tracking
- Cell allocation
- Parole and visitation scheduling
- Disciplinary and behavioral records
- Staff credentials
- Case and lawyer information
- Library and labor assignments

The application is modular and scalable, suitable for small to mid-sized correctional institutions seeking a robust, low-maintenance solution.

## Project Report

For detailed documentation and analysis, refer to the [Project Report](https://docs.google.com/document/d/1fdqVWQo-CYJJzd1Lyrjf8fKkTsQSv_9FoGKKS06aUTQ/edit?usp=sharing).


## Technology Stack

**Frontend:**  
HTML, CSS, JavaScript

**Backend:**  
Node.js, Express.js

**Database:**  
SQLPlus (Relational DBMS)

## Key Features

- Role-based access for Admins, Wardens, Jailors, and Guards
- Secure authentication and credential management
- Real-time dashboards for statistics and alerts
- Automated cell capacity tracking and inmate allocation
- Visitation scheduling and approval workflows
- Integrated case, parole, and lawyer management
- Behavioral and disciplinary logging
- Library and labor management modules
- Fully normalized relational schema (up to BCNF)

## Database Design

The database uses a fully normalized relational structure with entities such as:
- Prisoner, Cell, Block, Jail
- Warden, Jailor, Guard (Employee generalization)
- Visitor_Log, Case, Lawyer
- Medical_Log, Disciplinary_Actions, Phone_Call_Log
- Book_Inventory, Issue_Log (Library module)

Normalization levels:
- 1NF: Atomic attributes
- 2NF: No partial dependencies
- 3NF: No transitive dependencies
- BCNF: Every determinant is a candidate key

## System Architecture

The system follows a three-tier architecture:
- **Presentation Layer:** Frontend (HTML, CSS, JavaScript)
- **Application Layer:** Node.js and Express.js API and business logic
- **Data Layer:** SQLPlus-managed RDBMS for persistent, structured storage

## User Roles

- **Admin:** Full access to user and system management
- **Warden:** Manage prisoner information, staff, and incidents
- **Jailor:** Monitor cells, access behavioral logs
- **Guard:** View inmate and call logs, update daily activity

## Sample Modules

- Inmate Management
- Staff Management
- Visitation Scheduling
- Case Tracking
- Disciplinary Monitoring
- Library Management
- Work Assignment
- Parole and Release Tracking

## Results

The system has been implemented and tested with mock data for:
- Login and authentication
- Dashboards
- Admin and Warden profiles
- Prisoner and case records
- Library and labor logs

## Future Enhancements

- Biometric authentication (e.g., fingerprint or iris scan)
- IoT integration for real-time inmate tracking
- Cloud deployment and mobile access
- AI-based behavior prediction and risk analytics
- Police and court system API integrations
- Inmate self-service kiosks

## Authors

- S. Aditya (230911208)
- Soham Singh (230911528)
- Abhinav Medarametla (230911488)
- Akshar Agrawal (230911534)

## Institution

Manipal Institute of Technology, Department of I&CT  
April 2025


