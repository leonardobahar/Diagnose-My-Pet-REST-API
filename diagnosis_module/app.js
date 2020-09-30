import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {Dao} from "./dao";
import {
    ERROR_DUPLICATE_ENTRY,
    ERROR_FOREIGN_KEY,
    SOMETHING_WENT_WRONG,
    WRONG_BODY_FORMAT
} from "../strings";
import {AnimalCategory, AnimalType, Disease, Symptoms, User} from "../model";

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

const PORT = process.env.DIAGNOSIS_PORT
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const dao = new Dao(host, user, password, dbname)


app.get("/api/diagnosis/retrieve-animal-category", (req, res)=>{
    if (typeof req.query.id === 'undefined'){
        // RETRIEVE ALL
        dao.retrieveAnimalCategory().then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }else{
        // RETRIEVE WITH ID
    }
})

app.post("/api/diagnosis/add-animal-category", (req, res)=>{
    if (typeof req.body.category_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const category = new AnimalCategory(null, req.body.category_name.toUpperCase())

        dao.registerAnimalCategory(category).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(200).send({
                    success: false,
                    message: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
                res.status(500).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.get("/api/diagnosis/retrieve-animal-type", (req, res)=>{
    dao.retrieveAnimalType().then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/diagnosis/add-animal-type", (req, res)=>{
    if (typeof req.body.category_id === 'undefined' ||
        typeof req.body.animal_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const animal = new AnimalType(null,
            req.body.animal_name,
            new AnimalCategory(req.body.category_id, null))

        dao.registerAnimalType(animal).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(200).send({
                    success: false,
                    message: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
                res.status(500).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.get("/api/diagnosis/retrieve-disease", (req, res)=>{
    dao.retrieveDisease().then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/diagnosis/add-disease", (req, res)=>{
    if (typeof req.body.disease_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const disease = new Disease(null,
            req.body.disease_name)

        dao.registerDisease(disease).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(200).send({
                    success: false,
                    message: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
                res.status(500).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.get("/api/diagnosis/retrieve-symptom", (req, res)=>{
    dao.retrieveSymptom().then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/diagnosis/add-symptom", (req, res)=>{
    if (typeof req.body.symptom_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const symptom = new Symptoms(null,
            req.body.symptom_name)

        dao.registerSymptom(symptom).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(200).send({
                    success: false,
                    message: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
                res.status(500).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/diagnosis/bind-symptom-to-disease", (req, res)=>{
    if (typeof req.body.symptom_id === 'undefined' ||
        typeof req.body.disease_id === 'undefined' ||
        typeof req.body.animal_id === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindSymptomToDisease(new Symptoms(req.body.symptom_id), new Disease(req.body.disease_id), new AnimalType(req.body.animal_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY) {
            res.status(500).send({
                success: false,
                message: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(500).send({
                success: false,
                result: ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.get("/api/diagnosis/retrieve-symptoms-of-disease", (req, res)=>{
    if (typeof req.query.disease_id === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveSymptomsForDisease(new Disease(req.query.disease_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/diagnose-this", (req, res)=>{
    if (typeof req.body.symptoms === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.diagnoseSymptoms(req.body.symptoms).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY) {
            res.status(500).send({
                success: false,
                message: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(500).send({
                success: false,
                result: ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        }
    })
})

// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})
