/**
 * Revenue split constants
 * Platform fee: percentage that platform takes from each sale
 * Owner earnings: remaining percentage that goes to the studyset owner
 */

// Platform takes 30% of each sale, owner gets 70%
// This is a common split for marketplaces (similar to App Store, Google Play, etc.)
export const PLATFORM_FEE_PERCENTAGE = 0.30 // 30%

// Calculate owner earnings from total amount
export const calculateRevenueSplit = (totalAmount: number, platformFeePercentage: number = PLATFORM_FEE_PERCENTAGE) => {
    // Calculate platform fee and round to 2 decimal places
    const platformFee = Number((totalAmount * platformFeePercentage).toFixed(2))
    
    // Owner earnings = total - platform fee (ensures they always sum to totalAmount)
    // Round to 2 decimal places to handle floating point precision
    const ownerEarnings = Number((totalAmount - platformFee).toFixed(2))
    
    return {
        totalAmount: Number(totalAmount.toFixed(2)),
        platformFee,
        ownerEarnings,
        platformFeePercentage
    }
}

