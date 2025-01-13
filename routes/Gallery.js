const express = require('express');
const router = express.Router();
const { Events, Photos, sequelize } = require('../models'); // Assuming your models are in the models directory
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middleware/verifyToken'); // Import the middleware
const fs = require('fs')
const stream = require('stream')
const { google } = require('googleapis'); //google DRIVE API
const authorize = require('../middleware/authorize'); //authorization middleware
const axios = require('axios'); 

// // Configure Multer storage for photo uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/photos/'); // Folder to store uploaded photos
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp to prevent duplicate names
//   }
// });
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URL = process.env.REDIRECT_URL

const REFRESH_TOKEN = process.env.REFRESH_TOKEN

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
)

oauth2Client.setCredentials({refresh_token: REFRESH_TOKEN})

const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
})

const upload = multer({storage: multer.memoryStorage()}) //upload middleware that had object storage determining where we want to store the image, This ensures files are stored as buffer

// POST route to create or update an event (with description)
router.post('/events',verifyToken, authorize(['ADMIN']), async (req, res) => {
    try {
      const { id, name, description, event_date } = req.body;

      // Log the request body for debugging purposes
      console.log(req.body);
  
      // If id exists, update the event, otherwise create a new event
      const event = await Events.upsert({
        id: id ? id : null,
        name,
        description,
        event_date,
      });
  
      res.json({ message: 'Event created/updated successfully', event });
    } catch (error) {
      console.log(error); // Log the error
      res.status(500).json({ error: 'Failed to create/update event' });
    }
  });



// GET route to display the details of a specific event with description and photos
router.get('/events/:id', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;

    // Fetch the event details
    const event = await Events.findOne({ where: { id: eventId } });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Fetch the associated photos for the event
    let photos;
    
    if (req.user) {
      // Logged-in user: Show both public and private photos
      photos = await Photos.findAll({ 
        where: { 
          event_id: eventId
        }
      });
    } else {
      // Guest: Show only public photos
      photos = await Photos.findAll({
        where: {
          event_id: eventId,
          visibility: 'PUBLIC' // Only fetch public photos for guests
        }
      });
    }

    res.json({ 
      event,
      photos 
    });
  } catch (error) {
    console.error('Error retrieving event and photos:', error);
    res.status(500).json({ error: 'Failed to retrieve event and photos', details: error.message });
  }
});

  // DELETE route to delete an event by ID
router.delete('/events/:id', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const eventId = req.params.id;

    // Delete the event and associated photos
    await Events.destroy({ where: { id: eventId } });
    await Photos.destroy({ where: { event_id: eventId } });

    res.json({ message: 'Event and associated photos deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST route to upload photos to a specific event
router.post('/events/:id/photos', verifyToken, authorize(['ADMIN']), upload.array('photos', 30), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const eventId = req.params.id;
    const photoFiles = req.files;
    const { visibility } = req.body;

    if (!photoFiles || photoFiles.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    const visibilityFlags = Array.isArray(visibility) ? visibility : [visibility];
    const photos = [];

    for (const [index, photoFile] of photoFiles.entries()) {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(photoFile.buffer);

      const driveResponse = await drive.files.create({
        requestBody: {
          name: `event_${eventId}_${Date.now()}_${photoFile.originalname}`,
          mimeType: photoFile.mimetype,
        },
        media: {
          mimeType: photoFile.mimetype,
          body: bufferStream,
        },
      });

      await drive.permissions.create({
        fileId: driveResponse.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const fileUrl = `https://drive.google.com/uc?id=${driveResponse.data.id}`;

      photos.push({
        event_id: eventId,
        drive_file_id: driveResponse.data.id,
        photo_url: fileUrl,
        photo_name: photoFile.originalname,
        visibility: visibilityFlags[index] === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
      });
    }

    await Photos.bulkCreate(photos, { transaction });
    await transaction.commit();

    res.json({ message: 'Photos uploaded successfully', photos });
  } catch (error) {
    await transaction.rollback();
    console.error('Error uploading photos:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});
//Get photos from particular event
// GET route to fetch photos for a specific event
router.get('/events/:id/photos', verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
  try {
    const eventId = req.params.id;

    // Fetch all photos associated with the event ID
    const photos = await Photos.findAll({
      where: { event_id: eventId },
      attributes: ['id', 'photo_url', 'photo_name', 'visibility', 'createdAt'], // Fetch necessary attributes
    });

    // Check if photos exist for the event
    if (!photos || photos.length === 0) {
      return res.status(404).json({ message: 'No photos found for this event' });
    }

    // Respond with the list of photos
    res.status(200).json({ photos });
  } catch (error) {
    console.error('Error fetching event photos:', error);
    res.status(500).json({ error: 'Failed to fetch event photos' });
  }
});

router.put('/photos/:id/visibility', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const photoId = req.params.id;
    const { visibility } = req.body;

    if (!['PUBLIC', 'PRIVATE'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility value. Must be either PUBLIC or PRIVATE.' });
    }

    const photo = await Photos.findOne({ where: { id: photoId } });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    photo.visibility = visibility;
    await photo.save();

    res.json({ message: 'Photo visibility updated successfully', photo });
  } catch (error) {
    console.error('Error updating photo visibility:', error);
    res.status(500).json({ error: 'Failed to update photo visibility' });
  }
});
// DELETE route to delete a specific photo by ID
router.delete('/photos/:id', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const photoId = req.params.id;

    // Find the photo record in the database
    const photo = await Photos.findOne({ where: { id: photoId } });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const driveFileId = photo.drive_file_id;

    // Delete the photo from Google Drive
    try {
      await drive.files.delete({ fileId: driveFileId });
      console.log(`Photo deleted from Google Drive: ${driveFileId}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn(`File not found in Google Drive: ${driveFileId}`);
      } else {
        throw error;
      }
    }

    // Delete the photo record from the database
    await Photos.destroy({ where: { id: photoId } });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// DELETE route to delete all photos for a specific event
router.delete('/events/:id/photos', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const eventId = req.params.id;

    // Find all photos for the event
    const photos = await Photos.findAll({ where: { event_id: eventId } });

    // Delete each photo from Google Drive and the database
    for (const photo of photos) {
      try {
        await drive.files.delete({ fileId: photo.drive_file_id });
        console.log(`Photo deleted from Google Drive: ${photo.drive_file_id}`);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.warn(`File not found in Google Drive: ${photo.drive_file_id}`);
        } else {
          throw error;
        }
      }
    }

    // Delete all photo records from the database
    await Photos.destroy({ where: { event_id: eventId } });

    res.json({ message: 'All photos for event deleted successfully' });
  } catch (error) {
    console.error('Error deleting photos:', error);
    res.status(500).json({ error: 'Failed to delete photos' });
  }
});


// PUT route to modify the description of a specific event
router.put('/events/:id/description', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const eventId = req.params.id;
    const { description } = req.body;

    // Update the event's description
    const event = await Events.findOne({ where: { id: eventId } });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.description = description;
    await event.save();

    res.json({ message: 'Event description updated successfully', event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event description' });
  }
});

// DELETE route to delete the description of a specific event (set description to null)
router.delete('/events/:id/description', verifyToken, authorize(['ADMIN']), async (req, res) => {
  try {
    const eventId = req.params.id;

    // Set the event's description to null
    const event = await Events.findOne({ where: { id: eventId } });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.description = null;
    await event.save();

    res.json({ message: 'Event description deleted successfully', event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event description' });
  }
});

module.exports = router;