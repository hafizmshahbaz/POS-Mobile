/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';

const API_URL = `http://192.168.100.15:8000`;

const SimpleLineChart = ({ data }) => {
    if (!data || data.length === 0) return <p style={{color:'gray', textAlign:'center', marginTop:'50px'}}>No data available</p>;
    const maxVal = Math.max(...data.map(d => d.revenue), 100);
    const chartHeight = 200; const chartWidth = 600;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * chartWidth;
        const y = chartHeight - ((d.revenue / maxVal) * chartHeight);
        return `${x},${y}`;
    }).join(" ");

    return (
        <div style={{ width: '100%', overflowX: 'auto', paddingTop:'20px' }}>
            <svg width="100%" height="250" viewBox={`-20 -20 ${chartWidth + 40} ${chartHeight + 60}`} preserveAspectRatio="none">
                {[0, 0.5, 1].map(ratio => (
                    <g key={ratio}>
                        <line x1="0" y1={chartHeight * ratio} x2={chartWidth} y2={chartHeight * ratio} stroke="#e5e7eb" strokeDasharray="4" />
                        <text x="-10" y={(chartHeight * ratio) + 5} fontSize="10" fill="#6B7280" textAnchor="end">{Math.round(maxVal * (1 - ratio))}</text>
                    </g>
                ))}
                <polyline fill="none" stroke="#2563EB" strokeWidth="3" points={points} />
                <polygon fill="rgba(37, 99, 235, 0.1)" points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`} />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * chartWidth;
                    const y = chartHeight - ((d.revenue / maxVal) * chartHeight);
                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="4" fill="#2563EB" />
                            <text x={x} y={chartHeight + 20} fontSize="10" fill="#6B7280" textAnchor="middle">{d.date}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

function App() {
    const[activeTab, setActiveTab] = useState(() => localStorage.getItem("activeTab") || "Dashboard"); 
    const[isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    const [cart, setCart] = useState(() => { const s = localStorage.getItem("posCart"); return s ? JSON.parse(s) :[]; });
    
    useEffect(() => { localStorage.setItem("activeTab", activeTab); }, [activeTab]);
    useEffect(() => { localStorage.setItem("posCart", JSON.stringify(cart)); }, [cart]);

    const[products, setProducts] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({ business_name: "TEKNIVOS", phone: "", email: "", address: "", currency_symbol: "Rs.", tax_rate: 0, low_stock_alert_level: 5, receipt_message: "Thank you!", logo: "" });

    const[productModal, setProductModal] = useState({ open: false, isEdit: false, id: null });
    const[customerModal, setCustomerModal] = useState({ open: false, isEdit: false, id: null });
    const[orderDetails, setOrderDetails] = useState(null); 
    const [checkoutReceipt, setCheckoutReceipt] = useState(null); 
    const [checkoutModal, setCheckoutModal] = useState(false); 
    
    const [posCategory, setPosCategory] = useState("All");
    const [posSearch, setPosSearch] = useState("");
    const [prodSearch, setProdSearch] = useState("");
    const [custSearch, setCustSearch] = useState("");
    const [orderDateFilter, setOrderDateFilter] = useState("");

    const[formData, setFormData] = useState({ name: "", sku: "", category: "", cost_price: "", selling_price: "", stock_level: "", low_stock_alert: "5" });
    const[customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "" });

    const [discountType, setDiscountType] = useState("none"); 
    const[discountValue, setDiscountValue] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const[paymentMethod, setPaymentMethod] = useState("Cash");
    const [amountReceived, setAmountReceived] = useState("");

    const loadProducts = () => fetch(`${API_URL}/products`).then(res => res.json()).then(setProducts).catch(console.error);
    const loadDashboard = () => fetch(`${API_URL}/dashboard`).then(res => res.json()).then(setDashboardStats).catch(console.error);
    const loadCustomers = () => fetch(`${API_URL}/customers`).then(res => res.json()).then(setCustomers).catch(console.error);
    const loadOrders = () => fetch(`${API_URL}/orders`).then(res => res.json()).then(setOrders).catch(console.error);
    const loadSettings = () => fetch(`${API_URL}/settings`).then(res => res.json()).then(setSettings).catch(console.error);

    useEffect(() => {
        loadSettings();
        if (activeTab === "Products" || activeTab === "POS/Billing" || activeTab === "Dashboard") loadProducts();
        if (activeTab === "Dashboard") loadDashboard();
        if (activeTab === "Customers" || activeTab === "POS/Billing") loadCustomers();
        if (activeTab === "Orders") loadOrders();
    }, [activeTab]);

    const saveProduct = (e) => {
        e.preventDefault();
        const method = productModal.isEdit ? 'PUT' : 'POST';
        const url = productModal.isEdit ? `${API_URL}/products/${productModal.id}` : `${API_URL}/products`;
        fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
        .then(() => { loadProducts(); setProductModal({ open: false }); }).catch(() => alert("Network Error"));
    };
    
    const openEditProduct = (p) => { 
        setFormData({ name: p.name, sku: p.sku, category: p.category, cost_price: p.cost_price, selling_price: p.selling_price, stock_level: p.stock_level, low_stock_alert: p.low_stock_alert }); 
        setProductModal({ open: true, isEdit: true, id: p.id }); 
    };

    const deleteProduct = (id) => { 
        if (window.confirm("Are you sure?")) {
            fetch(`${API_URL}/products/${id}`, { method: 'DELETE' }).then(async (res) => {
                if (!res.ok) { const err = await res.json(); alert("⚠️ ERROR: " + err.detail); } 
                else { loadProducts(); }
            }).catch(() => alert("Network Error"));
        }
    };

    const saveCustomer = (e) => {
        e.preventDefault();
        const method = customerModal.isEdit ? 'PUT' : 'POST';
        const url = customerModal.isEdit ? `${API_URL}/customers/${customerModal.id}` : `${API_URL}/customers`;
        fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customerForm) })
        .then(() => { loadCustomers(); setCustomerModal({ open: false }); }).catch(() => alert("Network Error"));
    };

    const saveSettings = () => {
        fetch(`${API_URL}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
        .then(() => alert("Settings Saved!")).catch(() => alert("Error"));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setSettings({ ...settings, logo: reader.result }); reader.readAsDataURL(file); }
    };

    const addToCart = (product) => {
        if (product.stock_level <= 0) return alert("Out of stock!");
        const existing = cart.find(i => i.product_id === product.id);
        if (existing) {
            if (existing.quantity >= product.stock_level) return alert("Stock limit reached!");
            setCart(cart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else setCart([...cart, { product_id: product.id, name: product.name, price: product.selling_price, quantity: 1, max: product.stock_level }]);
    };
    const updateQty = (id, delta) => { setCart(cart.map(i => { if(i.product_id === id) { const n = i.quantity + delta; if(n > 0 && n <= i.max) return {...i, quantity: n}; } return i; })); };
    const removeFromCart = (id) => setCart(cart.filter(i => i.product_id !== id));
    const clearCart = () => { if(window.confirm("Clear cart?")) { setCart([]); setDiscountValue(0); setDiscountType('none'); setSelectedCustomer(""); } };

    const subtotal = cart.reduce((t, i) => t + (i.price * i.quantity), 0);
    let discountAmt = discountType === 'fixed' ? Number(discountValue) : (discountType === 'percent' ? subtotal * (Number(discountValue) / 100) : 0);
    const finalTotal = subtotal - discountAmt;

    const processPayment = () => {
        if (cart.length === 0) return;
        const payload = { cart_items: cart, discount: discountAmt, customer_id: selectedCustomer ? parseInt(selectedCustomer) : null, payment_method: paymentMethod, paid_amount: amountReceived || finalTotal };
        fetch(`${API_URL}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(res => res.json()).then(data => { 
            const cust = customers.find(c => c.id === parseInt(selectedCustomer));
            setCheckoutReceipt({ order_id: data.order_id, date: new Date(), items: [...cart], subtotal, discount: discountAmt, total: finalTotal, payment_method: paymentMethod, customer_name: cust ? cust.name : "Walk-in Customer" }); 
            setCart([]); setDiscountValue(0); setDiscountType('none'); setSelectedCustomer(""); setAmountReceived(""); setCheckoutModal(false); loadProducts(); 
        });
    };

    const categories =["All", ...new Set(products.map(p => p.category).filter(Boolean))];
    const filteredPOS = products.filter(p => (posCategory === "All" || p.category === posCategory) && p.name.toLowerCase().includes(posSearch.toLowerCase()));
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.includes(prodSearch));
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch));
    const filteredOrders = orderDateFilter ? orders.filter(o => o.date.startsWith(orderDateFilter)) : orders;

    const styles = {
        appContainer: { display: 'flex', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
        sidebar: { width: isSidebarOpen ? '260px' : '0px', backgroundColor: '#0B132B', color: '#8A94A6', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', overflow: 'hidden', flexShrink: 0 },
        menuItem: (isActive) => ({ padding: '12px 15px', margin: '5px 0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '15px', fontWeight: isActive ? 'bold' : 'normal', backgroundColor: isActive ? '#1D4ED8' : 'transparent', color: isActive ? 'white' : '#8A94A6' }),
        card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
        th: { padding: '15px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6B7280', fontSize: '12px', textTransform: 'uppercase' },
        td: { padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '14px' },
        input: { padding: '10px 15px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', width: '100%', boxSizing: 'border-box' },
        btnPrimary: { backgroundColor: '#1D4ED8', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modalBox: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
        payBtn: (active) => ({ flex: 1, padding: '15px', borderRadius: '8px', border: active ? '2px solid #1D4ED8' : '1px solid #d1d5db', backgroundColor: active ? '#eff6ff' : 'white', color: active ? '#1D4ED8' : '#374151', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }),
        btnAction: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', margin: '0 5px', color: '#6B7280' }
    };

    const tabs =[{ n: "Dashboard", i: "📊" }, { n: "POS/Billing", i: "🛒" }, { n: "Products", i: "📦" }, { n: "Customers", i: "👥" }, { n: "Orders", i: "📜" }, { n: "Reports", i: "📈" }, { n: "Settings", i: "⚙️" }];
    const receiptDataToPrint = checkoutReceipt || orderDetails;

    return (
        <div style={styles.appContainer}>
            <style>{`
                @media (max-width: 768px) {
                    .sidebar-container { position: absolute; z-index: 2000; height: 100%; box-shadow: 10px 0 15px rgba(0,0,0,0.1); }
                    .dashboard-grid { grid-template-columns: 1fr 1fr !important; }
                    .pos-container { flex-direction: column !important; }
                    .pos-right { margin-top: 20px; }
                    .table-wrapper { overflow-x: auto; }
                    .modal-box { width: 95% !important; padding: 15px !important; }
                }
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { margin: 0; padding: 0; background-color: white; }
                    body * { visibility: hidden; }
                    #printable-slip, #printable-slip * { visibility: visible; }
                    #printable-slip { position: absolute; left: 0; top: 0; width: 76mm; margin: 0 auto; padding: 4mm; color: black; font-family: 'Courier New', Courier, monospace; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div style={styles.sidebar} className="no-print sidebar-container">
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1C253C', minWidth: '260px' }}>
                    <img src="/image.png" alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
                    <div><h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>TEKNIVOS</h3></div>
                </div>
                <div style={{ padding: '15px 10px', flex: 1, overflowY: 'auto', minWidth: '240px' }}>
                    {tabs.map(tab => <div key={tab.n} onClick={() => { setActiveTab(tab.n); if(window.innerWidth < 768) setSidebarOpen(false); }} style={styles.menuItem(activeTab === tab.n)}><span>{tab.i}</span> {tab.n}</div>)}
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="no-print">
                <div style={{ backgroundColor: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>☰</button>
                        <div><h2 style={{ margin: 0, color: '#111827', fontSize: window.innerWidth < 768 ? '18px' : '24px' }}>{activeTab}</h2></div>
                    </div>
                </div>

                <div style={{ padding: window.innerWidth < 768 ? '15px' : '30px', overflowY: 'auto', flex: 1 }}>

                    {activeTab === "Dashboard" && dashboardStats && (
                        <div>
                            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                                <div style={styles.card}><small>TODAY</small><h2>{settings.currency_symbol}{dashboardStats.today_sales}</h2></div>
                                <div style={styles.card}><small>ORDERS</small><h2>{dashboardStats.total_orders}</h2></div>
                                <div style={styles.card}><small>PRODUCTS</small><h2>{dashboardStats.total_products}</h2></div>
                                <div style={styles.card}><small>CUSTOMERS</small><h2>{customers.length}</h2></div>
                            </div>
                            <div style={{...styles.card, marginBottom: '20px'}}><h3>Sales Trend</h3><SimpleLineChart data={dashboardStats.chart_data} /></div>
                        </div>
                    )}

                    {activeTab === "POS/Billing" && (
                        <div className="pos-container" style={{ display: 'flex', gap: '20px', height: '100%' }}>
                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                <input type="text" placeholder="Search product..." value={posSearch} onChange={e=>setPosSearch(e.target.value)} style={{...styles.input, marginBottom: '15px'}} />
                                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px' }}>
                                    {categories.map(cat => <button key={cat} onClick={() => setPosCategory(cat)} style={{ padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', border: posCategory === cat ? 'none' : '1px solid #d1d5db', backgroundColor: posCategory === cat ? '#1D4ED8' : 'white', color: posCategory === cat ? 'white' : '#374151', whiteSpace:'nowrap' }}>{cat}</button>)}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', overflowY: 'auto', paddingBottom:'20px' }}>
                                    {filteredPOS.map(p => (
                                        <div key={p.id} onClick={() => addToCart(p)} style={{ ...styles.card, cursor: 'pointer', textAlign: 'center', padding: '15px' }}>
                                            <h4 style={{ margin: '0 0 5px 0' }}>{p.name}</h4><p style={{ margin: '0', color: '#1D4ED8', fontWeight: 'bold' }}>{settings.currency_symbol}{p.selling_price}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pos-right" style={{ ...styles.card, flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
                                <div style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}><h3>Cart ({cart.length})</h3><button onClick={clearCart} style={{color: 'red', border:'none', background:'none'}}>Clear</button></div>
                                <div style={{ padding: '10px', flex: 1, overflowY: 'auto', backgroundColor:'#f9fafb' }}>
                                    {cart.map(item => (
                                        <div key={item.product_id} style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{item.name}</strong><button onClick={() => removeFromCart(item.product_id)} style={{border:'none', background:'none'}}>✖</button></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop:'10px' }}>
                                                <div style={{ display: 'flex', border:'1px solid #eee', borderRadius:'4px' }}>
                                                    <button onClick={() => updateQty(item.product_id, -1)} style={{padding:'2px 8px'}}>-</button>
                                                    <span style={{width:'30px', textAlign:'center'}}>{item.quantity}</span>
                                                    <button onClick={() => updateQty(item.product_id, 1)} style={{padding:'2px 8px'}}>+</button>
                                                </div>
                                                <strong>{settings.currency_symbol}{item.price * item.quantity}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ padding: '15px', borderTop: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}><span>Total</span><span>{settings.currency_symbol}{finalTotal}</span></div>
                                    <button onClick={() => setCheckoutModal(true)} style={{...styles.btnPrimary, width: '100%', padding: '15px'}}>Complete Sale</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === "Products" || activeTab === "Customers" || activeTab === "Orders") && (
                        <div style={styles.card} className="table-wrapper">
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                {activeTab === "Products" && <input placeholder="Search..." value={prodSearch} onChange={e=>setProdSearch(e.target.value)} style={{...styles.input, width:'200px'}}/>}
                                {activeTab === "Customers" && <input placeholder="Search..." value={custSearch} onChange={e=>setCustSearch(e.target.value)} style={{...styles.input, width:'200px'}}/>}
                                {activeTab === "Products" && <button onClick={()=>setProductModal({open:true, isEdit:false})} style={styles.btnPrimary}>+ Add</button>}
                            </div>
                             <table style={styles.table}>
                                <thead>
                                    {activeTab === "Products" && <tr><th style={styles.th}>Name</th><th style={styles.th}>Price</th><th style={styles.th}>Stock</th><th style={styles.th}>Actions</th></tr>}
                                    {activeTab === "Customers" && <tr><th style={styles.th}>Name</th><th style={styles.th}>Phone</th><th style={styles.th}>Balance</th></tr>}
                                    {activeTab === "Orders" && <tr><th style={styles.th}>Order #</th><th style={styles.th}>Total</th><th style={styles.th}>Action</th></tr>}
                                </thead>
                                <tbody>
                                    {activeTab === "Products" && filteredProducts.map(p => <tr key={p.id}><td style={styles.td}>{p.name}</td><td style={styles.td}>{p.selling_price}</td><td style={styles.td}>{p.stock_level}</td><td style={styles.td}><button onClick={()=>openEditProduct(p)} style={styles.btnAction}>Edit</button><button onClick={()=>deleteProduct(p.id)} style={{...styles.btnAction, color:'red'}}>Del</button></td></tr>)}
                                    {activeTab === "Customers" && filteredCustomers.map(c => <tr key={c.id}><td style={styles.td}>{c.name}</td><td style={styles.td}>{c.phone}</td><td style={styles.td}>{c.balance}</td></tr>)}
                                    {activeTab === "Orders" && filteredOrders.map(o => <tr key={o.id}><td style={styles.td}>#{o.id}</td><td style={styles.td}>{o.total}</td><td style={styles.td}><button onClick={()=>setOrderDetails(o)} style={styles.btnAction}>View</button></td></tr>)}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {activeTab === "Settings" && (
                        <div style={styles.card}>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{marginBottom:'20px'}}/>
                            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                <input value={settings.business_name} onChange={e=>setSettings({...settings, business_name:e.target.value})} style={styles.input} placeholder="Business Name"/>
                                <input value={settings.phone} onChange={e=>setSettings({...settings, phone:e.target.value})} style={styles.input} placeholder="Phone"/>
                                <button onClick={saveSettings} style={styles.btnPrimary}>Save</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {checkoutModal && (
                <div style={styles.modalOverlay}><div style={styles.modalBox} className="modal-box">
                    <h2>Checkout</h2>
                    <div style={{margin:'20px 0', fontSize:'24px', textAlign:'center'}}>Total: {settings.currency_symbol}{finalTotal}</div>
                    <div style={{display:'flex', gap:'5px', marginBottom:'20px'}}>
                        <button onClick={()=>setPaymentMethod("Cash")} style={styles.payBtn(paymentMethod==="Cash")}>Cash</button>
                        <button onClick={()=>setPaymentMethod("Card")} style={styles.payBtn(paymentMethod==="Card")}>Card</button>
                    </div>
                    <button onClick={processPayment} style={{...styles.btnPrimary, width:'100%', padding:'15px'}}>Complete Payment</button>
                    <button onClick={()=>setCheckoutModal(false)} style={{width:'100%', marginTop:'10px', background:'none', border:'none'}}>Cancel</button>
                </div></div>
            )}

            {receiptDataToPrint && (
                <div style={styles.modalOverlay}><div style={{...styles.modalBox, width:'350px'}} className="modal-box">
                    <div id="printable-slip">
                        <div style={{textAlign:'center', borderBottom:'1px dashed #000', paddingBottom:'10px'}}>
                            <h3>{settings.business_name}</h3>
                        </div>
                        <table style={{width:'100%', fontSize:'12px', marginTop:'10px'}}>
                             <tbody>
                                {receiptDataToPrint.items.map((i,idx)=>(
                                    <tr key={idx}><td>{i.name}</td><td>{i.quantity}</td><td style={{textAlign:'right'}}>{(i.price * i.quantity)}</td></tr>
                                ))}
                             </tbody>
                        </table>
                        <div style={{borderTop:'1px dashed #000', marginTop:'10px', paddingTop:'10px', textAlign:'right'}}>
                            <strong>Total: {settings.currency_symbol}{receiptDataToPrint.total}</strong>
                        </div>
                    </div>
                    <button onClick={()=>window.print()} style={{...styles.btnPrimary, width:'100%', marginTop:'20px'}} className="no-print">Print Slip</button>
                    <button onClick={()=>{setCheckoutReceipt(null); setOrderDetails(null)}} style={{width:'100%', marginTop:'10px'}} className="no-print">Close</button>
                </div></div>
            )}

            {productModal.open && (
                <div style={styles.modalOverlay} className="no-print"><div style={styles.modalBox} className="modal-box">
                    <h3>{productModal.isEdit ? 'Edit' : 'Add'} Product</h3>
                    <form onSubmit={saveProduct} style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'15px'}}>
                        <input placeholder="Name" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required style={styles.input}/>
                        <input placeholder="Price" type="number" value={formData.selling_price} onChange={e=>setFormData({...formData, selling_price:e.target.value})} required style={styles.input}/>
                        <input placeholder="Stock" type="number" value={formData.stock_level} onChange={e=>setFormData({...formData, stock_level:e.target.value})} required style={styles.input}/>
                        <button type="submit" style={styles.btnPrimary}>Save</button>
                        <button type="button" onClick={()=>setProductModal({open:false})} style={{background:'none', border:'none'}}>Cancel</button>
                    </form>
                </div></div>
            )}

            {customerModal.open && (
                <div style={styles.modalOverlay} className="no-print"><div style={styles.modalBox} className="modal-box">
                    <h3>{customerModal.isEdit ? 'Edit' : 'Add'} Customer</h3>
                    <form onSubmit={saveCustomer} style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'15px'}}>
                        <input placeholder="Name" value={customerForm.name} onChange={e=>setCustomerForm({...customerForm, name:e.target.value})} required style={styles.input}/>
                        <input placeholder="Phone" value={customerForm.phone} onChange={e=>setCustomerForm({...customerForm, phone:e.target.value})} required style={styles.input}/>
                        <button type="submit" style={styles.btnPrimary}>Save</button>
                        <button type="button" onClick={()=>setCustomerModal({open:false})} style={{background:'none', border:'none'}}>Cancel</button>
                    </form>
                </div></div>
            )}
        </div>
    );
}

export default App;
