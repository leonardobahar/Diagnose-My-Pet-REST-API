import jwt from "jsonwebtoken";

export const generateAccessToken = (userInfo, token_secret)=>{
    // console.log(userInfo)
    return jwt.sign(userInfo, token_secret, {expiresIn: 86400});
}

export class AgeFormatter{
    constructor(date1, date2){
        if (!date1.getDate() || !date2.getDate()){
            this.fckedUp = true
        }else{
            this.fckedUp = false
        }

        this.ageMonths = monthDiff(date1, date2)
    }

    getAgeYear(){
        return this.fckedUp == true ? 0 : parseInt(this.ageMonths/12);
    }

    getAgeMonth(){
        return this.fckedUp == true ? 0 : this.ageMonths;
    }

    getAgeString(){
        const ageYear = parseInt(this.ageMonths/12)
        const remainingMonths = ageYear > 0 ? this.ageMonths%(ageYear*12) : this.ageMonths
        return this.fckedUp == true ? 'Age was not input during registration' : `${parseInt(this.ageMonths/12)} year(s) and ${remainingMonths} month(s) old`;
    }
}

const monthDiff = (date1, date2)=>{
    let months;
    months=(date2.getFullYear()-date1.getFullYear()) * 12;
    months-=date1.getMonth();
    months+=date2.getMonth();
    return months <=0 ? 0 :months
}
