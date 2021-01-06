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
	constructor(id, plan_name, disease_id, medicine_ids) {
		this.id=id
		this.plan_name=plan_name
		this.disease_id=disease_id
		this.medicine_ids=medicine_ids
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
	constructor(id, appointment_name, appointment_time, appointment_status, user_id, patient_id) {
		this.id=id
		this.appointment_name=appointment_name
		this.appointment_time=appointment_time
		this.appointment_status=appointment_status
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

export class Customer{
	constructor(id, customer_name, address, phone_number) {
		this.id=id
		this.customer_name=customer_name
		this.address=address
		this.phone_number=phone_number
	}
}

export class Product{
	constructor(id, product_name, price, quantity) {
		this.id=id
		this.product_name=product_name
		this.price=price
		this.quantity=quantity
	}
}

export class Transaction{
	constructor(transaction_id, date, total_price, status, id_customer, id_shipment, id_payment) {
		this.transaction_id=transaction_id
		this.date=date
		this.total_price=total_price
		this.status=status
		this.id_customer=id_customer
		this.id_shipment=id_shipment
		this.id_payment=id_payment
	}
}

export class Transaction_detail{
	constructor(transaction_detail_id, product_quantity, id_product, id_transaction) {
		this.transaction_detail_id=transaction_detail_id
		this.product_quantity=product_quantity
		this.id_product=id_product
		this.id_transaction=id_transaction
	}
}

export class Shipment{
	constructor(shipment_id, method, price, duration, address, receiver_name, id_transaction) {
		this.shipment_id=shipment_id
		this.method=method
		this.price=price
		this.duration=duration
		this.address=address
		this.receiver_name=receiver_name
		this.id_transaction=id_transaction
	}
}

export class Payment{
	constructor(payment_id, method, date, status, id_transaction) {
		this.payment_id=payment_id
		this.method=method
		this.status=status
		this.date=date
		this.id_transaction=id_transaction
	}
}