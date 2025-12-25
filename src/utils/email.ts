import path from 'path'
import ejs from 'ejs'

export function renderEmailTemplate(templateName: string, variables: Record<string, any>) {
  const filePath = path.join(__dirname, '..', 'views', 'emails', `${templateName}.ejs`)
  return new Promise<string>((resolve, reject) => {
    ejs.renderFile(filePath, variables, (err, html) => {
      if (err) return reject(err)
      resolve(html)
    })
  })
}

export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString() // 6 số
}
