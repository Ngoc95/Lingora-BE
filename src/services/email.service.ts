import { env } from "../config/env";
import { Resend } from "resend"
import { SendMailOptions } from "../dtos/internal/email/emailOption.dto"
import { SendVerifyMailOptions } from "../dtos/internal/email/verifyEmailOption.dto"
import { generateVerificationCode, renderEmailTemplate } from "../utils/email"

const resend = new Resend(env.RESEND_API_KEY)

export const sendEmail = async ({ to, subject, template, variables = {} }: SendMailOptions) => {
    const html = await renderEmailTemplate(template, variables)
    const fromEmail = `Lingora <${env.FROM_EMAIL}>`

    const { error } = await resend.emails.send({ from: fromEmail, to, subject, html })

    if (error) throw error
}

export const sendVerifyEmail = async ({
    to,
    subject = 'Please verify email for Lingora!',
    template,
    name
}: SendVerifyMailOptions) => {
    // create verify email token
    const code = generateVerificationCode()

    await sendEmail({ to, subject, template, variables: { code, name } })

    return code
}

export const sendResetPasswordCode = async ({
    to,
    subject = 'Please verify email for Lingora!',
    template,
    body
}: {
    to: string
    subject?: string
    template: string
    body: { code: string; email: string }
}) => {
    await sendEmail({ to, subject, template, variables: { code: body.code, email: body.email } })

    return body.code
}
