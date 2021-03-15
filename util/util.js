import jwt from "jsonwebtoken";

export const generateAccessToken = (userInfo, token_secret)=>{
    return jwt.sign(userInfo, token_secret, {expiresIn: 86400});
}

export class AgeFormatter{
    constructor(date1, date2){
        console.log(date1+" "+date2)
        this.ageMonths = monthDiff(date1, date2)
    }

    getAgeYear(){
        return parseInt(this.ageMonths/12);
    }

    getAgeMonth(){
        return this.ageMonths;
    }

    getAgeString(){
        const ageYear = parseInt(this.ageMonths/12)
        const remainingMonths = this.ageMonths%(ageYear*12)
        return `${parseInt(this.ageMonths/12)} year(s) and ${remainingMonths} month(s) old`;
    }
}

const monthDiff = (date1, date2)=>{
    let months;
    months=(date2.getFullYear()-date1.getFullYear()) * 12;
    months-=date1.getMonth();
    months+=date2.getMonth();
    return months <=0 ? 0 :months
}
