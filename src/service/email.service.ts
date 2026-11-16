import nodemailer, { type Transporter } from "nodemailer"

let transporter: Transporter | null = null
let warned = false

const smtpReady = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, 
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    })
  }
  return transporter
}

export const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "")

export const sendEmail = async (input: { to: string; subject: string; html: string; text: string }) => {
  if (!smtpReady()) {
    if (!warned) {
      console.warn("Email is not configured (SMTP_* variables missing): emails are skipped.")
      warned = true
    }
    return false
  }
  try {
    await getTransporter().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, ...input })
    return true
  } catch (err) {
    console.error("sendEmail failed:", (err as Error).message)
    return false
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export const renderEmail = (o: {
  heading: string
  paragraphs: string[]
  button?: { label: string; url: string }
  footer?: string
}) => {
  const button = o.button
    ? `<p style="margin:22px 0"><a href="${esc(o.button.url)}" style="background:#f3bb8a;color:#16302a;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">${esc(o.button.label)}</a></p>
       <p style="font-size:12px;color:#5a6f68;word-break:break-all">If the button does not work, copy this link into your browser:<br>${esc(o.button.url)}</p>`
    : ""

  const html = `<!doctype html><html><body style="margin:0;background:#e9f0ec;font-family:Arial,Helvetica,sans-serif;color:#1e3b34">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#29493f;padding:18px 24px;color:#fbf4ec;font-size:20px;font-weight:bold">StudentNest</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:20px">${esc(o.heading)}</h1>
${o.paragraphs.map((p) => `<p style="margin:0 0 12px;line-height:1.5;font-size:15px">${esc(p)}</p>`).join("")}
${button}
${o.footer ? `<p style="margin:20px 0 0;font-size:12px;color:#5a6f68">${esc(o.footer)}</p>` : ""}
</td></tr></table></td></tr></table></body></html>`

  const text = [
    o.heading,
    "",
    ...o.paragraphs,
    ...(o.button ? ["", `${o.button.label}: ${o.button.url}`] : []),
    ...(o.footer ? ["", o.footer] : [])
  ].join("\n")

  return { html, text }
}