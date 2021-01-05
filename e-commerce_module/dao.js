import mysqlConn from '../util/mysql-conn.js'
import fs from 'fs'
import {
    ADMIN_VALIDATED,
    ALL, CANCELLED, DUPLICATE_ENTRY, ERROR_DUPLICATE_ENTRY, INVALID, INVALID_FINAL,
    MISMATCH_OBJ_TYPE,
    NO_AFFECTED_ROWS,
    NO_SUCH_CONTENT,
    ONLY_WITH_VENDORS, ORDER_PROCESSING,
    SOMETHING_WENT_WRONG, SUCCESS, VALID, WRONG_BODY_FORMAT
} from "../strings";
import {Customer, Payment, Product, Shipment, Transaction, Transaction_detail} from "../model";

export class Dao {
    constructor(host, user, password, dbname) {
        this._host = host
        this._user = user
        this._password = password
        this._dbname = dbname
        this._initSqlStmt = fs.readFileSync("./diagnosemypet.sql").toString()

        const handleConnection = () => {
            return new Promise(resolve => {
                this.mysqlConn = new mysqlConn(
                    this._host,
                    this._user,
                    this._password,
                    this._dbname
                )

                this.mysqlConn.connect(err => {
                    if (err) {  // or restarting (takes a while sometimes).
                        console.error('error when connecting to db:', err)
                        setTimeout(handleConnection, 2000)
                    } else {
                        this.mysqlConn.query(this._initSqlStmt, (err, res, fields) => {
                            if (err) {
                                throw err
                            } else {
                                console.info("CONNECTION TO DB TABLES SUCCESS")
                                resolve(1)
                            }
                        })
                    }
                })

                this.mysqlConn.on('error', (err) => {
                    console.log('db error', err)
                    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') { // Connection to the MySQL server is usually
                        handleConnection()                         // lost due to either server restart, or a
                    } else {                                      // connection idle timeout (the wait_timeout
                        console.error(err)
                        handleConnection()// server variable configures this)
                    }
                })
            })
        }

        handleConnection()
    }

    retrieveCustomer(){
        return new Promise((resolve,reject)=>{
            const query="SELECT * FROM customer "
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let customers=[]
                    for(let i=0; i<result.length; i++){
                        customers.push(new Customer(
                            result[i].c_id_customer,
                            result[i].c_name,
                            result[i].c_address,
                            result[i].c_phone_number
                        ))
                    }
                    resolve(customers)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retreiveOneCustomer(customer){
        return new Promise((resolve,reject)=>{
            if(!customer instanceof Customer){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="SELECT * FROM customer WHERE c_id_customer=?"
            this.mysqlConn.query(query, customer.id, (error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let customers=[]
                    for(let i=0; i<result.length; i++){
                        customers.push(new Customer(
                            result[i].c_id_customer,
                            result[i].c_name,
                            result[i].c_address,
                            result[i].c_phone_number
                        ))
                    }
                    resolve(customers)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    addCustomer(customer){
        return new Promise((resolve,reject)=>{
            if(!customer instanceof Customer){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="INSERT INTO `customer`(`c_name`,`c_address`,`c_phone_number`) VALUES(?, ?, ?) "
            this.mysqlConn.query(query, [customer.customer_name, customer.address, customer.phone_number], (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                customer.id=result.insertId
                resolve(customer)
            })
        })
    }

    updateCustomer(customer){
        return new Promise((resolve,reject)=>{
            if(!customer instanceof Customer){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="UPDATE customer SET c_name=?, c_address=?, c_phone_number=? WHERE c_id_customer=? "
            this.mysqlConn.query(query, [customer.customer_name, customer.address, customer.phone_number, customer.id], (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(customer)
            })
        })
    }

    deleteCustomer(customer){
        return new Promise((resolve,reject)=>{
            if(!customer instanceof Customer){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="DELETE FROM customer WHERE c_id_customer=? "
            this.mysqlConn.query(query,customer.id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    retrieveProduct(){
        return new Promise((resolve,reject)=>{
            const query="SELECT * FROM product"
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let products=[]
                    for(let i=0; i<result.length; i++){
                        products.push(new Product(
                            result[i].p_id_product,
                            result[i].p_name,
                            result[i].p_price,
                            result[i].p_quantity
                        ))
                    }
                    resolve(products)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOneProduct(product){
        return new Promise((resolve,reject)=>{
            if(!product instanceof Product){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="SELECT * FROM product WHERE p_id_product=?"
            this.mysqlConn.query(query, product.id, (error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let products=[]
                    for(let i=0; i<result.length; i++){
                        products.push(new Product(
                            result[i].p_id_product,
                            result[i].p_name,
                            result[i].p_price,
                            result[i].p_quantity
                        ))
                    }
                    resolve(products)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    addProduct(product){
        return new Promise((resolve,reject)=>{
            if(!product instanceof Product){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="INSERT INTO `product`(`p_name`, `p_price`, `p_quantity`) VALUES(?, ?, ?)"
            this.mysqlConn.query(query,[product.product_name,product.price,product.quantity], (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                product.id=result.insertId
                resolve(product)
            })
        })
    }

    updateProduct(product){
        return new Promise((resolve,reject)=>{
            if(!product instanceof Product){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="UPDATE product SET p_name=?, p_price=?, p_quantity=? WHERE p_id_product=? "
            this.mysqlConn.query(query,[product.product_name, product.price, product.quantity, product.id], (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(product)
            })
        })
    }

    deleteProduct(product){
        return new Promise((resolve,reject)=>{
            if(!product instanceof Product){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="DELETE FROM product WHERE p_id_product=?"
            this.mysqlConn.query(query, product.id, (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    retrieveTransaction(){
        return new Promise((resolve,reject)=>{
            const query="SELECT t.t_id_transaction, td.td_product_quantity, td.td_id_product, " +
                "p.p_name, p.p_price, " +
                "t.t_date, t.t_total_price, t.t_status, t.t_id_customer, " +
                "c.c_name, c.c_address, c.c_phone_number, " +
                "t.t_id_shipment, s.s_method, s.s_price, s.s_duration, s.s_address, s.s_receiver_name, " +
                "t.t_id_payment, pm.pm_method, pm.pm_date, pm.pm_status " +
                "FROM transaction t LEFT OUTER JOIN transaction_detail td ON td.td_id_transaction=t.t_id_transaction " +
                "LEFT OUTER JOIN product p ON td.td_id_product=p.p_id_product " +
                "LEFT OUTER JOIN customer c ON c.c_id_customer=t.t_id_customer " +
                "LEFT OUTER JOIN shipment s ON s.s_id_shipment=t.t_id_shipment " +
                "LEFT OUTER JOIN payment pm ON pm_id_payment=t.t_id_payment "
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    const transactions=result.map(rowDataPacket=>{
                        return{
                            id:rowDataPacket.t_id_transaction,
                            product_id:rowDataPacket.td_id_product,
                            product_name:rowDataPacket.p_name,
                            product_price:rowDataPacket.p_price,
                            product_quantity:rowDataPacket.td_product_quantity,
                            transaction_date:rowDataPacket.t_date,
                            total_price:rowDataPacket.t_total_price,
                            status:rowDataPacket.t_status,
                            customer_id:rowDataPacket.t_id_customer,
                            customer_name:rowDataPacket.c_name,
                            customer_address:rowDataPacket.c_address,
                            customer_phone_number:rowDataPacket.c_phone_number,
                            shipment_id:rowDataPacket.t_id_shipment,
                            shipment_method:rowDataPacket.s_method,
                            shipment_price:rowDataPacket.s_price,
                            shipment_duration:rowDataPacket.s_duration + "weeks",
                            shipment_address:rowDataPacket.s_address,
                            receiver_name:rowDataPacket.s_receiver_name,
                            payment_method:rowDataPacket.pm_method,
                            payment_date:rowDataPacket.pm_status
                        }
                    })
                    resolve(transactions)
                }else {
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOneTransactionByCustomerId(transaction){
        return new Promise((resolve,reject)=>{
            const query="SELECT t.t_id_transaction, td.td_product_quantity, td.td_id_product, " +
                "p.p_name, p.p_price, " +
                "t.t_date, t.t_total_price, t.t_status, t.t_id_customer, " +
                "c.c_name, c.c_address, c.c_phone_number, " +
                "t.t_id_shipment, s.s_method, s.s_price, s.s_duration, s.s_address, s.s_receiver_name, " +
                "t.t_id_payment, pm.pm_method, pm.pm_date, pm.pm_status " +
                "FROM transaction t LEFT OUTER JOIN transaction_detail td ON td.td_id_transaction=t.t_id_transaction " +
                "LEFT OUTER JOIN product p ON td.td_id_product=p.p_id_product " +
                "LEFT OUTER JOIN customer c ON c.c_id_customer=t.t_id_customer " +
                "LEFT OUTER JOIN shipment s ON s.s_id_shipment=t.t_id_shipment " +
                "LEFT OUTER JOIN payment pm ON pm_id_payment=t.t_id_payment "
            this.mysqlConn.query(query,transaction.customer_id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    const transactions=result.map(rowDataPacket=>{
                        return{
                            id:rowDataPacket.t_id_transaction,
                            product_id:rowDataPacket.td_id_product,
                            product_name:rowDataPacket.p_name,
                            product_price:rowDataPacket.p_price,
                            product_quantity:rowDataPacket.td_product_quantity,
                            transaction_date:rowDataPacket.t_date,
                            total_price:rowDataPacket.t_total_price,
                            status:rowDataPacket.t_status,
                            customer_id:rowDataPacket.t_id_customer,
                            customer_name:rowDataPacket.c_name,
                            customer_address:rowDataPacket.c_address,
                            customer_phone_number:rowDataPacket.c_phone_number,
                            shipment_id:rowDataPacket.t_id_shipment,
                            shipment_method:rowDataPacket.s_method,
                            shipment_price:rowDataPacket.s_price,
                            shipment_duration:rowDataPacket.s_duration + "weeks",
                            shipment_address:rowDataPacket.s_address,
                            receiver_name:rowDataPacket.s_receiver_name,
                            payment_method:rowDataPacket.pm_method,
                            payment_date:rowDataPacket.pm_status
                        }
                    })
                    resolve(transactions)
                }else {
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOneTransaction(id_transaction){
        return new Promise((resolve,reject)=>{
            const query="SELECT t_id_transaction FROM transaction WHERE t_id_transaction=? "
            this.mysqlConn.query(query,id_transaction,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    resolve(id_transaction)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    addTransaction(transaction){
        return new Promise((resolve,reject)=>{
            if(!transaction instanceof Transaction){
                reject(MISMATCH_OBJ_TYPE)
                return
            }
            const query="INSERT INTO `transaction`(`t_date`, `t_total_price`, `t_status`, `t_id_customer`) VALUES(NOW(), ?, 'Pending', ?)"
            this.mysqlConn.query(query,[transaction.total_price,transaction.id_customer],(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                transaction.transaction_id=result.insertId
                resolve(transaction)
            })
        })
    }

    addTransactionShipmentNPaymentId(shipment_id,payment_id,transaction_id){
        return new Promise((resolve,reject)=>{
            const query="UPDATE transaction SET t_id_shipment=?, t_id_payment=? WHERE t_id_transaction=? "
            this.mysqlConn.query(query,[shipment_id,payment_id,transaction_id],(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    approveTransaction(transaction){
        return new Promise((resolve,reject)=>{
            if(!transaction instanceof Transaction){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="UPDATE transaction SET t_status='Approved' WHERE t_id_transaction=?"
            this.mysqlConn.query(query,transaction.transaction_id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                transaction.status=result.t_status
                resolve(transaction.status)
            })
        })
    }

    declineTransaction(transaction){
        return new Promise((resolve,reject)=>{
            if(!transaction instanceof Transaction){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="UPDATE transaction SET t_status='Declined' WHERE t_id_transaction=?"
            this.mysqlConn.query(query,transaction.transaction_id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                transaction.status=result.t_status
                resolve(transaction.status)
            })
        })

    }

    deleteTransaction(transaction){
        return new Promise((resolve,reject)=>{
            if(!transaction instanceof Transaction){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="DELETE FROM transaction WHERE t_id_transaction=? "
            this.mysqlConn.query(query, transaction.id, (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    retrieveTransactionDetail(){
        return new Promise((resolve,reject)=>{
            const query="SELECT td.td_id_detail, td.td_product_quantity, td.td_id_product, p.p_name, p.p_price "+
                "FROM transaction_detail td LEFT OUTER JOIN product p ON td.td_id_product=p.p_id_product "
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                   const details = result.map(rowDataPacket=>{
                        return{
                            id:rowDataPacket.td_id_detail,
                            quantity:rowDataPacket.td_product_quantity,
                            product_id:rowDataPacket.td_id_product,
                            product_name:rowDataPacket.p_name,
                            price:p_price
                        }
                   })
                    resolve(details)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOneTransactionDetail(transactionDetail){
        return new Promise((resolve,reject)=>{
            if(!transactionDetail instanceof Transaction_detail){
                reject(MISMATCH_OBJ_TYPE)
                return
            }
            const query="SELECT td.td_id_detail, td.td_product_quantity, td.td_id_product, p.p_name, p.p_price "+
                "FROM transaction_detail td LEFT OUTER JOIN product p ON td.td_id_product=p.p_id_product "+
                "WHERE td.td_id_detail=? "
            this.mysqlConn.query(query,transactionDetail.id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    const details = result.map(rowDataPacket=>{
                        return{
                            id:rowDataPacket.td_id_detail,
                            quantity:rowDataPacket.td_product_quantity,
                            product_id:rowDataPacket.td_id_product,
                            product_name:rowDataPacket.p_name,
                            price:rowDataPacket.p_price
                        }
                    })
                    resolve(details)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    addTransactionDetail(transactionDetail){
        return new Promise((resolve,reject)=>{
            if(!transactionDetail instanceof Transaction_detail){
                reject(MISMATCH_OBJ_TYPE)
                return
            }
            const query="INSERT INTO `transaction_detail`(`td_product_quantity`, `td_id_product`, `td_id_transaction`) VALUES(?, ?, ?)"
            this.mysqlConn.query(query,[transactionDetail.product_quantity,transactionDetail.id_product,transactionDetail.id_transaction],(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                transactionDetail.transaction_detail_id=result.insertId
                resolve(transactionDetail)
            })
        })
    }

    deleteTransactionDetail(transactionDetail){
        return new Promise((resolve,reject)=>{
            if(!transactionDetail instanceof Transaction_detail){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="DELETE FROM transaction_detail WHERE td_id_transaction_detail=? "
            this.mysqlConn.query(query,transactionDetail.id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    retrieveShipment(){
        return new Promise((resolve,reject)=>{
            const query="SELECT * FROM shipment "
            this.mysqlConn.query(query,(error,result)=>{
                if(error) {
                    reject(error)
                    return
                }else if(result.length>0){
                    let shipments=[]
                    for(let i=0; i<result.length; i++){
                        shipments.push(new Shipment(
                            result[i].s_id_shipment,
                            result[i].s_method,
                            result[i].s_price,
                            result[i].s_duration,
                            result[i].s_address,
                            result[i].s_receiver_name,
                            result[i].s_id_transaction
                        ))
                    }
                    resolve(shipments)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOneShipment(id_transaction){
        return new Promise((resolve,reject)=>{
            const query="SELECT * FROM shipment WHERE s_id_transaction=? "
            this.mysqlConn.query(query,id_transaction,(error,result)=>{
                if(error) {
                    reject(error)
                    return
                }else if(result.length>0){
                    let shipments=[]
                    for(let i=0; i<result.length; i++){
                        shipments.push(new Shipment(
                            result[i].s_id_shipment,
                            result[i].s_method,
                            result[i].s_price,
                            result[i].s_duration,
                            result[i].s_address,
                            result[i].s_receiver_name,
                            result[i].s_id_transaction
                        ))
                    }
                    resolve(shipments)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOneShipmentByShipmentID(shipment){
        return new Promise((resolve,reject)=>{
            if(!shipment instanceof Shipment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="SELECT * FROM shipment WHERE s_id_shipment=? "
            this.mysqlConn.query(query,shipment.shipment_id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let shipments=[]
                    for(let i=0; i<result.length; i++){
                        shipments.push(new Shipment(
                            result[i].s_id_shipment,
                            result[i].s_method,
                            result[i].s_price,
                            result[i].s_duration,
                            result[i].s_address,
                            result[i].s_receiver_name,
                            result[i].s_id_transaction
                        ))
                    }
                    resolve(shipments)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    addShipment(shipment){
        return new Promise((resolve,reject)=>{
            if(!shipment instanceof Shipment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="INSERT INTO `shipment`(`s_method`,`s_price`,`s_duration`,`s_address`,`s_receiver_name`,`s_id_transaction`) "+
                "VALUES(?,?,'2 weeks',?,?,?)"
            this.mysqlConn.query(query,[shipment.method,shipment.price,shipment.address,shipment.receiver_name,shipment.id_transaction],(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                shipment.shipment_id=result.insertId
                resolve(shipment)
            })
        })
    }

    updateShipment(shipment){
        return new Promise((resolve,reject)=>{
            if(!shipment instanceof Shipment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="UPDATE shipment SET s_method=?, s_price=?, s_address=?, s_receiver_name=? WHERE s_id_shipment=? "
            this.mysqlConn.query(query,[shipment.method, shipment.price, shipment.address, shipment.receiver_name, shipment.shipment_id], (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(shipment)
            })
        })
    }

    deleteShipment(shipment){
        return new Promise((resolve,reject)=>{
            if(!shipment instanceof Shipment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="DELETE FROM shipment WHERE s_id_shipment=?"
            this.mysqlConn.query(query,shipment.shipment_id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    retrievePayment(){
        return new Promise((resolve,reject)=>{
            const query="SELECT * FROM payment "
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let payments=[]
                    for(let i=0; i<result.length; i++){
                        payments.push(new Payment(
                            result[i].pm_id_payment,
                            result[i].pm_method,
                            result[i].pm_date,
                            result[i].pm_status,
                            result[i].pm_id_transaction
                        ))
                    }
                    resolve(payments)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOnePayment(id_transaction){
        return new Promise((resolve,reject)=>{
            const query="SELECT * FROM payment WHERE pm_id_transaction=? "
            this.mysqlConn.query(query,id_transaction,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let payments=[]
                    for(let i=0; i<result.length; i++){
                        payments.push(new Payment(
                            result[i].pm_id_payment,
                            result[i].pm_method,
                            result[i].pm_date,
                            result[i].pm_status,
                            result[i].pm_id_transaction
                        ))
                    }
                    resolve(payments)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOnePaymentByPaymentId(payment){
        return new Promise((resolve,reject)=>{
            if(!payment instanceof Payment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="SELECT * FROM payment WHERE pm_id_payment=? "
            this.mysqlConn.query(query,payment.payment_id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let payments=[]
                    for(let i=0; i<result.length; i++){
                        payments.push(new Payment(
                            result[i].pm_id_payment,
                            result[i].pm_method,
                            result[i].pm_date,
                            result[i].pm_status,
                            result[i].pm_id_transaction
                        ))
                    }
                    resolve(payments)
                }else{
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    addPayment(payment){
        return new Promise((resolve,reject)=>{
            if(!payment instanceof Payment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="INSERT INTO `payment`(`pm_method`, `pm_date`, `pm_status`, `pm_id_transaction`) "+
                "VALUES(?, NOW(), 'Pending', ?)"
            this.mysqlConn.query(query,[payment.method, payment.id_transaction],(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                payment.payment_id=result.insertId
                resolve(payment)
            })
        })
    }

    approvePayment(payment){
        return new Promise((resolve,reject)=>{
            if(!payment instanceof Payment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="UPDATE payment SET pm_status='Approved' WHERE pm_id_payment=? "
            this.mysqlConn.query(query, payment.payment_id, (error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    declinePayment(payment){
        return new Promise((resolve,reject)=>{
            if(!payment instanceof Payment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="UPDATE payment SET pm_status='Declined' WHERE pm_id_payment=? "
            this.mysqlConn.query(query,payment.payment_id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }

    deletePayment(payment){
        return new Promise((resolve,reject)=>{
            if(!payment instanceof Payment){
                reject(MISMATCH_OBJ_TYPE)
                return
            }

            const query="DELETE FROM payment WHERE pm_id_payment=? "
            this.mysqlConn.query(query,payment.id,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }

                resolve(SUCCESS)
            })
        })
    }
}