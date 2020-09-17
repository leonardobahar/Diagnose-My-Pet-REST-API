import {max} from "moment";

export class Menu{
	constructor(id, name, price, min_order, max_order){
		this._id = id;
		this._name = name;
		this._price = price;
		this._min_order = typeof min_order === 'undefined' ? null : min_order
		this._max_order = typeof max_order === 'undefined' ? null : max_order
	}

	getId() {
		return this._id;
	}

	setId(value) {
		this._id = value;
	}

	getName() {
		return this._name;
	}

	setName(value) {
		this._name = value;
	}

	getPrice() {
		return this._price;
	}

	setPrice(value) {
		this._price = value;
	}
}

export class Vendor{
	constructor(id, name, address, contact_person, email, mobile, longtitude, latitude){
		this._id = id;
		this._name = name;
		this._email = email;
		this._contactPerson = contact_person;
		this._mobile = mobile;
		this._address = address;
		this._longtitude = longtitude;
		this._latitude = latitude;
	}

	getId() {
		return this._id;
	}

	setId(value) {
		this._id = value;
	}

	getName() {
		return this._name;
	}

	setName(value) {
		this._name = value;
	}

	getAddress() {
		return this._address;
	}

	setAddress(value) {
		this._address = value;
	}

	getEmail() {
		return this._email;
	}

	setEmail(value) {
		this._email = value;
	}

	getMobile() {
		return this._mobile;
	}

	setMobile(value) {
		this._mobile = value;
	}

	getLongitude(){
		return this._longtitude
	}

	getLatitude(){
		return this._latitude
	}
}

export class VendorMakesMenu{
	constructor(menuId, vendorId, minOrder, maxOrder, vendorPrice, vendorMakesMenuId){
		this._menuId = menuId
		this._vendorId = vendorId
		this._minOrder = minOrder
		this._maxOrder = maxOrder
		this._vendorPrice = vendorPrice
		this._vendorMakesMenuId = typeof vendorMakesMenuId === null ? null : vendorMakesMenuId
	}
}

export class Payment{
	constructor(paymentId, orderId, amount, customerEmail, paymentDate, paymentStatus, paymentProofPath){
		this._paymentId = paymentId
		this._orderId = orderId
        this._amount = amount
		this._customerEmail = customerEmail
		this._paymentDate = paymentDate
		this._paymentStatus = paymentStatus
		this._paymentProofPath = paymentProofPath
	}
}
