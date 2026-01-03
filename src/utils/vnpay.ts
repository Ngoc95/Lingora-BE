import { env } from '~/config/env';
import { VNPay, ignoreLogger, VnpLocale, ProductCode, dateFormat, HashAlgorithm } from 'vnpay'

const vnpay = new VNPay({
    tmnCode: 'Q9WPGFN9',
    secureSecret: 'J0MUV8G0FSFGPO5G74YGXMF6ZC3R0DI2',
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true, // Chế độ test
    hashAlgorithm: HashAlgorithm.SHA512, // Thuật toán mã hóa
    enableLog: true, // Bật/tắt log
    loggerFn: ignoreLogger, // Custom logger
})
export function createVNPayPaymentUrl(params: {
    amount: number;
    orderId: string;
    orderInfo: string;
}): string {
    const { amount, orderId, orderInfo } = params;

    const vnpayReturnUrl = `${env.BASE_URL}/vnpay/return`;

    const now = new Date();
    const createDate = dateFormat(now); // MM = minute
    const expireDate = dateFormat(new Date(now.getTime() + 15 * 60 * 1000));

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

