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
import {AnimalCategory, AnimalType, Disease, Medicine, Patient, Symptoms, User} from "../model";

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

app.post("/api/diagnosis/update-animal-category",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    }

    else{
        const category=new AnimalCategory(req.body.id,req.body.category_name.toUpperCase())

        dao.updateAnimalCategory(category).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(200).send({
                    success:false,
                    message:'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
            }
        })
    }
})

app.delete("/api/diagnosis/delete-animal-category", (req,res)=>{
    if(typeof req.body.id === 'undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    }
    else {
        const category=new AnimalCategory(req.body.id,null)

        dao.deleteAnimalCategory(category).then(result=>{
            res.status(200).send({
                success:true
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
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
                res.status(400).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/diagnosis/update-animal-type",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    }

    else{
        const animal=new AnimalType(req.body.id,req.body.category_name.toUpperCase())

        dao.updateAnimalType(animal).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(200).send({
                    success:false,
                    message:'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
            }
        })
    }
})

app.delete("/api/diagnosis/delete-animal-type", (req,res)=>{
    if(typeof req.body.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    }
    else {
        const animalType=new AnimalType(req.body.id,null,null)
        dao.deleteAnimalType(animalType).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='SOMETHING_WENT_WRONG'){
                console.log(err)
                res.status(400).send({
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
        res.status(400).send({
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
            req.body.disease_name.toUpperCase())

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

app.post("/api/diagnosis/update-disease",(req,res)=>{

    if(typeof req.body.id==='undefined' ||
            typeof req.body.disease_name === 'undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
    }

    else{
        const disease=new Disease(req.body.id,req.body.disease_name.toUpperCase())

        dao.updateDisease(disease).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(200).send({
                    success:false,
                    message:'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
                res.status(500).send({
                    success: false,
                    message: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.delete("/api/diagnosis/delete-disease", (req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(500).send({
                success: false,
                error: WRONG_BODY_FORMAT
            }
        )
    }

    else{
        const disease=new Disease(req.body.disease_id,null,null,null)
        dao.deleteDisease(disease).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success:false,
                result:SOMETHING_WENT_WRONG
                }
            )
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
            req.body.symptom_name.toUpperCase())

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

app.post("/api/diagnosis/update-symptom",(req,res)=>{
    if(typeof req.body.id==='undefined') {
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    }

    if(typeof req.body.id ==='undefined' ||
        typeof req.body.symptom_name === "undefined"){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
    }

    else{
        const symptom=new Symptoms(req.body.id,req.body.symptom_name.toUpperCase())

        dao.updateSymptom(symptom).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.delete("/api/diagnosis/delete-symptom",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    }
    else{
        const symptom=new Symptoms(req.body.id,null)
        dao.deleteSymptom(symptom).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.get("/api/diagnosis/retrieve-medicine", (req,res)=>{
    dao.retrieveMedicine().then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/diagnosis/add-medicine",(req,res)=>{
    if(typeof req.body.medicine_name === 'undefined' ||
        typeof req.body.side_effect === 'undefined'||
        typeof req.body.dosage_info === 'undefined'){
        res.status(400).send({
            success:false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const medicine=new Medicine(req.body.id, req.body.medicine_name.toUpperCase(),
            req.body.side_effect.toUpperCase(), req.body.dosage_info.toUpperCase(),)

        dao.registerMedicine(medicine).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(200).send({
                    success:false,
                    message:'DUPLICATE_ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/diagnosis/update-medicine",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
        typeof req.body.medicine_name==='undefined' ||
        typeof req.body.side_effect==='undefined' ||
        typeof req.body.dosage_info==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }else{
        const medicine=new Medicine(req.body.id,req.body.medicine_name.toUpperCase(),req.body.side_effect.toUpperCase(),req.body.dosage_info.toUpperCase())

        dao.updateMedicine(medicine).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            res.status(500).send({
                success:false,
                result:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.delete("/api/diagnosis/delete-medicine",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    }
    else{
        const medicine=new Medicine(req.body.id,null,null)

        dao.deleteMedicine(medicine).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success:false,
                result:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.get("/api/diagnosis/retrieve-patient",(req,res)=>{
    dao.retrievePatient().then(result=>{
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

app.post("/api/diagnosis/add-patient",(req,res)=>{
    if (typeof req.body.fullname === 'undefined' ||
        typeof req.body.animal_type === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.pet_owner === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const patient = new Patient(req.body.id,req.body.fullname,req.body.animal_type,req.body.birthdate,req.body.pet_owner)

        dao.registerPatient(patient).then(result=>{
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
                console.error(err)
                res.status(500).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/diagnosis/update-patient",(req,res)=>{
    if(typeof req.body.id==='undefined') {
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    }

    if(typeof req.body.id ==='undefined' ||
        typeof req.body.fullname === 'undefined' ||
        typeof req.body.animal_type === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.pet_owner === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
    }

    else{
        const patient=new Patient(req.body.id,req.body.fullname,req.body.animal_type,req.body.birthdate,req.body.pet_owner)

        dao.updatePatient(patient).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.delete("/api/diagnosis/delete-patient",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(500).send({
            success:false,
            result:SOMETHING_WENT_WRONG
        })
    }
    else{
        const patient=new Patient(req.body.id,null,null,null,null)
        dao.deletePatient(patient).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
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

app.delete("/api/diagnosis/delete-bind-symptom-to-disease", (req, res)=>{
    if (typeof req.query.bind_id === 'undefined' ){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindDiseaseSymptoms(req.query.bind_id).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            result: SOMETHING_WENT_WRONG
        })
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

app.post("/api/diagnosis/diagnose-this", (req, res)=>{
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
