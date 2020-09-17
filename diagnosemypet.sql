CREATE DATABASE IF NOT EXISTS `diagnose_my_pet`;

CREATE TABLE IF NOT EXISTS `animal_category`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	category_name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS `animal_type`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	animal_name VARCHAR(255) UNIQUE NOT NULL,
	animal_category_id INT(11),
	FOREIGN KEY (animal_category_id) REFERENCES animal_category(id)
);

CREATE TABLE IF NOT EXISTS `disease`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	disease_name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS `symptoms`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	symptom_name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS `medicine`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	medicine_name VARCHAR(255) UNIQUE NOT NULL,
	side_effect TEXT DEFAULT NULL,
	dosage_info TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS `disease_symptoms_animal`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	disease_id INT(11),
	animal_id INT(11),
	symptoms_id INT(11),
	FOREIGN KEY (disease_id) REFERENCES disease(id),
	FOREIGN KEY (animal_id) REFERENCES animal_type(id),
	FOREIGN KEY (symptoms_id) REFERENCES symptoms(id)
);

CREATE TABLE IF NOT EXISTS `medicine_for_disease_symptoms`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	disease_symptoms_animal_id INT(11),
	medicine_id INT(11),
	FOREIGN KEY (disease_symptoms_animal_id) REFERENCES disease_symptoms_animal(id),
	FOREIGN KEY (medicine_id) REFERENCES medicine(id)
);

CREATE TABLE IF NOT EXISTS `customer`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	fullname VARCHAR(255) NOT NULL,
	mobile VARCHAR(255) UNIQUE DEFAULT NULL,
	email VARCHAR(255) UNIQUE DEFAULT NULL,
	birthdate DATE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS `patients`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	fullname VARCHAR(255) NOT NULL,
	animal_type_id INT(11) NOT NULL,
	birthdate DATE DEFAULT NULL,
	pet_owner_id INT(11) NOT NULL,
	FOREIGN KEY (animal_type_id) REFERENCES animal_type(id),
	FOREIGN KEY (pet_owner_id) REFERENCES customer(id)
);

CREATE TABLE IF NOT EXISTS `medical_records`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	patient_id INT(11) NOT NULL,
	case_open_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	status TEXT,
	FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS `medical_records_symptoms`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	medical_records_id INT(11) NOT NULL,
	symptoms_id INT(11) NOT NULL,
	FOREIGN KEY (medical_records_id) REFERENCES medical_records(id),
	FOREIGN KEY (symptoms_id) REFERENCES symptoms(id)
);