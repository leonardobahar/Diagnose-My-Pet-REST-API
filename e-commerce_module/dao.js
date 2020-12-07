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
import {Customer} from "../model";

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
        return Promise((resolve,reject)=>{
            const query="SELECT * FROM customer "
            this.mysqlConn.query(query,(error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let customers=[]
                    for(let i=0; i<result.length; i++){
                        customers.push(new Customer(
                            result[i].id,
                            result[i].name,
                            result[i].address,
                            result[i].phone_number
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

            const query="SELECT * FROM customer WHERE id=?"
            this.mysqlConn.query(query, customer.id, (error,result)=>{
                if(error){
                    reject(error)
                    return
                }else if(result.length>0){
                    let customers=[]
                    for(let i=0; i<result.length; i++){
                        customers.push(new Customer(
                            result[i].id,
                            result[i].name,
                            result[i].address,
                            result[i].phone_number
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
}