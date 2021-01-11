CREATE DATABASE IF NOT EXISTS `diagnose_my_pet`;
USE `diagnose_my_pet`;

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

CREATE TABLE IF NOT EXISTS `anatomy`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	part_name VARCHAR(20) NOT NULL,
    animal_type_id INT(11) NOT NULL,
	FOREIGN KEY (animal_type_id) REFERENCES animal_type(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `disease_symptoms_animal`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	disease_id INT(11),
	animal_id INT(11),
	symptoms_id INT(11),
	anatomy_id INT(11),
	FOREIGN KEY (disease_id) REFERENCES disease(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (animal_id) REFERENCES animal_type(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (symptoms_id) REFERENCES symptoms(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (anatomy_id) REFERENCES anatomy(id) ON DELETE CASCADE ON UPDATE CASCADE
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
	user_name VARCHAR(255) NOT NULL,
	mobile VARCHAR(255) UNIQUE DEFAULT NULL,
	email VARCHAR(255) UNIQUE DEFAULT NULL,
	birthdate DATE DEFAULT NULL,
	password VARCHAR(255),
	salt VARCHAR(255),
	role VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `doctor`(
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    doctor_name VARCHAR(7) NOT NULL,
    user_id INT(11),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `patients`(
	id INT(11) PRIMARY KEY AUTO_INCREMENT,
	patient_name VARCHAR(255) NOT NULL,
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

CREATE TABLE IF NOT EXISTS `medicine_cure_symptoms`(
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    medicine_id INT(11) NOT NULL,
    symptoms_id INT(11) NOT NULL,
    FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (symptoms_id) REFERENCES symptoms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `treatment_plan`(
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    plan_name VARCHAR(255) UNIQUE NOT NULL,
    disease_id INT(11) NOT NULL,
    medicine_ids longtext,
    FOREIGN KEY (disease_id) REFERENCES disease(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `appointment`(
    id INT(7) PRIMARY KEY AUTO_INCREMENT,
    appointment_name varchar(255),
    appointment_time timestamp,
    user_id INT(11) NOT NULL,
    doctor_appointment tinyint(1),
    patient_id INT(11) NOT NULL,
    doctor_id INT(11) ,
    appointment_status varchar(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE
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
    FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plan(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `customer` (
  `c_id_customer` INT(7) PRIMARY KEY AUTO_INCREMENT,
  `c_name` VARCHAR(255) NOT NULL,
  `c_address` TEXT NOT NULL,
  `c_phone_number` VARCHAR(255) NOT NULL);

CREATE TABLE IF NOT EXISTS `product` (
  `p_id_product` INT(7) PRIMARY KEY AUTO_INCREMENT,
  `p_name` VARCHAR(255) NOT NULL,
  `p_price` INT(7) NOT NULL,
  `p_quantity` INT(7) NOT NULL);

CREATE TABLE IF NOT EXISTS `transaction`(
    `t_id_transaction` INT(7) PRIMARY KEY AUTO_INCREMENT,
    `t_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `t_total_price` INT(7) NOT NULL,
    `t_status` VARCHAR(255) NOT NULL,
    `t_id_customer` INT(7),
    `t_id_shipment` INT(7),
    `t_id_payment` INT(7),
    FOREIGN KEY (`t_id_customer`) REFERENCES customer(`c_id_customer`) ON DELETE CASCADE ON UPDATE CASCADE);

CREATE TABLE IF NOT EXISTS `transaction_detail`(
    `td_id_transaction_detail` INT(7) PRIMARY KEY AUTO_INCREMENT,
    `td_product_quantity` INT(7) NOT NULL,
    `td_id_product` INT(7),
    `td_id_transaction` INT(7),
    FOREIGN KEY (`td_id_product`) REFERENCES product(`p_id_product`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`td_id_transaction`) REFERENCES transaction(`t_id_transaction`) ON DELETE CASCADE ON UPDATE CASCADE);

CREATE TABLE IF NOT EXISTS `shipment`(
    `s_id_shipment` INT(7) PRIMARY KEY AUTO_INCREMENT,
    `s_method` VARCHAR(255) NOT NULL,
    `s_price` INT(7) NOT NULL,
    `s_duration` INT(7) NOT NULL,
    `s_address` TEXT NOT NULL,
    `s_receiver_name` VARCHAR(255) NOT NULL,
    `s_id_transaction` INT(7),
    FOREIGN KEY (`s_id_transaction`) REFERENCES transaction(`t_id_transaction`) ON DELETE CASCADE ON UPDATE CASCADE);

CREATE TABLE IF NOT EXISTS `payment`(
    `pm_id_payment` INT(7) PRIMARY KEY AUTO_INCREMENT,
    `pm_method` VARCHAR(255) NOT NULL,
    `pm_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `pm_status` VARCHAR(255) NOT NULL,
    `pm_id_transaction` INT(7),
    FOREIGN KEY (`pm_id_transaction`) REFERENCES transaction(`t_id_transaction`) ON DELETE CASCADE ON UPDATE CASCADE);