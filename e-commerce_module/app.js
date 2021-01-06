import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import jsonwebtoken from 'jsonwebtoken';
import {Dao} from "./dao";
import {
    ERROR_DUPLICATE_ENTRY,
    ERROR_FOREIGN_KEY,
    SOMETHING_WENT_WRONG,
    WRONG_BODY_FORMAT,
    NO_SUCH_CONTENT
} from "../strings";
import {Customer, Payment, Product, Shipment, Transaction, Transaction_detail} from "../model";

dotenv.config();

const app = express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json())

// ALLOW ACCESS CONTROL ORIGIN
app.use(cors())
app.use((err, req, res, next)=>{
    if (err){
        if (err.type === 'entity.parse.failed') {
            res.status(406).send({
                success: false,
                error: 'WRONG-JSON-FORMAT'
            })
        }else{
            res.status(400).send({
                success: false,
                error: 'CHECK-SERVER-LOG'
            })
            console.error(err)
        }
    }
});

const PORT = process.env.ECOMMERCE_PORT
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const dao = new Dao(host, user, password, dbname)

app.get("/api/ecommerce/retrieve-customer",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrieveCustomer().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else{
        const customer=new Customer(req.query.id,null,null,null)

        dao.retreiveOneCustomer(customer).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/ecommerce/add-customer", (req,res)=>{
    if(typeof req.body.customer_name==='undefined' ||
        typeof req.body.address==='undefined' ||
        typeof req.body.phone_number==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const customer=new Customer(null,req.body.customer_name,req.body.address,req.body.phone_number)
    dao.addCustomer(customer).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/update-customer",(req,res)=>{
    if(typeof req.body.customer_name==='undefined' ||
        typeof req.body.address==='undefined' ||
        typeof req.body.phone_number==='undefined' ||
        typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const customer=new Customer(req.body.id,req.body.customer_name,req.body.address,req.body.phone_number)
    dao.retreiveOneCustomer(new Customer(req.body.id)).then(result=>{
        dao.updateCustomer(customer).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }

        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/ecommerce/delete-customer",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const customer=new Customer(req.query.id,null,null,null)
    dao.retreiveOneCustomer(new Customer(req.query.id)).then(result=>{
        dao.deleteCustomer(customer).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                result:result
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            result:result
        })
    })
})

app.get("/api/ecommerce/retrieve-product",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrieveProduct().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }

            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else{
        dao.retrieveOneProduct(new Product(req.query.id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }

            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/ecommerce/add-product",(req,res)=>{
    if(typeof req.body.product_name==='undefined' ||
       typeof req.body.price==='undefined' ||
       typeof req.body.quantity==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const product=new Product(null,req.body.product_name,req.body.price,req.body.quantity)
    dao.addProduct(product).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/update-product", (req,res)=>{
    if(typeof req.body.product_name==='undefined' ||
       typeof req.body.price==='undefined' ||
       typeof req.body.quantity==='undefined' ||
       typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const product=new Product(req.body.id,req.body.product_name,req.body.price,req.body.quantity)
    dao.retrieveOneProduct(new Product(req.body.id)).then(result=>{
        dao.updateProduct(product).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/ecommerce/delete-product",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }
    dao.retrieveOneProduct(new Product(req.query.id)).then(result=>{
        dao.deleteProduct(new Product(req.query.id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/ecommerce/retrieve-transaction",(req,res)=>{
    if(typeof req.query.customer_id==='undefined'){
        dao.retrieveTransaction().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:true,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else{
        const transaction=new Transaction(null,null,null,null,req.query.customer_id,null,null)
        dao.retrieveOneTransactionByCustomerId(transaction).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:true,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/ecommerce/add-transaction",(req,res)=>{
    if(typeof req.body.price==='undefined' ||
       typeof req.body.customer_id==='undefined' ||
       typeof req.body.quantity==='undefined' ||
       typeof req.body.product_id==='undefined' ||
       typeof req.body.shipment_method==='undefined' ||
       typeof req.body.shipment_price==='undefined' ||
       typeof req.body.address==='undefined' ||
       typeof req.body.receiver_name==='undefined' ||
       typeof req.body.payment_method==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.addTransaction(new Transaction(null,null,req.body.price,null,req.body.customer_id,null,null)).then(result=>{
        const transactionId=result.transaction_id
        dao.addTransactionDetail(new Transaction_detail(null,req.body.quantity,req.body.product_id,transactionId)).then(result=>{
            dao.addShipment(new Shipment(null,req.body.shipment_method,req.body.shipment_price,null,req.body.address,req.body.receiver_name,transactionId)).then(result=>{
                const shipmentId=result.shipment_id
                dao.addPayment(new Payment(null,req.body.payment_method,null,null,transactionId)).then(result=>{
                    const paymentId=result.payment_id
                    dao.addTransactionShipmentNPaymentId(shipmentId,paymentId,transactionId).then(result=>{
                        res.status(200).send({
                            success:true,
                            result:result
                        })
                    }).catch(error=>{
                        console.error(error)
                        res.status(500).send({
                            success:false,
                            error:SOMETHING_WENT_WRONG
                        })
                    })
                }).catch(error=>{
                    console.error(error)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                })
            }).catch(error=>{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        console.error(error)
        res.status(500).send({
          success:false,
          error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/approve-transaction",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneTransaction(req.body.id).then(result=>{
        dao.approveTransaction(new Transaction(req.body.id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/decline-transaction",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneTransaction(req.body.id).then(result=>{
        dao.declineTransaction(new Transaction(req.body.id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/ecommerce/delete-transaction",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneTransaction(new Transaction(req.query.id)).then(result=>{

    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })

    dao.deleteTransaction(new Transaction(req.query.id)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/ecommerce/retrieve-shipment",(req,res)=>{
    if(typeof req.query.transaction_id==='undefined'){
        dao.retrieveShipment().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else{
        dao.retrieveOneShipment(req.query.transaction_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/ecommerce/add-shipment",(req,res)=>{
    if(typeof req.body.shipment_method==='undefined' ||
       typeof req.body.shipment_price==='undefined' ||
       typeof req.body.shipment_address==='undefined' ||
       typeof req.body.receiver_name==='undefined' ||
       typeof req.body.transaction_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneTransaction(req.body.transaction_id).then(result=>{
        dao.addShipment(new Shipment(null,req.body.shipment_method,req.body.shipment_price,null,req.body.shipment_address,req.body.receiver_name,req.body.transaction_id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/update-shipment",(req,res)=>{
    if(typeof req.body.shipment_id==='undefined' ||
        typeof req.body.shipment_method==='undefined' ||
        typeof req.body.shipment_price==='undefined' ||
        typeof req.body.shipment_address==='undefined' ||
        typeof req.body.receiver_name==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneShipmentByShipmentID(new Shipment(req.body.shipment_id)).then(result=>{
        console.log('test')
        dao.updateShipment(new Shipment(req.body.shipment_id,req.body.shipment_method,req.body.shipment_price,null,req.body.shipment_address,req.body.receiver_name,null)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }

        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/ecommerce/delete-shipment",(req,res)=>{
    if(typeof req.query.shipment_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneShipmentByShipmentID(new Shipment(req.query.shipment_id)).then(result=>{
        dao.deleteShipment(new Shipment(req.query.shipment_id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }

        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/ecommerce/retrieve-payment",(req,res)=>{
    if(typeof req.query.id_transaction==='undefined'){
        dao.retrievePayment().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
        return
    }

    dao.retrieveOnePayment(req.query.id_transaction).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }

        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/add-payment",(req,res)=>{
    if(typeof req.body.payment_method==='undefined' ||
       typeof req.body.id_transaction==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneTransaction(req.body.id_transaction).then(result=>{
        dao.addPayment(new Payment(null,req.body.payment_method,null,null,req.body.id_transaction)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/update-payment",(req,res)=>{
    if(typeof req.body.id_payment==='undefined' ||
        typeof req.body.payment_method==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOnePaymentByPaymentId(new Payment(req.body.id_payment)).then(result=>{
        dao.updatePayment(new Payment(req.body.id_payment,req.body.payment_method,null,null,null)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }

        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/approve-payment",(req,res)=>{
    if(typeof req.body.payment_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOnePaymentByPaymentId(new Payment(req.body.payment_id)).then(result=>{
        dao.approvePayment(new Payment(req.body.payment_id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/ecommerce/decline-payment",(req,res)=>{
    if(typeof req.body.payment_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOnePaymentByPaymentId(new Payment(req.body.payment_id)).then(result=>{
        dao.declinePayment(new Payment(req.body.payment_id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete('/api/ecommerce/delete-payment',(req,res)=>{
    if(typeof req.query.payment_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOnePaymentByPaymentId(new Payment(req.query.payment_id)).then(result=>{

    })
})

app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})