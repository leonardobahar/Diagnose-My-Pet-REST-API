import 'babel-polyfill';
import sha256 from 'crypto-js/sha256'
import {KunyahAccessObj} from './dao'
import dotenv from 'dotenv';
import {Menu, Payment, Vendor, VendorMakesMenu} from "./model"
import {
    ADMIN_VALIDATED,
    ALL,
    CANCELLED,
    INVALID,
    INVALID_FINAL,
    NO_SUCH_CONTENT,
    ONLY_WITH_VENDORS,
    VALID
} from "./strings";
import findVendorForMenu from "./util/find-vendors";
import {calculateUnitSubtotal} from "./util/OrderCalculations";
import moment from "moment";
import {runAHP, updateAHP} from "./util/ahp";

dotenv.config()

const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const kunyahAccessObject = new KunyahAccessObj(host, user, password, dbname)

let BobJohnson = {
    customer_id: 1,
    email: "bob@gmail.com",
    password: sha256("bobIsAwesome").toString(),
    fullname: "Bob Johnson",
    mobile: "+6289688886666",
    address: {
        street: "Jl. Ciremai Raya No. 55",
        latitude: -6.209717,
        longitude: 106.709332
    }
}

test('Database - Table Existence', done=>{
    kunyahAccessObject.mysqlConn.query("SHOW TABLES;", (err, res)=>{
        expect(res.length).toBe(7)
        done()
    })
})

test('Registration - Create new customer', ()=>{
    return kunyahAccessObject.addCustomer(BobJohnson.email, BobJohnson.password, BobJohnson.fullname, BobJohnson.mobile).then(result=>{
        BobJohnson.customer_id = result
        expect(result).toBeGreaterThan(0)
    })
})

test('Customer Verification - Login with correct email and password', ()=>{
    return kunyahAccessObject.verifyCustomer(BobJohnson.email, BobJohnson.password).then(result=>{
        expect(result).not.toBe(0)
    })
})

test('Customer Verification - Login with correct email and wrong password', ()=>{
    return kunyahAccessObject.verifyCustomer(BobJohnson.email, sha256("password").toString()).then(result=>{
        expect(result).toBe(0)
    })
})

test('Customer Verification - Login with non-existent email and a password', ()=>{
    return kunyahAccessObject.verifyCustomer("john@mail.com", sha256("password").toString()).then(result=>{
        expect(result).toBe(0)
    })
})

console.log("User Management")

test('Registration - Create existent customer', ()=>{
    return kunyahAccessObject.addCustomer(BobJohnson.email, BobJohnson.password, BobJohnson.fullname, BobJohnson.mobile)
        .then(result=>{})
        .catch(err=>{
            expect(err.code).toBe('ER_DUP_ENTRY')
        })
})

test('Customer Data - Retrieve short customer data with email', ()=>{
    return kunyahAccessObject.retrieveShortCustomerDataByEmail(BobJohnson.email).then(result=>{
        expect(typeof result.customer_id).not.toBe('undefined')
        expect(typeof result.fullname).not.toBe('undefined')
        expect(typeof result.email).not.toBe('undefined')
        expect(typeof result.mobile).not.toBe('undefined')
    })
})

test('Customer Data - Retrieve short customer data with ID', ()=>{
    return kunyahAccessObject.retrieveShortCustomerDataById(BobJohnson.customer_id).then(result=>{
        expect(typeof result.customer_id).not.toBe('undefined')
        expect(typeof result.fullname).not.toBe('undefined')
        expect(typeof result.email).not.toBe('undefined')
        expect(typeof result.mobile).not.toBe('undefined')
    })
})

test('Customer Data - Retrieve non-existent short customer data with email', ()=>{
    return kunyahAccessObject.retrieveShortCustomerDataByEmail('john@mail.com')
        .then(result=>{})
        .catch(err=>{
            expect(err).toBe(NO_SUCH_CONTENT)
        })
})

test('Customer Data - Retrieve non-existent short customer data with ID', ()=>{
    return kunyahAccessObject.retrieveShortCustomerDataById(3)
        .then(result=>{})
        .catch(err=>{
            expect(err).toBe(NO_SUCH_CONTENT)
        })
})

test('Customer Data - Retrieve complete customer data with email', ()=>{
    return kunyahAccessObject.retrieveCompleteCustomerDataByEmail(BobJohnson.email).then(result=>{
        expect(typeof result.customer_id).not.toBe('undefined')
        expect(typeof result.fullname).not.toBe('undefined')
        expect(typeof result.email).not.toBe('undefined')
        expect(typeof result.mobile).not.toBe('undefined')
        expect(typeof result.address).not.toBe('undefined')
        expect(typeof result.orders).not.toBe('undefined')
        expect(typeof result.payment).not.toBe('undefined')
    })
})

test('Customer Data - Retrieve complete customer data with ID', ()=>{
    return kunyahAccessObject.retrieveCompleteCustomerDataById(1).then(result=>{
        expect(typeof result.customer_id).not.toBe('undefined')
        expect(typeof result.fullname).not.toBe('undefined')
        expect(typeof result.email).not.toBe('undefined')
        expect(typeof result.mobile).not.toBe('undefined')
        expect(typeof result.address).not.toBe('undefined')
        expect(typeof result.orders).not.toBe('undefined')
        expect(typeof result.payment).not.toBe('undefined')
    })
})

test('Customer Data - Retrieve non-existent complete customer data with email', ()=>{
    return kunyahAccessObject.retrieveCompleteCustomerDataByEmail("john@mail.com") .then(result=>{})
        .catch(err=>{
            expect(err).toBe(NO_SUCH_CONTENT)
        })
})

test('Customer Data - Retrieve non-existent complete customer data with ID', ()=>{
    return kunyahAccessObject.retrieveCompleteCustomerDataById(3)
        .then(result=>{})
        .catch(err=>{
            expect(err).toBe(NO_SUCH_CONTENT)
        })
})

test('Customer Data - Insert Customer Address', ()=> {
    return kunyahAccessObject.addCustomerAddress(BobJohnson.address.street, BobJohnson.address.latitude, BobJohnson.address.longitude, BobJohnson.customer_id).then(result => {
        expect(result).toBeGreaterThan(0)
        BobJohnson.address.address_id = result
    })
})

test('Customer Data - Delete Customer Address', ()=>{
    return kunyahAccessObject.flagCustomerAddressDeleted(BobJohnson.address.address_id).then(result=>{
        expect(result).toBe(1)
    })
})

test('Customer Data - Change Password', ()=>{
    BobJohnson.newPassword = sha256('bobIsSecured').toString()
    return kunyahAccessObject.updateCustomer(BobJohnson.email, BobJohnson.newPassword, BobJohnson.fullname, BobJohnson.mobile).then(result=>{
        expect(result).toBe(1)
        BobJohnson.password = BobJohnson.newPassword
        delete BobJohnson.newPassword
        expect(typeof BobJohnson.newPassword).toBe('undefined')
    })
})

test('Customer Data - Update Customer Contact Data', ()=>{
    BobJohnson.newMobile = "+6285588887777"
    return kunyahAccessObject.updateCustomer(BobJohnson.email, BobJohnson.password, BobJohnson.fullname, BobJohnson.newMobile).then(result=>{
        expect(result).toBe(1)
        BobJohnson.mobile = BobJohnson.newMobile
        delete BobJohnson.mobile
    })
})

let VendorKateringParahyangan = {
    name: "Katering Parahyangan",
    address: "Jl. Cakra Negara Raya, Bintaro, Jakarta 12330",
    contact_person: "Siti Wahyu Joko",
    mobile: "+6286799991111",
    email: "siti@mail.com",
    longitude: 106.764100,
    latitude: -6.278562
}

console.log("Vendor Management")

test('Registration - Create new vendor', ()=>{
    return kunyahAccessObject.addVendor(new Vendor(null, VendorKateringParahyangan.name, VendorKateringParahyangan.address, VendorKateringParahyangan.contact_person, VendorKateringParahyangan.email, VendorKateringParahyangan.mobile, VendorKateringParahyangan.longitude, VendorKateringParahyangan.latitude)).then(result=>{
        expect(result._id).toBeGreaterThan(0)
        VendorKateringParahyangan.id = result._id
    })
})

test('Registration - Create existent vendor', ()=> {
    return kunyahAccessObject.addVendor(new Vendor(null, VendorKateringParahyangan.name, VendorKateringParahyangan.address, VendorKateringParahyangan.contact_person, VendorKateringParahyangan.email, VendorKateringParahyangan.mobile, VendorKateringParahyangan.longitude, VendorKateringParahyangan.latitude))
        .then(result => {})
        .catch(err => {
            expect(err.code).toBe('ER_DUP_ENTRY')
        })
})

test('Vendor Data - Retrieve All Vendors', ()=>{
    return kunyahAccessObject.retrieveVendors().then(result=>{
        result.forEach(eachResultItem=>{
            expect(typeof eachResultItem.vendor_id).not.toBe("undefined")
            expect(typeof eachResultItem.vendor_name).not.toBe("undefined")
            expect(typeof eachResultItem.address).not.toBe("undefined")
            expect(typeof eachResultItem.mobile).not.toBe("undefined")
            expect(typeof eachResultItem.latitude).not.toBe("undefined")
            expect(typeof eachResultItem.longtitude).not.toBe("undefined")
            expect(typeof eachResultItem.isBlocked).not.toBe("undefined")
        })
    })
})

test('Vendor Data - Retrieve Single Vendor Information', ()=>{
    return kunyahAccessObject.retrieveVendors(VendorKateringParahyangan.id).then(result=>{
        expect(typeof result.vendor_id).not.toBe("undefined")
        expect(typeof result.vendor_name).not.toBe("undefined")
        expect(typeof result.address).not.toBe("undefined")
        expect(typeof result.mobile).not.toBe("undefined")
        expect(typeof result.latitude).not.toBe("undefined")
        expect(typeof result.longtitude).not.toBe("undefined")
        expect(typeof result.isBlocked).not.toBe("undefined")
    })
})

test('Vendor Data - Update Vendor Information', ()=>{
    return kunyahAccessObject.updateVendor(VendorKateringParahyangan.id, VendorKateringParahyangan.name, VendorKateringParahyangan.address, VendorKateringParahyangan.email, VendorKateringParahyangan.mobile,VendorKateringParahyangan.latitude, VendorKateringParahyangan.longitude).then(result=>{
        expect(result).toBe(1)
    })
})

test('Vendor Data - Block Vendor', ()=>{
    return kunyahAccessObject.blockVendor(VendorKateringParahyangan.id).then(result=>{
        expect(result).toBe(1)
    })
})

console.log("Product Management (Menu)")

let NasiUdukIstimewa = {
    name: "Nasi Uduk Istimewa",
    price: 15000,
    id: 1
}

test('Insertion - Insert Menu Item', ()=>{
    return kunyahAccessObject.insertMenu(new Menu(null, NasiUdukIstimewa.name, NasiUdukIstimewa.price)).then(result=>{
        expect(result._id).toBeGreaterThan(0)
        NasiUdukIstimewa.id = result._id
    })
})

test('Insertion - Insert Existent Menu Item', ()=>{
    return kunyahAccessObject.insertMenu(new Menu(null, NasiUdukIstimewa.name, NasiUdukIstimewa.price))
        .then(result=>{})
        .catch(err=>{
            expect(err.code).toBe('ER_DUP_ENTRY')
        })
})

test('Insertion - Post-action Upload Menu Image', ()=>{
    const filepath = "./images/menu-test-file-path.jpg"
    return kunyahAccessObject.updateMenuImage(NasiUdukIstimewa.id, filepath).then(result=>{
        expect(result).toBe(true)
        NasiUdukIstimewa.image_path = filepath
    })
})

test('Insertion - Bind a Vendor to Menu', ()=>{
    return kunyahAccessObject.insertVendorMakesMenu(new VendorMakesMenu(NasiUdukIstimewa.id, VendorKateringParahyangan.id, 10, 1000, 8000, null)).then(result=>{
        expect(result._vendorMakesMenuId).toBeGreaterThan(0)
    })
})

test('Insertion - Bind a Vendor to a Non-existent Menu', ()=> {
    return kunyahAccessObject.insertVendorMakesMenu(new VendorMakesMenu(999, VendorKateringParahyangan.id, 10, 1000, 8000, null))
        .then(result=>{})
        .catch(err=>{
            expect(err.code).toBe('ER_NO_REFERENCED_ROW_2')
        })
})

test('Retrieval - Retrieve All Menu Items', ()=>{
    return kunyahAccessObject.retrieveMenu(ALL).then(result=>{
        result.forEach(eachItemResult=>{
            expect(typeof eachItemResult._id).not.toBe('undefined')
            expect(typeof eachItemResult._name).not.toBe('undefined')
            expect(typeof eachItemResult._price).not.toBe('undefined')
            expect(typeof eachItemResult._min_order).not.toBe('undefined')
            expect(typeof eachItemResult._max_order).not.toBe('undefined')
        })
    })
})

test('Retrieval - Retrieve All Menu Items with Assigned Vendors', ()=>{
    return kunyahAccessObject.retrieveMenu(ONLY_WITH_VENDORS).then(result=>{
        result.forEach(eachItemResult=>{
            expect(typeof eachItemResult._id).not.toBe('undefined')
            expect(typeof eachItemResult._name).not.toBe('undefined')
            expect(typeof eachItemResult._price).not.toBe('undefined')
            expect(typeof eachItemResult._min_order).not.toBe('undefined')
            expect(typeof eachItemResult._max_order).not.toBe('undefined')
            expect(eachItemResult._min_order).not.toBe(null)
            expect(eachItemResult._max_order).not.toBe(null)
        })
    })
})

test('Retrieval - Retrieve Image Path for Menu Item', ()=>{
    return kunyahAccessObject.getMenuImageName(NasiUdukIstimewa.id).then(result=>{
        expect(typeof result).not.toBe('undefined')
        expect(result.thumbnail_path).toBe(NasiUdukIstimewa.image_path)
    })
})

test('Update - Update Menu Item Sell Price', ()=>{
    return kunyahAccessObject.updateMenuPrice(NasiUdukIstimewa.id, 17500).then(result=>{
        expect(result).toBe(1)
    })
})

test('Update - Update Vendor Sell Price (Buy Price)', ()=>{
    return kunyahAccessObject.updateVendorMakesMenu(new VendorMakesMenu(NasiUdukIstimewa.id, VendorKateringParahyangan.id, 10, 1000, 10000, 1)).then(result=>{
        expect(result).toBe(1)
    })
})

test('Update - Update Order Quantity Margin (Minimum Order / Maximum Order)', ()=>{
    return kunyahAccessObject.updateVendorMakesMenu(new VendorMakesMenu(NasiUdukIstimewa.id, VendorKateringParahyangan.id, 5, 1100, 10000, 1)).then(result=>{
        expect(result).toBe(1)
    })
})

test('Update - Unbind Vendor from Menu Item', ()=>{
    return kunyahAccessObject.unbindVendorMakesMenu(1).then(result=>{
        expect(result).toBe(1)
    })
})

console.log("Order Entry Management")

let BobsOrder = {
    email: BobJohnson.email,
    status: "Product Test Insert",
    order_items: [
            {
                quantity: 50,
                menu_id: NasiUdukIstimewa.id,
                menu_name: NasiUdukIstimewa.name,
                price: NasiUdukIstimewa.price
            }
        ],
    shipping_address_id: 1
}

test('Retrieval - Retrieve All Orders on Single Customer Without Any Order', ()=>{
    return kunyahAccessObject.retrieveAllOrders(BobJohnson.email).then(result=>{
        expect(result.length).toBe(0)
    })
})

test('Insertion - Insert Order Entry', ()=>{
    let total = 0
    BobsOrder.order_items.forEach(item=>{
        item.subtotal = calculateUnitSubtotal(item)
        total += item.subtotal
    })
    BobsOrder.order_total = total
    return kunyahAccessObject.addOrders(BobsOrder.email, BobsOrder.status, JSON.stringify(BobsOrder.order_items), BobsOrder.order_total, BobsOrder.shipping_address_id).then(result=>{
        BobsOrder.id = result
        expect(result).toBeGreaterThan(0)
    })
})

test('Update - Select Confirmed Vendor', ()=>{
    return kunyahAccessObject.modifyOrderItems(BobsOrder.id, BobsOrder.order_items).then(result=>{
        //console.log(result)
        expect(result).not.toBe(null)
    })
})

test('Update - Modify Order Items', ()=>{
    return kunyahAccessObject.modifyOrderItems(BobsOrder.id, BobsOrder.order_items).then(result=>{
        //console.log(result)
        expect(result).not.toBe(null)
    })
})

test('Update - Cancel Order', ()=>{
    return kunyahAccessObject.setOrderStatus(BobsOrder.id, CANCELLED).then(result=>{
        //console.log(result)
        expect(result).toBe(1)
    })
})

test('Update - Change Order Status', ()=>{
    return kunyahAccessObject.setOrderStatus(BobsOrder.id, "Processing Order Testing").then(result=>{
        //console.log(result)
        expect(result).toBe(1)
    })
})

test('Retrieval - Retrieve All Orders', ()=>{
    return kunyahAccessObject.retrieveAllOrders().then(result=>{
        result.forEach(eachResultItem=>{
            expect(typeof eachResultItem.order_id).not.toBe('undefined')
            expect(typeof eachResultItem.order_date).not.toBe('undefined')
            expect(typeof eachResultItem.status).not.toBe('undefined')
            expect(typeof eachResultItem.email).not.toBe('undefined')
            expect(typeof eachResultItem.address).not.toBe('undefined')
            expect(typeof eachResultItem.order_item).not.toBe('undefined')
        })
    })
})

test('Retrieval - Retrieve All Orders on Single Customer', ()=>{
    return kunyahAccessObject.retrieveAllOrders("john@mail.com").then(result=>{
        result.forEach(eachResultItem=>{
            expect(typeof eachResultItem.order_id).not.toBe('undefined')
            expect(typeof eachResultItem.order_date).not.toBe('undefined')
            expect(typeof eachResultItem.status).not.toBe('undefined')
            expect(typeof eachResultItem.email).not.toBe('undefined')
            expect(typeof eachResultItem.address).not.toBe('undefined')
            expect(typeof eachResultItem.order_item).not.toBe('undefined')
        })
    })
})

test('Retrieval - Retrieve Single Order Item with ID', ()=>{
    return kunyahAccessObject.retrieveOneOrder(1).then(result=>{
        expect(typeof result.order_id).not.toBe('undefined')
        expect(typeof result.order_date).not.toBe('undefined')
        expect(typeof result.status).not.toBe('undefined')
        expect(typeof result.email).not.toBe('undefined')
        expect(typeof result.address).not.toBe('undefined')
        expect(typeof result.order_item).not.toBe('undefined')

    })
})

test('Retrieval - Retrieve Non-existent Single Order Item with ID', ()=>{
    return kunyahAccessObject.retrieveOneOrder(999).then(result=>{
        expect(result.length).toBe(0)
    })
})

const BobsPayment = {
    order_id: 1,
    amount: BobsOrder.order_total,
    customer_email: BobJohnson.email,
    payment_date: moment('2020-06-01').format('YYYY-MM-DD'),
    payment_status: "Menunggu Konfirmasi Terima Pembayaran Admin",
    payment_proof: null
}

console.log("Payment Entry Management")

test('Insertion - Insert Payment Entry', ()=>{
    return kunyahAccessObject.insertPayment(new Payment(null, BobsPayment.order_id, BobsOrder.order_total, BobsOrder.email, BobsPayment.payment_date, BobsPayment.payment_status, BobsPayment.payment_proof)).then(result=>{
        BobsPayment.id = result._paymentId
        expect(result._paymentId).toBeGreaterThan(0)
    })
})

test('Insertion - Insert Payment Entry on Non-existent order_id', ()=>{
    return kunyahAccessObject.insertPayment(new Payment(null, 999, BobsOrder.order_total, BobsOrder.email, BobsPayment.payment_date, BobsPayment.payment_status, BobsPayment.payment_proof))
        .then(result=>{})
        .catch(err=>{
            expect(err.code).toBe('ER_NO_REFERENCED_ROW_2')
        })

})

test('Insertion - Post-action Upload Payment Proof', ()=>{
    const filepath = "./images/menu-test-file-path.jpg"
    return kunyahAccessObject.updatePaymentImage(BobsPayment.id, filepath).then(result=>{
        expect(result).toBe(1)
        BobsPayment.payment_proof = filepath
    })
})

test('Retrieval - Retrieve All Payment Entries', ()=>{
    return kunyahAccessObject.retrievePayment().then(result=>{
        result.forEach(eachResultItem=>{
            expect(typeof eachResultItem._paymentId).not.toBe('undefined')
            expect(typeof eachResultItem._orderId).not.toBe('undefined')
            expect(typeof eachResultItem._amount).not.toBe('undefined')
            expect(typeof eachResultItem._customerEmail).not.toBe('undefined')
            expect(typeof eachResultItem._paymentDate).not.toBe('undefined')
            expect(typeof eachResultItem._paymentProofPath).not.toBe('undefined')
        })
    })
})

test('Retrieval - Retrieve Customer Payment Entry', ()=>{
    return kunyahAccessObject.retrievePayment(BobJohnson.email).then(result=>{
        result.forEach(eachResultItem=>{
            expect(typeof eachResultItem._paymentId).not.toBe('undefined')
            expect(typeof eachResultItem._orderId).not.toBe('undefined')
            expect(typeof eachResultItem._amount).not.toBe('undefined')
            expect(typeof eachResultItem._customerEmail).not.toBe('undefined')
            expect(typeof eachResultItem._paymentDate).not.toBe('undefined')
            expect(typeof eachResultItem._paymentProofPath).not.toBe('undefined')
        })
    })
})

test('Retrieval - Retrieve Image Path for Payment Proof', ()=>{
    return kunyahAccessObject.getPaymentImage(BobsPayment.id).then(result=>{
        expect(typeof result).not.toBe(null)
        expect(result.payment_proof_path).toBe(BobsPayment.payment_proof)
    })
})

test('Update - Post-action of Manual Upload Payment Proof', ()=>{
    const filepath = "./images/menu-test-file-path.jpg"
    return kunyahAccessObject.updatePaymentImage(BobsPayment.id, filepath).then(result=>{
        expect(result).toBe(1)
        BobsPayment.payment_proof = filepath
    })
})

test('Update - Flag Payment Invalid', ()=>{
    return kunyahAccessObject.flagPayment(BobsPayment.id, BobsOrder.id, INVALID).then(result=>{
        expect(result).toBe(1)
    })
})

test('Update - Flag Payment Valid', ()=>{
    return kunyahAccessObject.flagPayment(BobsPayment.id, BobsOrder.id, VALID).then(result=>{
        expect(result).toBe(1)
    })
})

test('Update - Flag Payment Validated by Admin', ()=>{
    return kunyahAccessObject.flagPayment(BobsPayment.id, BobsOrder.id, ADMIN_VALIDATED).then(result=>{
        expect(result).toBe(1)
    })
})

test('Update - Flag Payment Invalid for Final', ()=>{
    return kunyahAccessObject.flagPayment(BobsPayment.id, BobsOrder.id, INVALID_FINAL).then(result=>{
        expect(result).toBe(1)
    })
})

// console.log("Vendor – Menu Recommendation Module")
//
// test('Generate Recommendation - No Vendors Within 20km Range', ()=>{
//     const result = findVendorForMenu(BobsOrder.order_items, BobJohnson.address.latitude, BobJohnson.address.longitude, kunyahAccessObject)
//     expect(result).not.toBe(null)
//     console.log(result)
// })
//
// test('Generate Recommendation - Single Vendor Available', ()=>{
//     const result = findVendorForMenu(BobsOrder.order_items, BobJohnson.address.latitude, BobJohnson.address.longitude, kunyahAccessObject)
//     expect(result).not.toBe(null)
//     console.log(result)
// })
//
// test('Generate Recommendation - Multiple Vendors Available', ()=>{
//     return kunyahAccessObject.findVendorForMenu("order_items", "latitude", "longtitude", kunyahAccessObject).then(result=>{
//         //console.log(result)
//         expect(result).not.toBe(null)
//     })
//})

test('Setup AHP', ()=>{
    const ahpMatrix = [
        [1, 9, 5],
        [1/9, 1, 3],
        [1/5, 1/3, 1]
    ]
    const distanceMatrix = [
        [1,3,5,7],
        [1/3, 1, 3, 5],
        [1/5, 1/3, 1, 3],
        [1/7, 1/5, 1/3, 1]
    ]
    const capacityAbilityMatrix = [
        [1, 9],
        [1/9, 1]
    ]

    const sellPriceMatrix = [
        [1, 1/3, 1/5],
        [3, 1, 1/3],
        [5, 3, 1]
    ]
    const ahpResult = updateAHP(ahpMatrix, distanceMatrix, capacityAbilityMatrix, sellPriceMatrix)

    expect(true)
})

test('Run AHP', ()=>{
    const orderItems = [
        {
            "quantity":50,
            "menu_id":1,
            "menu_name":"Nasi Campur Hainam",
            "price":30000,
            "subtotal":1500000,
            "recommended_vendors":[
                {
                    "id":4,
                    "menu_id":1,
                    "vendor_id":2,
                    "min_order":20,
                    "max_order":200,
                    "vendor_price":22000,
                    "isDeleted":0,
                    "vendor_name":"Warung Ivan",
                    "address":"Jl. Ciremai Raya No. 55",
                    "contact_person":"",
                    "email":"ivan@mail.com",
                    "mobile":"081256374857",
                    "latitude":"-6.209717",
                    "longtitude":"106.709332",
                    "isBlocked":"0",
                    "distance":9.876399096346178
                },
                {
                    "id":5,
                    "menu_id":1,
                    "vendor_id":3,
                    "min_order":15,
                    "max_order":300,
                    "vendor_price":22250,
                    "isDeleted":0,
                    "vendor_name":"Dapur Bang Wahyu",
                    "address":"The Prominence Office Tower, Jl. Jalur Sutera Bar. No.15, RT.003/RW.006, Alam, Sutera, Kota Tangerang, Banten 15143",
                    "contact_person":"",
                    "email":"wahyu@gmail.com",
                    "mobile":"081256374857",
                    "latitude":"-6.224706",
                    "longtitude":"106.654559",
                    "isBlocked":"0",
                    "distance":15.962238536704625
                }
            ]
        }]

    const distanceCriteria = [5, 10, 15, 20]
    const capacityCriteria = [1, 0]
    const sellPriceCriteria = [5000, 7500, 10000]


    const ahpResult = runAHP(orderItems[0].recommended_vendors, orderItems[0], distanceCriteria, capacityCriteria, sellPriceCriteria)
})
