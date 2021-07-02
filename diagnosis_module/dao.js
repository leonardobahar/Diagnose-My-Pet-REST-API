
import mysqlConn from '../util/mysql-conn.js'
import fs from 'fs'
import axios from 'axios';
import {
	ADMIN_VALIDATED,
	ALL, CANCELLED, DUPLICATE_ENTRY, ERROR_DUPLICATE_ENTRY, INVALID, INVALID_FINAL,
	MISMATCH_OBJ_TYPE,
	NO_AFFECTED_ROWS,
	NO_SUCH_CONTENT,
	ONLY_WITH_VENDORS, ORDER_PROCESSING,
	SOMETHING_WENT_WRONG, SUCCESS, VALID, WRONG_BODY_FORMAT
} from "../strings";
import {
	Anatomy,
	AnimalCategory,
	AnimalType, Appointment,
	Disease, MedicalRecordAttachment,
	MedicalRecords,
	Medicine,
	Patient,
	Symptoms, TreatmentPlan,
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

	retrieveAnimalType(){
		return new Promise((resolve, reject) => {
			const query = "SELECT a.id, a.animal_name, a.animal_category_id, c.category_name FROM animal_type a LEFT OUTER JOIN animal_category c ON a.animal_category_id = c.id"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
					return
				}

				let animals = []
				for	(let i=0; i<result.length; i++){
					animals.push(new AnimalType(
						result[i].id,
						result[i].animal_name,
						new AnimalCategory(result[i].animal_category_id,result[i].category_name)
						//new AnimalType(result[i].id, result[i].category_name, result[i].animal_category)
					))
				}

				resolve(animals)
			})
		})
	}

	retrieveOneAnimalType(animalType){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.animal_name, a.animal_category_id, c.category_name FROM animal_type a LEFT OUTER JOIN animal_category c ON a.animal_category_id = c.id WHERE a.id=?"
			this.mysqlConn.query(query, animalType.id, (err,res)=>{

				if (err){
					reject(err)
					return
				} else if(res.length>0){
					let animals = []
					for	(let i=0; i<res.length; i++){
						animals.push(new AnimalType(
							res[i].id,
							res[i].animal_name,
							new AnimalCategory(res[i].animal_category_id,res[i].category_name)
						))
					}

					resolve(animals)
				} else {
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	getAnimalTypeId(animalType){
		return new Promise((resolve,reject)=>{
			if (!animalType instanceof AnimalType) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query="SELECT id FROM animal_type WHERE id=?"
			this.mysqlConn.query(query,animalType.id,(err,res)=>{
				if(err){
					reject (err)
					return
				}

				else if(res.length>0){
					resolve(res[0].id)
				}

				else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	registerAnimalType(animalType){
		return new Promise((resolve, reject) => {
			if (!animalType instanceof AnimalType) {
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "INSERT INTO `animal_type`(`animal_name`, `animal_category_id`) VALUES (?, ?)"
			this.mysqlConn.query(query, [animalType.animal_name, animalType.animal_category], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				animalType.id=res.insertId
				resolve(animalType)
			})
		})
	}

	updateAnimalType(animal){
		return new Promise((resolve,reject)=>{
			if(!animal instanceof AnimalType){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query = "UPDATE animal_type SET animal_name=?, animal_category_id=? WHERE id=?"
			this.mysqlConn.query(query, [animal.animal_name,animal.animal_category,animal.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				animal.id=res.insertId
				resolve(animal)
			})
		})
	}

	deleteAnimalType(animalType){
		return new Promise((resolve,reject)=>{
			if(!animalType instanceof AnimalType){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query = "DELETE FROM animal_type WHERE id = ?"
			this.mysqlConn.query(query, [animalType.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				animalType.id=res.insertId
				resolve(animalType)
			})
		})
	}

	retrieveAnimalCategory(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM animal_category"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
					return
				}

				let categories = []
				for (let i=0; i<result.length; i++){
					categories.push(new AnimalCategory(
						result[i].id,
						result[i].category_name
					))
				}

				resolve(categories)
			})
		})
	}

	retrieveOneAnimalCategory(animalCategory){
		return new Promise((resolve,reject)=>{
			const query = "SELECT category_name FROM animal_category WHERE id = ?"
			this.mysqlConn.query(query, [animalCategory.id], (err, res)=>{
				/*if (res.length === 0){
					resolve([])
					return
				}*/

				//const category_name = res[0].category_name
				const query="SELECT at.id, at.animal_name, at.animal_category_id, ac.category_name FROM animal_type at LEFT OUTER JOIN animal_category ac ON at.animal_category_id = ac.id WHERE at.animal_category_id=?"
				this.mysqlConn.query(query, [animalCategory.id], (err, res)=>{
					if (err){
						reject(err)
						return
					}else if(res.length>0){
						let animals = []
						for	(let i=0; i<res.length; i++){
							animals.push(new AnimalType(
								res[i].id,
								res[i].animal_name,
								new AnimalCategory(res[i].id, res[i].category_name)
							))
						}

						resolve(animals)
					}else{
						reject(NO_SUCH_CONTENT)
					}
				})
			})
		})
	}

	getAnimalCategoryID(category){
		return new Promise((resolve,reject)=>{
			const query="SELECT id FROM animal_category WHERE id=?"
			this.mysqlConn.query(query, category.id, (err,res)=>{
				if(err){
					reject (err)
					return
				} else if(res.length>0){
					resolve(res[0].id)
				} else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	registerAnimalCategory(animalCategory){
		return new Promise((resolve, reject) => {
			if (animalCategory instanceof AnimalCategory){
				const query = "INSERT INTO `animal_category`(`category_name`) VALUES (?)"
				this.mysqlConn.query(query, [animalCategory.category_name], (err, res)=>{
					if (err){
						reject(err)
						return
					}

					animalCategory.id=res.insertId
					resolve(animalCategory)
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateAnimalCategory(animalCategory){
		return new Promise((resolve,reject)=>{
			if(!animalCategory instanceof AnimalCategory){
				reject(MISMATCH_OBJ_TYPE)
				return
			}

			const query = "UPDATE animal_category SET category_name=? WHERE id=?"
			this.mysqlConn.query(query, [animalCategory.category_name,animalCategory.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				resolve(animalCategory)
			})
		})
	}

	deleteAnimalCategory(animalCategory){
		return new Promise((resolve,reject)=>{
			if(!animalCategory instanceof AnimalCategory){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query = "DELETE FROM animal_category WHERE id = ?"
			this.mysqlConn.query(query, animalCategory.id, (err,res)=>{
				if(err){
					reject(err)
					return
				}

				animalCategory.id=res.insertId
				resolve(animalCategory)
			})
		})
	}

	retrieveDisease(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM disease"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
					return
				}
				let diseases = []
				for (let i=0; i<result.length; i++){
					diseases.push(new Disease(
						result[i].id,
						result[i].disease_name
					))
				}

				resolve(diseases)
			})
		})
	}

	retrieveOneDisease(disease){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM disease WHERE id=?"
			this.mysqlConn.query(query, [disease.id], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				let diseases = []
				for	(let i=0; i<res.length; i++){
					diseases.push(new Disease(
						res[i].id,
						res[i].disease_name
					))
				}

				resolve(diseases)
			})
		})
	}

	getDiseaseId(disease){
		return new Promise((resolve,reject)=>{
			if(disease instanceof Disease){
				const query="SELECT id FROM disease WHERE id=? "
				this.mysqlConn.query(query, disease.id, (err,res)=>{
					if(err){
						reject(err)
						return
					}else if(res.length>0){
						resolve(res[0].id)
					}else{
						reject(NO_SUCH_CONTENT)
					}
				})
			}
		})
	}

	registerDisease(disease){
		return new Promise((resolve, reject) => {
			if (disease instanceof Disease){
				const query = "INSERT INTO `disease`(`disease_name`) VALUES (?)"
				this.mysqlConn.query(query, [disease.disease_name], (err, res)=>{
					if (err){
						reject(err)
						return
					}

					disease.id = res.insertId
					resolve(disease)
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateDisease(disease){
		return new Promise((resolve,reject)=>{
			if(!disease instanceof Disease){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query = "UPDATE disease SET disease_name=? WHERE id=?"
			this.mysqlConn.query(query, [disease.disease_name,disease.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				resolve(disease)
			})
		})
	}

	deleteDisease(disease){
		return new Promise((resolve, reject)=>{
			if(!disease instanceof Disease){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query= "DELETE FROM disease WHERE id = ? "
			this.mysqlConn.query(query,[disease.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				disease.id=res.insertId
				resolve(disease)
			})
		})
	}

	retrieveMedicine(){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM medicine"
			this.mysqlConn.query(query, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				let medicines=[]
				for(let i=0; i<result.length; i++){
					medicines.push(new Medicine(
						result[i].id,
						result[i].medicine_name,
						result[i].side_effect,
						result[i].dosage_info
					))
				}

				resolve(medicines)
			})
		})
	}

	retrieveOneMedicine(medicine){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM medicine WHERE id=?"
			this.mysqlConn.query(query, [medicine.id], (error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					let medicines=[]
					for(let i=0; i<result.length; i++){
						medicines.push(new Medicine(
							result[i].id,
							result[i].medicine_name,
							result[i].side_effect,
							result[i].dosage_info
						))
					}

					resolve(medicines)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	getMedicineId(medicine){
		return new Promise((resolve,reject)=>{
			const query="SELECT id FROM medicine WHERE id=?"
			this.mysqlConn.query(query,medicine.id,(error,result)=>{
				if(error){
					reject(error)
				}else if (result.length>0){
					resolve(result[0].id)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	registerMedicine(medicine){
		return new Promise((resolve,reject)=>{
			if(medicine instanceof Medicine){
				const query="INSERT INTO `medicine`(`medicine_name`,`side_effect`,`dosage_info`) VALUES(?, ?, ?)"
				this.mysqlConn.query(query, [medicine.medicine_name,medicine.side_effect,medicine.dosage_info], (err,res)=>{
					if(err){
						reject(err)
						return
					}

					medicine.id=res.insertId
					resolve(medicine)
				})
			}
			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateMedicine(medicine){
		return new Promise((resolve,reject)=>{
			if(!medicine instanceof Medicine){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query="UPDATE medicine SET medicine_name=?, side_effect=?, dosage_info=? WHERE id=?"
			this.mysqlConn.query(query,[medicine.medicine_name, medicine.side_effect, medicine.dosage_info, medicine.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				medicine.id=res.insertId
				resolve(medicine)
			})
		})
	}

	deleteMedicine(medicine){
		return new Promise((resolve,reject)=>{
			if(!medicine instanceof Medicine){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query="DELETE FROM medicine WHERE id=?"
			this.mysqlConn.query(query,[medicine.id],(err,res)=>{
				if(err){
					reject(err)
					return
				}

				medicine.id=res.insertId
				resolve(medicine)
			})
		})
	}

	retrieveSymptom(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM symptoms"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
				}else{
					let symptoms = []
					for (let i=0; i<result.length; i++){
						symptoms.push(new Symptoms(
							result[i].id,
							result[i].symptom_name
						))
					}

					resolve(symptoms)
				}
			})
		})
	}

	retrieveOneSymptom(symptom){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM symptoms WHERE id=?"
			this.mysqlConn.query(query,[symptom.id],(error,result)=>{
				if (error){
					reject(error)
				}else if(result.length>0){
					let symptoms = []
					for (let i=0; i<result.length; i++){
						symptoms.push(new Symptoms(
							result[i].id,
							result[i].symptom_name
						))
					}

					resolve(symptoms)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	getSymptomId(symptom){
		return new Promise((resolve,reject)=>{
			if(symptom instanceof Symptoms){
				const query="SELECT id FROM symptoms WHERE id=?"
				this.mysqlConn.query(query,symptom.id,(err,res)=>{
					if(err){
						reject(err)
						return
					}else if(res.length>0){
						resolve(res[0].id)
					}else{
						reject(NO_SUCH_CONTENT)
					}
				})
			}
		})
	}

	registerSymptom(symptom){
		return new Promise((resolve, reject) => {
			if (symptom instanceof Symptoms){
				const query = "INSERT INTO `symptoms`(`symptom_name`) VALUES (?)"
				this.mysqlConn.query(query, symptom.symptom_name, (err, res)=>{
					if (err){
						reject(err)
						return
					}

					symptom.id = res.insertId
					resolve(symptom)
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateSymptom(symptom){
		return new Promise((resolve,reject)=>{
			if(!symptom instanceof Symptoms){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query = "UPDATE symptoms SET symptom_name=? WHERE id=?"
			this.mysqlConn.query(query, [symptom.symptom_name,symptom.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				resolve(symptom)
			})
		})
	}

	deleteSymptom(symptom){
		return new Promise((resolve,reject)=>{
			if(!symptom instanceof Symptoms){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query="DELETE FROM symptoms WHERE id=?"
			this.mysqlConn.query(query,symptom.id,(err,res)=>{
				if(err){
					reject(err)
					return
				}

				symptom.id=res.insertId
				resolve(symptom)
			})
		})
	}

	retrieveAnatomy(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT a.id, a.part_name, a.parent, a.animal_type_id, t.animal_name FROM anatomy a LEFT OUTER JOIN animal_type t ON a.animal_type_id = t.id ORDER BY a.animal_type_id"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
					return
				}

				resolve(result)
			})
		})
	}

	retrieveOneAnatomy(anatomy){
		return new Promise((resolve,reject)=>{
			const query = "SELECT a.id, a.part_name, a.parent, a.animal_type_id, t.animal_name FROM anatomy a LEFT OUTER JOIN animal_type t ON a.animal_type_id = t.id WHERE a.id = ? ORDER BY a.animal_type_id "
			this.mysqlConn.query(query, anatomy.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}else if(result.length>0){
					resolve(result)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	getAnatomyId(anatomy){
		return new Promise((resolve,reject)=>{
			const query="SELECT id FROM anatomy WHERE id=?"
			this.mysqlConn.query(query, anatomy.id, (error,result)=>{
				if(error){
					reject(error)
				}else if(result.length>0){
					resolve(result[0].id)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	registerAnatomy(anatomy){
		return new Promise((resolve,reject)=>{
			if(anatomy instanceof Anatomy){
				const query="INSERT INTO `anatomy` (`part_name`, `animal_type_id`, `parent`) VALUES (?, ?, ?)"
				this.mysqlConn.query(query,[anatomy.part_name,anatomy.animal_type_id,anatomy.parent],(error,result)=>{
					if(error){
						reject(error)
						return
					}

					anatomy.id=result.insertId
					resolve(anatomy)
				})
			} else {
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updateAnatomy(anatomy){
		return new Promise((resolve,reject)=>{
			if(!anatomy instanceof Anatomy){
				reject(MISMATCH_OBJ_TYPE)
			} else{
				const query="UPDATE anatomy SET part_name = ?, animal_type_id = ?, parent = ? WHERE id = ?"
				this.mysqlConn.query(query,[anatomy.part_name,anatomy.animal_type_id, anatomy.parent, anatomy.id],(error,result)=>{
					if(error){
						reject(error)
						return
					}else if(result.affectedRows<1){
						reject(NO_SUCH_CONTENT)
					}else{
						resolve(anatomy)
					}
				})
			}
		})
	}

	deleteAnatomy(anatomy){
		return new Promise((resolve,reject)=>{
			if(!anatomy instanceof Anatomy){
				reject(MISMATCH_OBJ_TYPE)
			} else{
				const query="DELETE FROM anatomy WHERE id = ?"
				this.mysqlConn.query(query, anatomy.id, (error,result)=>{
					if(error){
						reject(error)
					}else if(result.affectedRows<1){
						reject(NO_SUCH_CONTENT)
					}else{
						resolve(SUCCESS)
					}
				})
			}
		})
	}

	bindMedicineToSymptom(medicine, symptom){
		return new Promise((resolve,reject)=>{
			if(symptom instanceof Symptoms &&
				medicine instanceof Medicine){
				const checkQuery="SELECT id FROM medicine_cure_symptoms WHERE medicine_id = ? AND symptoms_id = ?"
				this.mysqlConn.query(checkQuery, [medicine.id, symptom.id], (error,result)=>{
					if(result.length>1){
						reject(ERROR_DUPLICATE_ENTRY)
						return
					}

					const query="INSERT INTO `medicine_cure_symptoms`(`medicine_id`, `symptoms_id`) VALUES(?, ?)"
					this.mysqlConn.query(query,[medicine.id, symptom.id], (error,result)=>{
						if(error){
							reject(error)
							return
						}

						resolve(SUCCESS)
					})
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveMedicineForSymptom(symptom){
		return new Promise((resolve,reject)=>{
			const query="SELECT mcs.id, mcs.medicine_id, m.medicine_name, mcs.symptoms_id, s.symptom_name " +
				"FROM medicine_cure_symptoms mcs LEFT OUTER JOIN medicine m ON mcs.medicine_id=m.id " +
				"LEFT OUTER JOIN symptoms s ON mcs.symptoms_id=s.id " +
				"WHERE mcs.symptoms_id = ?"
			this.mysqlConn.query(query, symptom.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				const medicine = result.map(rowDataPacket =>{
					return{
						bind_id:rowDataPacket.id,
						medicine_id:rowDataPacket.medicine_id,
						medicine_name:rowDataPacket.medicine_name,
						symptoms_id:rowDataPacket.symptoms_id,
						symptom_name:rowDataPacket.symptom_name
					}
				})

				resolve(medicine)
			})
		})
	}

	unbindMedicineSymptoms(bind_id){
		return new Promise((resolve, reject) => {
			const query = "DELETE FROM medicine_cure_symptoms WHERE id = ?"
			this.mysqlConn.query(query, [bind_id], (err, res)=> {
				if (err) {
					reject(err)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	// bindTreatmentToDisease(disease_symptoms_animal_id, medicine_id){
	// 	return new Promise((resolve,reject)=>{
	//
	// 		const query="INSERT INTO `medicine_for_disease_symptoms`(`disease_symptoms_animal_id`,`medicine_id`) VALUES(?, ?)"
	// 		this.mysqlConn.query(query,[disease_symptoms_animal_id,medicine_id],(error,result)=>{
	// 			if(error){
	// 				reject(error)
	// 			}
	//
	// 			resolve(SUCCESS)
	// 		})
	// 	})
	// }

	retrieveMedicineForDisease(disease){
		return new Promise((resolve,reject)=>{
			const query="SELECT mds.medicine_id, m.medicine_name, dsa.disease_id, d.disease_name " +
				"FROM medicine_for_disease_symptoms mds LEFT OUTER JOIN disease_symptoms_animal dsa ON dsa.id=mds.disease_symptoms_animal_id " +
				"LEFT OUTER JOIN medicine m ON m.id=mds.medicine_id LEFT OUTER JOIN disease d ON d.id=dsa.disease_id " +
				"WHERE dsa.disease_id=? "
			this.mysqlConn.query(query, disease.id, (error,result)=>{
				if(error){
					reject(error)
					return
				}

				const medicines=result.map(rowDataPacket=>{
					return{
						medicine_id:rowDataPacket.medicine_id,
						medicine_name:rowDataPacket.medicine_name,
						disease_id:rowDataPacket.disease_id,
						disease_name:rowDataPacket.disease_name
					}
				})
				resolve(medicines)
			})
		})
	}

	unbindMedicineDisease(bind_id){
		return new Promise((resolve, reject) => {
			const query = "DELETE FROM treatment_plan WHERE id = ?"
			this.mysqlConn.query(query, [bind_id], (err, res)=> {
				if (err) {
					reject(err)
					return
				}

				resolve(SUCCESS)
			})
		})
	}

	bindSymptomMedicineToDisease(symptom, disease, animal, anatomy, medicine){
		return new Promise((resolve, reject)=>{
			if (symptom instanceof Symptoms &&
				disease instanceof Disease &&
				animal instanceof AnimalType &&
				anatomy instanceof Anatomy ){
				const checkQuery = "SELECT id FROM disease_symptoms_animal WHERE disease_id = ? AND animal_id = ? AND symptoms_id = ? AND anatomy_id = ? "
				this.mysqlConn.query(checkQuery, [disease.id, animal.id, symptom.id, anatomy.id], (err, res)=>{
					if (res.length > 1){
						reject(ERROR_DUPLICATE_ENTRY)
						return
					}

					const query = anatomy.id === "" ? "INSERT INTO `disease_symptoms_animal`(`disease_id`, `animal_id`, `symptoms_id`, `anatomy_id`, `medicine_id`) VALUES (?, ?, ?, ?, ?)" : "INSERT INTO `disease_symptoms_animal`(`disease_id`, `animal_id`, `symptoms_id`, `anatomy_id`,`medicine_id`) VALUES (?, ?, ?, ?, ?)";
					this.mysqlConn.query(query, [disease.id, animal.id, symptom.id, anatomy.id, medicine], (err, res)=>{
						if (err){
							reject(err)
							return
						}

						resolve(SUCCESS)
					})
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	diagnoseSymptoms(symptoms){
		return new Promise((resolve, reject) => {
			const query = "SELECT dsa.id, dsa.disease_id, d.disease_name, " +
				"dsa.animal_id, a.animal_name, dsa.symptoms_id, s.symptom_name " +
				"FROM disease_symptoms_animal dsa INNER JOIN disease d ON dsa.disease_id = d.id " +
				"INNER JOIN symptoms s ON s.id = dsa.symptoms_id " +
				"INNER JOIN animal_type a ON dsa.animal_id=a.id " +
				"LEFT OUTER JOIN anatomy antm ON dsa.anatomy_id=antm.id " +
				"WHERE dsa.symptoms_id IN (?)";

			this.mysqlConn.query(query, [symptoms], async(err, res)=>{
				if (err){
					reject(err)
					return
				}
				//resolve(res)
				let diagnoseResult = []
				// Narrows down res to categorised set
				res.forEach(diseaseResult=>{
					if (diagnoseResult === 0){
						diagnoseResult.push({
							disease_id: diseaseResult.disease_id,
							key: diseaseResult.disease_name,
							anatomy_part: diseaseResult.part_name,
							symptoms: [diseaseResult]
						})
					}else{
						// Check if disease has already exist in array
						const index = diagnoseResult.findIndex(t=> t.key === diseaseResult.disease_name)

						if (index === -1){
							// Does not exist therefore push here
							diagnoseResult.push({
								disease_id: diseaseResult.disease_id,
								key: diseaseResult.disease_name,
								anatomy_part: diseaseResult.part_name,
								symptoms: [diseaseResult]
							})
						}else{
							// Exist therefore add to that index
							diagnoseResult[index].symptoms.push(diseaseResult)
						}
					}
				})

				for (let i=0; i<diagnoseResult.length; i++){
					const resultSet = diagnoseResult[i]
					resultSet.symptoms_met = Object(resultSet.symptoms).length
					const diseaseSymptoms = await this.retrieveSymptomsForDisease(new Disease(resultSet.disease_id)).catch(err=>{console.error(err)})
					resultSet.total_disease_symptoms = diseaseSymptoms.length
				}

				resolve(diagnoseResult)
			})
		})
	}

	retrieveSymptomsForDisease(disease){
		return new Promise((resolve, reject) => {
			const query = "SELECT dsa.id, dsa.disease_id, d.disease_name, dsa.animal_id, a.animal_name, dsa.symptoms_id, s.symptom_name, dsa.anatomy_id, at.part_name " +
				"FROM disease_symptoms_animal dsa LEFT OUTER JOIN disease d ON dsa.disease_id = d.id " +
				"LEFT OUTER JOIN symptoms s ON dsa.symptoms_id = s.id " +
				"LEFT OUTER JOIN animal_type a ON dsa.animal_id = a.id " +
				"LEFT OUTER JOIN anatomy at ON dsa.anatomy_id = at.id " +
				"WHERE dsa.disease_id = ?"

			this.mysqlConn.query(query, disease.id, (err, res)=>{
				if (err){
					reject(err)
					return
				}else if(res.length>0){
					const symptoms = res.map(rowDataPacket => {
						return{
							disease_id: rowDataPacket.disease_id,
							disease_name: rowDataPacket.disease_name,
							bind_id : rowDataPacket.id,
							animal_id: rowDataPacket.animal_id,
							animal_name: rowDataPacket.animal_name,
							symptoms_id: rowDataPacket.symptoms_id,
							symptom_name : rowDataPacket.symptom_name,
							anatomy_id: rowDataPacket.anatomy_id,
							part_name: rowDataPacket.part_name
						}
					})
					resolve(symptoms)
				}else{
					reject(NO_SUCH_CONTENT)
				}
			})
		})
	}

	unbindDiseaseSymptoms(id){
		return new Promise((resolve, reject) => {
			const query = "DELETE FROM disease_symptoms_animal WHERE id = ?"
			this.mysqlConn.query(query, [id], (err, res)=> {
				if (err) {
					reject(err)
					return
				}

				resolve(SUCCESS)
			})
		})
	}
}
