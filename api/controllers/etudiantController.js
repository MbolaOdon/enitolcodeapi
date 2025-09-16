const { Etudiants, Billets, sequelize } = require('../models');
const { Op, Sequelize } = require('sequelize');

exports.createEtudiant = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { matricule, nom, prenom, niveau, email } = req.body;
        
        // Validation améliorée
        if (!matricule || !nom || !prenom || !niveau || !email) {
            await transaction.rollback();
            return res.status(400).json({ 
                error: 'Tous les champs sont obligatoires',
                requiredFields: ['matricule', 'nom', 'prenom', 'niveau', 'email']
            });
        }

        const etudiant = await Etudiants.create({
            matricule,
            nom,
            prenom,
            niveau,
            email,
            has_payed: false
        }, { transaction });

        await transaction.commit();
        return res.status(201).json(etudiant);
    } catch (error) {
        await transaction.rollback();
        console.error('Erreur création étudiant:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                error: 'Le matricule ou email doit être unique',
                details: error.errors.map(err => err.message)
            });
        }
        
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la création',
            details: error.message 
        });
    }
};

exports.getAllEtudiants = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, niveau, has_payed } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where[Op.or] = [
                { nom: { [Op.iLike]: `%${search}%` } },
                { prenom: { [Op.iLike]: `%${search}%` } },
                { matricule: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (niveau) {
            where.niveau = niveau;
        }
        if(has_payed){
          where.has_payed = has_payed;
        }

        const { count, rows } = await Etudiants.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['nom', 'ASC']],
            include: {
                model: Billets,
                as: 'billets',
                attributes: ['id', 'ticket_code', 'is_valide']
            }
        });

        return res.json({
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            data: rows
        });
    } catch (error) {
        console.error('Erreur récupération étudiants:', error);
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la récupération',
            details: error.message 
        });
    }
};

exports.getEtudiantById = async (req, res) => {
    try {
        const { id } = req.params;
        const etudiant = await Etudiants.findByPk(id, {
            include: {
                model: Billets,
                as: 'Billets',
                attributes: ['id', 'ticket_code', 'is_valide', 'evenement', 'type_billet']
            }
        });

        if (!etudiant) {
            return res.status(404).json({ 
                error: 'Étudiant non trouvé',
                details: `Aucun étudiant avec l'ID ${id}`
            });
        }

        return res.json(etudiant);
    } catch (error) {
        console.error('Erreur récupération étudiant:', error);
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la récupération',
            details: error.message 
        });
    }
};

exports.updateEtudiant = async (req, res) => {
    const transaction = await sequelize.transaction();
    let isCommitted = false;
    
    try {
      const { id } = req.params;
      const { matricule, nom, prenom, niveau, email, has_payed } = req.body;
      
      console.log(`Requête de mise à jour pour étudiant ${id}`, req.body);
      
      // Récupérer l'étudiant avec ses billets
      const etudiant = await Etudiants.findByPk(id, {
        include: [{
          model: Billets,
          as: 'billets'
        }],
        transaction
      });
      
      if (!etudiant) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'Étudiant non trouvé',
          details: `Aucun étudiant avec l'ID ${id}`
        });
      }
      
      console.log('Étudiant actuel:', etudiant.toJSON());
      console.log('Billets associés:', etudiant.billets?.length || 0, 'billet(s)');
      
      // Construire l'objet de mise à jour
      const updates = {};
      const fieldsToUpdate = { matricule, nom, prenom, niveau, email, has_payed };
      
      Object.entries(fieldsToUpdate).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      // Gestion des billets en fonction du statut de paiement
      if (has_payed !== undefined) {
        await updateBilletsStatus(etudiant, has_payed, transaction);
      }
      
      // Mettre à jour l'étudiant
      await etudiant.update(updates, { transaction });
      await transaction.commit();
      isCommitted = true;
      
      // Récupérer et retourner l'étudiant mis à jour
      const updatedEtudiant = await Etudiants.findByPk(id, {
        include: [{
          model: Billets,
          as: 'billets'
        }]
      });
      
      return res.json(updatedEtudiant.toJSON());
      
    } catch (error) {
      await handleTransactionError(transaction, isCommitted);
      return handleErrorResponse(error, res);
    }
  };
  
  // Fonction helper pour mettre à jour le statut des billets
  async function updateBilletsStatus(etudiant, hasPayed, transaction) {
    const billetsStatus = hasPayed;
    console.log(`Mise à jour des billets vers: ${billetsStatus ? 'valide' : 'invalide'}`);
    
    let updatedCount = 0;
    
    // Méthode 1: Via l'association (recommandée)
    if (etudiant.billets?.length > 0) {
      await Promise.all(
        etudiant.billets.map(billet =>
          billet.update({ is_valide: billetsStatus }, { transaction })
        )
      );
      updatedCount = etudiant.billets.length;
      console.log(`${updatedCount} billet(s) mis à jour via association`);
    } 
    // Méthode 2: Via une requête directe
    else {
      const [count] = await Billets.update(
        { is_valide: billetsStatus },
        {
          where: { etudiant_id: etudiant.id },
          transaction
        }
      );
      updatedCount = count;
      console.log(`${updatedCount} billet(s) mis à jour via requête directe`);
    }
    
    return updatedCount;
  }
  
  // Fonction helper pour gérer les erreurs de transaction
  async function handleTransactionError(transaction, isCommitted) {
    if (!isCommitted) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Erreur lors du rollback:', rollbackError.message);
      }
    }
  }
  
  // Fonction helper pour gérer les réponses d'erreur
  function handleErrorResponse(error, res) {
    console.error('Erreur détaillée:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Erreur de contrainte unique
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Le matricule ou email doit être unique',
        details: error.errors.map(err => err.message)
      });
    }
    
    // Erreur de validation
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Erreur de validation',
        details: error.errors.map(err => err.message)
      });
    }
    
    // Erreur générique
    return res.status(500).json({
      error: 'Erreur serveur lors de la mise à jour',
      details: error.message
    });
  }
exports.deleteEtudiant = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const etudiant = await Etudiants.findByPk(id, { transaction });

        if (!etudiant) {
            await transaction.rollback();
            return res.status(404).json({ 
                error: 'Étudiant non trouvé',
                details: `Aucun étudiant avec l'ID ${id}`
            });
        }

        // Supprimer d'abord les billets associés
        await Billets.destroy({ 
            where: { etudiant_id: id },
            transaction 
        });

        await etudiant.destroy({ transaction });
        await transaction.commit();
        
        return res.status(204).send();
    } catch (error) {
        await transaction.rollback();
        console.error('Erreur suppression étudiant:', error);
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la suppression',
            details: error.message 
        });
    }
};

// Méthode pour valider les billets
const validerBillets = async (etudiantId, transaction) => {
    try {
        const [affectedCount] = await Billets.update(
            { is_valide: true },
            {
                where: { etudiant_id: etudiantId },
                transaction
            }
        );
        return affectedCount;
    } catch (error) {
        console.error('Erreur validation billets:', error);
        throw error;
    }
};