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
import {Customer, Product, Transaction} from "../model";

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
            const query="SELECT * FROM transaction "
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let transactions=[]
                    for(let i=0; i<result.length; i++){
                        transactions.push(new Transaction(
                            result[i].t_id_transaction,
                            result[i].t_date,
                            result[i].t_total_price,
                            result[i].t_status,
                            result[i].t_id_customer,
                            result[i].t_id_payment
                        ))
                    }
                    resolve(transactions)
                }else {
                    reject(NO_SUCH_CONTENT)
                }
            })
        })
    }

    retrieveOneTransactionByCustomerId(transaction){
        return new Promise((resolve,reject)=>{
            const query="SELECT * FROM transaction WHERE t_id_customer=?"
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let transactions=[]
                    for(let i=0; i<result.length; i++){
                        transactions.push(new Transaction(
                            result[i].t_id_transaction,
                            result[i].t_date,
                            result[i].t_total_price,
                            result[i].t_status,
                            result[i].t_id_customer,
                            result[i].t_id_payment
                        ))
                    }
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

    addTransaction(total_price,customer,shipment,payment){
        return new Promise((resolve,reject)=>{
            const query="INSERT INTO `transaction`(`t_date`, `t_total_price`, `t_status`, `t_id_customer`, `t_id_shipment`, `t_id_payment`) VALUES(NOW(), ?, 'Pending', ?, ?, ?)"
            this.mysqlConn.query(query,[total_price,customer,shipment,payment],(error,result)=>{
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
            this.mysqlConn.query(query,transaction.id,(error,result)=>{
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
            this.mysqlConn.query(query,transaction.id,(error,result)=>{
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
}