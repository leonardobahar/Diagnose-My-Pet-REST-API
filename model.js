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
	constructor(id, description, medication, date_created, patient_id, appointment_id, file){
		this.id=id
		this.description=description
		this.medication=medication
		this.date_created=date_created
		this.patient_id=patient_id
		this.appointment_id=appointment_id
		this.file=file
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
	constructor(id, patient_name, animal_type, breed, gender, birthdate, pet_owner, picture) {
		this.id=id
		this.patient_name=patient_name
		this.animal_type=animal_type
		this.breed=breed
		this.gender=gender
		this.birthdate=birthdate
		this.pet_owner=pet_owner
		this.picture=picture
	}
}

export class Appointment{
	constructor(id, appointment_name, appointment_time, duration, user_id, is_real_appointment,
				patient_id, doctor_id, appointment_status, description, payment_attachment) {
		this.id=id
		this.appointment_name=appointment_name
		this.appointment_time=appointment_time
		this.duration=duration
		this.user_id=user_id
		this.is_real_appointment=is_real_appointment
		this.patient_id=patient_id
		this.doctor_id=doctor_id
		this.appointment_status=appointment_status
		this.description=description
		this.payment_attachment=payment_attachment
	}
}

export class Schedule{
	constructor(id, appointment_name, start_time, end_time, user_id, is_real_appointment,
				patient_id, doctor_id, appointment_status, description, payment_attachment) {
		this.id=id
		this.appointment_name=appointment_name
		this.start_time=start_time
		this.end_time=end_time
		this.user_id=user_id
		this.is_real_appointment=is_real_appointment
		this.patient_id=patient_id
		this.doctor_id=doctor_id
		this.appointment_status=appointment_status
		this.description=description
		this.payment_attachment=payment_attachment
	}
}

export class User{
	constructor(id, user_name, mobile, email, birthdate, address, password, salt, role){
		this.id = id
		this.user_name = user_name
		this.mobile = mobile
		this.email = email
		this.birthdate = birthdate
		this.address=address
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

export class Doctor{
	constructor(id, doctor_name, user_id){
		this.id=id
		this.doctor_name=doctor_name
		this.user_id=user_id
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

export class Participant{
	constructor(id, full_name, youtube_name, youtube_email, phone_number) {
		this.id=id
		this.full_name=full_name
		this.youtube_name=youtube_name
		this.youtube_email=youtube_email
		this.phone_number=phone_number
	}
}