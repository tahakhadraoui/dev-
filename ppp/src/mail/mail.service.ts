import { Injectable } from "@nestjs/common"
import  { ConfigService } from "@nestjs/config"
import * as nodemailer from "nodemailer"

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: this.configService.get<string>("MAIL_USER"),
        pass: this.configService.get<string>("MAIL_PASS"),
      },
    })
  }

  async sendPasswordResetEmail(email: string, resetCode: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>("MAIL_USER"),
        to: email,
        subject: "Code de Réinitialisation - Driblly",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">⚽ Driblly</h1>
              <h2 style="color: #374151; margin: 10px 0;">Demande de Réinitialisation</h2>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #374151; margin: 0 0 15px 0;">Bonjour,</p>
              <p style="color: #374151; margin: 0 0 15px 0;">
                Nous avons reçu une demande de réinitialisation de votre mot de passe. 
                Utilisez le code ci-dessous :
              </p>
              
              <div style="text-align: center; margin: 25px 0;">
                <div style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
                  ${resetCode}
                </div>
              </div>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; font-weight: bold;">⚠️ Important :</p>
              <ul style="color: #92400e; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Ce code expire dans 15 minutes</li>
                <li>Ne partagez ce code avec personne</li>
                <li>Si vous n'avez pas demandé ceci, ignorez cet email</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0;">
                Cordialement,<br>
                <strong>L'équipe Driblly</strong>
              </p>
            </div>
          </div>
        `,
      }

      await this.transporter.sendMail(mailOptions)
      console.log(`[MailService] Email de réinitialisation envoyé à ${email}`)
    } catch (error) {
      console.error(`[MailService] Erreur lors de l'envoi de l'email à ${email}:`, error)
      throw error
    }
  }
}
