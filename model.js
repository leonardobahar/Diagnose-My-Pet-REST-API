export class AnimalCategory {
	constructor(id, category_name){
		this.id = id
		this.category_name = category_name
	}
}

export class AnimalType{
	constructor(id, animal_name, animal_category){
		this.id = id
		this.animal_name = animal_name
		this.animal_category = animal_category
	}
}

export class Symptoms{
	constructor(id, symptom_name){
		this.id = id
		this.symptom_name = symptom_name
	}
}

export class Medicine{
	constructor(id, medicine_name, side_effect, dosage_info){
		this.id = id
		this.medicine_name = medicine_name
		this.side_effect = side_effect
		this.dosage_info = dosage_info
	}
}

export class Disease{
	constructor(id, disease_name, symptomsArray, medicineArray){
		this.id = id
		this.disease_name = disease_name
		this.symptomsArray = symptomsArray
		this.medicineArray = medicineArray
	}
}

export class Anatomy{
	constructor(id, part_name, animal_type_id) {
		this.id=id
		this.part_name=part_name
		this.animal_type_id=animal_type_id
	}
}

export class MedicalRecords{
	constructor(id, patient_id, case_open_time, status){
		this.id=id
		this.patient_id=patient_id
		this.case_open_time=case_open_time
		this.status=status
	}
}

export class MedicalRecordSymptoms{
	constructor(id, medical_records_id, symptoms_id) {
		this.id=id
		this.medical_records_id=medical_records_id
		this.symptoms_id=symptoms_id
	}
}

export class MedicalRecordTreatmentPlan{
	constructor(id, medical_record_id, treatment_plan_id) {
		this.id=id
		this.medical_record_id=medical_record_id
		this.treatment_plan_id=treatment_plan_id
	}
}

export class TreatmentPlan{
	constructor(id, medicine_id, disease_id) {
		this.id=id
		this.medicine_id=medicine_id
		this.disease_id=disease_id
	}
}

export class MedicalRecordAttachment{
	constructor(id, medical_record_id, file_name) {
		this.id=id
		this.medical_record_id=medical_record_id
		this.file_name=file_name
	}
}

export class Patient{
	constructor(id, patient_name, animal_type, birthdate, pet_owner) {
		this.id=id
		this.patient_name=patient_name
		this.animal_type=animal_type
		this.birthdate=birthdate
		this.pet_owner=pet_owner
	}
}

export class Appointment{
	constructor(id, appointment_name, appointment_time, user_id, patient_id) {
		this.id=id
		this.appointment_name=appointment_name
		this.appointment_time=appointment_time
		this.user_id=user_id
		this.patient_id=patient_id
	}
}

export class User{
	constructor(id, user_name, mobile, email, birthdate, password, salt, role){
		this.id = id
		this.user_name = user_name
		this.mobile = mobile
		this.email = email
		this.birthdate = birthdate
		this.password = password
		this.salt=salt
		this.role = role
	}
}