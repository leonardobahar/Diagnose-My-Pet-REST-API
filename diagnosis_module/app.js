require("../util/logger")();
import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import {Dao} from "./dao";
import {
    ERROR_DUPLICATE_ENTRY,
    ERROR_FOREIGN_KEY,
    SOMETHING_WENT_WRONG,
    WRONG_BODY_FORMAT,
    NO_SUCH_CONTENT
} from "../strings";
import {
    Anatomy,
    AnimalCategory,
    AnimalType,
    Disease,
    MedicalRecords,
    MedicalRecordAttachment,
    Medicine,
    Patient,
    Symptoms,
    User, Appointment, TreatmentPlan
} from "../model";

dotenv.config()

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

const PORT = process.env.DIAGNOSIS_PORT
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const dao = new Dao(host, user, password, dbname)

app.use(express.static('./Uploads'))

app.get("/api/diagnosis/retrieve-animal-category", (req, res)=>{
    if (typeof req.query.id === 'undefined'){
        // RETRIEVE ALL
        dao.retrieveAnimalCategory().then(result=>{
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
    }else{
        // RETRIEVE WITH ID
        const animal=new AnimalCategory(req.query.id,null)

        dao.retrieveOneAnimalCategory(animal).then(result=> {
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/diagnosis/add-animal-category", (req, res)=>{
    if (typeof req.body.category_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const category = new AnimalCategory(null, req.body.category_name.toUpperCase())

    dao.registerAnimalCategory(category).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(500).send({
                success: false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else{
            console.log(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/api/diagnosis/update-animal-category",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
        typeof req.body.category_name==='undefined'){
        res.status(400).send({
            success:false,
            error: WRONG_BODY_FORMAT
        })
    }
    const category=new AnimalCategory(req.body.id,req.body.category_name.toUpperCase())

    dao.getAnimalCategoryID(new AnimalCategory(req.body.id)).then(result=>{
        dao.updateAnimalCategory(category).then(result=>{
            res.status(200).send({
                success:true,
                result: result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(500).send({
                    success:false,
                    error:'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success:false,
                    error: SOMETHING_WENT_WRONG
                })
                res.end()
            }
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error: SOMETHING_WENT_WRONG
        })
        res.end()
    })
})

app.delete("/api/diagnosis/delete-animal-category", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
    }
    else {
        const category=new AnimalCategory(req.query.id,null)

        dao.getAnimalCategoryID(new AnimalCategory(req.query.id)).then(result=>{
            dao.deleteAnimalCategory(category).then(result=>{
                res.status(200).send({
                    success:true,
                    result:result
                })
            }).catch(err=>{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error: SOMETHING_WENT_WRONG
            })
            res.end()
        })
    }
})

app.get("/api/diagnosis/retrieve-animal-type", (req, res)=>{
    if(typeof req.query.id==='undefined'){
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
    }else{
        const animal=new AnimalType(req.query.id,null,null)

        dao.retrieveOneAnimalType(animal).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/diagnosis/add-animal-type", (req, res)=>{
    if (typeof req.body.animal_name === 'undefined' ||
        typeof req.body.animal_category === 'undefined') {
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }
    const animal = new AnimalType(null,
        req.body.animal_name.toUpperCase(),
        req.body.animal_category)

    dao.registerAnimalType(animal).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(500).send({
                success: false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else{
            console.log(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/api/diagnosis/update-animal-type",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
        typeof req.body.animal_name==='undefined' ||
        typeof req.body.animal_category==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const animal=new AnimalType(req.body.id,req.body.animal_name.toUpperCase(),req.body.animal_category)
    dao.getAnimalTypeId(new AnimalType(req.body.id)).then(result=>{
        dao.getAnimalCategoryID(new AnimalCategory(req.body.animal_category)).then(result=>{
            dao.updateAnimalType(animal).then(result=>{
                res.status(200).send({
                    success:true,
                    result:result
                })
            }).catch(err=>{
                if(err.code==='ER_DUP_ENTRY'){
                    res.status(200).send({
                        success:false,
                        error:'DUPLICATE-ENTRY'
                    })
                    res.end()
                }else{
                    console.error(err)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                }
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })

    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/diagnosis/delete-animal-type", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
        return
    }

    const animalType=new AnimalType(req.query.id,null,null)
    dao.getAnimalTypeId(new AnimalType(req.query.id)).then(result=>{
        dao.deleteAnimalType(animalType).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/retrieve-disease", (req, res)=>{
    if (typeof req.query.disease_id==='undefined'){
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
    } else{
        dao.retrieveSymptomsForDisease(new Disease(req.query.disease_id)).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/diagnosis/add-disease", (req, res)=>{
    if (typeof req.body.disease_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const disease = new Disease(null,
        req.body.disease_name.toUpperCase())

    dao.registerDisease(disease).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(500).send({
                success: false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else{
            console.log(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
            res.end()
        }
    })
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

    const disease=new Disease(req.body.id,req.body.disease_name.toUpperCase())

    dao.getDiseaseId(new Disease(req.body.id)).then(result=>{
        dao.updateDisease(disease).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(200).send({
                    success:false,
                    error:'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/diagnosis/delete-disease", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
                success: false,
                error: WRONG_BODY_FORMAT
            }
        )
        return
    }

    const disease=new Disease(req.query.id,null,null,null)
    dao.getDiseaseId(new Disease(req.query.id)).then(result=>{
        dao.deleteDisease(disease).then(result=>{
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
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/retrieve-symptom", (req, res)=>{
    if(typeof req.query.id==='undefined'){
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
    }else{
        const symptom=new Symptoms(req.query.id,null)

        dao.retrieveOneSymptom(symptom).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/diagnosis/add-symptom", (req, res)=>{
    if (typeof req.body.symptom_name === 'undefined') {
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const symptom = new Symptoms(null,
        req.body.symptom_name.toUpperCase())

    dao.registerSymptom(symptom).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{

        if(err.code==='ER_DUP_ENTRY'){
            res.status(500).send({
                success:false,
                error:'DUPLICATE-ENTRY'
            })
        }else {
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
            res.end()
        }
    })

})

app.post("/api/diagnosis/update-symptom",(req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.symptom_name === "undefined"){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const symptom=new Symptoms(req.body.id,req.body.symptom_name.toUpperCase())

    dao.getSymptomId(new Symptoms(req.body.id)).then(result=>{
        dao.updateSymptom(symptom).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(500).send({
                    success:false,
                    error:'DUPLICATE-ENTRY'
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/diagnosis/delete-symptom",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const symptom=new Symptoms(req.query.id,null)
    dao.getSymptomId(new Symptoms(req.query.id)).then(result=>{
        dao.deleteSymptom(symptom).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/retrieve-medicine", (req,res)=>{
    if(typeof req.query.id==='undefined'){
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
    }else{
        const medicine=new Medicine(req.query.id,null,null,null)

        dao.retrieveOneMedicine(medicine).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
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
    }

    const medicine=new Medicine(null, req.body.medicine_name.toUpperCase(),
        req.body.side_effect.toUpperCase(), req.body.dosage_info.toUpperCase())

    dao.registerMedicine(medicine).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        if(err.code==='ER_DUP_ENTRY'){
            res.status(500).send({
                success:false,
                error:'DUPLICATE_ENTRY'
            })
            res.end()
        }else{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
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
    }

    const medicine=new Medicine(req.body.id,req.body.medicine_name.toUpperCase(),req.body.side_effect.toUpperCase(),req.body.dosage_info.toUpperCase())

    dao.getMedicineId(new Medicine(req.body.id)).then(result=>{
        dao.updateMedicine(medicine).then(result=>{
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
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/diagnosis/delete-medicine",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
        return
    }

    const medicine=new Medicine(req.query.id,null,null)

    dao.getMedicineId(new Medicine(req.query.id)).then(result=>{
        dao.deleteMedicine(medicine).then(result=>{
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
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/retrieve-anatomy",(req,res)=>{
    if(typeof req.query.id === 'undefined'){
        dao.retrieveAnatomy().then(result=>{
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
    } else{
        const anatomy=new Anatomy(req.query.id,null,null)
        dao.retrieveOneAnatomy(anatomy).then(result=> {
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/diagnosis/register-anatomy",(req,res)=>{
    if(typeof req.body.part_name ==='undefined' ||
        typeof req.body.animal_type_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const anatomy=new Anatomy(null,req.body.part_name.toUpperCase(),req.body.animal_type_id)
    dao.registerAnatomy(anatomy).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(500).send({
                success: false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/api/diagnosis/update-anatomy", (req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.part_name === 'undefined' ||
        typeof req.body.animal_type_id === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const anatomy= new Anatomy(req.body.id, req.body.part_name.toUpperCase(), req.body.animal_type_id)

    dao.getAnatomyId(new Anatomy(req.body.id)).then(result=>{
        dao.updateAnatomy(anatomy).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/diagnosis/delete-anatomy",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const anatomy=new Anatomy(req.query.id,null,null)

    dao.getAnatomyId(new Anatomy(req.query.id)).then(result=>{
        dao.deleteAnatomy(anatomy).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/diagnosis/bind-medicine-to-symptom", (req,res)=>{
    if(typeof req.body.medicine_id === 'undefined' ||
        typeof req.body.symptom_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindMedicineToSymptom(new Medicine(req.body.medicine_id),new Symptoms(req.body.symptom_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success:false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2'){
            res.status(500).send({
                success:false,
                error:ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        }
    })
})

app.delete("/api/diagnosis/delete-bind-medicine-to-symptom", (req, res)=>{
    if (typeof req.query.bind_id === 'undefined' ){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindMedicineSymptoms(req.query.bind_id).then(result=>{
        res.status(200).send({
            success: true,
            result:result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/retrieve-medicine-of-symptoms",(req,res)=>{
    if(typeof req.query.symptom_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveMedicineForSymptom(new Symptoms(req.query.symptom_id)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

// app.post("/api/diagnosis/bind-medicine-to-disease", (req,res)=>{
//     if(typeof req.body.treatment_plan_name === 'undefined' ||
//         typeof req.body.disease_id === 'undefined' ||
//         typeof req.body.medicine_id_array === 'undefined'){
//         res.status(400).send({
//             success:false,
//             error:WRONG_BODY_FORMAT
//         })
//         return
//     }
//
//     const medicineArray=JSON.parse(req.body.medicine_id_array)
//     for(let i=0; i<medicineArray.length; i++){
//         dao.retrieveOneMedicine(new Medicine(medicineArray[i].medicine_id)).then(result=>{
//             dao.bindTreatmentToDisease(new TreatmentPlan(null,req.body.treatment_plan_name,req.body.disease_id,JSON.stringify(req.body.medicine_id_array))).then(result=>{
//                 res.status(200).send({
//                     success: true,
//                     result: result
//                 })
//             }).catch(err=>{
//                 if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY){
//                     res.status(500).send({
//                         success:false,
//                         error: 'DUPLICATE-ENTRY'
//                     })
//                     res.end()
//                 }else if(err.code === 'ER_NO_REFERENCED_ROW_2'){
//                     res.status(500).send({
//                         success:false,
//                         error:ERROR_FOREIGN_KEY
//                     })
//                 }else{
//                     console.error(err)
//                     res.status(500).send({
//                         success:false,
//                         error:SOMETHING_WENT_WRONG
//                     })
//                 }
//             })
//         }).catch(error=>{
//             if(error===NO_SUCH_CONTENT){
//                 res.status(204).send({
//                     success:false,
//                     error:NO_SUCH_CONTENT
//                 })
//                 return
//             }
//             console.error(error)
//             res.status(500).send({
//                 success:false,
//                 error:SOMETHING_WENT_WRONG
//             })
//         })
//     }
// })

app.post("/api/diagnosis/bind-disease-with-medicine",(req,res)=>{
    if(typeof req.body.disease_symptoms_animal_id==='undefined'||
       typeof req.body.medicine_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindTreatmentToDisease(req.body.disease_symptoms_animal_id,req.body.medicine_id).then(result=>{
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
app.delete("/api/diagnosis/delete-bind-medicine-to-disease", (req, res)=>{
    if (typeof req.query.bind_id === 'undefined' ){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindMedicineDisease(req.query.bind_id).then(result=>{
        res.status(200).send({
            success: true,
            result:result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/retrieve-medicine-of-disease",(req,res)=>{
    if(typeof req.query.disease_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveMedicineForDisease(new Disease(req.query.disease_id)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})


app.post("/api/diagnosis/bind-symptom-to-disease", (req, res)=>{
    if (typeof req.body.symptom_id === 'undefined' ||
        typeof req.body.disease_id === 'undefined' ||
        typeof req.body.animal_id === 'undefined'  ||
        typeof req.body.anatomy_id === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindSymptomToDisease(new Symptoms(req.body.symptom_id), new Disease(req.body.disease_id), new AnimalType(req.body.animal_id), new Anatomy(req.body.anatomy_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success:false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2'){
            res.status(500).send({
                success:false,
                error:ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        }
    })
})

app.delete("/api/diagnosis/delete-bind-symptom-to-disease", (req, res)=>{
    if (typeof req.query.id === 'undefined' ){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindDiseaseSymptoms(req.query.id).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
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
        if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY) {
            res.status(500).send({
                success: false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(500).send({
                success: false,
                error: ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})


// SSL Certs for codedoc.xyz
var privateKey  = fs.readFileSync('sslcerts/privkey.pem', 'utf8');
var certificate = fs.readFileSync('sslcerts/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};
const https = require('https')
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(8486)
