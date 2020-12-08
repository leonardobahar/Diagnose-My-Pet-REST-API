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
import {Customer, Product} from "../model";

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
})

app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})