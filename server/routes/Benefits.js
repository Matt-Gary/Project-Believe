const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const authorize = require('../middleware/authorize');
const { Partnerships, Users } = require('../models');
const verifyToken = require('../middleware/verifyToken'); // Import the middleware
const { sendWhatsappMessageToCompany, sendWhatsappMessageToUser } =require('../middleware/whatsapp')

// POST /benefits/claim/:benefitId
router.post('/claim/:benefitId', verifyToken, authorize(['USER', 'ADMIN']), async (req, res) => {
    // try {
    //     const { benefitId } = req.params;
    //     const userMatricula = req.user.matricula; // Assuming the matricula is still in the token

    //     // Fetch the user from the database
    //     const user = await Users.findOne({ where: { matricula: userMatricula } });

    //     if (!user) {
    //         return res.status(404).json({ message: 'User not found' });
    //     }

    //     const userEmail = user.email;
    //     const userName = user.username;

    //     console.log('User data:', { userEmail, userName, benefitId });

    //     // Fetch the partnership related to the benefit
    //     const partnership = await Partnerships.findByPk(benefitId);
    //     if (!partnership) {
    //         return res.status(404).json({ message: 'Benefit not found' });
    //     }

    //     console.log('Partnership data:', partnership);

    //     // Make sure companyEmail is not undefined
    //     if (!partnership.companyEmail) {
    //         return res.status(400).json({ message: 'Company email is missing' });
    //     }

    //     // Generate a random verification code
    //     const verificationCode = crypto.randomBytes(3).toString('hex');

    //     console.log('Sending verification code:', { userEmail, companyEmail: partnership.companyEmail, verificationCode, userName, companyName: partnership.companyName });

    //     // Send verification code to both the user and the company
    //     await sendVerificationCode(userEmail, partnership.companyEmail, verificationCode, userName, partnership.companyName);

    //     res.status(200).json({ message: 'Verification emails sent to both user and company' });
    // } catch (err) {
    //     console.error('Error in benefit claim:', err);
    //     res.status(500).json({ message: 'An error occurred', error: err.message });
    // }
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
      await sendWhatsappMessageToUser(userPhoneNumber, verificationCode);
      await sendWhatsappMessageToCompany(partnership.phoneNumber, verificationCode);

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