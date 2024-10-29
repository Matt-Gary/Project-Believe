const express = require('express');
const router = express.Router();
const { Tutorials, sequelize } = require('../models/index.js');
const { Op } = require('sequelize');
const verifyToken = require('../middleware/verifyToken.js');
const authorize = require('../middleware/authorize.js');
require('dotenv').config();

// Create a new tutorial
router.post("/create", verifyToken, authorize(['ADMIN']), async (req, res) => {
    // Extracting username, password, email, and matricula from the request body
    const { title, url, description, difficultyLevel} = req.body;

    try {
        //Check if a tutorial with the same url video already exists
        const existingTutorial = await Tutorials.findOne({ where: { url: url } });
        
        // Validation: Check if URL is already in use
        if (existingTutorial) {
            return res.status(400).json({error: "URL video is already used"})
        }

        // Create a new tutorial in the Tutorials table with the provided data
        title, url, description, difficultyLevel
        const tutorial = await Tutorials.create({
            title: title,
            url: url,
            description: description,
            difficultyLevel: difficultyLevel,
            createdAt: Date.now()
        });
        
        // Respond with success message
        return res.json("Tutorial has created successfully");

    } catch (error) {
        console.error("Error creating tutorial:", error);
        return res.status(500).json({ error: "An error occurred while creating the tutorial." });
    }
});


// get all created tutorials with optional filters, sorting, and pagination
router.get("/getAllTutorials", verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
    try {
        const { title, difficultyLevel, page = 1, pageSize = 10 } = req.query;

        // Create the where condition for optional filters
        const whereConditions = {};
        if (title) {
            whereConditions.title = { [Op.like]: `%${title}%` }; // Search by title (partial match)
        }
        if (difficultyLevel) {
            whereConditions.difficultyLevel = difficultyLevel; // Exact match for difficulty
        }

        // Calculate offset for pagination
        const offset = (page - 1) * pageSize;

        // Query tutorials with filters, sorting, and pagination
        const tutorials = await Tutorials.findAndCountAll({
            where: whereConditions,
            order: [
                ['title', 'ASC'], // Alphabetical order by title
                ['createdAt', 'DESC'] // Newest tutorials first by creation date
            ],
            limit: parseInt(pageSize), // Limit results per page
            offset: parseInt(offset) // Skip records for pagination
        });

        res.json({
            tutorials: tutorials.rows, // Return the results
            totalItems: tutorials.count, // Total number of tutorials
            currentPage: parseInt(page), // Current page
            totalPages: Math.ceil(tutorials.count / pageSize) // Total number of pages
        });
    } catch (error) {
        console.error("Error fetching all tutorials:", error);
        res.status(500).json({ message: "Server Error" + error });
    }
});

// Route to delete an existing tutorial
router.delete("/deleteById", verifyToken, authorize(['ADMIN']), async (req, res) => {
    // Extracting id from the request body
    const {id} = req.body;
    try {
        // Find the tutorial in the database by their id
        const tutorial = await Tutorials.findOne({where: {id}})

        // Validation: Check if the tutorial exists
        if(!tutorial) {
            return res.status(404).json({message: "Tutorial not found!"})    
        }

        const response = await Tutorials.destroy({where: {id: id}
        });

        return res.status(200).json({message: "Tutorial deleted sucessfully!"})
    } catch (error) {
        console.error("Get User Error in:", error)
        res.status(500).json({message: "Server Error"+ error})
    }
})

// Edit a existent tutorial
router.put("/updateById", verifyToken, authorize(['ADMIN']), async (req, res) => {

    const { id, title, url, description, difficultyLevel } = req.body;

    try {

        if(id == null || id.trim().length === 0){
            return res.status(400).json("The id can't be null or empty!");
        }

        //Get tutorial by id
        var tutorialUpdated = await Tutorials.findOne({ where: { id: id} });
        if(!tutorialUpdated){
            return res.status(400).json("The id don't have a tutorial registered!");
        }

        if (!(title == null || title.trim().length === 0)) {
            const existingTutorial = await Tutorials.findOne({ where: { title: title } });
            if(existingTutorial) {
                console.log("Title already exist!")    
            }else{
                //Update title
                tutorialUpdated.title = title
            }
        }

        if (!(url == null || url.trim().length === 0)) {
            const existingTutorial = await Tutorials.findOne({ where: { url: url } });
            if(existingTutorial) {
                console.log("URL already exist!")    
            }else{
                //Update url
                tutorialUpdated.url = url
            }
        }

        if (!(description == null || description.trim().length === 0)) {
            //Update description

            tutorialUpdated.description = description
        }

        if (!(difficultyLevel == null || difficultyLevel.trim().length === 0)) {
            //Update difficultyLevel
            tutorialUpdated.difficultyLevel = difficultyLevel
        }

        const [response] = await Tutorials.update(
            {
                title: tutorialUpdated.title,
                url: tutorialUpdated.url,
                description: tutorialUpdated.description,
                difficultyLevel: tutorialUpdated.difficultyLevel,
                updatedAt: Date.now()
            },
            {
                where: {
                    id: id
                }
            }
        );

        return res.status(200).json("Tutorial updated successfully!");
    } catch (error) {
        console.error("Error updating tutorial:", error);
        return res.status(500).json({ error: "An error occurred while updating the tutorial." + error });
    }
});

module.exports = router;
