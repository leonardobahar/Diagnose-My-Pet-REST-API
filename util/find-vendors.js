import {KunyahAccessObj} from '../dao'
import {SOMETHING_WENT_WRONG, NO_VENDORS_AVAILABLE} from "../strings"
import fetch from 'node-fetch'
import {haversineFormula, googleDistanceMatrix} from "./Formulas"
import {runAHP} from "./ahp";

const findVendorForMenu = (orderItems, customerShippingAddressLatitude, customerShippingAddressLongtitude, kunyahAccssObject)=>{
    return new Promise(async(resolve, reject)=>{
        for (let i=0; i<orderItems.length; i++){
            const item = orderItems[i]
            orderItems[i].recommended_vendors = await findVendorForItem(item, customerShippingAddressLatitude, customerShippingAddressLongtitude, kunyahAccssObject).catch(err=>{
                reject(err)
            })
            orderItems[i].chosen_vendor = orderItems[i].recommended_vendors[0]
        }
        resolve(orderItems)
    })
}

const findVendorForItem = (item, customerShippingAddressLatitude, customerShippingAddressLongtitude, kunyahAccssObject)=>{
    return new Promise(async(resolve, reject) => {
        let vendorData = await kunyahAccssObject.retrieveVendorsCookingMenu(item.menu_id).catch(err=>{
            console.error(err)
            reject(SOMETHING_WENT_WRONG)
        })

        if (vendorData.length === 0){
            reject(NO_VENDORS_AVAILABLE)
            return
        }

        for (let j=0; j<vendorData.length; j++){
            const currentDistance = haversineFormula(customerShippingAddressLatitude, customerShippingAddressLongtitude, vendorData[j].latitude, vendorData[j].longtitude)
            //console.log(`Haversine d = ${currentDistance}, Google Maps d = ${await googleDistanceMatrix(customerShippingAddressLatitude, customerShippingAddressLongtitude, vendorData[j].latitude, vendorData[j].longtitude)}`)
            //console.log(await googleDistanceMatrix(customerShippingAddressLatitude, customerShippingAddressLongtitude, vendorData[j].latitude, vendorData[j].longtitude))
            vendorData[j].distance = currentDistance
        }

        vendorData.sort((a, b)=>{
            if (a.distance > b.distance){
                return 1
            }

            if (b.distance > a.distance){
                return -1
            }

            return 0
        })

        vendorData = runAHP(vendorData, item)

        vendorData.sort((a, b)=>{
            if (a.ahpscore > b.ahpscore){
                return 1
            }

            if (b.ahpscore > a.ahpscore){
                return -1
            }

            return 0
        })

        resolve(vendorData)
    })

}


export default findVendorForMenu;
