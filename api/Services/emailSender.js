const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const validator = require('validator');

// Configuration du transporteur avec gestion d'erreurs améliorée
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  pool: true,
  maxConnections: 5, // Réduit pour éviter les limitations
  maxMessages: 120,
  rateLimit: 10, // Messages par seconde
  logger: true,
  debug: process.env.NODE_ENV === 'development',
  // Options supplémentaires pour une meilleure gestion d'erreurs
  connectionTimeout: 300000, // 30 secondes
  greetingTimeout: 300000,
  socketTimeout: 300000,
  // Forcer la vérification TLS
  secure: true,
  requireTLS: true
});

// Fonction pour vérifier la validité du domaine email
async function verifyEmailDomain(email) {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Vérifier les enregistrements MX du domaine
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    console.log(`Domaine invalide pour ${email}:`, error.message);
    return false;
  }
}

// Fonction principale améliorée pour l'envoi d'email
exports.sendEmailWithQRCode = async (toEmail, studentName, eventName, qrCodeDataURL, ticketCode) => {
  try {
    // 1. Validation initiale de l'email
    if (!toEmail || typeof toEmail !== 'string') {
      return {
        success: false,
        email: toEmail,
        errorType: 'INVALID_EMAIL_FORMAT',
        errorMessage: 'Adresse email manquante ou invalide',
        errorCode: 'VALIDATION_ERROR'
      };
    }

    const emailToValidate = toEmail.trim().toLowerCase();

    // 2. Validation du format email
    if (!validator.isEmail(emailToValidate)) {
      return {
        success: false,
        email: toEmail,
        errorType: 'INVALID_EMAIL_FORMAT',
        errorMessage: 'Format d\'adresse email invalide',
        errorCode: 'FORMAT_ERROR'
      };
    }

    // 3. Vérification du domaine (optionnel mais recommandé)
    const isDomainValid = await verifyEmailDomain(emailToValidate);
    if (!isDomainValid) {
      return {
        success: false,
        email: toEmail,
        errorType: 'DOMAIN_NOT_EXIST',
        errorMessage: 'Le domaine de l\'adresse email n\'existe pas',
        errorCode: 'DOMAIN_ERROR'
      };
    }

    // 4. Préparation du mail
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'ENITOLCode',
        address: process.env.EMAIL_FROM
      },
      to: emailToValidate,
      subject: `🎫 Votre billet pour ${eventName}`,
      html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9f9f9; }
                        .qr-section { text-align: center; margin: 20px 0; }
                        .ticket-code { background: #e8f5e8; padding: 15px; border-radius: 5px; font-weight: bold; }
                        .footer { color: #666; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                        <h1>Message officiel de ENITOLCode</h1>
                            <h1>🎫 Billet Électronique</h1>
                        </div>
                        <div class="content">
                            <p>Bonjour <strong>${studentName}</strong>,</p>
                            
                            <p>Nous avons le plaisir de vous transmettre votre billet électronique pour la réception des novices<strong>${eventName}</strong>.</p>
                            
                            <div class="ticket-code">
                                <p><strong>Code du billet:</strong> ${ticketCode}</p>
                            </div>
                            
                            <div class="qr-section">
                                <p>Téléchargez le QR code ci-dessous ou imprimez-le :</p>
                                <img src="cid:qrcode" alt="QR Code" style="max-width: 200px;">
                            </div>
                            
                            <p><em>⚠️ Ce billet est strictement personnel et valable pour une seule entrée. Toute duplication ou partage est interdit.</em></p>
                            
                            <div class="footer">
                                 <p>Cordialement,<br>L’équipe organisatrice et votre administrateur réseau</p>
    <p>Ce courriel a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
      attachments: [{
        filename: 'qrcode.png',
        content: qrCodeDataURL.split('base64,')[1],
        encoding: 'base64',
        cid: 'qrcode' // Pour l'affichage inline
      }],
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Reply-To': process.env.EMAIL_NOREPLY || process.env.EMAIL_FROM
      },
      // Options pour forcer la vérification
      dsn: {
        id: `ticket-${ticketCode}`,
        return: 'headers',
        notify: 'failure,delay',
        recipient: process.env.EMAIL_FROM
      }
    };

    // 5. Vérification de la connexion avant envoi
    try {
      await transporter.verify();
    } catch (verifyError) {
      return {
        success: false,
        email: toEmail,
        errorType: 'SMTP_CONNECTION_ERROR',
        errorMessage: 'Impossible de se connecter au serveur email',
        errorCode: verifyError.code,
        details: verifyError.message
      };
    }

    // 6. Tentative d'envoi avec timeout
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout lors de l\'envoi')), 45000); // 45 secondes
    });

    const info = await Promise.race([sendPromise, timeoutPromise]);

    // 7. Analyse de la réponse pour détecter les échecs "silencieux"
    if (info.rejected && info.rejected.length > 0) {
      return {
        success: false,
        email: toEmail,
        errorType: 'EMAIL_REJECTED',
        errorMessage: 'Email rejeté par le serveur destinataire',
        errorCode: 'REJECTED',
        rejectedEmails: info.rejected
      };
    }

    if (info.response && info.response.includes('5.')) {
      return {
        success: false,
        email: toEmail,
        errorType: 'PERMANENT_ERROR',
        errorMessage: 'Erreur permanente lors de l\'envoi',
        errorCode: 'PERMANENT_FAILURE',
        serverResponse: info.response
      };
    }

    // 8. Succès
    console.log(`✓ Email envoyé avec succès à ${toEmail} - Message ID: ${info.messageId}`);

    return {
      success: true,
      email: toEmail,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      sentAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`✗ Erreur lors de l'envoi à ${toEmail}:`, error);

    // Analyse détaillée des erreurs
    let errorType = 'UNKNOWN_ERROR';
    let errorMessage = error.message;
    let errorCode = error.code || error.responseCode;

    // Erreurs de connexion
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorType = 'CONNECTION_ERROR';
      errorMessage = 'Impossible de se connecter au serveur email';
    }
    // Erreurs d'authentification
    else if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorType = 'AUTHENTICATION_ERROR';
      errorMessage = 'Erreur d\'authentification avec le serveur email';
    }
    // Erreurs de destinataire
    else if (error.responseCode === 550 || (error.response && error.response.includes('550'))) {
      errorType = 'EMAIL_NOT_EXIST';
      errorMessage = 'Adresse email inexistante ou invalide';
    }
    else if (error.responseCode === 553 || (error.response && error.response.includes('553'))) {
      errorType = 'EMAIL_REJECTED';
      errorMessage = 'Email rejeté par le serveur destinataire';
    }
    else if (error.responseCode === 552 || (error.response && error.response.includes('552'))) {
      errorType = 'MAILBOX_FULL';
      errorMessage = 'Boîte mail du destinataire pleine';
    }
    // Erreurs temporaires
    else if (error.responseCode === 421 || error.responseCode === 450 || error.responseCode === 451) {
      errorType = 'TEMPORARY_ERROR';
      errorMessage = 'Erreur temporaire, veuillez réessayer plus tard';
    }
    // Erreurs de quota/limite
    else if (error.responseCode === 554 || (error.response && error.response.includes('rate limit'))) {
      errorType = 'RATE_LIMIT_ERROR';
      errorMessage = 'Limite de taux d\'envoi atteinte';
    }
    // Timeout
    else if (error.message && error.message.includes('Timeout')) {
      errorType = 'TIMEOUT_ERROR';
      errorMessage = 'Timeout lors de l\'envoi de l\'email';
    }

    return {
      success: false,
      email: toEmail,
      errorType: errorType,
      errorMessage: errorMessage,
      errorCode: errorCode,
      serverResponse: error.response,
      failedAt: new Date().toISOString()
    };
  }
};