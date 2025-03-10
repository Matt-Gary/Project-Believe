const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const authorize = require('../middleware/authorize');
const { Partnerships, Users, sequelize } = require('../models');
const verifyToken = require('../middleware/verifyToken'); // Import the middleware
const { sendWhatsappMessageToCompany, sendWhatsappMessageToUser } =require('../middleware/whatsapp')
const multer = require("multer")
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const multerSharpS3 = require('multer-sharp-s3');

const BUCKET_NAME = process.env.S3_BUCKET_NAME
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS = process.env.AWS_SECRET_ACCESS_KEY
const AWS_REGION = process.env.AWS_REGION


const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_ACCESS,
  region: AWS_REGION,
});

const upload = multer({storage: multer.memoryStorage()}) 

// POST /benefits/claim/:benefitId
router.post('/claim/:benefitId', verifyToken, authorize(['USER', 'ADMIN']), async (req, res) => {
    try {
      const { benefitId } = req.params;
      const userMatricula = req.user.matricula; // Extracting user matricula from token
      const userPhoneNumber = req.user.phoneNumber; // Extracting phoneNumber from token

      // Fetch the user from the database
      const user = await Users.findOne({ where: { matricula: userMatricula } });

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      const userEmail = user.email;
      const userName = user.username;

      console.log('User data:', { userEmail, userName, userPhoneNumber, benefitId });

      // Fetch the partnership related to the benefit
      const partnership = await Partnerships.findByPk(benefitId);
      if (!partnership) {
          return res.status(404).json({ message: 'Benefit not found' });
      }

      console.log('Partnership data:', partnership);

      // Make sure companyPhone is not undefined
      if (!partnership.phoneNumber) {
          return res.status(400).json({ message: 'Company phone number is missing' });
      }

      // Generate a 6-digit random verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      console.log('Sending verification code:', {
          userPhoneNumber,
          companyPhone: partnership.phoneNumber,
          verificationCode,
          userName,
          companyName: partnership.companyName
      });

      // Send verification code to both the user and the company (via SMS/WhatsApp or any other system)
      await sendWhatsappMessageToUser(userPhoneNumber, verificationCode, partnership.companyName);
      await sendWhatsappMessageToCompany(partnership.phoneNumber, verificationCode, userName);

      res.status(200).json({ message: 'Verification code sent to both user and company' });
  } catch (err) {
      console.error('Error in benefit claim:', err);
      res.status(500).json({ message: 'An error occurred', error: err.message });
  }
});



// CREATE - Add a new partnership
router.post('/', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const { companyName, companyEmail, discount, description, phoneNumber } = req.body;
    const newPartnership = await Partnerships.create({
      companyName,
      companyEmail,
      discount,
      description,
      phoneNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json(newPartnership);
  } catch (error) {
    console.error('Error creating partnership:', error);
    res.status(500).json({ error: 'Failed to create partnership', details: error.message });
  }
});

// POST route to update partnership logo
router.post('/update-logo/:id', verifyToken, authorize(['ADMIN']), upload.single('logo'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const partnershipId = req.params.id;
    const logoFile = req.file;

    // Check if a file was uploaded
    if (!logoFile) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No logo uploaded' });
    }

    // Find the partnership by ID
    const partnership = await Partnerships.findOne({ where: { id: partnershipId }, transaction });
    if (!partnership) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Partnership not found' });
    }

    // Delete old logo if it exists
    if (partnership.companyLogo) {
      try {
        await s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: partnership.companyLogo
        }).promise();
      } catch (deleteErr) {
        console.error('Error deleting old logo:', deleteErr);
      }
    }

    // Generate a unique filename for the new logo
    const fileName = `partnerships/${partnershipId}/logo_${partnershipId}_${Date.now()}_${logoFile.originalname}`;

    // Upload the new logo to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: logoFile.buffer,
      ContentType: logoFile.mimetype,
      ACL: 'public-read' // Remove if bucket policies block ACLs
    };

    const s3Response = await s3.upload(uploadParams).promise();

    // Update the partnership with the new logo key
    partnership.companyLogo = fileName;
    await partnership.save({ transaction, fields: ['companyLogo'] });

    await transaction.commit();

    res.json({ 
      message: 'Partnership logo updated successfully', 
      logoUrl: s3Response.Location 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update logo error:', error);
    res.status(500).json({ 
      error: 'Partnership logo update failed',
      details: error.message 
    });
  }
});

// READ - Get all partnerships
router.get('/', async (req, res) => {
  try {
    const partnerships = await Partnerships.findAll();
    res.json(partnerships);
  } catch (error) {
    console.error('Error fetching partnerships:', error);
    res.status(500).json({ error: 'Failed to fetch partnerships' });
  }
});

// READ - Get a single partnership by ID
router.get('/:id', async (req, res) => {
  try {
    const partnership = await Partnerships.findByPk(req.params.id);
    if (partnership) {
      res.json(partnership);
    } else {
      res.status(404).json({ error: 'Partnership not found' });
    }
  } catch (error) {
    console.error('Error fetching partnership:', error);
    res.status(500).json({ error: 'Failed to fetch partnership' });
  }
});

// UPDATE - Update a partnership
router.put('/:id', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const { companyName, companyEmail, discount, description } = req.body;
    const [updated] = await Partnerships.update(
      {
        companyName,
        companyEmail,
        discount,
        description,
        updatedAt: new Date()
      },
      { where: { id: req.params.id } }
    );
    if (updated) {
      const updatedPartnership = await Partnerships.findByPk(req.params.id);
      res.json(updatedPartnership);
    } else {
      res.status(404).json({ error: 'Partnership not found' });
    }
  } catch (error) {
    console.error('Error updating partnership:', error);
    res.status(500).json({ error: 'Failed to update partnership', details: error.message });
  }
});
// DELETE route to remove partnership logo

router.delete('/delete-logo/:id', verifyToken, authorize(['ADMIN']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const partnershipId = req.params.id;

    // Find the partnership by ID
    const partnership = await Partnerships.findOne({ where: { id: partnershipId }, transaction });
    if (!partnership) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Parceria não encontrada' });
    }

    // Check if the partnership has a logo
    if (!partnership.companyLogo) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Nenhum logo encontrado para esta parceria' });
    }

    // Delete the logo from S3
    try {
      await s3.deleteObject({
        Bucket: BUCKET_NAME,
        Key: partnership.companyLogo
      }).promise();
    } catch (deleteErr) {
      console.error('Erro ao excluir o logo do S3:', deleteErr);
      await transaction.rollback();
      return res.status(500).json({ error: 'Falha ao excluir o logo do S3' });
    }

    // Update the partnership to remove the logo reference
    partnership.companyLogo = null;
    await partnership.save({ transaction, fields: ['companyLogo'] });

    await transaction.commit();

    res.json({ message: 'Logo da parceria excluído com sucesso' });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao excluir o logo:', error);
    res.status(500).json({ 
      error: 'Falha ao excluir o logo da parceria',
      details: error.message 
    });
  }
});
// DELETE - Delete a partnership
router.delete('/:id', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const deleted = await Partnerships.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Partnership deleted successfully' });
    } else {
      res.status(404).json({ error: 'Partnership not found' });
    }
  } catch (error) {
    console.error('Error deleting partnership:', error);
    res.status(500).json({ error: 'Failed to delete partnership' });
  }
});

module.exports = router;