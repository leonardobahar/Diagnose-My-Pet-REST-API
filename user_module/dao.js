import mysqlConn from './util/mysql-conn.js'
import {
    ADMIN_VALIDATED,
    ALL, CANCELLED, INVALID, INVALID_FINAL,
    MISMATCH_OBJ_TYPE,
    NO_AFFECTED_ROWS,
    NO_SUCH_CONTENT,
    ONLY_WITH_VENDORS, ORDER_PROCESSING,
    SOMETHING_WENT_WRONG, VALID, WRONG_BODY_FORMAT
} from "./strings";
import {Customer} from "./model";

export class Dao{
	constructor(host, user, password, dbname){
		this._host = host
		this._user = user
		this._password = password
		this._dbname = dbname

		this._initSqlStmt = `
		CREATE TABLE IF NOT EXISTS animal_category(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		category_name VARCHAR(255) UNIQUE NOT NULL
		);
		
		CREATE TABLE IF NOT EXISTS animal_type(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		animal_name VARCHAR(255) UNIQUE NOT NULL,
		animal_category_id INT(11),
		FOREIGN KEY (animal_category_id) REFERENCES animal_category(id)
		);
		
		CREATE TABLE IF NOT EXISTS disease(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		disease_name VARCHAR(255) UNIQUE NOT NULL
		);
		
		CREATE TABLE IF NOT EXISTS symptoms(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		symptom_name VARCHAR(255) UNIQUE NOT NULL
		);
		
		CREATE TABLE IF NOT EXISTS medicine(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		medicine_name VARCHAR(255) UNIQUE NOT NULL,
		side_effect TEXT DEFAULT NULL,
		dosage_info TEXT DEFAULT NULL
		);
		
		CREATE TABLE IF NOT EXISTS disease_symptoms_animal(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		disease_id INT(11),
		animal_id INT(11),
		symptoms_id INT(11),
		FOREIGN KEY (disease_id) REFERENCES disease(id),
		FOREIGN KEY (animal_id) REFERENCES animal_type(id),
		FOREIGN KEY (symptoms_id) REFERENCES symptoms(id)
		);
		
		CREATE TABLE IF NOT EXISTS medicine_for_disease_symptoms(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		disease_symptoms_animal_id INT(11),
		medicine_id INT(11),
		FOREIGN KEY (disease_symptoms_animal_id) REFERENCES disease_symptoms_animal(id),
		FOREIGN KEY (medicine_id) REFERENCES medicine(id)
		);
		
		CREATE TABLE IF NOT EXISTS customer(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		fullname VARCHAR(255) NOT NULL,
		mobile VARCHAR(255) UNIQUE DEFAULT NULL,
		email VARCHAR(255) UNIQUE DEFAULT NULL,
		birthdate DATE DEFAULT NULL
		);
		
		CREATE TABLE IF NOT EXISTS patients(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		fullname VARCHAR(255) NOT NULL,
		animal_type_id INT(11) NOT NULL,
		birthdate DATE DEFAULT NULL,
		pet_owner_id INT(11) NOT NULL,
		FOREIGN KEY (animal_type_id) REFERENCES animal_type(id),
		FOREIGN KEY (pet_owner_id) REFERENCES customer(id)
		);
		
		CREATE TABLE IF NOT EXISTS medical_records(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		patient_id INT(11) NOT NULL,
		case_open_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		status TEXT,
		FOREIGN KEY (patient_id) REFERENCES patients(id)
		);
		
		CREATE TABLE IF NOT EXISTS medical_records_symptoms(
		id INT(11) PRIMARY KEY AUTO_INCREMENT,
		medical_records_id INT(11) NOT NULL,
		symptoms_id INT(11) NOT NULL,
		FOREIGN KEY (medical_records_id) REFERENCES medical_records(id),
		FOREIGN KEY (symptoms_id) REFERENCES symptoms(id)
		);`

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
			const query = "SELECT * FROM customer"
			this.mysqlConn.query(query, (error, result)=>{
				if (error){
					reject(error)
				}else{
					let customers = []
					for (let i=0; i<result.length; i++){
						customers.push(new Customer(
							result[i].id,
							result[i].fullname,
							result[i].mobile,
							result[i].email,
							result[i].birthdate
						))
					}

					resolve(customers)
				}
			})
		})
	}

	retrieveUserPets(user_id){
		return new Promise((resolve, reject)=>{

		})
	}
}
