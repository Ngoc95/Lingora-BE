import { env } from '~/config/env';
import { VNPay, ignoreLogger, VnpLocale, ProductCode, HashAlgorithm } from 'vnpay'

const vnpay = new VNPay({
    tmnCode: 'Q9WPGFN9',
    secureSecret: 'J0MUV8G0FSFGPO5G74YGXMF6ZC3R0DI2',
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true, // Chế độ test
    hashAlgorithm: HashAlgorithm.SHA512, // Thuật toán mã hóa
    enableLog: true, // Bật/tắt log
    loggerFn: ignoreLogger, // Custom logger
})

function formatDate(date: Date): number {
    const tzOffset = 7 * 60 * 60 * 1000;
    const vnTime = new Date(date.getTime() + tzOffset); 
    
    const yyyy = vnTime.getUTCFullYear();
    const MM = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vnTime.getUTCDate()).padStart(2, '0');
    const HH = String(vnTime.getUTCHours()).padStart(2, '0');
    const mm = String(vnTime.getUTCMinutes()).padStart(2, '0');
    const ss = String(vnTime.getUTCSeconds()).padStart(2, '0');
    
    return Number(`${yyyy}${MM}${dd}${HH}${mm}${ss}`);
}
export function createVNPayPaymentUrl(params: {
    amount: number;
    orderId: string;
    orderInfo: string;
}): string {
    const { amount, orderId, orderInfo } = params;

    const vnpayReturnUrl = `${env.BASE_URL}/vnpay/return`;

    const now = new Date();
    const createDate = formatDate(now);
    const expireDate = formatDate(new Date(now.getTime() + 15 * 60 * 1000));

    const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: ProductCode.Other,
        vnp_Locale: VnpLocale.VN,
        vnp_ReturnUrl: vnpayReturnUrl,
        vnp_IpAddr: '127.0.0.1',
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
    })

    return paymentUrl;
}
export function verifyVNPayReturn(params: Record<string, string>): boolean {
    const verify = vnpay.verifyReturnUrl(params as any)
    console.log('vnpay return:', verify.message)
    return verify.isSuccess
}

