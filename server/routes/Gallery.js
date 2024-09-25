const express = require('express');
const router = express.Router();
const { Events, Photos } = require('../models'); // Assuming your models are in the models directory
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middleware/verifyToken'); // Import the middleware
const fs = require('fs')

// Configure Multer storage for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/photos/'); // Folder to store uploaded photos
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp to prevent duplicate names
  }
});

const upload = multer({ storage: storage });

// POST route to create or update an event (with description)
router.post('/events',verifyToken, async (req, res) => {
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
    const photos = await Photos.findAll({ where: { event_id: eventId } });

    res.json({ 
      event,
      photos 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve event and photos' });
  }
});

  // DELETE route to delete an event by ID
router.delete('/events/:id', verifyToken, async (req, res) => {
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
router.post('/events/:id/photos', verifyToken, upload.array('photos', 30), async (req, res) => {
  try {
    const eventId = req.params.id;
    const photoFiles = req.files;

    const photos = photoFiles.map(file => ({
      event_id: eventId,
      photo_url: `/uploads/photos/${file.filename}`,
      photo_name: file.originalname,
    }));

    await Photos.bulkCreate(photos);

    res.json({ message: 'Photos uploaded successfully', photos });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// DELETE route to delete a specific photo by ID
router.delete('/photos/:id', verifyToken, async (req, res) => {
  try {
    const photoId = req.params.id;

    await Photos.destroy({ where: { id: photoId } });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// DELETE route to delete all photos for a specific event
router.delete('/events/:id/photos', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;

    // Step 1: Retrieve all photo file paths from the database
    const photos = await Photos.findAll({ where: { event_id: eventId } });

    // Step 2: Delete the files from the uploads/photos folder
    photos.forEach(photo => {
      const filePath = path.join(__dirname, '..', photo.photo_url); // Adjust the path to match your directory structure
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Failed to delete file ${filePath}: `, err);
        } else {
          console.log(`Successfully deleted file ${filePath}`);
        }
      });
    });

    // Step 3: Delete the photo records from the database
    await Photos.destroy({ where: { event_id: eventId } });

    res.json({ message: 'All photos for event deleted successfully' });
  } catch (error) {
    console.error('Error deleting photos: ', error);
    res.status(500).json({ error: 'Failed to delete photos' });
  }
});

// PUT route to modify the description of a specific event
router.put('/events/:id/description', verifyToken, async (req, res) => {
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
router.delete('/events/:id/description', verifyToken, async (req, res) => {
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