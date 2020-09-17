import fetch from "node-fetch";

const degToRad = (deg)=>{
    return deg * Math.PI / 180
}

export const haversineFormula = (shippingLat, shippingLon, vendorLat, vendorLon)=>{
    //console.log(shippingLat+" "+shippingLon )
    const R = 6371 // km
    shippingLat = parseFloat(shippingLat)
    shippingLon = parseFloat(shippingLon)
    vendorLat = parseFloat(vendorLat)
    vendorLon = parseFloat(vendorLon)
    const x1 = vendorLat - shippingLat
    const dLat = degToRad(x1)
    const x2 = vendorLon - shippingLon
    const dLon = degToRad(x2)

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(degToRad(shippingLat)) * Math.cos(degToRad(vendorLat)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const d = R * c

    return d // in kilometres
}

export const googleDistanceMatrix = async(shippingLat, shippingLon, vendorLat, vendorLon)=>{
    return new Promise(resolve=>{
        const apiKey = 'AIzaSyD3UcmOJXwa7NYwgmepRYdk3NlaCQB28s8'
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metrics&origins=${shippingLat},${shippingLon}&destinations=${vendorLat},${vendorLon}&key=${apiKey}`
        fetch(url).then(async response=>{
            const responseJson = await response.json()
            let d = responseJson.rows[0].elements[0].distance.text.split(" ")[0]
            resolve(d)
        })
    })
}

const pythagorasEquirectangular = (shippingLat, shippingLon, vendorLat, vendorLon) =>{
    shippingLat = degToRad(shippingLat)
    shippingLon = degToRad(shippingLon)
    vendorLat = degToRad(vendorLat)
    vendorLon = degToRad(vendorLon)
    const R = 6371 // km; Radius of planet Earth
    const x = (vendorLon - shippingLon) * Math.cos((vendorLat + shippingLat)/2)
    const y = (vendorLat - shippingLat)
    const d = Math.sqrt(x * x + y * y) * R
    console.log(d)
    return d
}
