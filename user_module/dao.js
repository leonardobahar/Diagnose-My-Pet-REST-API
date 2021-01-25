import mysqlConn from '../util/mysql-conn.js'
import fs from 'fs'
import bcrypt from 'bcrypt'
import moment from 'moment'
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
	Appointment, Doctor,
	MedicalRecordAttachment,
	MedicalRecords, MedicalRecordSymptoms, MedicalRecordTreatmentPlan,
	Patient, Symptoms, TreatmentPlan,
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

	retrieveUsers(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT id,user_name,mobile,email,birthdate,role FROM users WHERE role='CUSTOMER' "
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
							role:rowDataPacket.role
						}
					})
					resolve(customer)
				}
			})
		})
	}

	retrieveOneUser(user){
		return new Promise((resolve,reject)=>{
			const query="SELECT id,user_name,mobile,email,birthdate,role FROM users WHERE role='CUSTOMER' AND id=?"
			this.mysqlConn.query(query,user.id, (error,result)=>{
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

	registerUser(user){
		return new Promise(async (resolve, reject) => {
			if (!user instanceof User) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "INSERT INTO `users`(`user_name`, `mobile`, `email`, `birthdate`, `password`, `salt`, `role`) VALUES (?, ?, ?, ?, ?, ?, ?)"
			const salt = await bcrypt.genSalt(5)
			const hash = await bcrypt.hash(user.password,salt)
			this.mysqlConn.query(query, [user.user_name, user.mobile, user.email, user.birthdate, hash, salt, user.role], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				user.id = res.insertId
				resolve(user)
			})
		})
	}

	loginCustomer(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT user_name, salt, password FROM users WHERE user_name=?"
			this.mysqlConn.query(query,[user.user_name], (error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length > 0){
					const salt = result[0].salt
					const hashedClientInput = bcrypt.hashSync(user.password, salt)
					const bcryptedPassword = hashedClientInput===result[0].password ? true : false
					if (bcryptedPassword){
						resolve(bcryptedPassword)
					}else{
						reject(NO_SUCH_CONTENT)
					}
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	updateCustomer(user){
		return new Promise((resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
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

	changeCustomerPassword(user){
		return new Promise(async(resolve,reject)=>{
			if(!user instanceof User){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const salt = await bcrypt.genSalt(5)
			const hash = await bcrypt.hash(user.password,salt)
			const query="UPDATE users SET password=?, salt=? WHERE user_name=?"
			this.mysqlConn.query(query, [hash, salt, user.user_name],(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(user)
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
				}

				user.id=res.insertId
				delete(user.salt)
				resolve(user)
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

	deleteDoctor(doctor){
		return new Promise((resolve,reject)=>{
			if(!doctor instanceof Doctor){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="DELETE FROM doctor WHERE id=? "
			this.mysqlConn.query(query,doctor.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				resolve(doctor)
			})
		})
	}

	retrievePatient(){
		return new Promise((resolve, reject)=>{
			const query="SELECT p.id, p.patient_name, p.animal_type_id, at.animal_name, p.birthdate, p.pet_owner_id, u.user_name " +
				"FROM patients p LEFT OUTER JOIN animal_type at ON p.animal_type_id=at.id "+
				"LEFT OUTER JOIN users u ON p.pet_owner_id=u.id"
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
					return
				}

				const patients=result.map(rowDataPacket=>{
					return{
						id:rowDataPacket.id,
						patient_name:rowDataPacket.patient_name,
						animal_type_id:rowDataPacket.animal_type_id,
						animal_name:rowDataPacket.animal_name,
						birthdate:rowDataPacket.birthdate,
						pet_owner_id:rowDataPacket.pet_owner_id,
						pet_owner_name:rowDataPacket.user_name
					}
				})
				resolve(patients)
			})
		})
	}

	retrieveOnePatient(patient){
		return new Promise((resolve,reject)=>{
			const query="SELECT p.id, p.patient_name, p.animal_type_id, at.animal_name, p.birthdate, p.pet_owner_id, u.user_name " +
				"FROM patients p LEFT OUTER JOIN animal_type at ON p.animal_type_id=at.id "+
				"LEFT OUTER JOIN users u ON p.pet_owner_id=u.id "+
				"WHERE p.id=?"
			this.mysqlConn.query(query,patient.id,(error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const patients=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							patient_name:rowDataPacket.patient_name,
							animal_type_id:rowDataPacket.animal_type_id,
							animal_name:rowDataPacket.animal_name,
							birthdate:rowDataPacket.birthdate,
							pet_owner_id:rowDataPacket.pet_owner_id,
							pet_owner_name:rowDataPacket.user_name
						}
					})
					resolve(patients)
				}else {
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	registerPatient(patient){
		return new Promise((resolve,reject)=>{
			if(patient instanceof Patient){
				const query="INSERT INTO `patients`(`patient_name`,`animal_type_id`,`birthdate`, `pet_owner_id`) VALUES(?, ?, ?, ?)"
				this.mysqlConn.query(query,[patient.patient_name, patient.animal_type, patient.birthdate, patient.pet_owner],(err,res)=>{
					if(err){
						reject(err)
						return
					}

					patient.id=res.insertId
					resolve(patient)
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
				const query="UPDATE patients SET patient_name=?, animal_type_id=?, birthdate=?, pet_owner_id=? WHERE id=?"
				this.mysqlConn.query(query, [patient.patient_name, patient.animal_type, patient.birthdate, patient.pet_owner, patient.id], (err, res)=>{
					if(err){
						reject(err)
						return
					}

					patient.id=res.insertId
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
					return
				}

				resolve(patient)
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

					resolve(record)
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
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id "
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
						duration:rowDataPacket.duration,
						appointment_status:rowDataPacket.appointment_status,
						user_id:rowDataPacket.user_id,
						user_name:rowDataPacket.user_name,
						is_real_appointment:rowDataPacket.is_real_appointment,
						patient_id:rowDataPacket.patient_id,
						pet_name:rowDataPacket.patient_name,
						doctor_id:rowDataPacket.doctor_id,
						doctor_name:rowDataPacket.doctor_name
					}
				})
				resolve(attachment)
			})
		})
	}

	retrieveOneAppointment(appointment){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, " +
				"a.is_real_appointment, u.user_name, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name " +
				"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
				"LEFT OUTER JOIN patients p ON a.patient_id=p.id " +
				"LEFT OUTER JOIN doctor d ON a.doctor_id=d.id " +
				"WHERE a.id=? "
			this.mysqlConn.query(query, appointment.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					const attachment=result.map(rowDataPacket=>{
						return{
							id:rowDataPacket.id,
							appointment_name:rowDataPacket.appointment_name,
							appointment_time:rowDataPacket.appointment_time,
							duration:rowDataPacket.duration,
							appointment_status:rowDataPacket.appointment_status,
							user_id:rowDataPacket.user_id,
							user_name:rowDataPacket.user_name,
							is_real_appointment:rowDataPacket.is_real_appointment,
							patient_id:rowDataPacket.patient_id,
							pet_name:rowDataPacket.patient_name,
							doctor_id:rowDataPacket.doctor_id,
							doctor_name:rowDataPacket.doctor_name
						}
					})
					resolve(attachment)
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
			}
		})
	}

	retrieveAppointmentByStatus(appointment){
		return new Promise((resolve,reject)=>{
			if(appointment instanceof Appointment){
				const query="SELECT a.id, a.appointment_name, a.appointment_time, a.duration, a.appointment_status, a.user_id, a.is_real_appointment, u.user_name, a.patient_id, p.patient_name " +
					"FROM appointment a LEFT OUTER JOIN users u ON a.user_id=u.id " +
					"LEFT OUTER JOIN patients p ON a.patient_id=p.id" +
					"WHERE a.appointment_status=?"
				this.mysqlConn.query(query, appointment.appointment_status, (error,result)=>{
					if(error){
						reject(error)
						return
					}else if(result.length>0){
						const attachment=result.map(rowDataPacket=>{
							return{
								id:rowDataPacket.id,
								appointment_name:rowDataPacket.appointment_name,
								appointment_time:rowDataPacket.appointment_time,
								duration:rowDataPacket.duration,
								appointment_status:rowDataPacket.appointment_status,
								user_id:rowDataPacket.user_id,
								user_name:rowDataPacket.user_name,
								patient_id:rowDataPacket.patient_id,
								pet_name:rowDataPacket.patient_name,
								is_real_appointment:rowDataPacket.is_real_appointment
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
				const query="INSERT INTO `appointment` (`appointment_name`, `appointment_time`, `duration`, `user_id`, `appointment_status`, `is_real_appointment`, `patient_id`, `doctor_id`) VALUES(?, ?, ?, ?, ?, ?, ?, ?)"
				const appointmentTime =  moment(appointment.appointment_time, 'YYYY/MM/DD HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
				this.mysqlConn.query(query, [appointment.appointment_name, appointmentTime, appointment.duration, appointment.user_id,appointment.appointment_status, appointment.is_real_appointment, appointment.patient_id, appointment.doctor_id],(error,result)=>{
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
				const query="UPDATE appointment SET appointment_name=?, appointment_time=?, duration=?, appointment_status=?, user_id=?, is_real_appointment=?, patient_id=?, doctor_id=? WHERE id=?"
				this.mysqlConn.query(query, [appointment.appointment_name.toUpperCase(),
					appointment.appointment_time,
					appointment.duration,
					appointment.appointment_status,
					appointment.user_id,
					appointment.is_real_appointment,
					appointment.patient_id,
					appointment.doctor_id,
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

			const query="UPDATE appointment SET appointment_time=?, duration=?, appointment_status=?  WHERE id=? "
			this.mysqlConn.query(query,[appointment.appointment_time, appointment.duration,appointment.appointment_status,appointment.id],(error,result)=>{
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
				const query="UPDATE appointment SET appointment_status='APPROVED' WHERE id=?"
				this.mysqlConn.query(query,appointment.id,(error,result)=>{
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
				const query="DELETE FROM appointment WHERE id=?"
				this.mysqlConn.query(query, appointment.id, (error,result)=>{
					if(error){
						reject(error)
						return
					}

					resolve(appointment)
				})
			} else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}
}