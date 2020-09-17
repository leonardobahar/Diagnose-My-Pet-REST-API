import mysqlConn from './util/mysql-conn.js'
import {Payment, Penjualan, VendorMakesMenu} from "./model";
import {Menu, Vendor} from "./model";
import {
    ADMIN_VALIDATED,
    ALL, CANCELLED, INVALID, INVALID_FINAL,
    MISMATCH_OBJ_TYPE,
    NO_AFFECTED_ROWS,
    NO_SUCH_CONTENT,
    ONLY_WITH_VENDORS, ORDER_PROCESSING,
    SOMETHING_WENT_WRONG, VALID, WRONG_BODY_FORMAT
} from "./strings";

export class KunyahAccessObj{
	constructor(host, user, password, dbname){
		this._host = host
		this._user = user
		this._password = password
		this._dbname = dbname

		this._initSqlStmt = `CREATE TABLE IF NOT EXISTS customer(
			customer_id int(11) PRIMARY KEY AUTO_INCREMENT,
			fullname varchar(255) NOT NULL,
			email varchar(255) UNIQUE NOT NULL,
			mobile varchar(255) NOT NULL,
			password varchar(255) NOT NULL
		) ENGINE=InnoDB;
		
		CREATE TABLE IF NOT EXISTS customer_address(
			address_id INT(11) AUTO_INCREMENT PRIMARY KEY,
			customer_id INT(11) NOT NULL,
			address VARCHAR(255) NOT NULL,
			latitude VARCHAR(255) NOT NULL,
			longtitude VARCHAR(255) NOT NULL,
			isDeleted tinyint(1) DEFAULT 0,
			FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE
		)ENGINE=InnoDB;
		
		CREATE TABLE IF NOT EXISTS vendor(
			vendor_id int(11) PRIMARY KEY AUTO_INCREMENT,
			vendor_name varchar(255) UNIQUE NOT NULL,
			address varchar(255) NOT NULL,
			contact_person varchar(255) NOT NULL,
			email varchar(255) NOT NULL,
			mobile varchar(255) NOT NULL,
			latitude varchar(255) NOT NULL,
			longtitude varchar(255) NOT NULL,
			isBlocked varchar(1) DEFAULT 0
		) ENGINE=InnoDB;
		
		CREATE TABLE IF NOT EXISTS menu(
			menu_id int(11) PRIMARY KEY AUTO_INCREMENT,
			menu_name varchar(255) UNIQUE NOT NULL,
			price int(11) DEFAULT 0,
			thumbnail_path varchar(255) NULL
		) ENGINE=InnoDB;
		
		CREATE TABLE IF NOT EXISTS vendor_makes_menu(
			id int(11) AUTO_INCREMENT PRIMARY KEY,
			menu_id int(11),
			vendor_id int(11),
			min_order int(11) NOT NULL,
			max_order int(11) NOT NULL,
			vendor_price int(11) NOT NULL,
			isDeleted tinyint(1) DEFAULT 0,
			FOREIGN KEY (menu_id) REFERENCES menu(menu_id) ON DELETE CASCADE,
			FOREIGN KEY (vendor_id) REFERENCES vendor(vendor_id) ON DELETE CASCADE
		) ENGINE=InnoDB;
		
		CREATE TABLE IF NOT EXISTS orders(
			order_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    		email varchar(255) NOT NULL,
    		status varchar(255) DEFAULT "Belum Bayar",
    		order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    		order_item LONGTEXT,
    		order_total INT,
    		shipping_address_id INT(11) NOT NULL,
    		FOREIGN KEY (email) REFERENCES customer(email) ON DELETE CASCADE,
    		FOREIGN KEY (shipping_address_id) REFERENCES customer_address(address_id)
		) ENGINE=InnoDB;
		
		CREATE TABLE IF NOT EXISTS payment(
			payment_id INT(11) AUTO_INCREMENT PRIMARY KEY,
			order_id INT(11) NOT NULL,
			amount int(11) DEFAULT 0,
			customer_email varchar(255),
			payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			payment_status varchar(255) DEFAULT 'SUBMITTED',
			payment_proof_path varchar(255) NULL,
			FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
			FOREIGN KEY (customer_email) REFERENCES customer(email) ON DELETE CASCADE
		) ENGINE=InnoDB`;

		const handleConnection = ()=>{
			return new Promise(resolve => {
				this.mysqlConn = new mysqlConn(
					this._host,
					this._user,
					this._password,
					this._dbname
				)

				this.mysqlConn.connect(err=>{
					if(err) {  // or restarting (takes a while sometimes).
						console.error('error when connecting to db:', err);
						setTimeout(handleConnection(), 2000);
					}else{
						this.mysqlConn.query(this._initSqlStmt, (err, res, fields)=>{
							if (err){
								throw err
							} else{
								//console.info("CONNECTION TO DB TABLES SUCCESS")
								resolve(1)
							}
						})
					}
				})

				this.mysqlConn.on('error', (err)=>{
					console.log('db error', err);
					if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
						handleConnection()                         // lost due to either server restart, or a
					} else {                                      // connnection idle timeout (the wait_timeout
						throw err                                  // server variable configures this)
					}
				})
			})
		}

		handleConnection()
	}

	retrieveMenu(criteria){
		return new Promise((resolve, reject)=>{
			if (criteria === ONLY_WITH_VENDORS) {
				const stmt = `SELECT m.menu_id, m.menu_name, m.price, m.thumbnail_path, (SELECT MIN(min_order) FROM vendor_makes_menu WHERE menu_id = m.menu_id AND isDeleted = 0) AS min_order, (SELECT MAX(max_order) FROM vendor_makes_menu WHERE menu_id = m.menu_id) AS max_order FROM menu m WHERE (SELECT COUNT(id) FROM vendor_makes_menu WHERE menu_id = m.menu_id) > 0;`;
				this.mysqlConn.query(stmt, (err, res) => {
					if (!err) {
						if (res.length > 0) {
							let resultArray = res.map(eachRes => {
								return new Menu(eachRes.menu_id, eachRes.menu_name, eachRes.price, eachRes.min_order, eachRes.max_order)
							})
							console.log("Retrieve Menu Request")
							resolve(resultArray)
						} else {
							resolve(0)
						}
					} else {
						reject(err)
					}
				})
			}else if (criteria === ALL){
				const stmt = `SELECT m.menu_id, m.menu_name, m.price, m.thumbnail_path, (SELECT MIN(min_order) FROM vendor_makes_menu WHERE menu_id = m.menu_id AND isDeleted = 0) AS min_order, (SELECT MAX(max_order) FROM vendor_makes_menu WHERE menu_id = m.menu_id) AS max_order FROM menu m;`
				this.mysqlConn.query(stmt, (err, res) => {
					if (!err) {
						if (res.length > 0) {
							let resultArray = res.map(eachRes => {
								return new Menu(eachRes.menu_id, eachRes.menu_name, eachRes.price, eachRes.min_order, eachRes.max_order)
							})
							console.log("Retrieve Menu Request")
							resolve(resultArray)
						} else {
							resolve(0)
						}
					} else {
						reject(err)
					}
				})
			}else{
				reject(WRONG_BODY_FORMAT)
			}
		})
	}

	retrieveVendorsCookingMenu(menuId){
		return new Promise((resolve, reject)=>{
			const stmt = "SELECT * FROM vendor_makes_menu INNER JOIN vendor ON vendor_makes_menu.vendor_id = vendor.vendor_id WHERE menu_id = ? AND vendor_makes_menu.isDeleted = 0"
			this.mysqlConn.query(stmt, [menuId], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(JSON.parse(JSON.stringify(res)))
				}
			})
		})
	}

	insertMenu(menu) {
		return new Promise((resolve, reject) => {
			if (menu instanceof Menu) {
				this.mysqlConn.query("INSERT INTO `menu`(`menu_name`, `price`) VALUES (?, ?)",
					[menu.getName(), menu.getPrice()], (err, res) => {
						if (err) {
							reject(err)
						} else {
							menu.setId(res.insertId)
							resolve(menu)
						}
					})
			} else {
				reject("Type menu mismatch")
			}
		})
	}

	updateMenuPrice(menu_id, price){
		return new Promise((resolve, reject) => {
			const stmt = "UPDATE menu SET price = ? WHERE menu_id = ?"
			this.mysqlConn.query(stmt, [price, menu_id], (err, res)=>{
				if (err) {
					reject(err)
				} else {
					if (res.affectedRows === 0){
						reject(NO_SUCH_CONTENT)
					}else {
						resolve(1)
					}
				}
			})
		})
	}

	insertVendorMakesMenu(vendorMakesMenu){
		return new Promise((resolve, reject)=>{
			if (vendorMakesMenu instanceof VendorMakesMenu){
				this.mysqlConn.query("INSERT INTO vendor_makes_menu (menu_id, vendor_id, min_order, max_order, vendor_price) VALUES (?,?,?,?,?)", [vendorMakesMenu._menuId, vendorMakesMenu._vendorId, vendorMakesMenu._minOrder, vendorMakesMenu._maxOrder, vendorMakesMenu._vendorPrice], (err, res)=>{
					if (err){
						reject(err)
					}else{
						vendorMakesMenu._vendorMakesMenuId = res.insertId
						resolve(vendorMakesMenu)
					}
				})
			}else{
				reject("Type vendorMakesMenu mismatch")
			}
		})
	}

	retrieveVendorMakesMenu(){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query("")
		})
	}

	updateVendorMakesMenu(vendorMakesMenu) {
		return new Promise((resolve, reject) => {
			if (vendorMakesMenu instanceof VendorMakesMenu) {
				this.mysqlConn.query("UPDATE vendor_makes_menu SET min_order=?, max_order=?, vendor_price=? WHERE id = ?", [vendorMakesMenu._minOrder, vendorMakesMenu._maxOrder, vendorMakesMenu._vendorPrice, vendorMakesMenu._vendorMakesMenuId], (err, res) => {
					if (err) {
						reject(err)
					} else {
						if (res.affectedRows === 0){
							reject(NO_SUCH_CONTENT)
						}else {
							resolve(1)
						}
					}
				})
			} else {
				reject("Type vendorMakesMenu mismatch")
			}
		})
	}

	unbindVendorMakesMenu(vendorMakesMenuId){
		return new Promise((resolve, reject) => {
			const stmt = "UPDATE vendor_makes_menu SET isDeleted = 1 WHERE id = ?"
			this.mysqlConn.query(stmt, [vendorMakesMenuId], (err, res)=>{
				if (err){
					reject(err)
				}else{
					if (res.affectedRows === 0){
						reject(NO_SUCH_CONTENT)
					}else {
						resolve(1)
					}
				}
			})
		})
	}

	updateMenuImage(menuId, filePath){
		return new Promise((resolve, reject) => {
			this.mysqlConn.query(`UPDATE menu SET thumbnail_path = "${filePath}" WHERE menu_id = ${menuId}`, (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(true)
				}
			})
		})
	}

	getMenuImageName(menuId){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query(`SELECT thumbnail_path FROM menu WHERE menu_id = ${menuId};`, (err,res)=>{
				if (!err){
					resolve(res[0])
				}else{
					reject(err)
				}
			})
		})
	}

	// Vendor
	addVendor(vendor) {
		return new Promise((resolve, reject) => {
			if (vendor instanceof Vendor) {
				this.mysqlConn.query("INSERT INTO `vendor`(`vendor_name`, `address`, `contact_person`, `email`, `mobile`, `latitude`, `longtitude`) VALUES (?, ?, ?, ?, ?, ?, ?)",
					[vendor.getName(), vendor.getAddress(), vendor._contactPerson, vendor.getEmail(), vendor.getMobile(), vendor.getLatitude(), vendor.getLongitude()], (err, res) => {
						if (err) {
							reject(err)
						} else {
							vendor.setId(res.insertId)
							resolve(vendor)
						}
					})
			} else {
				reject("Type vendor mismatch")
			}
		})
	}

	updateVendor(vendor_id, name, address, email, mobile, latitude, longitude){
		return new Promise((resolve, reject) => {
			this.mysqlConn.query("UPDATE vendor SET vendor_name = ?, address = ?, email = ?, mobile = ?, latitude = ?, longtitude = ? WHERE vendor_id = ?",
				[name, address, email, mobile, latitude, longitude, vendor_id], (err, res)=>{
					if (err){
						reject(err)
					}else{
						if (res.affectedRows === 0){
							reject(NO_SUCH_CONTENT)
						}else {
							resolve(1)
						}
					}
				})
		})
	}

	blockVendor(vendor_id){
		return new Promise((resolve, reject) => {
			const stmt = "UPDATE vendor SET isBlocked = 1 WHERE vendor_id = ?"
			this.mysqlConn.query(stmt, [vendor_id], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(1)
				}
			})
		})
	}

	retrieveVendors(vendor_id){
		return new Promise((resolve, reject)=>{
			if (typeof vendor_id !== 'undefined'){
				const vendorBasicInfoStmt = "SELECT * FROM vendor WHERE vendor_id = ?"
				const vendorMenusStmt = "SELECT * FROM vendor_makes_menu INNER JOIN menu ON vendor_makes_menu.menu_id = menu.menu_id WHERE vendor_id = ?"
				this.mysqlConn.query(vendorBasicInfoStmt, [vendor_id], (err, res)=>{
					if (err){
						reject(err)
					}else{
						const vendorInfo = res[0]
						this.mysqlConn.query(vendorMenusStmt, [vendor_id], (err, menuRes)=>{
							if (err){
								reject(err)
							}else{
								vendorInfo.menus = menuRes.length > 0 ? menuRes : []
								resolve(vendorInfo)
							}
						})
					}
				})
			}else{
				const stmt = "SELECT * FROM vendor"
				this.mysqlConn.query(stmt, (err, res)=>{
					if (err){
						reject(err)
					}else{
						resolve(res)
					}
				})
			}
		})
	}

	// Customer
	verifyCustomer(email, password) {
		return new Promise(async (resolve, reject) => {
			this.mysqlConn.query(`SELECT * FROM customer WHERE email = "${email}" AND password = "${password}";`, (err, res) => {
				if (err) {
					reject(err)
				} else {
					if (res.length === 1) {
						const customerJson = {
							_id : res[0].customer_id,
							_fullname: res[0].fullname,
							_email: res[0].email,
							_mobile: res[0].mobile,
							_address: res[0].address===null ? "" : res[0].address
						}
						resolve(customerJson)
					} else {
						resolve(0)
					}
				}
			})
		})
	}

	addCustomer(email, password, fullname, mobile){
		return new Promise((resolve, reject) => {
			this.mysqlConn.query('INSERT INTO customer (email, password, fullname, mobile) VALUES(?,?,?,?)', [email, password, fullname, mobile], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(res.insertId)
				}
			})
		})
	}

	updateCustomer(email, password, fullname, mobile){
		return new Promise((resolve, reject) => {
			this.mysqlConn.query('UPDATE customer SET password = ? , fullname = ?, mobile = ? WHERE email = ?', [password, fullname, mobile, email], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(1)
				}
			})
		})
	}

	addCustomerAddress(address, latitude, longtitude, customer_id){
		return new Promise((resolve, reject) => {
			this.mysqlConn.query(`INSERT INTO customer_address (customer_id, address, longtitude, latitude) VALUES(?, ?, ?, ?)`, [customer_id, address, longtitude, latitude], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(res.insertId)
				}
			})
		})
	}

	flagCustomerAddressDeleted(address_id){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query(`UPDATE customer_address SET isDeleted = 1 WHERE address_id = ?`, [address_id], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(1)
				}
			})
		})
	}

	retrieveCustomerAddressById(customerAddressId){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query("SELECT * FROM customer_address WHERE address_id = ? AND isDeleted = 0", [customerAddressId], (err, res)=>{
				if (err){
					reject(SOMETHING_WENT_WRONG)
				}else{
					if (res.length === 0){
						reject(NO_SUCH_CONTENT)
					}else {
						resolve(JSON.parse(JSON.stringify(res[0])))
					}
				}
			})
		})
	}


	retreiveCustomerAddresssByCustomerId(customerId){
		return new Promise((resolve, reject) => {
			const stmt = "SELECT * FROM customer_address WHERE customer_id = ? AND isDeleted = 0"
			this.mysqlConn.query(stmt, [customerId],(err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(JSON.parse(JSON.stringify(res)))
				}
			})
		})
	}

	retrieveAllCustomers(){
		return new Promise((resolve, reject) => {
			const stmt = "SELECT customer_id, fullname, email, mobile FROM customer;"
			this.mysqlConn.query(stmt, (err, res)=>{
				if (err){
					reject(err)
				}else{
					if (res.length===0) {
						reject(NO_SUCH_CONTENT)
					}else{
						resolve(JSON.parse(JSON.stringify(res)))
					}
				}
			})
		})
	}

	retrieveShortCustomerDataByEmail(customerEmail){
		return new Promise((resolve, reject) => {
			const stmt = "SELECT customer_id, fullname, email, mobile FROM customer WHERE email = ?"
			this.mysqlConn.query(stmt, [customerEmail], (err, res)=>{
				if (err){
					reject(err)
				}else{
					if (res.length===0) {
						reject(NO_SUCH_CONTENT)
					}else{
						resolve(JSON.parse(JSON.stringify(res[0])))
					}
				}
			})
		})
	}

	retrieveShortCustomerDataById(customerId){
		return new Promise((resolve, reject) => {
			const stmt = "SELECT customer_id, fullname, email, mobile FROM customer WHERE customer_id = ?"
			this.mysqlConn.query(stmt, [customerId], (err, res)=>{
				if (err){
					reject(err)
				}else{
					if (res.length===0) {
						reject(NO_SUCH_CONTENT)
					}else{
						resolve(JSON.parse(JSON.stringify(res[0])))
					}
				}
			})
		})
	}

	retrieveCompleteCustomerDataById(customerId){
		return new Promise((resolve, reject) => {
			const customerStmt = "SELECT customer_id, fullname, email, mobile FROM customer WHERE customer_id = ?"
			const customerAddrStmt = "SELECT * FROM customer_address WHERE customer_id = ?"
			const orderStmt = "SELECT * FROM orders WHERE email = ?"
			const paymentStmt = "SELECT * FROM payment WHERE customer_email = ?"

			this.mysqlConn.query(customerStmt, [customerId], (err, customerStmtRes)=>{
				if (err){
					reject(err)
				}else{
					// If user with id does not exist
					if (customerStmtRes.length === 0){
						reject(NO_SUCH_CONTENT)
					}else{
						// Initialise ObjectCustomer
						let customer = JSON.parse(JSON.stringify(customerStmtRes[0]))
						this.mysqlConn.query(customerAddrStmt, [customer.customer_id], (err, customerAddrRes)=>{
							if (err){
								reject(err)
							}else{
								customer.address = customerAddrRes.length === 0 ? [] : JSON.parse(JSON.stringify(customerAddrRes))
								this.mysqlConn.query(orderStmt, [customer.email], (err, orderStmtRes)=>{
									if (err){
										reject(err)
									}else{
										customer.orders = orderStmtRes.length === 0 ? [] : JSON.parse(JSON.stringify(orderStmtRes))
										this.mysqlConn.query(paymentStmt, [customer.email], (err, paymentStmtRes)=>{
											if (err){
												reject(err)
											}else{
												customer.payment = paymentStmtRes.length === 0 ? [] : JSON.parse(JSON.stringify(paymentStmtRes))
												resolve(customer)
											}
										})
									}
								})
							}
						})
					}
				}
			})
		})
	}

	retrieveCompleteCustomerDataByEmail(customerEmail){
		return new Promise((resolve, reject) => {
			const customerStmt = "SELECT customer_id, fullname, email, mobile FROM customer WHERE email = ?"
			const customerAddrStmt = "SELECT * FROM customer_address WHERE customer_id = ?"
			const orderStmt = "SELECT * FROM orders WHERE email = ?"
			const paymentStmt = "SELECT * FROM payment WHERE customer_email = ?"

			this.mysqlConn.query(customerStmt, [customerEmail], (err, customerStmtRes)=>{
				if (err){
					reject(err)
				}else{
					// If user with id does not exist
					if (customerStmtRes.length === 0){
						reject(NO_SUCH_CONTENT)
					}else{
						// Initialise ObjectCustomer
						let customer = JSON.parse(JSON.stringify(customerStmtRes[0]))
						this.mysqlConn.query(customerAddrStmt, [customer.customer_id], (err, customerAddrRes)=>{
							if (err){
								reject(err)
							}else{
								customer.address = customerAddrRes.length === 0 ? [] : JSON.parse(JSON.stringify(customerAddrRes))
								this.mysqlConn.query(orderStmt, [customer.email], (err, orderStmtRes)=>{
									if (err){
										reject(err)
									}else{
										customer.orders = orderStmtRes.length === 0 ? [] : JSON.parse(JSON.stringify(orderStmtRes))
										this.mysqlConn.query(paymentStmt, [customer.email], (err, paymentStmtRes)=>{
											if (err){
												reject(err)
											}else{
												customer.payment = paymentStmtRes.length === 0 ? [] : JSON.parse(JSON.stringify(paymentStmtRes))
												resolve(customer)
											}
										})
									}
								})
							}
						})
					}
				}
			})
		})
	}

	// Orders
	addOrders(email, status, order_item, order_total, shipping_address_id){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query("INSERT INTO `orders`(`email`, `status`, `order_item`, `order_total`, `shipping_address_id`) VALUES (?,?,?,?,?)", [email, status, order_item, order_total, shipping_address_id], (err, res)=>{
				if (err){
					reject(err)
				} else{
					resolve(res.insertId)
				}
			})
		})
	}

	modifyOrderItems(order_id, order_item){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query("UPDATE orders SET order_item = ? WHERE order_id = ?", [order_item, order_id], (err, res)=>{
				if (err){
					reject(err)
				}else{
					if (res.affectedRows === 0) {
						reject(NO_AFFECTED_ROWS)
					}else {
						resolve(res)
					}
				}
			})
		})
	}

	setOrderStatusCancelled(order_id){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query("UPDATE orders SET status = 'Dibatalkan' WHERE order_id = ? AND status != 'Dibatalkan'",[order_id], (err, res)=>{
				if (err){
					reject(err)
				}else{
					if (res.affectedRows === 0) {
						reject(NO_AFFECTED_ROWS)
					}else {
						resolve(1)
					}
				}
			})
		})
	}

    setOrderStatus(order_id, status){
        return new Promise((resolve, reject)=>{
            this.mysqlConn.query("UPDATE orders SET status = ? WHERE order_id = ? ",[status, order_id], (err, res)=>{
                if (err){
                    reject(err)
                }else{
                    if (res.affectedRows === 0) {
                        reject(NO_AFFECTED_ROWS)
                    }else {
                        resolve(1)
                    }
                }
            })
        })
    }

	retrieveAllOrders(email){
		return new Promise((resolve, reject)=>{
			const stmt = typeof email === 'undefined' ?
			"SELECT o.order_id, c.fullname, c.mobile, o.email, o.status, o.order_date, o.order_item, o.order_total, ca.address, p.payment_id, p.amount, p.payment_date, p.payment_status, p.payment_proof_path FROM orders o INNER JOIN customer c ON o.email = c.email INNER JOIN customer_address ca ON c.customer_id = ca.customer_id LEFT JOIN payment p ON o.order_id = p.order_id GROUP BY (o.order_id)"
				:
			"SELECT o.order_id, c.fullname, c.mobile, o.email, o.status, o.order_date, o.order_item, o.order_total, ca.address, p.payment_id, p.amount, p.payment_date, p.payment_status, p.payment_proof_path FROM orders o INNER JOIN customer c ON o.email = c.email INNER JOIN customer_address ca ON c.customer_id = ca.customer_id LEFT JOIN payment p ON o.order_id = p.order_id WHERE o.email = ? GROUP BY (o.order_id)"
			this.mysqlConn.query(stmt, [email], (err, res)=>{
				if (err){
					reject(err)
				} else{
					for (let i=0; i<res.length; i++){
						res[i].order_item = typeof res[i].order_item === 'string' ? JSON.parse(res[i].order_item) : res[i].order_item
					}
					resolve(res)
				}
			})
		})
	}

	retrieveOneOrder(order_id){
		return new Promise((resolve, reject)=>{
			this.mysqlConn.query("SELECT o.order_id, c.fullname, c.mobile, o.email, o.status, o.order_date, o.order_item, o.order_total, ca.address, p.payment_id, p.amount, p.payment_date, p.payment_status, p.payment_proof_path FROM orders o INNER JOIN customer c ON o.email = c.email INNER JOIN customer_address ca ON c.customer_id = ca.customer_id LEFT JOIN payment p ON o.order_id = p.order_id WHERE o.order_id = ? GROUP BY (o.order_id)", [order_id], (err, res)=>{
				if (err){
					reject(err)
				} else{
					if (res.length >0) {
						const i = 0
						res[i].order_item = typeof res[i].order_item === 'string' ? JSON.parse(res[i].order_item) : res[i].order_item
						resolve(res[0])
					}else{
						resolve([])
					}
				}
			})
		})
	}

	insertPayment(payment){
		return new Promise(async (resolve, reject)=>{
			if (payment instanceof Payment){
			    await this.setOrderStatus(payment._orderId, payment._paymentStatus).catch(err=>{})
				const insertStmt = "INSERT INTO `payment`(`order_id`, `amount`, `customer_email`, `payment_date`, `payment_status`) VALUES (?, ?, ?, ?, ?)"
				this.mysqlConn.query(insertStmt, [payment._orderId, payment._amount, payment._customerEmail, payment._paymentDate, payment._paymentStatus], async(err, res)=>{
					if (err){
                        await this.setOrderStatus(payment._orderId, "Belum Dibayar").catch(err=>{})
						reject(err)
					}else{
						payment._paymentId = res.insertId
						resolve(payment)
					}
				})
			}else{
                await this.setOrderStatus(payment._orderId, "Belum Dibayar").catch(err=>{})
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrievePayment(customer_email){
		return new Promise((resolve, reject) => {
			const stmt = typeof customer_email !== 'undefined' ? `SELECT * FROM payment WHERE customer_email = '${customer_email}'` :`SELECT * FROM payment`

			this.mysqlConn.query(stmt, (err, res) => {
				if (err) {
					reject(err)
				} else {
					let payments = []
					if (res.length > 0) {
						for (let i = 0; i < res.length; i++) {
							payments.push(new Payment(
								res[i].payment_id,
								res[i].order_id,
								res[i].amount,
								res[i].customer_email,
								res[i].payment_date,
								res[i].payment_status,
								res[i].payment_proof_path
							))
						}
					}
					resolve(payments)
				}
			})
		})
	}

	flagPayment(payment_id, order_id, flag){
		return new Promise((resolve, reject) => {
			const stmt = "UPDATE payment SET payment_status = ? WHERE payment_id = ?"

			this.mysqlConn.query(stmt, [flag, payment_id], (err, res)=>{
				if (err){
					reject(err)
				}else{
					if (res.affectedRows === 0){
						reject(NO_SUCH_CONTENT)
					}else{
						if (flag === VALID){
							this.setOrderStatus(order_id, ORDER_PROCESSING).then(result=>{
								resolve(1)
							}).catch(err=>{
								reject(err)
							})
						}else if (flag === INVALID_FINAL){
							this.setOrderStatus(order_id, CANCELLED).then(result=>{
								resolve(1)
							}).catch(err=>{
								reject(err)
							})
						}else if (flag === ADMIN_VALIDATED){
                            this.setOrderStatus(order_id, ADMIN_VALIDATED).then(result=>{
                                resolve(1)
                            }).catch(err=>{
                                reject(err)
                            })
                        }else if (flag === INVALID){
                            this.setOrderStatus(order_id, INVALID).then(result=>{
                                resolve(1)
                            }).catch(err=>{
                                reject(err)
                            })
                        }else{
						    reject(SOMETHING_WENT_WRONG)
                        }

					}
				}
			})
		})
	}

	updatePaymentImage(paymentId, paymentProofPath){
		return new Promise((resolve, reject)=>{
			const updateStmt = "UPDATE payment SET payment_proof_path = ? WHERE payment_id = ?"
			this.mysqlConn.query(updateStmt, [paymentProofPath, paymentId], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(1)
				}
			})
		})
	}

	getPaymentImage(paymentId){
		return new Promise((resolve, reject)=>{
			const stmt = "SELECT payment_proof_path FROM payment WHERE payment_id = ?"
			this.mysqlConn.query(stmt, [paymentId], (err, res)=>{
				if (err){
					reject(err)
				}else{
					console.log(res[0].payment_proof_path)
					resolve(res[0])
				}
			})
		})
	}

	
}
