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
import {AnimalCategory, AnimalType, Disease, Medicine, Patient, Symptoms, User} from "../model";

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
					} else {                                      // connection idle timeout (the wait_timeout
						throw err                                  // server variable configures this)
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
						new AnimalType(result[i].id, result[i].category_name, result[i].animal_category)
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
				}

				let animals = []
				for	(let i=0; i<res.length; i++){
					animals.push(new AnimalType(
						res[i].id,
						res[i].animal_name,
						new AnimalType(res[i].id, res[i].category_name, res[i].animal_category)
					))
				}

				resolve(animals)
			})
		})
	}

	retrieveOneAnimalType(animalType){
		return new Promise((resolve,reject)=>{
			const query="SELECT a.id, a.animal_name, a.animal_category_id, c.category_name FROM animal_type a INNER JOIN animal_category c ON a.animal_category_id = c.id WHERE id=?"
			this.mysqlConn.query(query, animalType.id, (err, res)=>{
				if (err){
					reject(err)
					return
				}

				let animals = []
				for	(let i=0; i<res.length; i++){
					animals.push(new AnimalType(
						res[i].id,
						res[i].animal_name,
						new AnimalCategory(res[i].animal_category_id, res[i].category_name)
					))
				}

				resolve(animals)
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
			console.log(query)
			this.mysqlConn.query(query, [animalType.animal_name, animalType.animal_category], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				animalType.animal_name = res.animal_name
				resolve(animalType)
			})
		})
	}

	updateAnimalType(animal){
		return new Promise((resolve,reject)=>{
			if(!animal instanceof AnimalCategory){
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
				if (res.length === 0){
					resolve([])
					return
				}
				const category_name = res[0].category_name
				const query="SELECT at.id, at.animal_name, at.animal_category_id, ac.category_name FROM animal_type at INNER JOIN animal_category ac ON at.animal_category_id = ac.id WHERE at.animal_category_id=?"
				this.mysqlConn.query(query, [animalCategory.id], (err, res)=>{
					if (err){
						reject(err)
						return
					}

					let animals = []
					for	(let i=0; i<res.length; i++){
						animals.push(new AnimalType(
							res[i].id,
							res[i].animal_name,
							new AnimalCategory(res[i].animal_category_id, res[i].category_name)
						))
					}

					resolve({
						category_name: category_name,
						animal_types: animals
					})
				})
			})
		})
	}

	retrieveOneAnimalCategory(animalCategory){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM animal_category WHERE id=?"
			this.mysqlConn.query(query, animalCategory.id, (err, res)=>{
				if (err){
					reject(err)
					return
				}

				let categories = []
				for	(let i=0; i<res.length; i++){
					categories.push(new AnimalCategory(
						res[i].id,
						res[i].category_name,
					))
				}

				resolve(categories)
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

					animalCategory.category_name = res.category_name
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
			}

			const query = "UPDATE animal_category SET category_name=? WHERE id=?"
			this.mysqlConn.query(query, [animalCategory.category_name,animalCategory.id], (err,res)=>{
				if(err){
					reject(err)
					return
				}

				animalCategory.id=res.insertId
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
			this.mysqlConn.query(query, [animalCategory.id], (err,res)=>{
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

	retrieveOneDisease(disease){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM disease WHERE id=?"
			this.mysqlConn.query(query, disease.id, (err, res)=>{
				if (err){
					reject(err)
					return
				}

				let diseases = []
				for	(let i=0; i<res.length; i++){
					diseases.push(new Disease(
						res[i].id,
						res[i].disease_name,
					))
				}

				resolve(diseases)
			})
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

				disease.id=res.insertId
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
				resolve(SUCCESS)
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
				resolve(SUCCESS)
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

				symptom.id=res.insertId
				resolve(SUCCESS)
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

	retrievePatient(){
		return new Promise((resolve, reject)=>{
			const query="SELECT * FROM patients"
			this.mysqlConn.query(query,(error,result)=>{
				if(error){
					reject(error)
				}

				else{
					let patients=[]
					for(let i=0; i<patients.length; i++){
						patients.push(new Patient(
							result[i].id,
							result[i].fullname,
							result[i].animal_type,
							result[i].birthdate,
							result[i].pet_owner
						))
					}
					resolve(patients)
				}
			})
		})
	}

	retrieveOnePatient(patient){
		return new Promise((resolve,reject)=>{
			const query="SELECT * FROM patients WHERE id=?"
			this.mysqlConn.query(query,patient.id,(error,result)=>{
				if(error){
					reject(error)
				}

				else{
					let patients=[]
					for(let i=0; i<patients.length;i++){
						patients.push(new Patient(
							result[i].id,
							result[i].fullname,
							result[i].animal_type,
							result[i].birthdate,
							result[i].pet_owner
						))
					}
				}
			})
		})
	}

	registerPatient(patient){
		return new Promise((resolve,reject)=>{
			if(patient instanceof Patient){
				const query="INSERT INTO `patients`(`fullname`,`animal_type_id`,`birthdate`, `pet_owner_id`) VALUES(?, ?, ?, ?)"
				this.mysqlConn.query(query,[patient.fullname, patient.animal_type, patient.birthdate, patient.pet_owner],(err,res)=>{
					if(err){
						reject(err)
						return
					}

					patient.id=res.insertId
					resolve(patient)
				})
			}
			else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	updatePatient(patient){
		return new Promise((resolve, reject)=>{
			if(!patient instanceof Patient){
				reject(MISMATCH_OBJ_TYPE)
			}

			else{
				const query="UPDATE patients SET fullname=?, animal_type_id=?, birthdate=?, pet_owner_id=? WHERE id=?"
				this.mysqlConn.query(query, [patient.fullname, patient.animal_type, patient.birthdate, patient.pet_owner, patient.id], (err, res)=>{
					if(err){
						reject(err)
						return
					}

					resolve(SUCCESS)
				})
			}
		})
	}

	deletePatient(patient){
		return new Promise((resolve, reject)=>{
			if(!patient instanceof Patient){
				reject(MISMATCH_OBJ_TYPE)
			}

			const query="DELETE FROM patients WHERE id=?"
			this.mysqlConn.query(query,[patient.id],(err,res)=>{
				if(err){
					reject(err)
					return
				}

				patient.id=res.insertId
				resolve(patient)
			})
		})
	}

	bindSymptomToDiseaseAndMedicine(symptom, disease, animal, medicine){
		return new Promise((resolve, reject)=>{
			if (symptom instanceof Symptoms &&
				disease instanceof Disease &&
				animal instanceof AnimalType &&
			    medicine instanceof Medicine){
				const checkQuery = "SELECT id FROM disease_symptoms_animal WHERE disease_id = ? AND animal_id = ? AND symptoms_id = ? AND medicine_id = ?"
				this.mysqlConn.query(checkQuery, [disease.id, animal.id, symptom.id, medicine.id], (err, res)=>{
					if (res.length > 1){
						reject(ERROR_DUPLICATE_ENTRY)
						return
					}

					const query = "INSERT INTO `disease_symptoms_animal`(`disease_id`, `animal_id`, `symptoms_id`, `medicine_id`) VALUES (?, ?, ?, ?)";
					this.mysqlConn.query(query, [disease.id, animal.id, symptom.id, medicine.id], (err, res)=>{
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
				"dsa.animal_id, a.animal_name, dsa.symptoms_id, s.symptom_name, dsa.medicine_id, m.medicine_name " +
				"FROM disease_symptoms_animal dsa INNER JOIN disease d ON dsa.disease_id = d.id " +
				"INNER JOIN symptoms s ON s.id = dsa.symptoms_id " +
				"INNER JOIN animal_type a ON dsa.animal_id=a.id " +
				"INNER JOIN medicine m ON dsa.medicine_id=m.id" +
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
					const diseaseSymptoms = await this.retrieveSymptomsAndMedicineForDisease(new Disease(resultSet.disease_id)).catch(err=>{console.error(err)})
					resultSet.total_disease_symptoms = diseaseSymptoms.length
				}

				resolve(diagnoseResult)
			})
		})
	}

	retrieveSymptomsAndMedicineForDisease(disease){
		return new Promise((resolve, reject) => {
			const query = "SELECT dsa.id, dsa.disease_id, d.disease_name, dsa.animal_id, a.animal_name, dsa.symptoms_id, s.symptom_name, dsa.medicine_id, m.medicine_name " +
				"FROM disease_symptoms_animal dsa INNER JOIN disease d ON dsa.disease_id = d.id " +
				"INNER JOIN symptoms s ON dsa.symptoms_id = s.id " +
				"INNER JOIN animal_type a ON dsa.animal_id=a.id " +
				"INNER JOIN medicine m ON dsa.medicine_id=m.id " +
				"WHERE dsa.disease_id = ?"

			this.mysqlConn.query(query, disease.id, (err, res)=>{
				if (err){
					reject(err)
					return
				}

				const symptoms = res.map(rowDataPacket => {
					// return new Symptoms(
					// 	rowDataPacket.id,
					// 	rowDataPacket.symptom_name
					// )

					return {
						bind_id : rowDataPacket.id,
						symptom_id: rowDataPacket.symptom_id,
						symptom_name : rowDataPacket.symptom_name,
						medicine_id : rowDataPacket.medicine_id,
						medicne_name: rowDataPacket.medicine_name
					}
				})
				resolve(symptoms)
			})
		})
	}

	unbindDiseaseSymptoms(bind_id){
		return new Promise((resolve, reject) => {
			const query = "DELETE FROM disease_symptoms_animal WHERE id = ?"
			this.mysqlConn.query(query, [bind_id], (err, res)=> {
				if (err) {
					reject(err)
					return
				}

				resolve(SUCCESS)
			})
		})
	}
}
