import mysqlConn from '../util/mysql-conn.js'
import fs from 'fs'
import bcrypt from 'bcrypt'
import moment from 'moment'
import {
	ADMIN_VALIDATED,
	ALL, AUTH_ERROR_LOGIN, CANCELLED, ERROR_DUPLICATE_ENTRY, INVALID, INVALID_FINAL,
	MISMATCH_OBJ_TYPE,
	NO_AFFECTED_ROWS,
	NO_SUCH_CONTENT,
	ONLY_WITH_VENDORS, ORDER_PROCESSING,
	SOMETHING_WENT_WRONG, SUCCESS, VALID, WRONG_BODY_FORMAT
} from "../strings";
import {
	AnimalCategory,
	AnimalType,
	Appointment, Doctor,
	MedicalRecordAttachment,
	MedicalRecords, MedicalRecordSymptoms, MedicalRecordTreatmentPlan, Participant,
	Patient, Schedule, Symptoms, TreatmentPlan,
	User, VisitReminder
} from "../model";
import {AgeFormatter, monthDiff} from "../util/util";

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
						setTimeout(handleConnection, 2000)
					}else{
						this.mysqlConn.query(this._initSqlStmt, (err, res, fields)=>{
							if (err){
								throw err
							} else{
								console.info("CONNECTION TO DB TABLES SUCCESS")
								resolve(1)
							}
						})
					}
				})

				this.mysqlConn.on('error', (err)=>{
					console.log('db error', err)
					if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') { // Connection to the MySQL server is usually
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

	retrieveCustomers(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT id,user_name,mobile,email,birthdate,address,role FROM users WHERE role='CUSTOMER' "
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
				}else{
					const customer=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							user_name:rowDataPacket.user_name,
							mobile:rowDataPacket.mobile,
							email:rowDataPacket.email,
							birthdate:rowDataPacket.birthdate,
							address:rowDataPacket.address,
							role:rowDataPacket.role
						}
					})
					resolve(customer)
				}
			})
		})
	}

	retrieveUserId(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT id FROM users WHERE id=? "
			this.mysqlConn.query(query,user.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					resolve(result[0].id)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveOneCustomer(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query= user.id === null ? `SELECT id,user_name,mobile,email,birthdate,address,role FROM users WHERE role='CUSTOMER' AND email='${user.email}'; ` : `SELECT id,user_name,mobile,email,birthdate,address,role FROM users WHERE role='CUSTOMER' AND id=${user.id}`
			this.mysqlConn.query(query, (error,result)=>{
				if(error){
					reject(error)
				}else if(result.length>0){
					const customer=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							user_name:rowDataPacket.user_name,
							mobile:rowDataPacket.mobile,
							email:rowDataPacket.email,
							birthdate:rowDataPacket.birthdate,
							address:rowDataPacket.address,
							role:rowDataPacket.role
						}
					})
					resolve(customer)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	addResetPasswordToken(token, user_id){
		return new Promise((resolve, reject) => {
			const query = `INSERT INTO forgot_password_token(token, user_id) VALUES(?,?)`;
			this.mysqlConn.query(query, [token, user_id], (err, res)=>{
				if (err){
					reject(err)
				}else{
					resolve(res)
				}
			})
		})
	}

	retrieveUserIdFromToken(token){
		return new Promise((resolve, reject)=>{
			const query = `SELECT user_id FROM forgot_password_token WHERE token = ?`
			this.mysqlConn.query(query, [token], (err, res)=>{
				if (res.length == 0){
					reject(NO_SUCH_CONTENT)
				}else{
					console.log(res)
					resolve(res[0].user_id)
				}
			})
		})
	}

	removeToken(token){
		return new Promise(resolve=>{
			const query = `DELETE FROM forgot_password_token WHERE token = ?`
			this.mysqlConn.query(query, [token], (err, res)=>{
				resolve()
			})
		})
	}

	retrieveUsers(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT id,user_name,mobile,email,birthdate,address,role FROM users "
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
					return
				}
				resolve(result)
			})
		})
	}

	retrieveOneUser(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query= user.id === null ? `SELECT id,user_name,mobile,email,birthdate,address,role FROM users WHERE email='${user.email}'; ` : `SELECT id,user_name,mobile,email,birthdate,address,role FROM users WHERE id=${user.id}`
			this.mysqlConn.query(query, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(result)
			})
		})
	}

	registerUser(user){
		return new Promise(async (resolve, reject) => {
			if (!user instanceof User) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "INSERT INTO `users`(`user_name`, `mobile`, `email`, `birthdate`, `address`, `password`, `salt`, `role`) " +
				"VALUES (?, ?, ?, ?, ?, ?, ?, ?) "
			const salt = await bcrypt.genSalt(5)
			const hash = await bcrypt.hash(user.password, salt)
			this.mysqlConn.query(query, [user.user_name, user.mobile, user.email, user.birthdate, user.address, hash, salt, user.role], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				user.id = res.insertId
				resolve(user)
			})
		})
	}

	updateUserInfo(user){
		return new Promise(async (resolve, reject) => {
			if (!user instanceof User) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "UPDATE `users` SET `mobile` = ?, `email` = ?, `birthdate` = ?, `address`= ? WHERE `user_name` = ? "
			this.mysqlConn.query(query, [user.mobile, user.email, user.birthdate, user.address, user.user_name], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				resolve(user)
			})
		})
	}

	resetPassword(user){
		return new Promise(async (resolve, reject) => {
			if (!user instanceof User) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "UPDATE users SET password = ?, salt=? WHERE email = ?"
			const salt = await bcrypt.genSalt(5)
			const hash = await bcrypt.hash(user.password, salt)
			this.mysqlConn.query(query, [hash, salt, user.email], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	resetPasswordById(user){
		return new Promise(async (resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="UPDATE users SET password = ?, salt=? WHERE id = ?"
			const salt=await bcrypt.genSalt(5)
			const hash=await bcrypt.hash(user.password,salt)
			this.mysqlConn.query(query, [hash, salt, user.id], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	confirmUserEmail(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="UPDATE users SET email_is_confirmed=1 WHERE id=? "
			this.mysqlConn.query(query,user.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	loginWithUsername(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT id, user_name, email, salt, password, role FROM users WHERE user_name=?"
			this.mysqlConn.query(query,[user.user_name], async(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length === 1){
					const salt = result[0].salt
					const hashedClientInput = bcrypt.hashSync(user.password, salt)
					const bcryptedPassword = hashedClientInput===result[0].password ? true : false
					if (bcryptedPassword){
						let user = [{
							user_id:result[0].id,
							user_name:result[0].user_name,
							email:result[0].email,
							role:result[0].role
						}]

						if (user[0].role === "DOCTOR"){
							const doctorDetails = await this.retrieveDoctorWithUserId(user[0].user_id)
							user[0].doctor_id = doctorDetails.id
						}
						resolve(user)
					}else{
						reject(AUTH_ERROR_LOGIN)
					}
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	loginWithEmail(user) {
		return new Promise((resolve, reject) => {
			if (!user instanceof User) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "SELECT id, user_name, email, salt, password, role FROM users WHERE email=?"
			this.mysqlConn.query(query, [user.email], async (error, result) => {
				if (error) {
					reject(error)
					return
				} else if (result.length === 1) {
					const salt = result[0].salt
					const hashedClientInput = bcrypt.hashSync(user.password, salt)
					const bcryptedPassword = hashedClientInput === result[0].password ? true : false
					if (bcryptedPassword) {
						let user = [{
							user_id: result[0].id,
							user_name: result[0].user_name,
							email: result[0].email,
							role: result[0].role
						}]

						if (user[0].role === "DOCTOR") {
							const doctorDetails = await this.retrieveDoctorWithUserId(user[0].user_id)
							user[0].doctor_id = doctorDetails.id
						}
						resolve(user)
					} else {
						reject(AUTH_ERROR_LOGIN)
					}
				}
			})
		})
	}

	userLastSignIn(id){
		return new Promise((resolve,reject)=>{
			const query="UPDATE users SET last_sign_in= NOW() " +
				"WHERE id=? "
			this.mysqlConn.query(query,id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	updateCustomer(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "UPDATE users SET user_name=?, mobile=?, email=?, birthdate=?, address=? WHERE id=?"
			this.mysqlConn.query(query, [user.user_name,user.mobile, user.email,user.birthdate, user.address, user.id], (err,res)=>{
				if(err){
					reject(err)
				}else if(res.affectedRows<1) {
					reject(NO_SUCH_CONTENT)
				}else{
					resolve(SUCCESS)
				}
			})
		})
	}

	changeCustomerPassword(user){
		return new Promise(async(resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const salt = await bcrypt.genSalt(5)
			const hash = await bcrypt.hash(user.password,salt)
			const query="UPDATE users SET password=?, salt=? WHERE id=?"
			this.mysqlConn.query(query, [hash, salt, user.id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	deleteCustomer(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="DELETE FROM users WHERE id=?"
			this.mysqlConn.query(query,user.id,(err,res)=>{
				if(err){
					reject(err)
					return
				}else if(res.affectedRows<1){
					reject(NO_SUCH_CONTENT)
				}else{
					user.id=res.insertId
					delete(user.salt)
					resolve(SUCCESS)
				}
			})
		})
	}

	retrieveDoctor(){
		return new Promise((resolve,reject)=>{
			const query="SELECT d.id, d.doctor_name, d.user_id, u.mobile, u.email, u.birthdate, u.role " +
				"FROM doctor d LEFT OUTER JOIN users u ON u.id=d.user_id "
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const doctors=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						doctor_name:rowDataPacket.doctor_name,
						user_id:rowDataPacket.user_id,
						mobile:rowDataPacket.mobile,
						email:rowDataPacket.email,
						birthdate:rowDataPacket.birthdate,
						role:rowDataPacket.role
					}
				})
				resolve(doctors)
			})
		})
	}

	retrieveDoctorWithUserId(user_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT id, doctor_name, user_id FROM doctor WHERE user_id = ?"
			this.mysqlConn.query(query,[user_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve({id:result[0].id,
					doctor_name:result[0].doctor_name,
					user_id:result[0].user_id})
			})
		})
	}

	retrieveOneDoctor(doctor){
		return new Promise((resolve,reject)=>{
			if(!doctor instanceof Doctor){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT d.id, d.doctor_name, d.user_id, u.mobile, u.email, u.birthdate, u.role " +
				"FROM doctor d LEFT OUTER JOIN users u ON u.id=d.user_id " +
				"WHERE d.id=? "
			this.mysqlConn.query(query,doctor.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const doctors=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							doctor_name:rowDataPacket.doctor_name,
							user_id:rowDataPacket.user_id,
							mobile:rowDataPacket.mobile,
							email:rowDataPacket.email,
							birthdate:rowDataPacket.birthdate,
							role:rowDataPacket.role
						}
					})
					resolve(doctors)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	getDoctorUserId(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT id FROM users WHERE role='DOCTOR' AND id=? "
			this.mysqlConn.query(query,user.id,(error,result)=>{
				if(result.length===1){
					resolve(result)
					return
				}
				reject(NO_SUCH_CONTENT)
			})
		})
	}

	registerDoctor(doctor){
		return new Promise((resolve,reject)=>{
			if(!doctor instanceof Doctor){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="INSERT INTO `doctor`(`doctor_name`, `user_id`) VALUES(?, ?) "
			this.mysqlConn.query(query,[doctor.doctor_name,doctor.user_id],async(error,result)=>{
				if(error){
					reject(error)
					return
				}

				doctor.id=result.insertId
				resolve(doctor)
			})
		})
	}

	updateDoctor(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			if(typeof user.user_name==='undefined'){
				const query="UPDATE users SET mobile=?, email=?, birthdate=? WHERE id=? "
				this.mysqlConn.query(query,[user.mobile,user.email,user.birthdate,user.id],(error,result)=>{
					if(error){
						reject(error)
					}else if(result.affectedRows<1){
						reject(NO_SUCH_CONTENT)
					}else{
						resolve(SUCCESS)
					}
				})
				return
			}

			const query="UPDATE users SET user_name=?, mobile=?, email=?, birthdate=? WHERE id=? "
			this.mysqlConn.query(query,[user.user_name,user.mobile,user.email,user.birthdate,user.id],(error,result)=>{
				const updateNameQuery="UPDATE doctor SET doctor_name=? WHERE user_id=? "
				this.mysqlConn.query(updateNameQuery,[user.user_name,user.id],(error,result)=>{
					if(error){
						reject(error)
					}else if(result.affectedRows<1){
						reject(NO_SUCH_CONTENT)
					}else{
						resolve(SUCCESS)
					}
				})
			})
		})
	}

	deleteDoctor(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="DELETE FROM users WHERE role='DOCTOR' AND id=(SELECT user_id FROM doctor WHERE id=?) "
			const res = this.mysqlConn.query(query,user.id,(error,result)=>{
				if(error){
					reject(error)
				}else if(result.affectedRows<1){
					reject(NO_SUCH_CONTENT)
				}else{
					resolve(SUCCESS)
				}
			})
			console.log(res.sql)
		})
	}

	retrievePatient(){
		return new Promise((resolve, reject)=>{
			const query="SELECT p.id, p.patient_name, p.animal_type_id, at.animal_name, p.breed, p.patient_gender, p.birthdate, p.pet_owner_id, u.user_name, p.patient_picture " +
				"FROM patients p LEFT OUTER JOIN animal_type at ON p.animal_type_id=at.id "+
				"LEFT OUTER JOIN users u ON p.pet_owner_id=u.id"
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const patients=result.map(rowDataPacket=>{
					const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
					const ageFormatter = new AgeFormatter(d1, new Date());

					return{
						id:rowDataPacket.id,
						patient_name:rowDataPacket.patient_name,
						animal_type_id:rowDataPacket.animal_type_id,
						animal_name:rowDataPacket.animal_name,
						breed:rowDataPacket.breed,
						gender:rowDataPacket.patient_gender,
						birthdate:d1,
						age:ageFormatter.getAgeYear(),
						age_month:ageFormatter.getAgeMonth(),
						age_string:ageFormatter.getAgeString(),
						pet_owner_id:rowDataPacket.pet_owner_id,
						pet_owner_name:rowDataPacket.user_name,
						picture:rowDataPacket.patient_picture
					}
				})
				resolve(patients)
			})
		})
	}

	retrieveOnePatient(patient){
		return new Promise((resolve,reject)=>{
			if(!patient instanceof Patient){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="SELECT p.id, p.patient_name, p.animal_type_id, at.animal_name, p.breed, p.patient_gender, p.birthdate, p.pet_owner_id, u.user_name, p.patient_picture " +
				"FROM patients p LEFT OUTER JOIN animal_type at ON p.animal_type_id=at.id "+
				"LEFT OUTER JOIN users u ON p.pet_owner_id=u.id "+
				"WHERE p.id=?"
			this.mysqlConn.query(query,patient.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const patients=result.map(rowDataPacket=>{

						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());

						return{
							id:rowDataPacket.id,
							patient_name:rowDataPacket.patient_name,
							animal_type_id:rowDataPacket.animal_type_id,
							animal_name:rowDataPacket.animal_name,
							breed:rowDataPacket.breed,
							gender:rowDataPacket.patient_gender,
							birthdate:d1,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							pet_owner_id:rowDataPacket.pet_owner_id,
							pet_owner_name:rowDataPacket.user_name,
							picture:rowDataPacket.patient_picture
						}
					})
					resolve(patients)
				}else {
					resolve([])
				}
			})
		})
	}

	retrievePatientsByOwnerId(owner_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT p.id, p.patient_name, p.animal_type_id, at.animal_name, p.breed, p.patient_gender, p.birthdate, p.pet_owner_id, u.user_name, p.patient_picture " +
				"FROM patients p LEFT OUTER JOIN animal_type at ON p.animal_type_id=at.id "+
				"LEFT OUTER JOIN users u ON p.pet_owner_id=u.id "+
				"WHERE p.pet_owner_id=?"
			this.mysqlConn.query(query,owner_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const patients=result.map(rowDataPacket=>{
						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());
						return{
							id:rowDataPacket.id,
							patient_name:rowDataPacket.patient_name,
							animal_type_id:rowDataPacket.animal_type_id,
							animal_name:rowDataPacket.animal_name,
							breed:rowDataPacket.breed,
							gender:rowDataPacket.patient_gender,
							birthdate:rowDataPacket.birthdate,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							pet_owner_id:rowDataPacket.pet_owner_id,
							pet_owner_name:rowDataPacket.user_name,
							picture:rowDataPacket.patient_picture
						}
					})
					resolve(patients)
				}else {
					resolve([])
				}
			})
		})
	}

	retrievePatientPicture(patient){
		return new Promise((resolve,reject)=>{
			if(!patient instanceof Patient){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="SELECT patient_picture FROM patients WHERE id=? "
			this.mysqlConn.query(query,patient.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					resolve(result[0].patient_picture)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	registerPatient(patient){
		return new Promise((resolve,reject)=>{
			if(patient instanceof Patient){
				let query = "SELECT 'x' FROM patients WHERE patient_name = ? AND breed = ? AND animal_type_id = ? AND pet_owner_id = ?"
				this.mysqlConn.query(query, [patient.patient_name, patient.breed, patient.animal_type, patient.pet_owner], (err, res)=>{
					if	(err){
						reject(err)
						return
					}else{
						if (res.length>0){
							reject(ERROR_DUPLICATE_ENTRY)
							return
						}else{
							query="INSERT INTO `patients`(`patient_name`,`animal_type_id`,`breed`,`patient_gender`,`birthdate`,`pet_owner_id`,`patient_picture`) VALUES(?,?,?,?,?,?,?)"
							this.mysqlConn.query(query,[patient.patient_name,patient.animal_type,patient.breed,patient.gender,patient.birthdate,patient.pet_owner,patient.picture],(err,res)=>{
								if(err){
									reject(err)
									return
								}

								patient.id=res.insertId
								resolve(patient)
							})
						}
					}
				})
			} else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updatePatient(patient){
		return new Promise((resolve, reject)=>{
			if(!patient instanceof Patient){
				reject(MISMATCH_OBJ_TYPE)
				return
			} else{
				if(patient.picture==='No Attachment'){
					const query="UPDATE patients SET patient_name=?,animal_type_id=?,breed=?,patient_gender=?,birthdate=?,pet_owner_id=? WHERE id=?"
					this.mysqlConn.query(query, [patient.patient_name,patient.animal_type,patient.breed,patient.gender,patient.birthdate,patient.pet_owner,patient.id], (err, res)=>{
						if(err){
							reject(err)
							return
						}

						resolve(patient)
					})
					return
				}

				const query="UPDATE patients SET patient_name=?,animal_type_id=?,breed=?,patient_gender=?,birthdate=?,pet_owner_id=?,patient_picture=? WHERE id=?"
				this.mysqlConn.query(query, [patient.patient_name,patient.animal_type,patient.breed,patient.gender,patient.birthdate,patient.pet_owner,patient.picture,patient.id], (err, res)=>{
					if(err){
						reject(err)
						return
					}

					resolve(patient)
				})
			}
		})
	}

	deletePatient(patient){
		return new Promise((resolve, reject)=>{
			if(!patient instanceof Patient){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="DELETE FROM patients WHERE id=?"
			this.mysqlConn.query(query,[patient.id],(err,res)=>{
				if(err){
					reject(err)
				}else if(res.length<1){
					reject(NO_SUCH_CONTENT)
				}else{
					resolve(patient)
				}
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
			const query="SELECT m.id, m.description, m.medication, m.date_created, m.appointment_id, a.patient_id, m.file " +
				"FROM medical_records m LEFT OUTER JOIN v2_appointment_schedule a ON a.id=m.appointment_id "
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const records=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						description:rowDataPacket.description,
						medication:rowDataPacket.medication,
						date_created:rowDataPacket.date_created,
						appointment_id:rowDataPacket.appointment_id,
						patient_id:rowDataPacket.patient_id,
						file_attachment:rowDataPacket.file
					}
				})
				resolve(records)
			})
		})
	}

	retrieveOneMedicalRecord(record){
		return new Promise((resolve,reject)=>{
			if(!record instanceof MedicalRecords){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT m.id, m.description, m.medication, m.date_created, m.appointment_id, a.patient_id, m.file " +
				"FROM medical_records m LEFT OUTER JOIN v2_appointment_schedule a ON a.id=m.appointment_id " +
				"WHERE m.id=? "
			this.mysqlConn.query(query,record.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length===1){
					const records=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							description:rowDataPacket.description,
							medication:rowDataPacket.medication,
							date_created:rowDataPacket.date_created,
							appointment_id:rowDataPacket.appointment_id,
							patient_id:rowDataPacket.patient_id,
							file_attachment:rowDataPacket.file
						}
					})
					resolve(records)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveMedicalRecordByPatientId(patient_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT m.id, m.description, m.medication, m.date_created, m.appointment_id, a.patient_id, m.file " +
				"FROM medical_records m LEFT OUTER JOIN v2_appointment_schedule a ON a.id=m.appointment_id " +
				"WHERE a.patient_id=? "
			this.mysqlConn.query(query,patient_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const records=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							description:rowDataPacket.description,
							medication:rowDataPacket.medication,
							date_created:rowDataPacket.date_created,
							appointment_id:rowDataPacket.appointment_id,
							patient_id:rowDataPacket.patient_id,
							file_attachment:rowDataPacket.file
						}
					})
					resolve(records)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveMedicalRecordByAppointmentId(appointment_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT m.id, m.description, m.medication, m.date_created, m.appointment_id, a.patient_id, m.file " +
				"FROM medical_records m LEFT OUTER JOIN v2_appointment_schedule a ON a.id=m.appointment_id " +
				"WHERE a.status='DONE' AND m.appointment_id=? "
			this.mysqlConn.query(query,appointment_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const records=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							description:rowDataPacket.description,
							medication:rowDataPacket.medication,
							date_created:rowDataPacket.date_created,
							appointment_id:rowDataPacket.appointment_id,
							patient_id:rowDataPacket.patient_id,
							file_attachment:rowDataPacket.file
						}
					})
					resolve(records)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	addMedicalRecord(record){
		return new Promise((resolve,reject)=>{
			if(record instanceof MedicalRecords){
				const query="INSERT INTO `medical_records` (`description`, `medication`, `date_created`, `appointment_id`, `file`) VALUES(?, ?, NOW(), ?, ?)"
				this.mysqlConn.query(query, [record.description, record.medication, record.appointment_id, record.file],(error, result)=>{
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
				if(record.file==='No Attachment'){
					const query="UPDATE medical_records SET description=?, medication=?, date_created=NOW(), appointment_id=? WHERE id=?"
					this.mysqlConn.query(query, [record.description,record.medication, record.appointment_id, record.id], (error,result)=>{
						if(error){
							reject(error)
							return
						}

						resolve(record)
					})
				}else{
					const query="UPDATE medical_records SET description=?, medication=?, date_created=NOW(), appointment_id=?, file=? WHERE id=?"
					this.mysqlConn.query(query, [record.description,record.medication, record.appointment_id, record.file, record.id], (error,result)=>{
						if(error){
							reject(error)
							return
						}

						resolve(record)
					})
				}
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

					resolve(SUCCESS)
				})
			}

			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveMedicalRecordSymptoms(){
		return new Promise((resolve,reject)=>{
			const query="SELECT mrs.medical_records_id, mr.patient_id, mr.case_open_time, mr.status, mrs.symptoms_id, s.symptom_name "+
				"FROM medical_records_symptoms mrs LEFT OUTER JOIN medical_records mr ON mrs.medical_records_id=mr.id "+
				"LEFT OUTER JOIN symptoms s ON mrs.symptoms_id=s.id "

			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const records=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						patient_id:rowDataPacket.patient_id,
						case_open_time:rowDataPacket.case_open_time,
						status:rowDataPacket.status,
						symptoms_id:rowDataPacket.symptoms_id,
						symptom_name:rowDataPacket.symptom_name
					}
				})
				resolve(records)
			})
		})
	}

	retrieveOneMedicalRecordSymptoms(record){
		return new Promise((resolve,reject)=>{
			const query="SELECT mrs.medical_records_id, mr.patient_id, mr.case_open_time, mr.status, mrs.symptoms_id, s.symptom_name "+
				"FROM medical_records_symptoms mrs LEFT OUTER JOIN medical_records mr ON mrs.medical_records_id=mr.id "+
				"LEFT OUTER JOIN symptoms s ON mrs.symptoms_id=s.id "+
				"WHERE mrs.medical_records_id=? "

			this.mysqlConn.query(query,record.medical_record_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const records=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						patient_id:rowDataPacket.patient_id,
						case_open_time:rowDataPacket.case_open_time,
						status:rowDataPacket.status,
						symptoms_id:rowDataPacket.symptoms_id,
						symptom_name:rowDataPacket.symptom_name
					}
				})
				resolve(records)
			})
		})
	}

	bindMedicalRecordWithSymptoms(record,symptoms){
		return new Promise((resolve,reject)=>{
			if(record instanceof MedicalRecordSymptoms &&
				symptoms instanceof Symptoms){
				const query="INSERT INTO `medical_records_symptoms` (`medical_records_id`,`symptoms_id`) VALUES(?,?) "
				this.mysqlConn.query(query,[record.id,symptoms.id], (error,result)=>{
					if(result.length>1){
						reject(ERROR_DUPLICATE_ENTRY)
						return
					}

					resolve(SUCCESS)
				})
			}

			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	/*updateMedicalRecordSymptoms(record){
		return new Promise((resolve,reject)=>{
			if(record instanceof MedicalRecordSymptoms){
				const query="UPDATE medical_records_symptoms SET medical_records_id=?, symptoms_id=? WHERE id=?"
				this.mysqlConn.query(query,[record.medical_record_id, record.symptoms_id, record.id], (error,result)=>{
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
	}*/

	unbindMedicalRecordWithSymptoms(bind_id){
		return new Promise((resolve,reject)=>{
			const query="DELETE FROM medical_records_symptoms WHERE id=?"
			this.mysqlConn.query(query,bind_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	retrieveMedicalRecordTreatmentPlan(){
		return new Promise((resolve,reject)=>{
			const query="SELECT mrtp.id, mrtp.medical_record_id, mr.patient_id, mr.case_open_time, mr.status, mrtp.treatment_plan_id, tp.medicine_id, m.medicine_name, tp.disease_id, d.disease_name "+
				"FROM medical_record_treatment_plan mrtp LEFT OUTER JOIN medical_records mr ON mrtp.medical_record_id=mr.id "+
				"LEFT OUTER JOIN treatment_plan tp ON mrtp.treatment_plan_id=tp.id "+
				"LEFT OUTER JOIN medicine m ON tp.medicine_id=m.id "+
				"LEFT OUTER JOIN disease d ON tp.disease_id=d.id "

			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const record=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						medical_record_id:rowDataPacket.medical_record_id,
						patient_id:rowDataPacket.patient_id,
						case_open_time:rowDataPacket.case_open_time,
						status:rowDataPacket.status,
						treatment_plan_id:rowDataPacket.treatment_plan_id,
						medicine_id:rowDataPacket.medicine_id,
						medicine_name:rowDataPacket.medicine_name,
						disease_id:rowDataPacket.disease_id,
						disease_name:rowDataPacket.disease_name
					}
				})

				resolve(record)
			})
		})
	}

	retrieveOneMedicalRecordTreatmentPlan(record){
		return new Promise((reject,resolve)=>{
			const query="SELECT mrtp.id, mrtp.medical_record_id, mr.patient_id, mr.case_open_time, mr.status, mrtp.treatment_plan_id, tp.medicine_id, m.medicine_name, tp.disease_id, d.disease_name "+
				"FROM medical_record_treatment_plan mrtp LEFT OUTER JOIN medical_records mr ON mrtp.medical_record_id=mr.id "+
				"LEFT OUTER JOIN treatment_plan tp ON mrtp.treatment_plan_id=tp.id "+
				"LEFT OUTER JOIN medicine m ON tp.medicine_id=m.id "+
				"LEFT OUTER JOIN disease d ON tp.disease_id=d.id "+
				"WHERE mrtp.medical_record_id=? "

			this.mysqlConn.query(query,record.medical_record_id,(error,result)=> {
				if (error) {
					reject(error)
					return
				}

				const record = result.map(rowDataPacket => {
					return {
						id: rowDataPacket.id,
						medical_record_id: rowDataPacket.medical_record_id,
						patient_id: rowDataPacket.patient_id,
						case_open_time: rowDataPacket.case_open_time,
						status: rowDataPacket.status,
						treatment_plan_id: rowDataPacket.treatment_plan_id,
						medicine_id: rowDataPacket.medicine_id,
						medicine_name:rowDataPacket.medicine_name,
						disease_id: rowDataPacket.disease_id,
						disease_name:rowDataPacket.disease_name
					}
				})

				resolve(record)
			})
		})
	}

	bindMedicalRecordToTreatmentPlan(record,treatment){
		return new Promise((resolve,reject)=>{
			if(record instanceof MedicalRecords &&
				treatment instanceof TreatmentPlan){
				const query="INSERT INTO `medical_record_treatment_plan` (`medical_record_id`, `treatment_plan_id`) VALUES(?, ?)"
				this.mysqlConn.query(query, [record.id,treatment.id],(error,result)=>{
					if(result.length>1){
						reject(ERROR_DUPLICATE_ENTRY)
						return
					}

					resolve(SUCCESS)
				})
			} else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	unbindMedicalRecordWithTreatmentPlan(bind_id){
		return new Promise((resolve,reject)=>{
			const query="DELETE FROM medical_record_treatment_plan WHERE ID=?"
			this.mysqlConn.query(query,bind_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
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
				} else if(result.length>0){
					resolve(result[0].file_name)
				} else {
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
			} else {
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
			} else{
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

					resolve(attachment)
				})
			} else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveAppointment(){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, p.birthdate, a.doctor_id, d.doctor_name, a.description, " +
				"a.proof_of_payment " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id "
			this.mysqlConn.query(query, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				const schedule=result.map(rowDataPacket=>{
					const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");

					const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
					const ageMonths=monthDiff(d1,new Date());

					return{
						id:rowDataPacket.id,
						appointment_name:rowDataPacket.appointment_name,
						appointment_time:appointmentTime,
						duration:rowDataPacket.duration,
						appointment_status:rowDataPacket.appointment_status,
						user_id:rowDataPacket.user_id,
						user_name:rowDataPacket.user_name,
						is_real_appointment:rowDataPacket.is_real_appointment,
						patient_id:rowDataPacket.patient_id,
						pet_name:rowDataPacket.patient_name,
						birthdate:d1,
						age:ageMonths,
						doctor_id:rowDataPacket.doctor_id,
						doctor_name:rowDataPacket.doctor_name,
						description:rowDataPacket.description,
						proof_of_payment:rowDataPacket.proof_of_payment
					}
				})
				resolve(schedule)
			})
		})
	}

	retrieveOneAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(!appointment instanceof Appointment){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, p.birthdate, a.doctor_id, d.doctor_name, a.description, " +
				"a.proof_of_payment " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id " +
				"WHERE a.id=? "
			this.mysqlConn.query(query, appointment.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");

						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageMonths=monthDiff(d1,new Date());

						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							appointment_time:appointmentTime,
							duration:rowDataPacket.duration,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							birthdate:d1,
							age:ageMonths,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveOneAppointmentByDoctorId(doctor){
		return new Promise((resolve,reject)=>{
			if(!doctor instanceof Doctor){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name, a.description, " +
				"a.proof_of_payment " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id " +
				"WHERE a.doctor_id=? "
			this.mysqlConn.query(query, doctor.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							appointment_time:appointmentTime,
							duration:rowDataPacket.duration,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentByDoctorName(doctor){
		return new Promise((resolve,reject)=>{
			if(!doctor instanceof Doctor){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name, a.description, " +
				"a.proof_of_payment " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id " +
				"WHERE d.doctor_name=? "
			this.mysqlConn.query(query,doctor.doctor_name,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							appointment_time:appointmentTime,
							duration:rowDataPacket.duration,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentsBetweenDates(date1,date2){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name, a.description, " +
				"a.proof_of_payment " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id " +
				"WHERE appointment_time BETWEEN ? AND ? "
			this.mysqlConn.query(query,[date1,date2],(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							appointment_time:appointmentTime,
							duration:rowDataPacket.duration,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentByDoctorAndBetweenDates(doctorId,date1,date2){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name, a.description, " +
				"a.proof_of_payment " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id " +
				"WHERE a.doctor_id=? AND appointment_time BETWEEN ? AND ? "
			this.mysqlConn.query(query,[doctorId,date1,date2],(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							appointment_time:appointmentTime,
							duration:rowDataPacket.duration,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	getAppointmentId(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="SELECT id FROM appointment WHERE id=?"
				this.mysqlConn.query(query, appointment.id, (error,result)=>{
					if(error){
						reject(error)
						return
					}else if(result.length>0){
						resolve(result[0].id)
					}else{
						reject(NO_SUCH_CONTENT)
					}
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveAppointmentByCustomerId(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name, a.description, " +
				"a.proof_of_payment " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id " +
				"WHERE a.user_id=? "
			this.mysqlConn.query(query,user.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							appointment_time:appointmentTime,
							duration:rowDataPacket.duration,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentByStatus(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, " +
					"a.user_id, a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.description, a.proof_of_payment " +
					"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
					"LEFT OUTER JOIN patients p ON a.patient_id=p.id" +
					"WHERE a.appointment_status=?"
				this.mysqlConn.query(query, appointment.appointment_status, (error,result)=>{
					if(error){
						reject(error)
						return
					}else if(result.length>0){
						const attachment=result.map(rowDataPacket=>{
							const appointmentTime =  moment(rowDataPacket.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
							return{
								id:rowDataPacket.id,
								appointment_name:rowDataPacket.appointment_name,
								appointment_time:appointmentTime,
								duration:rowDataPacket.duration,
								appointment_status:rowDataPacket.appointment_status,
								user_id:rowDataPacket.user_id,
								user_name:rowDataPacket.user_name,
								patient_id:rowDataPacket.patient_id,
								pet_name:rowDataPacket.patient_name,
								is_real_appointment:rowDataPacket.is_real_appointment,
								description:rowDataPacket.description,
								proof_of_payment:rowDataPacket.proof_of_payment
							}
						})
						resolve(attachment)
					}else{
						reject(NO_SUCH_CONTENT)
					}
				})
			}
		})
	}

	addAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof  Appointment){
				const query="INSERT INTO `appointment` (`appointment_name`, `appointment_time`, `duration`, `user_id`, " +
					"`appointment_status`, `is_real_appointment`, `patient_id`, `doctor_id`, `description`, `proof_of_payment`) " +
					"VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				const appointmentTime =  moment(appointment.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
				this.mysqlConn.query(query, [appointment.appointment_name, appointmentTime,
					appointment.duration, appointment.user_id,appointment.appointment_status,
					appointment.is_real_appointment, appointment.patient_id, appointment.doctor_id,
					appointment.description, appointment.payment_attachment],(error,result)=>{
					if(error){
						reject(error)
						return
					}

					appointment.id=result.insertId
					resolve(appointment)
				})
			} else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	addAppointmentDescription(id,description){
		return new Promise((resolve,reject)=>{
			const query="UPDATE appointment SET description=? WHERE id=? "
			this.mysqlConn.query(query,[description,id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	updateAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="UPDATE appointment SET appointment_name=?, user_id=?, is_real_appointment=?, patient_id=?, " +
					"doctor_id=?, appointment_status=?, proof_of_payment=? " +
					"WHERE id=? "
				this.mysqlConn.query(query, [appointment.appointment_name.toUpperCase(),
					appointment.user_id,
					appointment.is_real_appointment,
					appointment.patient_id,
					appointment.doctor_id,
					appointment.appointment_status,
					appointment.payment_attachment,
					appointment.id], (error,result)=>{
					if(error){
						reject(error)
						return
					}

					resolve(appointment)
				})
			} else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	rescheduleAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(!appointment instanceof Appointment){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="UPDATE appointment SET appointment_time=?, duration=?, appointment_status='RESCHEDULED' WHERE id=? "
			const appointmentTime=moment(appointment.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
			this.mysqlConn.query(query,[appointmentTime, appointment.duration,appointment.id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	approveAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="UPDATE appointment SET appointment_time=?, duration=?, appointment_status='APPROVED' WHERE id=?"
				const appointmentTime=moment(appointment.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
				this.mysqlConn.query(query,[appointmentTime,appointment.duration,appointment.id],(error,result)=>{
					if(error){
						reject(error)
						return
					}

					resolve(SUCCESS)
				})
			}else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	declineAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="UPDATE appointment SET appointment_status='DECLINED' WHERE id=?"
				this.mysqlConn.query(query,appointment.id,(error,result)=>{
					if(error){
						reject(error)
						return
					}

					resolve(SUCCESS)
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	cancelAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(!appointment instanceof Appointment){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="UPDATE appointment SET appointment_status='CANCELLED' WHERE id=? "
			this.mysqlConn.query(query,appointment.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	finishAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="UPDATE appointment SET appointment_status='FINISHED' WHERE id=?"
				this.mysqlConn.query(query,appointment.id,(error,result)=>{
					if(error){
						reject(error)
						return
					}

					resolve(SUCCESS)
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	deleteAppointment(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof  Appointment){
				const query="UPDATE appointment SET appointment_status='DELETED' WHERE id=?"
				this.mysqlConn.query(query, appointment.id, (error,result)=>{
					if(error){
						reject(error)
						return
					}

					resolve(SUCCESS)
				})
			} else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveSchedule(){
		return new Promise((resolve,reject)=>{
			const query="SELECT s.id, s.appointment_name, s.start_time, s.end_time, s.appointment_status, s.user_id, " +
				"s.is_real_appointment, u.user_name, s.patient_id, p.patient_name, s.doctor_id, d.doctor_name, s.description, " +
				"s.proof_of_payment " +
				"FROM schedule s LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON s.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON s.doctor_id=d.id "
			this.mysqlConn.query(query,(error,result)=>{
				const schedule=result.map(rowDataPacket=>{
					const startTime =  moment(rowDataPacket.start_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
					const endTime =  moment(rowDataPacket.end_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
					return{
						id:rowDataPacket.id,
						appointment_name:rowDataPacket.appointment_name,
						start_time:startTime,
						end_time:endTime,
						appointment_status:rowDataPacket.appointment_status,
						user_id:rowDataPacket.user_id,
						user_name:rowDataPacket.user_name,
						is_real_appointment:rowDataPacket.is_real_appointment,
						patient_id:rowDataPacket.patient_id,
						pet_name:rowDataPacket.patient_name,
						doctor_id:rowDataPacket.doctor_id,
						doctor_name:rowDataPacket.doctor_name,
						description:rowDataPacket.description,
						proof_of_payment:rowDataPacket.proof_of_payment
					}
				})
				resolve(schedule)
			})
		})
	}

	retrieveOneSchedule(schedule){
		return new Promise((resolve,reject)=>{
			if(!schedule instanceof Schedule){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT s.id, s.appointment_name, s.start_time, s.end_time, s.appointment_status, s.user_id, " +
				"s.is_real_appointment, u.user_name, s.patient_id, p.patient_name, s.doctor_id, d.doctor_name, s.description, " +
				"s.proof_of_payment " +
				"FROM schedule s LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON s.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON s.doctor_id=d.id " +
				"WHERE s.id=? "
			this.mysqlConn.query(query,schedule.id,(error,result)=>{
				const schedule=result.map(rowDataPacket=>{
					const startTime =  moment(rowDataPacket.start_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
					const endTime =  moment(rowDataPacket.end_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
					return{
						id:rowDataPacket.id,
						appointment_name:rowDataPacket.appointment_name,
						start_time:startTime,
						end_time:endTime,
						appointment_status:rowDataPacket.appointment_status,
						user_id:rowDataPacket.user_id,
						user_name:rowDataPacket.user_name,
						is_real_appointment:rowDataPacket.is_real_appointment,
						patient_id:rowDataPacket.patient_id,
						pet_name:rowDataPacket.patient_name,
						doctor_id:rowDataPacket.doctor_id,
						doctor_name:rowDataPacket.doctor_name,
						description:rowDataPacket.description,
						proof_of_payment:rowDataPacket.proof_of_payment
					}
				})
				resolve(schedule)
			})
		})
	}

	retrieveOneScheduleByDoctorId(doctor){
		return new Promise((resolve,reject)=>{
			if(!doctor instanceof Doctor){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="SELECT s.id, s.appointment_name, s.start_time, s.end_time, s.appointment_status, s.user_id, " +
				"s.is_real_appointment, u.user_name, s.patient_id, s.patient_name, s.doctor_id, d.doctor_name, s.description, " +
				"s.proof_of_payment " +
				"FROM schedule s LEFT OUTER JOIN users u ON s.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON s.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON s.doctor_id=d.id " +
				"WHERE s.doctor_id=? "
			this.mysqlConn.query(query, doctor.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const startTime =  moment(rowDataPacket.start_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						const endTime =  moment(rowDataPacket.end_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							start_time:startTime,
							end_time:endTime,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveScheduleByDoctorName(doctor){
		return new Promise((resolve,reject)=>{
			if(!doctor instanceof Doctor){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT s.id, s.appointment_name, s.start_time, s.end_time, s.appointment_status, s.user_id, " +
				"s.is_real_appointment, u.user_name, s.patient_id, s.patient_name, s.doctor_id, d.doctor_name, s.description, " +
				"s.proof_of_payment " +
				"FROM schedule s LEFT OUTER JOIN users u ON s.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON s.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON s.doctor_id=d.id " +
				"WHERE d.doctor_name=? "
			this.mysqlConn.query(query,doctor.doctor_name,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const startTime =  moment(rowDataPacket.start_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						const endTime =  moment(rowDataPacket.end_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							start_time:startTime,
							end_time:endTime,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveScheduleByCustomerId(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="SELECT s.id, s.appointment_name, s.appointment_time, s.duration, s.appointment_status, s.user_id, " +
				"s.is_real_appointment, u.user_name, s.patient_id, p.patient_name, s.doctor_id, d.doctor_name, s.description, " +
				"s.proof_of_payment " +
				"FROM schedule s LEFT OUTER JOIN users u ON s.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON s.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON s.doctor_id=d.id " +
				"WHERE s.user_id=? "
			this.mysqlConn.query(query,user.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const startTime =  moment(rowDataPacket.start_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						const endTime =  moment(rowDataPacket.end_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							start_time:startTime,
							end_time:endTime,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							description:rowDataPacket.description,
							proof_of_payment:rowDataPacket.proof_of_payment
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	addSchedule(schedule){
		return new Promise((resolve,reject)=>{
			if(schedule instanceof Schedule){
				const query="INSERT INTO `schedule` (`appointment_name`, `start_time`, `end_time`, `user_id`, " +
					"`appointment_status`, `is_real_appointment`, `patient_id`, `doctor_id`, `description`, `proof_of_payment`) " +
					"VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				const startTime =  moment(schedule.start_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
				const endTime = moment(schedule.end_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");

				this.mysqlConn.query(query, [schedule.appointment_name, startTime,
					endTime, schedule.user_id,schedule.appointment_status,
					schedule.is_real_appointment, schedule.patient_id, schedule.doctor_id,
					schedule.description, schedule.payment_attachment],(error,result)=>{
					if(error){
						reject(error)
						return
					}

					schedule.id=result.insertId
					resolve(schedule)
				})
			} else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateSchedule(schedule){
		return new Promise((resolve,reject)=>{
			if(schedule instanceof Schedule){
				const query="UPDATE schedule SET appointment_name=?, user_id=?, is_real_appointment=?, patient_id=?, " +
					"doctor_id=?, appointment_status=?, proof_of_payment=? " +
					"WHERE id=? "
				this.mysqlConn.query(query, [schedule.appointment_name.toUpperCase(),
					schedule.user_id,
					schedule.is_real_appointment,
					schedule.patient_id,
					schedule.doctor_id,
					schedule.appointment_status,
					schedule.payment_attachment,
					schedule.id], (error,result)=>{
					if(error){
						reject(error)
						return
					}

					resolve(schedule)
				})
			} else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	rescheduleSchedule(schedule){
		return new Promise((resolve,reject)=>{
			if(!schedule instanceof Schedule){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="UPDATE schedule SET start_time=?, end-time=?, appointment_status='RESCHEDULED' WHERE id=? "
			const startTime=moment(schedule.start_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
			const endTime=moment(schedule.end_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
			this.mysqlConn.query(query,[startTime, endTime,schedule.id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	retrieveParticipants(){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM participants "
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				let participants=[]
				for(let i=0; i<result.length; i++){
					participants.push(new Participant(
						result[i].id,
						result[i].full_name,
						result[i].youtube_name,
						result[i].youtube_email,
						result[i].phone_number
					))
				}
				resolve(participants)
			})
		})
	}

	retrieveOneParticipant(participant){
		return new Promise((resolve,reject)=>{
			if(!participant instanceof Participant){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT * FROM participants " +
				"WHERE id=? "
			this.mysqlConn.query(query,participant.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					let participants=[]
					for(let i=0; i<result.length; i++){
						participants.push(new Participant(
							result[i].id,
							result[i].full_name,
							result[i].youtube_name,
							result[i].youtube_email,
							result[i].phone_number
						))
					}
					resolve(participants)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	registerParticipant(participant){
		return new Promise((resolve,reject)=>{
			if(!participant instanceof Participant){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="INSERT INTO participants (`full_name`, `youtube_name`, `youtube_email`, `phone_number`) VALUES(?, ?, ?, ?) "
			this.mysqlConn.query(query,[participant.full_name,participant.youtube_name, participant.youtube_email, participant.phone_number],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				participant.id=result.insertId
				resolve(participant)
			})
		})
	}

	updateParticipant(participant){
		return new Promise((resolve,reject)=>{
			if(!participant instanceof Participant){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="UPDATE participants SET full_name=?, youtube_name=?, youtube_email=?, phone_number=? WHERE id=? "
			this.mysqlConn.query(query,[participant.full_name,participant.youtube_name,participant.youtube_email,participant.phone_number,participant.id],(error,result)=>{
				if(error){
					reject(error)
				}else if(result.affectedRows<1){
					reject(NO_SUCH_CONTENT)
				}else{
					resolve(participant)
				}
			})
		})
	}

	deleteParticipant(participant){
		return new Promise((resolve,reject)=>{
			if(!participant instanceof Participant){
				reject(MISMATCH_OBJ_TYPE)
				return
			}
			const query="DELETE FROM participants WHERE id=? "
			this.mysqlConn.query(query,participant.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.affectedRows<1){
					reject(NO_SUCH_CONTENT)
				}else{
					resolve(SUCCESS)
				}
			})
		})
	}

	// Start of v2 Development
	addBookingType(booking_type_name, duration, payment_proof_required){
		return new Promise((resolve, reject)=>{
			const query = "INSERT INTO `v2_booking_type`(`booking_type_name`, `duration`, `payment_proof_required`) VALUES (?,?,?)";
			this.mysqlConn.query(query, [booking_type_name, duration, payment_proof_required], (err, res)=>{
				if(!err){
					resolve(res)
				}else{
					reject(err)
				}
			})
		})
	}

	editBookingType(booking_type_name, duration){
		return new Promise((resolve, reject)=>{
			const query = "UPDATE `v2_booking_type` SET `duration` = ? WHERE `booking_type_name` = ?";
			this.mysqlConn.query(query, [duration, booking_type_name], (err, res)=>{
				if(err){
					reject(err)
				}else if(res.affectedRows<1){
					reject(NO_SUCH_CONTENT)
				}else{
					resolve(SUCCESS)
				}
			})
		})
	}

	retrieveBookingTypes(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM `v2_booking_type`";
			this.mysqlConn.query(query, (err, res)=>{
				if(!err){
					resolve(res)
				}else{
					reject(err)
				}
			})
		})
	}

	retrieveOneBookingType(name){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM `v2_booking_type` " +
				"WHERE booking_type_name=? "
			this.mysqlConn.query(query,name,(error,result)=>{
				if(error){
					reject(error)
				}else if(result.length>0){
					resolve(result)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveBookingTypeDuration(booking_type_name){
		return new Promise((resolve, reject)=>{
			const query = "SELECT duration FROM v2_booking_type WHERE booking_type_name = ?"
			this.mysqlConn.query(query, [booking_type_name], (err, res)=>{
				if	(!err){
					if	(res.length == 0){
						reject(NO_SUCH_CONTENT)
					}else {
						resolve(res[0].duration)
					}
				}else{
					reject(err)
				}
			})
		})
	}

	deleteBookingType(booking_type_name){
		return new Promise((resolve, reject)=>{
			const query = "DELETE FROM v2_booking_type WHERE booking_type_name = ?"
			this.mysqlConn.query(query, [booking_type_name], (err, res)=>{
				if(err){
					reject(err)
				}else if(res.affectedRows<1){
					reject(NO_SUCH_CONTENT)
				}else{
					resolve(SUCCESS)
				}
			})
		})
	}

	bindDoctorToBookingType(booking_type_name, doctor_id){
		return new Promise((resolve, reject)=>{
			let query = "SELECT doctor_id FROM v2_booking_type_has_doctors WHERE doctor_id = ? AND booking_type_name = ? "
			this.mysqlConn.query(query, [doctor_id, booking_type_name], (err, res)=>{
				if	(res.length > 0){
					// doctor has already been previously binded
					reject(ERROR_DUPLICATE_ENTRY)
				}else{
					query = "INSERT INTO `v2_booking_type_has_doctors`(`doctor_id`, `booking_type_name`) VALUES (?, ?)"
					this.mysqlConn.query(query, [doctor_id, booking_type_name], (err, res)=>{
						if (!err){
							resolve(booking_type_name)
						}else{
							reject(err)
						}
					})
				}
			})

		})
	}

	unbindDoctorToBookingType(booking_type_name, doctor_id){
		return new Promise((resolve, reject)=>{
			const query = "DELETE FROM `v2_booking_type_has_doctors` WHERE `doctor_id` = ? AND `booking_type_name` = ?"
			this.mysqlConn.query(query, [doctor_id, booking_type_name], (err, res)=>{
				if (err){
					reject(err)
				}else if(res.affectedRows>0){
					resolve(res)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	bindAndRebind(booking_type_name_array, doctor_id){
		return new Promise((resolve, reject)=>{
			let query = "DELETE FROM `v2_booking_type_has_doctors` WHERE `doctor_id` = ?"
			this.mysqlConn.query(query, [doctor_id], async(err, res)=>{
				if (err){
					reject(err)
				}else {
					let failedBinds = []
					let successfulBinds = []
					for (let i=0; i<booking_type_name_array.length; i++){
						const bindResult = await this.bindDoctorToBookingType(booking_type_name_array[i].toUpperCase(),doctor_id).catch(err=>{
							//console.error("Error from bindAndRebind Arr function: "+err)
							failedBinds.push(booking_type_name_array[i])
						})
						if	(bindResult){
							successfulBinds.push(bindResult)
						}
					}
					resolve({
						successfulBinds: successfulBinds,
						failedBinds : failedBinds
					})
				}
			})
		})
	}

	retrieveDoctorsBasedOnBookingType(booking_type_name){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM `v2_booking_type_has_doctors` bthd INNER JOIN `doctor` d ON bthd.doctor_id = d.id " +
				"INNER JOIN `v2_booking_type` bt ON bthd.booking_type_name=bt.booking_type_name " +
				"WHERE bthd.`booking_type_name` = ? "
			this.mysqlConn.query(query, [booking_type_name], (err, res)=>{
				if (!err){
					res = res.map(rdp=>{
						return{
							doctor_id: rdp.doctor_id,
							doctor_name: rdp.doctor_name,
							booking_type_name: rdp.booking_type_name,
							duration: rdp.duration
						}
					})
					resolve(res)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveDoctorsByBookingTypeId(booking_id){
		return new Promise((resolve,reject)=>{
			const query = "SELECT * FROM `v2_booking_type_has_doctors` bthd INNER JOIN `doctor` d ON bthd.doctor_id = d.id " +
				"INNER JOIN `v2_booking_type` bt ON bthd.booking_type_name=bt.booking_type_name " +
				"WHERE bt.`id` = ? "
			this.mysqlConn.query(query, [booking_id], (err, res)=>{
				if (!err){
					res = res.map(rdp=>{
						return{
							doctor_id: rdp.doctor_id,
							doctor_name: rdp.doctor_name,
							booking_type_name: rdp.booking_type_name,
							duration: rdp.duration
						}
					})
					resolve(res)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveBookingTypeBasedOnDoctorId(doctor_id){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM `v2_booking_type_has_doctors` bthd INNER JOIN `doctor` d ON bthd.doctor_id = d.id INNER JOIN v2_booking_type bt ON bthd.booking_type_name=bt.booking_type_name WHERE bthd.`doctor_id` = ?"
			this.mysqlConn.query(query, [doctor_id], (err, res)=>{
				if (!err){
					res = res.map(rdp=>{
						return{
							doctor_id: rdp.doctor_id,
							doctor_name: rdp.doctor_name,
							booking_type_name: rdp.booking_type_name,
							duration:rdp.duration
						}
					})
					resolve(res)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveBookingTypeByName(booking_type_name){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM v2_booking_type WHERE booking_type_name=? "
			this.mysqlConn.query(query,booking_type_name,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const booking_type=result.map(rdp=>{
						return{
							id:rdp.id,
							booking_type_name:rdp.booking_type_name,
							duration:rdp.duration,
							payment_proof_required:rdp.payment_proof_required
						}
					})
					resolve(booking_type)
				}else {
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveBookedAppointmentSchedule(){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.birthdate, p.breed, p.pet_owner_id, u.user_name, u.mobile, a.booking_type_name, b.duration " +
				"FROM v2_appointment_schedule a INNER JOIN v2_booking_type b ON a.booking_type_name = b.booking_type_name INNER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN users u ON u.id=p.pet_owner_id WHERE a.patient_id IS NOT NULL "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				const schedule=result.map(rowDataPacket=>{
					const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
					const ageFormatter = new AgeFormatter(d1, new Date());

					return{
						id:rowDataPacket.id,
						start_time:rowDataPacket.start_time,
						end_time:rowDataPacket.end_time,
						proof_of_payment:rowDataPacket.proof_of_payment,
						description:rowDataPacket.description,
						additional_storage:rowDataPacket.additional_storage,
						status:rowDataPacket.status,
						doctor_id:rowDataPacket.doctor_id,
						doctor_name:rowDataPacket.doctor_name,
						patient_id:rowDataPacket.patient_id,
						patient_name:rowDataPacket.patient_name,
						breed:rowDataPacket.breed,
						birthdate:d1,
						age:ageFormatter.getAgeYear(),
						age_month:ageFormatter.getAgeMonth(),
						age_string:ageFormatter.getAgeString(),
						customer_id:rowDataPacket.pet_owner_id,
						customer_name:rowDataPacket.user_name,
						customer_mobile:rowDataPacket.mobile,
						booking_type_name:rowDataPacket.booking_type_name,
						duration:rowDataPacket.duration
					}
				})
				resolve(schedule)
			})
		})
	}

	retrieveBookedAppointmentScheduleByDoctorId(doctor_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.birthdate, p.breed, p.pet_owner_id, u.user_name, u.mobile, a.booking_type_name, b.duration " +
				"FROM v2_appointment_schedule a INNER JOIN v2_booking_type b ON a.booking_type_name = b.booking_type_name INNER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"WHERE a.patient_id IS NOT NULL AND a.doctor_id = ? "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query, doctor_id, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());
						return{
							id:rowDataPacket.id,
							start_time:rowDataPacket.start_time,
							end_time:rowDataPacket.end_time,
							proof_of_payment:rowDataPacket.proof_of_payment,
							description:rowDataPacket.description,
							additional_storage:rowDataPacket.additional_storage,
							status:rowDataPacket.status,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							patient_id:rowDataPacket.patient_id,
							patient_name:rowDataPacket.patient_name,
							breed:rowDataPacket.breed,
							birthdate:d1,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							customer_id:rowDataPacket.pet_owner_id,
							customer_name:rowDataPacket.user_name,
							customer_mobile:rowDataPacket.mobile,
							booking_type_name:rowDataPacket.booking_type_name,
							duration:rowDataPacket.duration,
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAvailableAppointmentScheduleForDoctorDay(start_time, end_time, doctor_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.pet_owner_id, u.user_name, a.booking_type_name, b.duration " +
				"FROM v2_appointment_schedule a LEFT OUTER JOIN v2_booking_type b ON a.booking_type_name = b.booking_type_name INNER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"WHERE a.start_time >= ? AND a.end_time <= ? AND d.id = ? AND a.patient_id IS NULL OR a.booking_type_name IS NULL "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query, [start_time, end_time, doctor_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const schedule=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						start_time:rowDataPacket.start_time,
						end_time:rowDataPacket.end_time,
						proof_of_payment:rowDataPacket.proof_of_payment,
						description:rowDataPacket.description,
						additional_storage:rowDataPacket.additional_storage,
						status:rowDataPacket.status,
						doctor_id:rowDataPacket.doctor_id,
						doctor_name:rowDataPacket.doctor_name,
						patient_id:rowDataPacket.patient_id,
						patient_name:rowDataPacket.patient_name,
						customer_id:rowDataPacket.pet_owner_id,
						customer_name:rowDataPacket.user_name,
						booking_type_name:rowDataPacket.booking_type_name,
						duration:rowDataPacket.duration
					}
				})
				resolve(schedule)
			})
		})
	}

	retrieveAvailableAppointmentScheduleFrontend(start_time, end_time, doctor_id, booking_type_name){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.pet_owner_id, u.user_name, a.booking_type_name, b.duration " +
				"FROM v2_appointment_schedule a LEFT OUTER JOIN v2_booking_type b ON a.booking_type_name = b.booking_type_name INNER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"WHERE a.patient_id IS NULL AND (a.booking_type_name IS NULL OR a.booking_type_name = ? ) AND a.start_time >= ? AND a.end_time <= ? AND d.id = ? "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query, [booking_type_name, start_time, end_time, doctor_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const schedule=result.map(rowDataPacket=>{
					const startTime=moment(rowDataPacket.start_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
					const endTime=moment(rowDataPacket.end_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
					return{
						id:rowDataPacket.id,
						start_time:startTime,
						end_time:endTime,
						proof_of_payment:rowDataPacket.proof_of_payment,
						description:rowDataPacket.description,
						additional_storage:rowDataPacket.additional_storage,
						status:rowDataPacket.status,
						doctor_id:rowDataPacket.doctor_id,
						doctor_name:rowDataPacket.doctor_name,
						patient_id:rowDataPacket.patient_id,
						patient_name:rowDataPacket.patient_name,
						customer_id:rowDataPacket.pet_owner_id,
						customer_name:rowDataPacket.customer_name,
						booking_type_name:rowDataPacket.booking_type_name,
						duration:rowDataPacket.duration
					}
				})
				resolve(schedule)
			})
		})
	}

	retrieveOneAppointmentSchedule(id){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.birthdate, p.breed, p.pet_owner_id, u.user_name, u.mobile, a.booking_type_name, bt.duration, " +
				"mr.description, mr.medication, mr.date_created " +
				"FROM v2_appointment_schedule a LEFT OUTER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN v2_booking_type bt ON bt.booking_type_name=a.booking_type_name LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"LEFT OUTER JOIN medical_records mr ON mr.appointment_id=a.id " +
				"WHERE a.id = ? "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query, id, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const startTime=moment(rowDataPacket.start_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const endTime=moment(rowDataPacket.end_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());

						return{
							id:rowDataPacket.id,
							start_time:startTime,
							end_time:endTime,
							proof_of_payment:rowDataPacket.proof_of_payment,
							description:rowDataPacket.description,
							additional_storage:rowDataPacket.additional_storage,
							status:rowDataPacket.status,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							patient_id:rowDataPacket.patient_id,
							patient_name:rowDataPacket.patient_name,
							birthdate:d1,
							breed:rowDataPacket.breed,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							customer_id:rowDataPacket.pet_owner_id,
							customer_name:rowDataPacket.user_name,
							customer_mobile:rowDataPacket.mobile,
							booking_type_name:rowDataPacket.booking_type_name,
							duration:rowDataPacket.duration,
							medical_record_description:rowDataPacket.description,
							medication:rowDataPacket.medication,
							date_created:rowDataPacket.date_created
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentScheduleByUserId(user_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.birthdate, p.breed, p.pet_owner_id, u.user_name, u.mobile, a.booking_type_name, bt.duration " +
				"FROM v2_appointment_schedule a LEFT OUTER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN v2_booking_type bt ON bt.booking_type_name=a.booking_type_name LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"WHERE p.pet_owner_id = ? "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query,user_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const startTime=moment(rowDataPacket.start_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const endTime=moment(rowDataPacket.end_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());
						return{
							id:rowDataPacket.id,
							start_time:startTime,
							end_time:endTime,
							proof_of_payment:rowDataPacket.proof_of_payment,
							description:rowDataPacket.description,
							additional_storage:rowDataPacket.additional_storage,
							status:rowDataPacket.status,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							patient_id:rowDataPacket.patient_id,
							patient_name:rowDataPacket.patient_name,
							breed:rowDataPacket.breed,
							birthdate:d1,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							customer_id:rowDataPacket.pet_owner_id,
							customer_name:rowDataPacket.user_name,
							customer_mobile:rowDataPacket.mobile,
							booking_type_name:rowDataPacket.booking_type_name,
							duration:rowDataPacket.duration
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentScheduleByPatientId(patient_id){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.birthdate, p.breed, p.pet_owner_id, u.user_name, u.mobile, a.booking_type_name, bt.duration " +
				"FROM v2_appointment_schedule a LEFT OUTER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN v2_booking_type bt ON bt.booking_type_name=a.booking_type_name LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"WHERE a.patient_id=? "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query, patient_id, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const startTime=moment(rowDataPacket.start_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const endTime=moment(rowDataPacket.end_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());
						return{
							id:rowDataPacket.id,
							start_time:startTime,
							end_time:endTime,
							proof_of_payment:rowDataPacket.proof_of_payment,
							description:rowDataPacket.description,
							additional_storage:rowDataPacket.additional_storage,
							status:rowDataPacket.status,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							patient_id:rowDataPacket.patient_id,
							patient_name:rowDataPacket.patient_name,
							breed:rowDataPacket.breed,
							birthdate:d1,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							customer_id:rowDataPacket.pet_owner_id,
							customer_name:rowDataPacket.user_name,
							customer_mobile:rowDataPacket.mobile,
							booking_type_name:rowDataPacket.booking_type_name,
							duration:rowDataPacket.duration
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentScheduleByStartTimeEndTimeDoctorId(start_time,end_time,doctor_id){
		return new Promise((resolve,reject)=>{
			if	( !moment(start_time,"YYYY-MM-DD HH:mm:ss", true).isValid() || !moment(end_time,"YYYY-MM-DD HH:mm:ss", true).isValid()){
				reject("WRONG DATETIME FORMAT")
				return
			}
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.birthdate, p.breed, p.pet_owner_id, u.user_name, u.mobile, a.booking_type_name, bt.duration " +
				"FROM v2_appointment_schedule a LEFT OUTER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN v2_booking_type bt ON bt.booking_type_name=a.booking_type_name " +
				"LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"WHERE a.patient_id IS NOT NULL AND a.start_time >= ? AND a.end_time <= ? AND a.doctor_id=? "+
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query,[start_time,end_time,doctor_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						// const startTime=moment(rowDataPacket.start_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						// const endTime=moment(rowDataPacket.end_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());
						return{
							id:rowDataPacket.id,
							start_time:rowDataPacket.start_time,
							end_time:rowDataPacket.end_time,
							proof_of_payment:rowDataPacket.proof_of_payment,
							description:rowDataPacket.description,
							additional_storage:rowDataPacket.additional_storage,
							status:rowDataPacket.status,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							patient_id:rowDataPacket.patient_id,
							patient_name:rowDataPacket.patient_name,
							breed:rowDataPacket.breed,
							birthdate:d1,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							customer_id:rowDataPacket.pet_owner_id,
							customer_name:rowDataPacket.user_name,
							customer_mobile:rowDataPacket.mobile,
							booking_type_name:rowDataPacket.booking_type_name,
							duration:rowDataPacket.duration
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	retrieveAppointmentScheduleByStartTimeEndTime(start_time,end_time){
		return new Promise((resolve,reject)=>{
			if	( !moment(start_time,"YYYY-MM-DD HH:mm:ss", true).isValid() || !moment(end_time,"YYYY-MM-DD HH:mm:ss", true).isValid()){
				reject("WRONG DATETIME FORMAT")
				return
			}
			const query="SELECT a.id, a.start_time, a.end_time, a.proof_of_payment, a.description, a.additional_storage, a.status, a.doctor_id, d.doctor_name, a.patient_id, p.patient_name, p.birthdate, p.breed, p.pet_owner_id, u.user_name, u.mobile, a.booking_type_name, bt.duration " +
				"FROM v2_appointment_schedule a LEFT OUTER JOIN doctor d ON a.doctor_id=d.id LEFT OUTER JOIN patients p ON a.patient_id=p.id LEFT OUTER JOIN v2_booking_type bt ON bt.booking_type_name=a.booking_type_name " +
				"LEFT OUTER JOIN users u ON u.id=p.pet_owner_id " +
				"WHERE a.patient_id IS NOT NULL AND a.start_time >= ? AND a.end_time <= ? " +
				"ORDER BY a.start_time ASC "
			this.mysqlConn.query(query,[start_time,end_time],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					const schedule=result.map(rowDataPacket=>{
						const startTime=moment(rowDataPacket.start_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const endTime=moment(rowDataPacket.end_time,'YYYY-MM-DDTHH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
						const d1=moment(rowDataPacket.birthdate, 'YYYY-MM-DDTHH:mm:ss').toDate()
						const ageFormatter = new AgeFormatter(d1, new Date());
						return{
							id:rowDataPacket.id,
							start_time:startTime,
							end_time:endTime,
							proof_of_payment:rowDataPacket.proof_of_payment,
							description:rowDataPacket.description,
							additional_storage:rowDataPacket.additional_storage,
							status:rowDataPacket.status,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name,
							patient_id:rowDataPacket.patient_id,
							patient_name:rowDataPacket.patient_name,
							breed:rowDataPacket.breed,
							birthdate:d1,
							age:ageFormatter.getAgeYear(),
							age_month:ageFormatter.getAgeMonth(),
							age_string:ageFormatter.getAgeString(),
							customer_id:rowDataPacket.pet_owner_id,
							customer_name:rowDataPacket.user_name,
							customer_mobile:rowDataPacket.mobile,
							booking_type_name:rowDataPacket.booking_type_name,
							duration:rowDataPacket.duration
						}
					})
					resolve(schedule)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	addAppointmentSlot(start_time, end_time, description, additional_storage, status, doctor_id, co_doctor_id, booking_type_name){
		return new Promise((resolve, reject)=>{
			// Validate start_time and end_time format
			if	( !moment(start_time,"YYYY-MM-DD HH:mm:ss", true).isValid() || !moment(end_time,"YYYY-MM-DD HH:mm:ss", true).isValid()){
				reject("WRONG DATETIME FORMAT")
				return
			}
			let query = "SELECT * FROM `v2_appointment_schedule` WHERE start_time >= ? AND end_time <= ? AND (doctor_id = ? OR co_doctor_id = ?) OR (doctor_id = ? OR co_doctor_id = ?)"
			this.mysqlConn.query(query, [start_time, end_time, doctor_id, co_doctor_id, co_doctor_id, doctor_id], (err, res)=>{
				if (res.length > 0){
					reject("APPOINTMENT SLOT NOT AVAILABLE")
				}else {
					query = "INSERT INTO `v2_appointment_schedule`(`start_time`, `end_time`, `description`, `additional_storage`, `status`, `doctor_id`, `co_doctor_id`, `booking_type_name`) VALUES (?,?,?,?,?,?,?,?)"
					this.mysqlConn.query(query, [start_time, end_time, description, additional_storage, status, doctor_id, co_doctor_id, booking_type_name], (err, res) => {
						if (!err) {
							resolve(res.insertId)
						} else {
							reject(err)
						}
					})
				}
			})
		})
	}

	useAppointmentSlot(appointment_id, patient_id, proof_of_payment, description, additional_storage){
		return new Promise((resolve, reject)=>{
			const query = "UPDATE v2_appointment_schedule SET description=?, additional_storage=?, status = 'PENDING', patient_id = ?, proof_of_payment=? WHERE id = ?"
			this.mysqlConn.query(query, [description, additional_storage, patient_id, proof_of_payment, appointment_id], (err, res)=>{
				if	(!err){
					resolve(SUCCESS)
				}else{
					reject(err)
				}
			})
		})
	}

	updateAppointmentSlot(appointment_id, description, additional_storage){
		return new Promise((resolve,reject)=>{
			const query="UPDATE v2_appointment_schedule SET description=?, additional_storage=?, status='UPDATED' WHERE id=? "
			this.mysqlConn.query(query,[description,additional_storage,appointment_id],(err,res)=>{
				if(!err){
					resolve(SUCCESS)
				}else{
					reject(err)
				}
			})
		})
	}

	approveAppointmentSlot(appointment_id){
		return new Promise((resolve,reject)=>{
			const query="UPDATE v2_appointment_schedule SET status='APPROVED' WHERE id=? "
			this.mysqlConn.query(query,appointment_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	freeAppointmentSlot(appointment_id){
		return new Promise((resolve,reject)=>{
			const query="UPDATE v2_appointment_schedule SET status='AVAILABLE', patient_id=?, proof_of_payment=? WHERE id = ?"
			this.mysqlConn.query(query,[null,null,appointment_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}
				resolve(SUCCESS)
			})
		})
	}

	finishAppointmentSchedule(appointment_id){
		return new Promise((resolve,reject)=>{
			const query="UPDATE v2_appointment_schedule SET status='DONE' WHERE id=? "
			this.mysqlConn.query(query,appointment_id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	unbindAppointment(appointment_id){
		return new Promise((resolve,reject)=>{
			const query="UPDATE v2_appointment_schedule SET status='AVAILABLE', patient_id=?, proof_of_payment=? WHERE id = ?"
			this.mysqlConn.query(query,[null,null,appointment_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}
				resolve(SUCCESS)
			})
		})
	}

	deleteAppointmentSlot(appointment_id){
		return new Promise((resolve,reject)=>{
			const query="DELETE FROM v2_appointment_schedule WHERE id=?"
			this.mysqlConn.query(query,[appointment_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	addAppointmentLog(patient_id,booking_type_name,appointment_time,internal_notes){
		return new Promise((resolve,reject)=>{
			const query="INSERT INTO `v2_appointment_log` (`patient_id`,`booking_type_name`,`appointment_time`,`internal_notes`,`date_created`) " +
				"VALUES(?,?,?,?,NOW()) "
			this.mysqlConn.query(query,[patient_id,booking_type_name,appointment_time,internal_notes],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	retrieveVisitReminder(){
		return new Promise((resolve,reject)=>{
			const query="SELECT v.id, v.booking_type_name, v.description, v.create_date, v.target_send_date, v.patient_id, p.patient_name " +
				"FROM visit_reminder v LEFT OUTER JOIN patients p ON p.id=v.patient_id "
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}
				resolve(result)
			})
		})
	}
	
	retrieveOneVisitReminder(id){
		return new Promise((resolve,reject)=>{
			const query="SELECT v.id, v.booking_type_name, v.create_date, v.description, v.target_send_date, v.patient_id, p.patient_name, u.id as customer_id, u.user_name, u.mobile " +
				"FROM visit_reminder v LEFT OUTER JOIN patients p ON p.id=v.patient_id INNER JOIN users u ON p.pet_owner_id = u.id " +
				"WHERE v.id=? "
			this.mysqlConn.query(query,id,(error,result)=>{
				if(error){
					reject(error)
					return
				}
				resolve(result)
			})
		})
	}

	retrieveVisitReminderByDate(date){
		return new Promise((resolve,reject)=>{
			const query="SELECT v.id, v.booking_type_name, v.create_date, v.target_send_date, v.patient_id, p.patient_name " +
				"FROM visit_reminder v LEFT OUTER JOIN patients p ON p.id=v.patient_id " +
				"WHERE v.target_send_date = ? "
			this.mysqlConn.query(query,[date],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				if(result.length>0){
					resolve(result)
				}else{
					resolve([])
				}
			})
		})
	}

	addVisitReminder(visitReminder){
		return new Promise((resolve,reject)=>{
			if(!visitReminder instanceof VisitReminder){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="INSERT INTO `visit_reminder`(`booking_type_name`,`description`,`create_date`,`target_send_date`,`patient_id`) " +
				"VALUES(?,?,NOW(),?,?) "
			this.mysqlConn.query(query,[visitReminder.booking_type_name,visitReminder.description,visitReminder.target_send_date,visitReminder.patient_id],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				visitReminder.id=result.insertId
				resolve(visitReminder)
			})
		})
	}

	deleteVisitReminder(id){
		return new Promise((resolve,reject)=>{
			const query="DELETE FROM visit_reminder WHERE id=? "
			this.mysqlConn.query(query,id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	// End of v2 Development
}
