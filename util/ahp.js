import fs from 'fs'

export const updateAHP = (ahpMatrix, distanceMatrix, capacityMatrix, sellPriceRangeMatrix)=>{
    // 1. Compute matrix
    const ahpMatrixResult = computeMatrix(ahpMatrix) // Gives back target and weight(w)
    const distanceMatrixResult = computeMatrix(distanceMatrix)
    const capacityAbilityMatrixResult = computeMatrix(capacityMatrix)
    const sellPriceRangeResult = computeMatrix(sellPriceRangeMatrix)

    // 2. Store in json file form
    fs.writeFileSync("./ahp-asset.json", JSON.stringify({
        ahpMatrixResult: ahpMatrixResult,
        distanceMatrixResult: distanceMatrixResult,
        capacityAbilityMatrixResult: capacityAbilityMatrixResult,
        sellPriceRangeResult: sellPriceRangeResult
    }))
}

const computeMatrix = (ahpMatrix)=>{
    // Calculate weight from ahpMatrix
    // 1. Get colsum
    console.log(ahpMatrix)
    const colSum = new Array(ahpMatrix.length);
    for (let i=0; i<ahpMatrix.length; i++){
        for (let j=0; j<ahpMatrix[i].length; j++){
            // Add value to colSum Array
            if (j===0){
                colSum[i] = ahpMatrix[j][i]
            }else{
                colSum[i] += ahpMatrix[j][i]
            }
        }
    }

    // 2. Form target matrix
    const targetMatrix = []
    const targetMatrixAverage = []
    for (let i=0; i<ahpMatrix.length; i++){
        const horizontalMatrixContent = new Array(ahpMatrix[i].length)
        let sumForAvg = 0
        for (let j=0; j<ahpMatrix[i].length; j++){
            // Form horizontal target matrix
            const resultDivision = ahpMatrix[i][j] / colSum[j]
            horizontalMatrixContent[j] = resultDivision
            sumForAvg += resultDivision
        }
        targetMatrix.push(horizontalMatrixContent)
        targetMatrixAverage.push(sumForAvg/ahpMatrix.length)
    }
    console.log(targetMatrix)
    console.log(targetMatrixAverage)

    return {
        target: targetMatrix,
        weight: targetMatrixAverage
    }
}


export const runAHP = (vendorData, orderItem)=>{
    const assetJson = JSON.parse(fs.readFileSync("./ahp-asset.json"))
    const ahpMatrixResult = assetJson.ahpMatrixResult
    const distanceMatrixResult = assetJson.distanceMatrixResult
    const capacityMatrixResult = assetJson.capacityAbilityMatrixResult
    const sellPriceRangeMatrixResult = assetJson.sellPriceRangeResult

    const ahpConf = JSON.parse(fs.readFileSync("./ahp-conf.json"))
    const distanceCriteria = ahpConf.distanceCriteria
    const capacityCriteria = ahpConf.capacityCriteria
    const sellPriceCriteria = ahpConf.sellPriceCriteria

    // 1. Judge each vendors, give score
    for (let i=0; i<vendorData.length; i++){
        // i. Judge distance
        let distanceScore = 0
        for (let criteriaIndex = 0; criteriaIndex<distanceCriteria.length; criteriaIndex++){
            if (vendorData[i].distance < distanceCriteria[criteriaIndex]){
                distanceScore = distanceMatrixResult.weight[criteriaIndex] // of w
            }
        }

        // ii. Judge capacity
        let capacityScore = 0
        // for (let criteriaIndex = 0; criteriaIndex<capacityCriteria.length; criteriaIndex++){
            if (vendorData[i].max_order > orderItem.quantity){
                capacityScore = capacityMatrixResult.weight[0] // of w -> fit
            }else{
                capacityScore = capacityMatrixResult.weight[1] // no fit
            }
        //}
        // iii. Judge sellPrice
        let sellPriceScore = 0
        for (let criteriaIndex = 0; criteriaIndex<sellPriceCriteria.length; criteriaIndex++){
            if (orderItem.price - vendorData[i].vendor_price < sellPriceCriteria[criteriaIndex]){
                sellPriceScore = sellPriceRangeMatrixResult.weight[criteriaIndex] // of w
            }
        }

        // v. Multiply score with AHP matrix's weight
        const ahpScore = (distanceScore * ahpMatrixResult.weight[0])
                            + (capacityScore * ahpMatrixResult.weight[1])
                            + (sellPriceScore * ahpMatrixResult.weight[2])

        // iv. Assign score to vendor data
        vendorData[i].ahpscore = ahpScore
    }

    return vendorData
}
