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

export class Customer{
	constructor(id, fullname, mobile, email, birthdate){
		this.id = id;
		this.fullname = fullname;
		this.mobile = mobile;
		this.email = email;
		this.birthdate = birthdate;
	}

}
