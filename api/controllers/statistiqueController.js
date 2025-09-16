const { Etudiants, Billets } = require('../models');
const { Op } = require('sequelize');

// Statistiques des étudiants par niveau
exports.getStatistiquesEtudiants = async (req, res) => {
  try {
    // Nombre d'étudiants qui ont payé par niveau
    const etudiantsPayeParNiveau = await Etudiants.findAll({
      attributes: [
        'niveau',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'nombre_paye']
      ],
      where: {
        has_payed: true
      },
      group: ['niveau'],
      raw: true
    });

    // Nombre total d'étudiants par niveau
    const totalEtudiantsParNiveau = await Etudiants.findAll({
      attributes: [
        'niveau',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total']
      ],
      group: ['niveau'],
      raw: true
    });

    // Combiner les résultats par niveau
    const statistiquesParNiveau = totalEtudiantsParNiveau.map(niveau => {
      const paye = etudiantsPayeParNiveau.find(p => p.niveau === niveau.niveau);
      return {
        niveau: niveau.niveau,
        total_etudiants: parseInt(niveau.total),
        etudiants_paye: paye ? parseInt(paye.nombre_paye) : 0,
        etudiants_non_paye: parseInt(niveau.total) - (paye ? parseInt(paye.nombre_paye) : 0)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        statistiques_par_niveau: statistiquesParNiveau
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques étudiants:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: error.message
    });
  }
};

// Statistiques des billets
exports.getStatistiquesBillets = async (req, res) => {
  try {
    // Nombre de billets valides
    const billetsValides = await Billets.count({
      where: {
        is_valide: true
      }
    });

    // Nombre de billets par type
    const billetsParType = await Billets.findAll({
      attributes: [
        'type_billet',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'nombre']
      ],
      group: ['type_billet'],
      raw: true
    });

    // Organiser les résultats par type
    const typeStats = {
      gratuit: 0,
      payant: 0,
      VIP: 0
    };

    billetsParType.forEach(type => {
      if (type.type_billet) {
        const typeLower = type.type_billet.toLowerCase();
        if (typeLower === 'gratuit') {
          typeStats.gratuit = parseInt(type.nombre);
        } else if (typeLower === 'payant') {
          typeStats.payant = parseInt(type.nombre);
        } else if (typeLower === 'vip') {
          typeStats.VIP = parseInt(type.nombre);
        }
      }
    });

    // Nombre total de billets
    const totalBillets = await Billets.count();

    res.status(200).json({
      success: true,
      data: {
        total_billets: totalBillets,
        billets_valides: billetsValides,
        billets_invalides: totalBillets - billetsValides,
        billets_par_type: typeStats
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques billets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: error.message
    });
  }
};

// Nombre d'étudiants qui possèdent un billet
exports.getEtudiantsAvecBillet = async (req, res) => {
  try {
    // Étudiants avec au moins un billet
    const etudiantsAvecBillet = await Etudiants.count({
      include: [{
        model: Billets,
        as: 'billets',
        required: true
      }]
    });

    // Total d'étudiants
    const totalEtudiants = await Etudiants.count();

    // Étudiants avec billet par niveau
    const etudiantsAvecBilletParNiveau = await Etudiants.findAll({
      attributes: [
        'niveau',
        [require('sequelize').fn('COUNT', require('sequelize').fn('DISTINCT', require('sequelize').col('Etudiants.id'))), 'nombre_avec_billet']
      ],
      include: [{
        model: Billets,
        as: 'billets',
        required: true,
        attributes: []
      }],
      group: ['niveau'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        total_etudiants: totalEtudiants,
        etudiants_avec_billet: etudiantsAvecBillet,
        etudiants_sans_billet: totalEtudiants - etudiantsAvecBillet,
        etudiants_avec_billet_par_niveau: etudiantsAvecBilletParNiveau.map(item => ({
          niveau: item.niveau,
          nombre_avec_billet: parseInt(item.nombre_avec_billet)
        }))
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des étudiants avec billet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: error.message
    });
  }
};

// Rapport complet de toutes les statistiques
exports.getRapportComplet = async (req, res) => {
  try {
    // Récupérer toutes les statistiques
    const [
      etudiantsStats,
      billetsStats,
      etudiantsAvecBilletStats
    ] = await Promise.all([
      // Statistiques étudiants par niveau
      Promise.all([
        Etudiants.findAll({
          attributes: [
            'niveau',
            [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'nombre_paye']
          ],
          where: { has_payed: true },
          group: ['niveau'],
          raw: true
        }),
        Etudiants.findAll({
          attributes: [
            'niveau',
            [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total']
          ],
          group: ['niveau'],
          raw: true
        })
      ]).then(([paye, total]) => {
        return total.map(niveau => {
          const payeData = paye.find(p => p.niveau === niveau.niveau);
          return {
            niveau: niveau.niveau,
            total_etudiants: parseInt(niveau.total),
            etudiants_paye: payeData ? parseInt(payeData.nombre_paye) : 0,
            etudiants_non_paye: parseInt(niveau.total) - (payeData ? parseInt(payeData.nombre_paye) : 0)
          };
        });
      }),

      // Statistiques billets
      Promise.all([
        Billets.count({ where: { is_valide: true } }),
        Billets.count(),
        Billets.findAll({
          attributes: [
            'type_billet',
            [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'nombre']
          ],
          group: ['type_billet'],
          raw: true
        })
      ]).then(([valides, total, parType]) => {
        const typeStats = { gratuit: 0, payant: 0, VIP: 0 };
        parType.forEach(type => {
          if (type.type_billet) {
            const typeLower = type.type_billet.toLowerCase();
            if (typeLower === 'gratuit') typeStats.gratuit = parseInt(type.nombre);
            else if (typeLower === 'payant') typeStats.payant = parseInt(type.nombre);
            else if (typeLower === 'vip') typeStats.VIP = parseInt(type.nombre);
          }
        });
        return {
          total_billets: total,
          billets_valides: valides,
          billets_invalides: total - valides,
          billets_par_type: typeStats
        };
      }),

      // Étudiants avec billets
      Promise.all([
        Etudiants.count({
          include: [{ model: Billets, as: 'billets', required: true }]
        }),
        Etudiants.count(),
        Etudiants.findAll({
          attributes: [
            'niveau',
            [require('sequelize').fn('COUNT', require('sequelize').fn('DISTINCT', require('sequelize').col('Etudiants.id'))), 'nombre_avec_billet']
          ],
          include: [{
            model: Billets,
            as: 'billets',
            required: true,
            attributes: []
          }],
          group: ['niveau'],
          raw: true
        })
      ]).then(([avecBillet, total, parNiveau]) => ({
        total_etudiants: total,
        etudiants_avec_billet: avecBillet,
        etudiants_sans_billet: total - avecBillet,
        etudiants_avec_billet_par_niveau: parNiveau.map(item => ({
          niveau: item.niveau,
          nombre_avec_billet: parseInt(item.nombre_avec_billet)
        }))
      }))
    ]);

    res.status(200).json({
      success: true,
      message: 'Rapport complet généré avec succès',
      data: {
        date_rapport: new Date().toISOString(),
        statistiques_etudiants: etudiantsStats,
        statistiques_billets: billetsStats,
        statistiques_etudiants_billets: etudiantsAvecBilletStats
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération du rapport complet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: error.message
    });
  }
};

exports.getTicketStats = async(req, res) => {
  try {
    const stats = await Billets.getTicketStats();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}