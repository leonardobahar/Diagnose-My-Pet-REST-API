import mysqlConn from '../util/mysql-conn.js'
import fs from 'fs'
import {
    ADMIN_VALIDATED,
    ALL, CANCELLED, INVALID, INVALID_FINAL,
    MISMATCH_OBJ_TYPE,
    NO_AFFECTED_ROWS,
    NO_SUCH_CONTENT,
    ONLY_WITH_VENDORS, ORDER_PROCESSING,
    SOMETHING_WENT_WRONG, VALID, WRONG_BODY_FORMAT
} from "../strings";
import {AnimalCategory, AnimalType, User} from "../model";

export class Dao{
	constructor(host, user, password, dbname){
		this._host = host
		this._user = user
		this._password = password
		this._dbname = dbname

		this._initSqlStmt = fs.readFileSync("./diagnosemypet.sql").toString()

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
						console.error('error when connecting to db:', err)
						setTimeout(handleConnection(), 2000)
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
					console.log('db error', err)
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


	retrieveUsers(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM users"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
				}else{
					let customers = []
					for (let i=0; i<result.length; i++){
						const user = new User(
							result[i].id,
							result[i].fullname,
							result[i].mobile,
							result[i].email,
							result[i].birthdate,
							null,
							result[i].role
						)
						delete user.password
						customers.push(user)
					}

					resolve(customers)
				}
			})
		})
	}

	registerCustomer(user){
		return new Promise((resolve, reject) => {
			if (!user instanceof User) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "INSERT INTO `users`(`fullname`, `mobile`, `email`, `birthdate`, `password`, `role`) VALUES (?, ?, ?, ?, ?, ?)"
			this.mysqlConn.query(query, [user.fullname, user.mobile, user.email, user.birthdate, user.password, user.role], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				user.id = res.insertId
				resolve(user)
			})
		})
	}


	retrieveUserPets(user_id){
		return new Promise((resolve, reject)=>{

		})
	}
}
