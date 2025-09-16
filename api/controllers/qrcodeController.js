require('dotenv').config();
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { Billets, Etudiants } = require('../models');
const { Op } = require('sequelize'); 

const JWT_SECRET = process.env.JWT_SECRET;
const {sendEmailWithQRCode}
 = require('../Services/emailSender')
function generateTicketCode() {
    return 'TICK-' + Math.random().toString(36).substring(2, 10).toUpperCase() +
           '-' + Date.now().toString(36).toUpperCase();
  }
  
  // Générer un billet + QR Code
  exports.generateQRCode = async (req, res) => {
    try {
      const { etudiant_id, evenement } = req.body;
  
      const etudiant = await Etudiants.findByPk(etudiant_id);
      if (!etudiant) {
        return res.status(404).json({ error: 'Étudiant non trouvé' });
      }
  
      const billet = await Billets.create({
        etudiant_id,
        ticket_code: generateTicketCode(),
        date_achat: new Date(),
        is_valide: true,
        evenement
      });
  
      const token = jwt.sign(
        {
          billet_id: billet.id,
          etudiant_id: billet.etudiant_id,
          ticket_code: billet.ticket_code,
          evenement: billet.evenement
        },
        process.env.JWT_SECRET,
        { expiresIn: '365d' }
      );

      await billet.update({
        token_code : token
    });
  
      
  
      return res.json({
        billet,
        token,
        message: 'QR code généré avec succès'
      });
    } catch (error) {
      console.error('Erreur QRCode:', error);
      return res.status(500).json({ error: 'Erreur lors de la génération du QR code' });
    }
  };
  
  // Validation d’un billet via le QR code
  exports.validateQRCode = async (req, res) => {
    try {
      const { token } = req.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const billet = await Billets.findOne({
        where: {
          id: decoded.billet_id,
          ticket_code: decoded.ticket_code,
          is_valide: true
        },
        include: [{
          model: Etudiants,
          as: 'etudiants', // Selon votre structure Sequelize
          attributes: ['matricule', 'nom', 'prenom', 'niveau']
        }]
      });
  
      if (!billet) {
        return res.status(400).json({ 
          isValid: false,
          error: 'Billet invalide ou déjà utilisé',
          message: 'Billet invalide ou déjà utilisé'
        });
      }
  
      // Marquer le billet comme utilisé
      await billet.update({ is_valide: false });
      
      console.log('Info etudiant:', billet);
  
      // Formatez correctement la réponse selon la structure attendue par le client
      const response = {
        isValid: true,
        message: 'Billet validé avec succès',
        billet: {
          id: billet.id,
          etudiant_id: billet.etudiant_id,
          ticket_code: billet.ticket_code,
          date_achat: billet.date_achat,
          is_valide: false, // Maintenant false car le billet a été utilisé
          evenement: billet.evenement,
          type_billet: billet.type_billet,
          // Mappage correct de l'étudiant selon votre structure Sequelize
          Student: billet.etudiants ? {
            matricule: billet.etudiants.matricule,
            nom: billet.etudiants.nom,
            prenom: billet.etudiants.prenom,
            niveau: billet.etudiants.niveau
          } : null
        }
      };
  
      return res.status(200).json(response);
  
    } catch (error) {
      console.error('Erreur validation QR:', error);
      
      let errorMessage = 'QR code invalide';
      let statusCode = 400;
  
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Le QR code a expiré';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Format de QR code invalide';
      }
  
      return res.status(statusCode).json({ 
        isValid: false,
        error: errorMessage,
        message: errorMessage
      });
    }
  };


exports.generateQRCodeForAllPaidStudents = async (req, res) => {
  try {

    const paidStudentsWithoutTickets = await Etudiants.findAll({
      where: {
        has_payed: true
      },
      include: [{
        model: Billets,
        as: 'billets',
        required: false // LEFT JOIN pour inclure les étudiants sans billets
      }]
    });

    const studentsWithoutTickets = paidStudentsWithoutTickets.filter(etudiant => 
      !etudiant.billets || etudiant.billets.length === 0
    );

    if (!studentsWithoutTickets.length) {
      return res.status(200).json({
        success: true,
        message: 'Aucun étudiant sans billet trouvé. Tous les étudiants payés ont déjà leurs billets.',
        details: [],
        total: 0,
        success_count: 0,
        failed_count: 0
      });
    }

    const results = [];
    const eventName = req.body.evenement || "RECPTNOV2025";
    const ticketType = req.body.type_billet || "payant";

    console.log(`Génération de billets pour ${studentsWithoutTickets.length} étudiants sans billet...`);

    // Traiter chaque étudiant sans billet
    for (const etudiant of studentsWithoutTickets) {
      try {
        const ticketCode = generateTicketCode();
 
        const billet = await Billets.create({
          etudiant_id: etudiant.id,
          ticket_code: ticketCode,
          date_achat: new Date(),
          is_valide: true,
          evenement: eventName,
          type_billet: ticketType,
          is_sent: false 
        });

        const token = jwt.sign(
          {
            billet_id: billet.id,
            etudiant_id: etudiant.id,
            ticket_code: ticketCode,
            evenement: eventName,
            matricule: etudiant.matricule
          },
          process.env.JWT_SECRET,
          { expiresIn: '365d' }
        );

        await billet.update({ token_code: token });

        results.push({
          etudiant_id: etudiant.id,
          matricule: etudiant.matricule,
          nom: `${etudiant.prenom} ${etudiant.nom}`,
          email: etudiant.email,
          ticket_code: ticketCode,
          evenement: eventName,
          type_billet: ticketType,
          status: 'success'
        });

        console.log(`Billet créé avec succès pour ${etudiant.matricule} - ${etudiant.prenom} ${etudiant.nom}`);

      } catch (error) {
        console.error(`Erreur pour l'étudiant ${etudiant.matricule}:`, error);
        results.push({
          etudiant_id: etudiant.id,
          matricule: etudiant.matricule,
          nom: `${etudiant.prenom} ${etudiant.nom}`,
          email: etudiant.email,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`Traitement terminé: ${successCount} billets créés, ${failedCount} échecs`);

    return res.status(200).json({
      success: true,
      message: 'Génération des billets terminée',
      details: results,
      total: studentsWithoutTickets.length,
      success_count: successCount,
      failed_count: failedCount,
      evenement: eventName
    });

  } catch (error) {
    console.error('Erreur globale lors de la génération des billets:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération des billets',
      details: error.message
    });
  }
};

/// Fonction principale améliorée pour l'envoi en masse
exports.generateAndSendQRcodes = async (req, res) => {
  try {
      console.log('🚀 Début du traitement des envois d\'emails...');

      // Récupérer tous les étudiants qui ont payé avec leurs billets non envoyés
      const etudiantsAvecBilletsNonEnvoyes = await Etudiants.findAll({
          where: { has_payed: true },
          include: [{
              model: Billets,
              as: 'billets',
              where: {
                  is_valide: true,
                  is_sent: false
              },
              required: true
          }]
      });

      if (!etudiantsAvecBilletsNonEnvoyes.length) {
          console.log('ℹ️ Aucun étudiant avec billet valide non envoyé trouvé.');
          return res.status(200).json({
              success: true,
              message: 'Aucun billet à envoyer',
              summary: {
                  total_processed: 0,
                  successful_sends: 0,
                  failed_sends: 0,
                  missing_emails: 0,
                  invalid_emails: 0
              },
              details: {
                  successful_emails: [],
                  failed_emails: [],
                  missing_emails: [],
                  invalid_emails: []
              }
          });
      }

      // Initialiser les compteurs et tableaux de résultats
      let successfulSends = [];
      let failedSends = [];
      let missingEmails = [];
      let invalidEmails = [];

      console.log(`📊 ${etudiantsAvecBilletsNonEnvoyes.length} étudiant(s) trouvé(s) avec billets à envoyer`);

      // Traiter chaque étudiant avec un délai pour éviter le spam
      for (let i = 0; i < etudiantsAvecBilletsNonEnvoyes.length; i++) {
          const etudiant = etudiantsAvecBilletsNonEnvoyes[i];
          
          console.log(`🔄 Traitement de l'étudiant ${i + 1}/${etudiantsAvecBilletsNonEnvoyes.length} - ${etudiant.prenom} ${etudiant.nom}`);

          for (const billet of etudiant.billets) {
              try {
                  // Vérifier si l'email existe
                  if (!etudiant.email || etudiant.email.trim() === '') {
                      missingEmails.push({
                          student_id: etudiant.matricule,
                          student_name: `${etudiant.prenom} ${etudiant.nom}`,
                          ticket_code: billet.ticket_code,
                          reason: 'Adresse email manquante'
                      });
                      console.log(`⚠️ Email manquant pour ${etudiant.prenom} ${etudiant.nom}`);
                      continue;
                  }

                  // Générer le QR code
                  const QRCode = require('qrcode');
                  const qrCode = await QRCode.toDataURL(billet.token_code, {
                      errorCorrectionLevel: 'M',
                      type: 'image/png',
                      quality: 0.92,
                      margin: 1,
                      color: {
                          dark: '#000000',
                          light: '#FFFFFF'
                      }
                  });

                  // Tentative d'envoi
                  const emailResult = await sendEmailWithQRCode(
                      etudiant.email,
                      `${etudiant.prenom} ${etudiant.nom}`,
                      billet.evenement,
                      qrCode,
                      billet.ticket_code
                  );

                  if (emailResult.success) {
                      // Marquer le billet comme envoyé SEULEMENT après envoi réussi
                      await billet.update({ 
                          is_sent: true,
                          sent_at: new Date()
                      });
                      
                      successfulSends.push({
                          email: etudiant.email,
                          student_id: etudiant.matricule,
                          student_name: `${etudiant.prenom} ${etudiant.nom}`,
                          ticket_code: billet.ticket_code,
                          message_id: emailResult.messageId,
                          sent_at: emailResult.sentAt
                      });

                      console.log(`✅ QR code envoyé avec succès à ${etudiant.email} pour le billet ${billet.ticket_code}`);
                  } else {
                      // Catégoriser les échecs
                      if (emailResult.errorType === 'INVALID_EMAIL_FORMAT' || 
                          emailResult.errorType === 'DOMAIN_NOT_EXIST') {
                          invalidEmails.push({
                              email: etudiant.email,
                              student_id: etudiant.matricule,
                              student_name: `${etudiant.prenom} ${etudiant.nom}`,
                              ticket_code: billet.ticket_code,
                              error_type: emailResult.errorType,
                              error_message: emailResult.errorMessage,
                              failed_at: emailResult.failedAt
                          });
                      } else {
                          failedSends.push({
                              email: etudiant.email,
                              student_id: etudiant.matricule,
                              student_name: `${etudiant.prenom} ${etudiant.nom}`,
                              ticket_code: billet.ticket_code,
                              error_type: emailResult.errorType,
                              error_message: emailResult.errorMessage,
                              error_code: emailResult.errorCode,
                              server_response: emailResult.serverResponse,
                              failed_at: emailResult.failedAt
                          });
                      }

                      console.error(`❌ Échec d'envoi à ${etudiant.email} pour le billet ${billet.ticket_code}: ${emailResult.errorMessage}`);
                  }

                  // Délai entre les envois pour éviter les limitations
                  if (i < etudiantsAvecBilletsNonEnvoyes.length - 1) {
                      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondes
                  }

              } catch (error) {
                  failedSends.push({
                      email: etudiant.email || 'N/A',
                      student_id: etudiant.matricule,
                      student_name: `${etudiant.prenom} ${etudiant.nom}`,
                      ticket_code: billet.ticket_code,
                      error_type: 'PROCESSING_ERROR',
                      error_message: error.message,
                      failed_at: new Date().toISOString()
                  });

                  console.error(`💥 Erreur de traitement pour ${etudiant.matricule}:`, error.message);
              }
          }
      }

      // Préparer la réponse détaillée
      const totalProcessed = successfulSends.length + failedSends.length + missingEmails.length + invalidEmails.length;
      const successRate = totalProcessed > 0 ? Math.round((successfulSends.length / totalProcessed) * 100) : 0;
      
      console.log(`\n📋 === RÉSUMÉ DU TRAITEMENT ===`);
      console.log(`📊 Total traité: ${totalProcessed}`);
      console.log(`✅ Envois réussis: ${successfulSends.length}`);
      console.log(`❌ Envois échoués: ${failedSends.length}`);
      console.log(`📧 Emails manquants: ${missingEmails.length}`);
      console.log(`🚫 Emails invalides: ${invalidEmails.length}`);
      console.log(`📈 Taux de succès: ${successRate}%`);

      return res.status(200).json({
          success: true,
          message: 'Traitement terminé',
          summary: {
              total_processed: totalProcessed,
              successful_sends: successfulSends.length,
              failed_sends: failedSends.length,
              missing_emails: missingEmails.length,
              invalid_emails: invalidEmails.length,
              success_rate: successRate
          },
          details: {
              successful_emails: successfulSends,
              failed_emails: failedSends,
              missing_emails: missingEmails,
              invalid_emails: invalidEmails
          },
          processed_at: new Date().toISOString()
      });

  } catch (error) {
      console.error('💥 Erreur critique lors du traitement:', error);
      return res.status(500).json({
          success: false,
          message: 'Erreur critique lors du traitement',
          error: {
              type: 'SYSTEM_ERROR',
              message: error.message,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
              occurred_at: new Date().toISOString()
          }
      });
  }
};