# TEKNIVOS POS System

A professional Point of Sale (POS) system built with **FastAPI**, **PostgreSQL**, and **React.js**.

##  Features

* **Sales Dashboard**

  * Real-time revenue insights with 7-day trend graphs

* **Advanced POS Billing**

  * Cart management with discount support (fixed & percentage)
  * Multiple payment methods: Cash, Card, Bank/Online

* **Inventory Management**

  * Full product CRUD operations
  * Low stock alerts
  * Cost and selling price tracking

* **Customer Management**

  * Customer ledger and balance tracking
  * Order history

* **Reporting**

  * Daily sales breakdown
  * Net profit calculation

* **Thermal Receipt**

  * 80mm professional receipt generation
  * Business logo and custom address support

* **Business Settings**

  * Dynamic branding and logo upload

##  Tech Stack

* **Backend:** FastAPI (Python), SQLAlchemy
* **Frontend:** React.js
* **Database:** PostgreSQL

##  Setup Instructions

### Backend

1. Install Python 3.9+
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```
3. Configure PostgreSQL database URL in `main.py`
4. Run server:

   ```bash
   uvicorn main:app --reload
   ```

### Frontend

1. Navigate to project folder:

   ```bash
   cd counter-app
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Start application:

   ```bash
   npm start
   ```

##  Branding

This software is branded as **TEKNIVOS**.
