const { Billets, Etudiants } = require('../models');
const { Op } = require('sequelize');



exports.getAllBillets = async (req, res) => {
    try {
        const { page = 1, limit = 10, etudiant_id, valide } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (etudiant_id) where.etudiant_id = etudiant_id;
        if (valide !== undefined) where.is_valide = valide === 'true';

        const { count, rows } = await Billets.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: {
                model: Etudiants,
                as:'etudiants',
                attributes: ['id', 'nom', 'prenom', 'matricule']
            },
            order: [['date_achat', 'DESC']]
        });

        return res.json({
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            data: rows
        });
    } catch (error) {
        console.error('Erreur récupération billets:', error);
        return res.status(500).json({ error: 'Erreur serveur lors de la récupération' });
    }
};

exports.getBilletById = async (req, res) => {
    try {
        const { id } = req.params;
        const billet = await Billets.findByPk(id, {
            include: {
                model: Etudiants,
                as:'etudiants',
                attributes: ['id', 'nom', 'prenom', 'matricule']
            }
        });

        if (!billet) {
            return res.status(404).json({ error: 'Billet non trouvé' });
        }

        return res.json(billet);
    } catch (error) {
        console.error('Erreur récupération billet:', error);
        return res.status(500).json({ error: 'Erreur serveur lors de la récupération' });
    }
};

exports.createBillet = async (req, res) => {
    try {
        const { etudiant_id, ticket_code, date_achat, is_valide, evenement } = req.body;
        
        // Validation de base
        if (!etudiant_id || !ticket_code) {
            return res.status(400).json({ error: 'etudiant_id et ticket_code sont obligatoires' });
        }

        // Vérifier que l'étudiant existe
        const etudiant = await Etudiants.findByPk(etudiant_id);
        if (!etudiant) {
            return res.status(404).json({ error: 'Étudiant non trouvé' });
        }

        const billet = await Billets.create({
            etudiant_id,
            ticket_code,
            date_achat: date_achat || new Date(),
            is_valide: is_valide !== undefined ? is_valide : true,
            evenement
        });

        return res.status(201).json(billet);
    } catch (error) {
        console.error('Erreur création billet:', error);
        
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ error: 'ID étudiant invalide' });
        }
        
        return res.status(500).json({ error: 'Erreur serveur lors de la création' });
    }
};

exports.updateBillet = async (req, res) => {
    try {
        const { id } = req.params;
        const { etudiant_id, ticket_code, date_achat, is_valide, evenement } = req.body;

        const billet = await Billets.findByPk(id);
        if (!billet) {
            return res.status(404).json({ error: 'Billet non trouvé' });
        }

        // Vérifier que le nouvel étudiant existe si fourni
        if (etudiant_id) {
            const etudiant = await Etudiants.findByPk(etudiant_id);
            if (!etudiant) {
                return res.status(404).json({ error: 'Nouvel étudiant non trouvé' });
            }
        }

        await billet.update({
            etudiant_id,
            ticket_code,
            date_achat,
            is_valide,
            evenement
        });

        return res.json(billet);
    } catch (error) {
        console.error('Erreur mise à jour billet:', error);
        
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ error: 'ID étudiant invalide' });
        }
        
        return res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
    }
};

exports.deleteBillet = async (req, res) => {
    try {
        const { id } = req.params;
        const billet = await Billets.findByPk(id);

        if (!billet) {
            return res.status(404).json({ error: 'Billet non trouvé' });
        }

        await billet.destroy();
        return res.status(204).send();
    } catch (error) {
        console.error('Erreur suppression billet:', error);
        return res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
    }
};

exports.validerBillets = async (ids) => {
    try {
      // Si c'est un seul ID (nombre ou string)
      if (!Array.isArray(ids)) {
        const billet = await Billets.findByPk(ids);
        if (!billet) {
          throw new Error('Billet non trouvé');
        }
        
        billet.is_valide = true;
        await billet.save();
        return billet;
      }
      
      // Si c'est un tableau d'IDs
      const [affectedCount] = await Billets.update(
        { is_valide: true },
        {
          where: {
            id: ids
          }
        }
      );
      
      return affectedCount;
    } catch (error) {
      throw error;
    }
  }
