from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from typing import List, Optional

# ==========================================
# 1. DATABASE SETUP
# ==========================================
DATABASE_URL = "postgresql://postgres:1234@localhost/dukaan_db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# 2. DATABASE MODELS (Fresh Tables)
# ==========================================
class ProductDB(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sku = Column(String, unique=True, index=True)
    category = Column(String, index=True)
    cost_price = Column(Float)
    selling_price = Column(Float)
    stock_level = Column(Integer, default=0)
    low_stock_alert = Column(Integer, default=5)

class CustomerDB(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String, nullable=True)
    balance = Column(Float, default=0.0)
    orders = relationship("OrderDB", back_populates="customer")

class OrderDB(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    subtotal = Column(Float)
    discount = Column(Float, default=0.0)
    total = Column(Float)
    paid_amount = Column(Float)
    payment_method = Column(String, default="Cash") 
    status = Column(String, default="Completed")
    
    items = relationship("OrderItemDB", back_populates="order")
    customer = relationship("CustomerDB", back_populates="orders")

class OrderItemDB(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    price_at_sale = Column(Float)
    cost_at_sale = Column(Float, default=0.0) 
    
    order = relationship("OrderDB", back_populates="items")
    product = relationship("ProductDB")

class SettingsDB(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, default="")
    phone = Column(String, default="")
    email = Column(String, default="")
    address = Column(String, default="") 
    currency_symbol = Column(String, default="Rs.")
    tax_rate = Column(Float, default=0.0)
    low_stock_alert_level = Column(Integer, default=5)
    receipt_message = Column(String, default="Thank you for your business!")
    logo = Column(Text, nullable=True)

# Drop and recreate tables for a fresh start
# Base.metadata.drop_all(bind=engine)
# Base.metadata.create_all(bind=engine)

# ==========================================
# 3. FASTAPI SETUP
# ==========================================
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# ==========================================
# 4. PYDANTIC MODELS
# ==========================================
class ProductCreate(BaseModel): name: str; sku: str; category: str; cost_price: float; selling_price: float; stock_level: int; low_stock_alert: int
class CustomerCreate(BaseModel): name: str; phone: str; email: Optional[str] = None
class CartItem(BaseModel): product_id: int; quantity: int; price: float
class CheckoutRequest(BaseModel): cart_items: List[CartItem]; discount: float = 0.0; customer_id: Optional[int] = None; payment_method: str = "Cash"; paid_amount: float = 0.0
class SettingsUpdate(BaseModel): business_name: str; phone: str; email: str; address: str; currency_symbol: str; tax_rate: float; low_stock_alert_level: int; receipt_message: str; logo: Optional[str] = None

# ==========================================
# 5. API ENDPOINTS
# ==========================================

# --- PRODUCTS ---
@app.get("/products")
def get_products(db: Session = Depends(get_db)): return db.query(ProductDB).all()

@app.post("/products")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    new_product = ProductDB(**product.dict()); db.add(new_product); db.commit(); return new_product

@app.put("/products/{id}")
def update_product(id: int, product: ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(ProductDB).filter(ProductDB.id == id).first()
    if db_product:
        for key, value in product.dict().items(): setattr(db_product, key, value)
        db.commit(); return db_product

@app.delete("/products/{id}")
def delete_product(id: int, db: Session = Depends(get_db)):
    db_product = db.query(ProductDB).filter(ProductDB.id == id).first()
    if db_product:
        try: db.delete(db_product); db.commit(); return {"msg": "Deleted"}
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Cannot delete! Product is linked to past orders.")
    return {"msg": "Not found"}

# --- CUSTOMERS ---
@app.get("/customers")
def get_customers(db: Session = Depends(get_db)):
    customers = db.query(CustomerDB).all()
    # Sending total orders count with customer
    return[{"id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "balance": c.balance, "orders_count": len(c.orders)} for c in customers]

@app.post("/customers")
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    new_customer = CustomerDB(**customer.dict()); db.add(new_customer); db.commit(); return new_customer

@app.put("/customers/{id}")
def update_customer(id: int, customer: CustomerCreate, db: Session = Depends(get_db)):
    db_cust = db.query(CustomerDB).filter(CustomerDB.id == id).first()
    if db_cust:
        for key, value in customer.dict().items(): setattr(db_cust, key, value)
        db.commit(); return db_cust

# --- CHECKOUT / POS ---
@app.post("/checkout")
def process_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    subtotal = sum(i.price * i.quantity for i in req.cart_items)
    total = subtotal - req.discount
    new_order = OrderDB(customer_id=req.customer_id, subtotal=subtotal, discount=req.discount, total=total, paid_amount=req.paid_amount, payment_method=req.payment_method)
    db.add(new_order); db.commit(); db.refresh(new_order)
    
    for item in req.cart_items:
        prod = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        cost = prod.cost_price if prod else 0.0
        db.add(OrderItemDB(order_id=new_order.id, product_id=item.product_id, quantity=item.quantity, price_at_sale=item.price, cost_at_sale=cost))
        if prod: prod.stock_level -= item.quantity
    db.commit()
    return {"message": "Success", "order_id": new_order.id}

@app.get("/orders")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(OrderDB).order_by(OrderDB.id.desc()).all()
    result =[]
    for o in orders:
        items =[{"name": i.product.name if i.product else "Unknown", "qty": i.quantity, "price": i.price_at_sale} for i in o.items]
        result.append({"id": o.id, "date": o.date, "total": o.total, "status": o.status, "payment_method": o.payment_method, "customer_name": o.customer.name if o.customer else "Walk-in Customer", "items": items, "subtotal": o.subtotal, "discount": o.discount})
    return result

# --- DASHBOARD & REPORTS ---
@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    all_orders = db.query(OrderDB).all()
    today_sales = sum(o.total for o in all_orders if o.date.date() == today)
    
    recent_orders = db.query(OrderDB).order_by(OrderDB.id.desc()).limit(5).all()
    recent_list =[{"id": o.id, "time": o.date, "total": o.total, "customer": o.customer.name if o.customer else "Walk-in"} for o in recent_orders]
    
    # Graph Data (Last 7 Days by default)
    chart_data =[]
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        daily_total = sum(o.total for o in all_orders if o.date.date() == d)
        chart_data.append({"date": d.strftime("%b %d"), "revenue": daily_total})

    return {
        "today_sales": today_sales, "total_orders": len(all_orders),
        "total_products": db.query(ProductDB).count(), "low_stock_products": db.query(ProductDB).filter(ProductDB.stock_level <= ProductDB.low_stock_alert).count(),
        "recent_orders": recent_list, "chart_data": chart_data
    }

@app.get("/reports")
def get_reports(db: Session = Depends(get_db)):
    orders = db.query(OrderDB).all()
    revenue = sum(o.total for o in orders)
    
    # Calculate Profit
    total_cost = 0
    for o in orders:
        for i in o.items: total_cost += (i.cost_at_sale * i.quantity)
    profit = revenue - total_cost

    # Top Products
    product_sales = {}
    for o in orders:
        for i in o.items:
            name = i.product.name if i.product else "Unknown"
            product_sales[name] = product_sales.get(name, 0) + i.quantity
    top_products =[{"name": k, "qty": v} for k, v in sorted(product_sales.items(), key=lambda item: item[1], reverse=True)[:5]]

    daily = {}
    for o in orders:
        d = o.date.strftime("%Y-%m-%d")
        if d not in daily: daily[d] = {"orders": 0, "revenue": 0.0, "profit": 0.0}
        daily[d]["orders"] += 1
        daily[d]["revenue"] += o.total
        daily[d]["profit"] += sum((i.price_at_sale - i.cost_at_sale)*i.quantity for i in o.items)

    return {"total_revenue": revenue, "total_profit": profit, "total_orders": len(orders), "top_products": top_products, "daily":[{"date": k, **v} for k, v in daily.items()]}

# --- SETTINGS ---
@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    setting = db.query(SettingsDB).first()
    if not setting:
        setting = SettingsDB(); db.add(setting); db.commit(); db.refresh(setting)
    return setting

@app.post("/settings")
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db)):
    setting = db.query(SettingsDB).first()
    if not setting: setting = SettingsDB(); db.add(setting)
    for key, value in req.dict().items(): setattr(setting, key, value)
    db.commit()
    return {"msg": "Settings Saved"}

# Create a model for Login request
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
def login(req: LoginRequest):
    # Hardcoded credentials for now
    if req.username == "admin" and req.password == "admin123":
        return {"message": "Login Success", "user": "Administrator"}
    else:
        raise HTTPException(status_code=401, detail="Invalid Username or Password!")