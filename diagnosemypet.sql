CREATE DATABASE IF NOT EXISTS `diagnose_my_pet`;

CREATE TABLE IF NOT EXISTS `animal_category`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	category_name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS `animal_type`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	animal_name VARCHAR(255) UNIQUE NOT NULL,
	animal_category_id INT(11),
	FOREIGN KEY (animal_category_id) REFERENCES animal_category(id) ON DELETE SET NULL ON UPDATE CASCADE
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
	FOREIGN KEY (disease_id) REFERENCES disease(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (animal_id) REFERENCES animal_type(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (symptoms_id) REFERENCES symptoms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `medicine_for_disease_symptoms`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	disease_symptoms_animal_id INT(11),
	medicine_id INT(11),
	FOREIGN KEY (disease_symptoms_animal_id) REFERENCES disease_symptoms_animal(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `users`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	fullname VARCHAR(255) NOT NULL,
	mobile VARCHAR(255) UNIQUE DEFAULT NULL,
	email VARCHAR(255) UNIQUE DEFAULT NULL,
	birthdate DATE DEFAULT NULL,
	password VARCHAR(255),
	salt VARCHAR(255),
	role VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `patients`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	fullname VARCHAR(255) NOT NULL,
	animal_type_id INT(11),
	birthdate DATE DEFAULT NULL,
	pet_owner_id INT(11),
	FOREIGN KEY (animal_type_id) REFERENCES animal_type(id) ON DELETE SET NULL ON UPDATE CASCADE,
	FOREIGN KEY (pet_owner_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `medical_records`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	patient_id INT(11) NOT NULL,
	case_open_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	status TEXT,
	FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `medical_records_symptoms`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	medical_records_id INT(11) NOT NULL,
	symptoms_id INT(11) NOT NULL,
	FOREIGN KEY (medical_records_id) REFERENCES medical_records(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (symptoms_id) REFERENCES symptoms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `anatomy`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	part_name VARCHAR(20) NOT NULL,
        animal_type_id INT(11) NOT NULL,
	FOREIGN KEY (animal_type_id) REFERENCES animal_type(id) ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE disease_symptoms_animal ADD COLUMN IF NOT EXISTS medicine_id INT(11) AFTER symptoms_id;
ALTER TABLE disease_symptoms_animal ADD COLUMN IF NOT EXISTS anatomy_id INT(11) AFTER medicine_id;

CREATE TABLE IF NOT EXISTS `medicine_cure_symptoms`(
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    medicine_id INT(11) NOT NULL,
    symptoms_id INT(11) NOT NULL,
    FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (symptoms_id) REFERENCES symptoms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `treatment_plan`(
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    medicine_id INT(11) NOT NULL,
    disease_id INT(11) NOT NULL,
    FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (disease_id) REFERENCES disease(id) ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE disease_symptoms_animal DROP COLUMN medicine_id;

CREATE TABLE IF NOT EXISTS `appointment`(
    id INT(7) PRIMARY KEY AUTO_INCREMENT,
    appointment_name varchar(20),
    appointment_time timestamp,
    user_id INT(7) NOT NULL,
    patient_id INT(7) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `medical_record_attachment`(
    id INT(7) PRIMARY KEY AUTO_INCREMENT,
    medical_record_id INT(7),
    file_name varchar(150),
    FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS`diagnose_my_pet`.`medical_record_treatment_plan` (
    `id` INT(11) NOT NULL AUTO_INCREMENT ,
    `medical_record_id` INT(11) NOT NULL ,
    `treatment_plan_id` INT(11) NOT NULL ,
    PRIMARY KEY (`id`),
    FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plan(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE = InnoDB;