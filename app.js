import moment from 'moment';
import https from 'https';
import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {authenticateTokenAccessControl} from './util/jwt';
import {KunyahAccessObj} from "./dao";
import {Menu, Vendor, VendorMakesMenu, Payment} from "./model";
import {
    ADMIN_VALIDATED,
    ALL,
    ERROR_FOREIGN_KEY, INVALID, INVALID_FINAL,
    NO_AFFECTED_ROWS,
    NO_SUCH_CONTENT,
    NO_VENDORS_AVAILABLE, ONLY_WITH_VENDORS,
    SOMETHING_WENT_WRONG, VALID,
    WRONG_BODY_FORMAT
} from "./strings";
import findVendorForMenu from "./util/find-vendors";

// Image handling
import multer from "multer";
import path from 'path';
import {calculateUnitSubtotal} from "./util/OrderCalculations";

dotenv.config();

const app = express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json())

// ALLOW ACCESS CONTROL ALLOW ORIGIN
app.use(cors())
app.use((err, req, res, next)=>{
    if (err){
        if (err.type === 'entity.parse.failed') {
            res.status(406).send({
                success: false,
                message: 'WRONG-JSON-FORMAT'
            })
        }else{
            res.status(400).send({
                success: false,
                message: 'CHECK-SERVER-LOG'
            })
            console.error(err)
        }
    }
});
const PORT = process.env.PORT
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const kunyahAccessObject = new KunyahAccessObj(host, user, password, dbname)

// Customer
app.post("/api/login", async(req, res)=>{
    if (typeof req.body.email === 'undefined' ||
        typeof req.body.password === 'undefined' ) {
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
    }else {
        kunyahAccessObject.verifyCustomer(req.body.email, req.body.password).then(result => {
            if (result!==0) {
                res.status(200).send({
                    success: true,
                    approved: true,
                    message: result
                })
            } else {
                res.status(200).send({
                    success: true,
                    approved: false
                })
            }
        }).catch(err => {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        })
    }
})

app.post("/api/register-customer", async(req, res)=>{
    if (typeof req.body.email === 'undefined' ||
        typeof req.body.password === 'undefined' ||
        typeof req.body.fullname === 'undefined' ||
        typeof req.body.mobile === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    kunyahAccessObject.addCustomer(req.body.email, req.body.password, req.body.fullname, req.body.mobile).then(result => {
        res.status(200).send({
            success: true,
            message: {
                id: result
            }
        })
    }).catch(err => {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(200).send({
                success: false,
                message: 'DUPLICATE-ENTRY'
            })
            res.end()
        } else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        }
    })

})

app.post("/api/add-customer-address", async(req, res)=>{
    if (typeof req.body.customer_id === 'undefined' ||
        typeof req.body.address === 'undefined' ||
        typeof req.body.longtitude === 'undefined' ||
        typeof req.body.latitude === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    kunyahAccessObject.addCustomerAddress(req.body.address, req.body.latitude, req.body.longtitude, req.body.customer_id).then(result=>{
        res.status(200).send({
            success: true,
            message: 'Success'
        })
        res.end()
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
        res.end()
    })

})

app.get("/api/retrieve-customer-addresses", async(req, res)=>{
    if ( typeof req.query.customer_id === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }

    kunyahAccessObject.retreiveCustomerAddresssByCustomerId(req.query.customer_id).then(result=>{
        if (result.length === 0){
            res.status(204).send()
        }else{
            res.status(200).send({
                success: true,
                message: result

            })
        }
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/retrieve-customer", (req, res)=>{
    if (typeof req.query.customer_id !== 'undefined'){
        if (typeof req.query.criteria === 'undefined'){
            res.status(400).send({
                success: false,
                message: WRONG_BODY_FORMAT
            })
            res.end()
            return
        }

        if (req.query.criteria === 'SHORT'){
            kunyahAccessObject.retrieveShortCustomerDataById(req.query.customer_id).then(result=>{
                res.status(200).send({
                    success: true,
                    message: result
                })
            }).catch(err=>{
                if (err===NO_SUCH_CONTENT){
                    res.status(204).send()
                }else{
                    console.error(err)
                    res.status(400).send({
                        success: false,
                        message: SOMETHING_WENT_WRONG
                    })
                }
            })
        }else if (req.query.criteria === 'COMPLETE'){
            kunyahAccessObject.retrieveCompleteCustomerDataById(req.query.customer_id).then(result=>{
                res.status(200).send({
                    success: true,
                    message: result
                })
            }).catch(err=>{
                if (err===NO_SUCH_CONTENT){
                    res.status(204).send()
                }else{
                    console.error(err)
                    res.status(400).send({
                        success: false,
                        message: SOMETHING_WENT_WRONG
                    })
                }
            })
        }else{
            res.status(400).send({
                success: false,
                message: "Please re-consult API manual for usage on criteria"
            })
            res.end()
            return
        }
    }else if (typeof req.query.customer_email !== 'undefined') {
        if (typeof req.query.criteria === 'undefined'){
            res.status(400).send({
                success: false,
                message: WRONG_BODY_FORMAT
            })
            res.end()
            return
        }

        if (req.query.criteria === 'SHORT'){
            kunyahAccessObject.retrieveShortCustomerDataByEmail(req.query.customer_email).then(result=>{
                res.status(200).send({
                    success: true,
                    message: result
                })
            }).catch(err=>{
                if (err===NO_SUCH_CONTENT){
                    res.status(204).send()
                }else{
                    console.error(err)
                    res.status(400).send({
                        success: false,
                        message: SOMETHING_WENT_WRONG
                    })
                }
            })
        }else if (req.query.criteria === 'COMPLETE'){
            kunyahAccessObject.retrieveCompleteCustomerDataByEmail(req.query.customer_email).then(result=>{
                res.status(200).send({
                    success: true,
                    message: result
                })
            }).catch(err=>{
                if (err===NO_SUCH_CONTENT){
                    res.status(204).send()
                }else{
                    console.error(err)
                    res.status(400).send({
                        success: false,
                        message: SOMETHING_WENT_WRONG
                    })
                }
            })
        }else{
            res.status(400).send({
                success: false,
                message: "Please re-consult API manual for usage on criteria"
            })
            res.end()
            return
        }
    }else{
        kunyahAccessObject.retrieveAllCustomers().then(result=>{
            res.status(200).send({
                success: true,
                message: result
            })
        }).catch(err=>{
            if (err === NO_SUCH_CONTENT){
                res.status(204).send()
            }else{
                console.error(err)
                res.status(400).send({
                    success: false,
                    message: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/delete-customer-address", async(req, res)=>{
    if (typeof req.body.customer_address_id === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    kunyahAccessObject.flagCustomerAddressDeleted(req.body.customer_address_id).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/update-customer-info", async(req, res)=>{
    if (typeof req.body.email === 'undefined' ||
        typeof req.body.password === 'undefined' ||
        typeof req.body.fullname === 'undefined' ||
        typeof req.body.mobile === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    if ( req.body.email === '' || req.body.email === null ||
         req.body.password === '' || req.body.password === null ||
         req.body.fullname === '' || req.body.fullname === null ||
         req.body.mobile === '' || req.body.mobile === null){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    kunyahAccessObject.updateCustomer(req.body.email, req.body.password, req.body.fullname, req.body.mobile).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        if (err === NO_SUCH_CONTENT){
            res.status(304).send({
                success: false
            })
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
        }
    })
})

// Menu
app.get("/admin-api/retrieve-menu", async(req, res)=>{
    kunyahAccessObject.retrieveMenu(ALL).then(result=>{
        if (result===0){
            res.status(204).send({
                success: true,
                message: 'NO-CONTENT'
            })
        }else{
            res.status(200).send({
                success: true,
                message: result
            })
        }
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/retrieve-menu", async(req, res)=>{
    kunyahAccessObject.retrieveMenu(ONLY_WITH_VENDORS).then(result=>{
        if (result===0){
            res.status(204).send({
                success: true,
                message: 'NO-CONTENT'
            })
        }else{
            res.status(200).send({
                success: true,
                message: result
            })
        }
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/admin-api/update-menu-price", async(req, res)=>{
    if (typeof req.body.menu_id === "undefined" ||
        typeof req.body.price === "undefined"){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    kunyahAccessObject.updateMenuPrice(req.body.menu_id, req.body.price).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        if (err === NO_SUCH_CONTENT){
            res.status(304).send({
                success: false
            })
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/admin-api/add-menu", async(req, res)=>{
    if (JSON.stringify(req.body)==="{}"){
        res.status(400).send({
            success: false,
            message: 'SHOULD-DEFINE-VENDOR-DETAILS-TO-ADD'
        })
        res.end()
    } else if ( typeof req.body.name === 'undefined' ||
        typeof req.body.price === 'undefined') {
        res.status(400).send({
            success: false,
            message: 'SHOULD-DEFINE-PRICE-TO-ADD'
        })
        res.end()
    }else {
        const newMenu = new Menu(null, req.body.name, req.body.price)
        kunyahAccessObject.insertMenu(newMenu).then(result => {
            res.status(200).send({
                success: true,
                message: result
            })
        }).catch(err => {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(200).send({
                    success: false,
                    message: 'DUPLICATE-ENTRY'
                })
                res.end()
            } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                res.status(400).send({
                    success: false,
                    message: 'Vendor does not exist'
                })
            }else{
                console.error(err)
                res.status(400).send({
                    success: false,
                    message: SOMETHING_WENT_WRONG
                })
                res.end()
            }
        })
    }
})


app.post("/api/insert-vendor-makes-menu", async(req, res)=>{
    if (typeof req.body.vendor_id === "undefined" ||
        typeof req.body.menu_id === "undefined" ||
        typeof req.body.min_order === "undefined" ||
        typeof req.body.max_order === "undefined" ||
        typeof req.body.vendor_price === "undefined"){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }

    kunyahAccessObject.insertVendorMakesMenu(new VendorMakesMenu(req.body.menu_id, req.body.vendor_id, req.body.min_order, req.body.max_order, req.body.vendor_price)).then(result=>{
        res.status(200).send({
            success: true,
            message: result
        })
    }).catch(err=>{
        if (err.errno === 1452){
            res.status(200).send({
                success: false,
                message: ERROR_FOREIGN_KEY
            })
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/admin-api/update-vendor-makes-menu", async(req, res)=> {
    if (typeof req.body.vendor_makes_menu_id === "undefined" ||
        typeof req.body.vendor_id === "undefined" ||
        typeof req.body.menu_id === "undefined" ||
        typeof req.body.min_order === "undefined" ||
        typeof req.body.max_order === "undefined" ||
        typeof req.body.vendor_price === "undefined") {
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }

    kunyahAccessObject.updateVendorMakesMenu(new VendorMakesMenu(req.body.menu_id, req.body.vendor_id, req.body.min_order, req.body.max_order, req.body.vendor_price, req.body.vendor_makes_menu_id)).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        if (err === NO_SUCH_CONTENT){
            res.status(304).send({
                success: false
            })
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/admin-api/unbind-vendor-from-menu", async(req, res)=>{
    if (typeof req.body.vendor_makes_menu_id === "undefined" ) {
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }

    kunyahAccessObject.unbindVendorMakesMenu(req.body.vendor_makes_menu_id).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=> {
        if (err === NO_SUCH_CONTENT){
            res.status(304).send({
                success: false
            })
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
        }
    })
})

// Order
app.post("/api/add-order", async(req, res)=>{
    if ( typeof req.body.customer_email === 'undefined' ||
        typeof req.body.order_items === 'undefined' ||
        typeof req.body.shipping_address_id === 'undefined') {
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }else{
        try {
            req.body.order_items = typeof req.body.order_items !== 'object' ? JSON.parse(req.body.order_items) : req.body.order_items
            let total = 0
            // Validate order_items and calculate price
            req.body.order_items.forEach(item=>{
                if (typeof item.quantity === 'undefined' ||
                    typeof item.price === 'undefined' ||
                    typeof item.menu_id === 'undefined' ||
                    typeof item.menu_name === 'undefined'){
                    res.status( ).send({
                        success: false,
                        message: WRONG_BODY_FORMAT
                    })
                    res.end()
                    return
                }else{
                    item.subtotal = calculateUnitSubtotal(item)
                    total += item.subtotal
                }
            })
            req.body.order_total = total
        // Try block for json syntax error exception
            let customerAddressInfo = await kunyahAccessObject.retrieveCustomerAddressById(req.body.shipping_address_id).catch(err=>{
                if (err === NO_SUCH_CONTENT){
                    res.status(400).send({
                        status: false,
                        message: "No such shipping address"
                    })
                    return
                }else {
                    console.error(err)
                    res.status(500).send({
                        success: false,
                        message: SOMETHING_WENT_WRONG
                    })
                    return
                }
            })
            req.body.order_items = await findVendorForMenu(req.body.order_items, customerAddressInfo.latitude, customerAddressInfo.longtitude, kunyahAccessObject).catch(err=>{
                if (err === NO_VENDORS_AVAILABLE){
                    res.status(200).send({
                        success: false,
                        message: NO_VENDORS_AVAILABLE
                    })
                    res.end()
                    return
                }else {
                    console.error(err)
                    res.status(500).send({
                        success: false,
                        message: SOMETHING_WENT_WRONG + " Error part: Vendor Menu Search Alg."
                    })
                    res.end()
                }
            })
            if (typeof req.body.order_items === "undefined"){ return }
            let orderItemsBody = typeof req.body.order_items === 'object' ? JSON.stringify(req.body.order_items) : JSON.stringify(JSON.parse(req.body.order_items))
            kunyahAccessObject.addOrders(req.body.customer_email, "Belum Dibayar", orderItemsBody, req.body.order_total, req.body.shipping_address_id).then(response=>{
                res.status(200).send({
                    success: true
                })
                res.end()
            }).catch(err=>{
                console.error(err)
                res.status(500).send({
                    success: false,
                    message: SOMETHING_WENT_WRONG+" JSON Parse Error"
                })
                res.end()
            })
            //res.status(304).send()
        }catch(err){
            if (err===NO_VENDORS_AVAILABLE){
                res.status(200).send({
                    success: false,
                    message: NO_VENDORS_AVAILABLE
                })
                res.end()
            }else {
                console.error(err)
                res.status(500).send({
                    success: false,
                    message: SOMETHING_WENT_WRONG
                })
                res.end()
                return
            }
        }
    }
})

app.post("/api/modify-order-item", async(req, res)=>{
    if ( typeof req.body.order_id === 'undefined' ||
        typeof req.body.order_items === 'undefined') {
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
    }else{
        try {
            let orderItemsBody = JSON.stringify(JSON.parse(req.body.order_items))
            kunyahAccessObject.modifyOrderItems(req.body.order_id, orderItemsBody).then(response => {
                res.status(200).send({
                    success: true
                })
                res.end()
            }).catch(err => {
                if (err === NO_AFFECTED_ROWS) {
                    res.status(400).send({
                        success: false,
                        message: NO_AFFECTED_ROWS
                    })
                } else {
                    console.error(err)
                    res.status(400).send({
                        success: false,
                        message: SOMETHING_WENT_WRONG
                    })
                    res.end()
                }
            })
        }catch(err){
            if (err instanceof SyntaxError) {
                res.status(400).send({
                    success: false,
                    message: 'INVALID-JSON'
                })
                res.end()
            } else {
                console.error(err)
                res.status(400).send({
                    success: false,
                    message: SOMETHING_WENT_WRONG
                })
                res.end()
            }
            return
        }
    }
})

app.post("/api/cancel-order", async(req, res)=>{
    if (typeof req.body.order_id === 'undefined'){
        res.status(400).send({
            success: false,
            message: 'Request does not contain required order_id'
        })
        res.end()
        return
    }

    kunyahAccessObject.setOrderStatusCancelled(req.body.order_id).then(result=>{
       res.status(200).send({
           success: true
       })
       res.end
    }).catch(err=>{
        if (err === NO_AFFECTED_ROWS){
            res.status(400).send({
                success: false,
                message: NO_AFFECTED_ROWS
            })
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        }
    })
})

app.get("/admin-api/fetch-orders", async(req,res)=> {
    kunyahAccessObject.retrieveAllOrders().then(result => {
        if (result.length === 0) {
            res.status(204).send()
        } else {
            res.status(200).send({
                success: true,
                length: result.length,
                result: result
            })
        }
    }).catch(err => {
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
        res.end()
    })
})

app.get("/api/fetch-orders", async(req,res)=>{
    if (typeof req.query.email === 'undefined' && typeof req.query.order_id === 'undefined'){
        res.status(400).send({
            success: 'false',
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    if (typeof req.query.email !== "undefined") {
        kunyahAccessObject.retrieveAllOrders(req.query.email).then(result => {
            if (result.length === 0) {
                res.status(204).send()
            } else {
                res.status(200).send({
                    success: true,
                    length: result.length,
                    result: result
                })
            }
        }).catch(err => {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        })
    }else{
        kunyahAccessObject.retrieveOneOrder(req.query.order_id).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
            res.end()
        }).catch(err=>{
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        })
    }
})

// DISABLE BELOW!
console.warn("DISABLE FETCH-ORDER REDUNDANT FUNCTION")
app.get("/api/fetch-order", (req, res)=>{
    if (typeof req.query.order_id==='undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
    } else{
        kunyahAccessObject.retrieveOneOrder(req.query.order_id).then(result=>{
            res.status(200).send({
                success: true,
                message: result
            })
            res.end()
        }).catch(err=>{
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        })
    }
})

// Vendor
app.get("/api/retrieve-vendors", async(req, res)=>{
    if (typeof req.query.id !== 'undefined'){
        // Fetch one vendor details
        kunyahAccessObject.retrieveVendors(req.query.id).then(result=>{
            res.status(200).send({
                success: true,
                message: result
            })
            res.end()
        }).catch(err=>{
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        })
    }else{
        // Fetch all vendors
        kunyahAccessObject.retrieveVendors().then(result=>{
            res.status(200).send({
                success: true,
                message: result
            })
            res.end()
        }).catch(err=>{
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        })
    }
})

app.post("/api/add-vendor", async(req, res)=>{
    if ( typeof req.body.name === 'undefined' ||
                typeof req.body.address === 'undefined' ||
                typeof req.body.mobile === 'undefined' ||
                typeof req.body.email === 'undefined' ||
                typeof req.body.contact_person === 'undefined' ||
                typeof req.body.longitude === 'undefined' ||
                typeof req.body.latitude === 'undefined') {
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    const newVendor = new Vendor(null, req.body.name, req.body.address, req.body.contact_person, req.body.email, req.body.mobile, req.body.longitude, req.body.latitude)
    kunyahAccessObject.addVendor(newVendor).then(result=>{
        res.status(200).send({
            success: true,
            message: result
        })
    }).catch(err=>{
        if (err.code==='ER_DUP_ENTRY'){
            res.status(200).send({
                success: false,
                message: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
            res.end()
        }
    })

})

app.post("/api/block-vendor", (req, res)=>{
    if (typeof req.body.vendor_id === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    kunyahAccessObject.blockVendor(req.body.vendor_id).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=> {
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
        res.end()
    })
})

app.post("/api/update-vendor-info", (req, res)=>{
    if (typeof req.body.vendor_id === 'undefined' ||
        typeof req.body.name === 'undefined' ||
        typeof req.body.address === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.longitude === 'undefined' ||
        typeof req.body.latitude === 'undefined') {
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
        return
    }

    kunyahAccessObject.updateVendor(req.body.vendor_id, req.body.name, req.body.address, req.body.email, req.body.longitude, req.body.latitude).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false,
            message: SOMETHING_WENT_WRONG
        })
        res.end()
    })
})

// PAYMENT
app.post("/api/add-payment", async(req, res)=>{
    if (typeof req.body.order_id === 'undefined' ||
        typeof req.body.customer_email === 'undefined' ||
        typeof req.body.payment_method === 'undefined' ||
        typeof req.body.payment_date === 'undefined' ||
        typeof req.body.amount === 'undefined' ){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        res.end()
    }else{
        const payment = new Payment(null, req.body.order_id, req.body.amount, req.body.customer_email, moment(req.body.payment_date).format('YYYY-MM-DD'), "Menunggu Konfirmasi Terima Pembayaran Admin", null)
        kunyahAccessObject.insertPayment(payment).then(result=>{
            res.status(200).send({
                success: true,
                message: result
            })
        }).catch(err=>{
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.get("/api/retrieve-payments", (req, res)=>{
    if (typeof req.query.email === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }

    kunyahAccessObject.retrievePayment(req.query.customer_email).then(result=>{
        if (result.length === 0){
            res.status(204).send()
        }else{
            res.status(200).send({
                success: true,
                message: result
            })
        }
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: true,
            message: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/admin-api/retrieve-payments", async(req, res)=>{
    kunyahAccessObject.retrievePayment().then(result=>{
        if (result.length === 0){
            res.status(204).send()
        }else{
            res.status(200).send({
                success: true,
                message: result
            })
        }
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: true,
            message: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/admin-api/flag-payment", async(req, res)=>{
    if (typeof req.body.payment_id === 'undefined' ||
        typeof req.body.order_id === 'undefined' ||
        typeof req.body.flag === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }else if (req.body.flag !=='ADMIN_VALIDATED' && req.body.flag !== 'VALID' && req.body.flag !== 'INVALID_FINAL' && req.body.flag !== 'INVALID'){
        console.log(req.body.flag)
        res.status(400).send({
            success: false,
            message: "BEE"
        })
        return
    }

    let flag = ""
    switch(req.body.flag){
        case 'VALID': flag = VALID; break;
        case 'INVALID_FINAL' : flag = INVALID_FINAL; break;
        case 'INVALID' : flag = INVALID; break;
        case 'ADMIN_VALIDATED' : flag = ADMIN_VALIDATED; break;
        default: return
    }

    kunyahAccessObject.flagPayment(flag).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        if (err === NO_SUCH_CONTENT){
            res.status(304).send({
                success: false
            })
        }else {
            console.error(err)
            res.status(400).send({
                success: false,
                message: SOMETHING_WENT_WRONG
            })
        }
    })
})

// IMAGE HANDLING
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'images/');
    },

    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

app.get("/image-api/menu-image", async(req, res)=>{
    const menuId = req.query.menu_id
    console.log(menuId+" received")
    kunyahAccessObject.getMenuImageName(menuId).then(response=>{
        if (response.thumbnail_path==null){
            res.sendFile(__dirname+"/images/no-image-thumbnail.png")
        }else{
            res.sendFile(__dirname+"/images/"+response.thumbnail_path)
        }

    })
})

app.get("/image-api/payment-image", async(req, res)=>{
    if (typeof req.query.payment_id === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }

    const paymentId = req.query.payment_id
    console.log(paymentId+" received")
    kunyahAccessObject.getPaymentImage(paymentId).then(response=>{
        if (response.payment_proof_path==null){
            res.sendFile(__dirname+"/images/no-image-thumbnail.png")
        }else{
            res.sendFile(__dirname+"/images/"+response.payment_proof_path)
        }

    })
})


const imageFilter = function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

app.post('/image-api/add-menu-image', async(req, res)=>{
    const upload = multer({ storage: storage, fileFilter: imageFilter }).single('menu_image')
    if (typeof req.query.menu_id === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }
    const menuId = req.query.menu_id
    console.log("Menu_id : "+menuId)
    upload(req, res, async (err)=>{
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        }
        else if (!req.file) {
            return res.status(400).send({
                success: false,
                message: WRONG_BODY_FORMAT
            });
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }

        console.log(req.file)
        kunyahAccessObject.updateMenuImage(menuId, req.file.filename).then(result=>{
            res.status(200).send({
                success: true,
                message: `File name: ${req.file.filename}`
            })
        }).catch(err=>{
            res.status(400).send({
                success: false,
                message: err
            })
        })

    });
})

app.post("/image-api/add-payment-image", async(req, res)=>{
    const upload = multer({ storage: storage, fileFilter: imageFilter }).single('payment_proof');
    if (typeof req.query.payment_id === 'undefined'){
        res.status(400).send({
            success: false,
            message: WRONG_BODY_FORMAT
        })
        return
    }
    const paymentId = req.query.payment_id
    console.log("Received payment_id : "+paymentId)
    upload(req, res, (err)=>{
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        }
        else if (!req.file) {
            return res.send('Please select an image to upload');
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }

        console.log(req.file)
        kunyahAccessObject.updatePaymentImage(paymentId, req.file.filename).then(result=>{
            res.status(200).send({
                success: true,
                message: `File name: ${req.file.filename}`
            })
        }).catch(err=>{
            res.status(400).send({
                success: false,
                message: err
            })
        })
    });
})

// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(8088, ()=>{
    console.info(`Server serving port 8088`)
})


// LISTEN SERVER HTTPS
const ssl = {
    key: fs.readFileSync("ssl/kunyahprivkey.pem"),
    cert: fs.readFileSync("ssl/kunyahcert.pem")
}

https.createServer(ssl, app).listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})
