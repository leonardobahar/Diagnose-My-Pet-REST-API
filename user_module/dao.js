import mysqlConn from '../util/mysql-conn.js'
import fs from 'fs'
import {
	ADMIN_VALIDATED,
	ALL, CANCELLED, ERROR_DUPLICATE_ENTRY, INVALID, INVALID_FINAL,
	MISMATCH_OBJ_TYPE,
	NO_AFFECTED_ROWS,
	NO_SUCH_CONTENT,
	ONLY_WITH_VENDORS, ORDER_PROCESSING,
	SOMETHING_WENT_WRONG, SUCCESS, VALID, WRONG_BODY_FORMAT
} from "../strings";
import {
	AnimalCategory,
	AnimalType,
	Appointment,
	MedicalRecordAttachment,
	MedicalRecords,
	Patient,
	User
} from "../model";

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
					if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') { // Connection to the MySQL server is usually
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
							result[i].user_name,
							result[i].mobile,
							result[i].email,
							result[i].birthdate,
							result[i].password,
							result[i].role
						)
						//delete user.password
						delete(user.salt)
						customers.push(user)
					}

					resolve(customers)
				}
			})
		})
	}

	retrieveOneUser(user){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM users WHERE id=?"
			this.mysqlConn.query(query,user.id, (error,result)=>{
				if(error){
					reject(error)
				}else{
					let customers=[]
					for(let i=0;i<result.length;i++){
						const user=new User(
							result[i].id,
							result[i].user_name,
							result[i].mobile,
							result[i].email,
							result[i].birthdate,
							result[i].password,
							result[i].role
						)
						delete(user.salt)
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

			const query = "INSERT INTO `users`(`user_name`, `mobile`, `email`, `birthdate`, `password`, `role`) VALUES (?, ?, ?, ?, ?, ?)"
			this.mysqlConn.query(query, [user.user_name, user.mobile, user.email, user.birthdate, user.password, user.role], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				user.id = res.insertId
				delete(user.salt)
				resolve(user)
			})
		})
	}

	updateCustomer(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query = "UPDATE users SET user_name=?, mobile=?, email=?, birthdate=?, password=?, role=? WHERE id=?"
			this.mysqlConn.query(query, [user.user_name,user.mobile, user.email,user.birthdate, user.password,user.role,user.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				delete(user.salt)
				resolve(user)
			})
		})
	}

	deleteCustomer(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query="DELETE FROM users WHERE id=?"
			this.mysqlConn.query(query,user.id,(err,res)=>{
				if(err){
					reject(err)
					return
				}

				user.id=res.insertId
				delete(user.salt)
				resolve(user)
			})
		})
	}

	bindUserToPet(user,patient){
		return new Promise((resolve,reject)=>{
			if(user instanceof User &&
				patient instanceof Patient){
				const checkQuery="SELECT id FROM users_patients WHERE user_id=? AND patient_id=?"
				this.mysqlConn.query(checkQuery, [user.id,patient.id], (err, res)=>{
					if(res.length>1){
						reject(ERROR_DUPLICATE_ENTRY)
						return
					}

					const query="INSERT INTO `users_patients` (`user_id`, `patient_id`) VALUES(?, ?)";
					this.mysqlConn.query(query, [user.id, patient.id], (err,res)=>{
						if(err){
							reject(err)
							return
						}

						resolve(SUCCESS)
					})
				})
			}else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveMedicalRecord(){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM medical_records"
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				let records=[]
				for(let i=0;i<result.length;i++){
					records.push(new MedicalRecords(
						result[i].id,
						result[i].patient_id,
						result[i].case_open_time,
						result[i].status
					))
				}
				resolve(records)
			})
		})
	}

	retrieveOneMedicalRecord(record){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM medical_records WHERE patient_id=?"
			this.mysqlConn.query(query, record.patient_id, (error, result)=>{
				if(error){
					reject(error)
					return
				}

				let records=[]
				for(let i=0; i<result.length; i++){
					records.push(new MedicalRecords(
						result[i].id,
						result[i].patient_id,
						result[i].case_open_time,
						result[i].status
					))
				}
				resolve(records)
			})
		})
	}

	addMedicalRecord(record){
		return new Promise((resolve,reject)=>{
			if(record instanceof MedicalRecords){
				const query="INSERT INTO `medical_records` (`patient_id`, `case_open_time`, `status`) VALUES(?, NOW(), ?)"
				this.mysqlConn.query(query, [record.patient_id, record.status],(error, result)=>{
					if(error){
						reject(error)
						return
					}

					record.id=result.insertId
					resolve(record)
				})
			}

			else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateMedicalRecord(record){
		return new Promise((resolve,reject)=>{
			if(record instanceof MedicalRecords){
				const query="UPDATE medical_records SET patient_id=?, case_open_time=NOW(), status=? WHERE id=?"
				this.mysqlConn.query(query, [record.patient_id, record.status, record.id], (error,result)=>{
					if(error){
						reject(error)
						return
					}

					record.id=result.insertId
					resolve(record)
				})
			}

			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	deleteMedicalRecord(record){
		return new Promise((resolve,reject)=>{
			if(record instanceof MedicalRecords){
				const query="DELETE FROM medical_records WHERE id=?"
				this.mysqlConn.query(query, record.id, (error,result)=>{
					if(error){
						reject(error)
						return
					}

					record.id=result.insertId
					resolve(record)
				})
			}

			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveMedicalRecordAttachment(){
		return new Promise((resolve,reject)=>{
			const query="SELECT mra.file_name FROM medical_record_attachment mra "

			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const attachment=result.map(rowDataPacket=>{
					return{
						file_name:rowDataPacket.file_name
					}
				})
				resolve(attachment)
			})
		})
	}

	retrieveOneMedicalRecordAttachment(record){
		return new Promise((resolve,reject)=>{
			const query="SELECT mra.file_name FROM medical_record_attachment mra WHERE mra.file_name=?"

			this.mysqlConn.query(query, record.file_name, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				const attachment=result.map(rowDataPacket=>{
					return{
						file_name:rowDataPacket.file_name
					}
				})
				resolve(attachment)
			})
		})
	}

	getAttachmentFileName(attachment){
		return new Promise((resolve,reject)=>{
			const query="SELECT file_name FROM medical_record_attachment WHERE id=? "
			this.mysqlConn.query(query,attachment.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				else if(result.length>0){
					resolve(result[0].file_name)
				}

				else {
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	addMedicalRecordAttachment(attachment){
		return new Promise((resolve,reject)=>{
			if(attachment instanceof MedicalRecordAttachment){
				const query="INSERT INTO `medical_record_attachment` (`medical_record_id`, `file_name`) VALUES(?, ?)"
				this.mysqlConn.query(query, [attachment.medical_record_id, attachment.file_name],(error,result)=>{
					if(error){
						reject(error)
						return
					}

					attachment.id=result.insertId
					resolve(attachment)
				})
			}

			else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateMedicalRecordAttachment(attachment){
		return new Promise((resolve,reject)=> {
			if (attachment instanceof MedicalRecordAttachment) {
				const query = "UPDATE medical_record_attachment SET file_name=? WHERE medical_record_id=?"
				this.mysqlConn.query(query, [attachment.file_name,attachment.medical_record_id],(error,result)=>{
					if(error){
						reject(error)
						return
					}

					attachment.id=result.insertId
					resolve(attachment)
				})
			}

			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	deleteMedicalRecordAttachment(attachment){
		return new Promise((resolve,reject)=>{
			if(attachment instanceof MedicalRecordAttachment){
				const query="DELETE FROM medical_record_attachment WHERE id=?"
				this.mysqlConn.query(query, attachment.id,(error,result)=>{
					if(error){
						reject(error)
						return
					}

					attachment.id=result.insertId
					resolve(attachment)
				})
			}

			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveAppointment(){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.user_id, u.user_name, a.patient_id, p.patient_name " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id "
			this.mysqlConn.query(query, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				const attachment=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						appointment_name:rowDataPacket.appointment_name,
						appointment_time:rowDataPacket.appointment_time,
						user_id:rowDataPacket.user_id,
						user_name:rowDataPacket.user_name,
						patient_id:rowDataPacket.patient_id,
						pet_name:rowDataPacket.patient_name
					}
				})
				resolve(attachment)
			})
		})
	}

	retrieveOneAppointment(appointment){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.user_id, u.user_name, a.patient_id, p.patient_name " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"WHERE a.id=?"
			this.mysqlConn.query(query, appointment.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				const attachment=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						appointment_name:rowDataPacket.appointment_name,
						appointment_time:rowDataPacket.appointment_time,
						user_id:rowDataPacket.user_id,
						user_name:rowDataPacket.user_name,
						patient_id:rowDataPacket.patient_id,
						pet_name:rowDataPacket.patient_name
					}
				})
				resolve(attachment)
			})
		})
	}

	addAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof  Appointment){
				const query="INSERT INTO `appointment` (`appointment_name`, `appointment_time`, `user_id`, `patient_id`) VALUES(?, ?, ?, ?)"
				this.mysqlConn.query(query, [appointment.appointment_name, appointment.appointment_time, appointment.user_id, appointment.patient_id],(error,result)=>{
					if(error){
						reject(error)
						return
					}

					appointment.id=result.insertId
					resolve(appointment)
				})
			}

			else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="UPDATE appointment SET appointment_name=?, appointment_time=?, user_id=?, patient_id=? WHERE id=?"
				this.mysqlConn.query(query, [appointment.appointment_name.toUpperCase(), appointment.appointment_time, appointment.user_id, appointment.patient_id, appointment.id], (error,result)=>{
					if(error){
						reject(error)
						return
					}

					appointment.id=result.insertId
					resolve(appointment)
				})
			}

			else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	deleteAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof  Appointment){
				const query="DELETE FROM appointment WHERE id=?"
				this.mysqlConn.query(query, appointment.id, (error,result)=>{
					if(error){
						reject(error)
						return
					}

					appointment.id=result.insertId
					resolve(appointment)
				})
			}

			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}
}