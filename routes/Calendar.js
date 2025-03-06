const express = require('express');
const router = express.Router();
const { Calendar } = require('../models'); // Import the Calendar model
const verifyToken = require('../middleware/verifyToken.js');
const authorize = require('../middleware/authorize.js');
const multer = require('multer');
require('dotenv').config();
const AWS = require('aws-sdk');

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

const s3 = new AWS.S3({
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS,
    region: AWS_REGION,
});

const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory as buffers

// Create a new event with optional photo upload
router.post('/create', verifyToken, authorize(['ADMIN']), upload.single('event_photo'), async (req, res) => {
    try {
        const { date, event_name, description } = req.body;
        const eventPhotoFile = req.file; // Uploaded file (if any)

        console.log('Received file:', eventPhotoFile); // Debugging line

        // Validate required fields
        if (!date || !event_name) {
            return res.status(400).json({ error: 'Date and event name are required' });
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
        }

        let eventPhotoUrl = null;

    // Upload photo to S3 if provided
    if (eventPhotoFile) {
        // Sanitize event name for S3 path (replace spaces and special characters)
        const sanitizedEventName = event_name
            .replace(/\s+/g, '_')          // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove special characters

        // Sanitize original filename
        const sanitizedFileName = eventPhotoFile.originalname
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_.-]/g, '');

        const fileName = `event_photos/${sanitizedEventName}/${Date.now()}_${sanitizedFileName}`;

        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: eventPhotoFile.buffer,
            ContentType: eventPhotoFile.mimetype,
            ACL: 'public-read',
        };

        const s3Response = await s3.upload(uploadParams).promise();
        eventPhotoUrl = s3Response.Location;
    }

        // Create the event
        const newEvent = await Calendar.create({
            date,
            event_name,
            description: description || null, // Optional field
            event_photo: eventPhotoUrl, // URL of the uploaded photo (or null if no photo)
        });

        // Return the created event
        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});


    // Get all events
    router.get('/', async (req, res) => {
        try {
            const events = await Calendar.findAll();
            res.status(200).json(events);
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({ error: 'Failed to fetch events' });
        }
    });

    // Get a single event by ID
    router.get('/:id', async (req, res) => {
        try {
            const event = await Calendar.findByPk(req.params.id);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }
            res.status(200).json(event);
        } catch (error) {
            console.error('Error fetching event:', error);
            res.status(500).json({ error: 'Failed to fetch event' });
        }
    });

    
    // DELETE EVENT BY ID
    router.delete('/:id', verifyToken, authorize(['ADMIN']), async (req, res) => {
        try {
            const eventId = req.params.id;

            // Find the event first to check if it exists
            const event = await Calendar.findByPk(eventId);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Delete the event photo from S3 (if it exists)
            if (event.event_photo) {
                const photoUrl = event.event_photo;
                const key = photoUrl.split(`https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`)[1];

                await s3.deleteObject({
                    Bucket: BUCKET_NAME,
                    Key: key,
                }).promise();
            }

            // Delete the event from the database
            await Calendar.destroy({
                where: { id: eventId }
            });

            res.status(200).json({ message: 'Event deleted successfully' });
        } catch (error) {
            console.error('Error deleting event:', error);
            res.status(500).json({ error: 'Failed to delete event' });
        }
    });
    // ./routes/Calendar.js

    // UPDATE EVENT BY ID
    router.put('/:id', verifyToken, authorize(['ADMIN']), upload.single('event_photo'), async (req, res) => {
        try {
            const eventId = req.params.id;
            const { date, event_name, description } = req.body;
            const eventPhotoFile = req.file;
        
            // Validate at least one field is provided
            if (!date && !event_name && !description && !eventPhotoFile) {
                return res.status(400).json({ error: 'No fields to update' });
            }
        
            // Fetch the existing event
            const existingEvent = await Calendar.findByPk(eventId);
            if (!existingEvent) {
                return res.status(404).json({ error: 'Event not found' });
            }
        
            // Validate date format (if date is being updated)
            if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
            }
        
            let eventPhotoUrl = existingEvent.event_photo;
        
            // Update photo if a new file is provided
            if (eventPhotoFile) {
                // Delete old photo from S3 (if it exists)
                if (existingEvent.event_photo) {
                    const oldKey = existingEvent.event_photo.split(`https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`)[1];
                    await s3.deleteObject({ Bucket: BUCKET_NAME, Key: oldKey }).promise();
                }
            
                // Upload new photo to S3
                const sanitizedEventName = (event_name || existingEvent.event_name)
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_-]/g, '');
                const sanitizedFileName = eventPhotoFile.originalname
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_.-]/g, '');
                const fileName = `event_photos/${sanitizedEventName}/${Date.now()}_${sanitizedFileName}`;
            
                const uploadParams = {
                    Bucket: BUCKET_NAME,
                    Key: fileName,
                    Body: eventPhotoFile.buffer,
                    ContentType: eventPhotoFile.mimetype,
                    ACL: 'public-read',
                };
            
                const s3Response = await s3.upload(uploadParams).promise();
                eventPhotoUrl = s3Response.Location;
            }
        
            // Prepare updated fields
            const updatedFields = {
                date: date || existingEvent.date,
                event_name: event_name || existingEvent.event_name,
                description: description || existingEvent.description,
                event_photo: eventPhotoUrl,
            };
        
            // Update the event in the database
            await Calendar.update(updatedFields, { where: { id: eventId } });
        
            // Fetch and return the updated event
            const updatedEvent = await Calendar.findByPk(eventId);
            res.status(200).json(updatedEvent);
        } catch (error) {
            console.error('Error updating event:', error);
            res.status(500).json({ error: 'Failed to update event' });
        }
    });

module.exports = router;