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
import {AnimalCategory, AnimalType, Disease, Symptoms, User} from "../model";

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

	retrieveAnimalType(){
		return new Promise((resolve, reject) => {
			const query = "SELECT a.id, a.animal_name, a.animal_category_id, c.category_name FROM animal_type a INNER JOIN animal_category c ON a.animal_category_id = c.id"
			this.mysqlConn.query(query, (err, res)=>{
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
			this.mysqlConn.query(query, [animalType.animal_name, animalType.animal_category.id], (err, res)=>{
				if (err){
					reject(err)
					return
				}

				animalType.id = res.insertId
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
				}else{
					let categories = []
					for (let i=0; i<result.length; i++){
						categories.push(new User(
							result[i].id,
							result[i].category_name
						))
					}

					resolve(categories)
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

					animalCategory.id = res.insertId
					resolve(animalCategory)
				})
			}else{
				reject(MISMATCH_OBJ_TYPE)
			}
		})
	}

	retrieveDisease(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM disease"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
				}else{
					let diseases = []
					for (let i=0; i<result.length; i++){
						diseases.push(new User(
							result[i].id,
							result[i].disease_name
						))
					}

					resolve(diseases)
				}
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

	retrieveSymptom(){
		return new Promise((resolve, reject)=>{
			const query = "SELECT * FROM symptoms"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
				}else{
					let symptoms = []
					for (let i=0; i<result.length; i++){
						symptoms.push(new User(
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
				this.mysqlConn.query(query, [symptom.symptom_name], (err, res)=>{
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
}
