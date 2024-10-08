const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
    // Get the token from the request header or cookies
    const token = req.cookies.accessToken || req.headers['authorization']?.split(" ")[1]; // Support for cookies or Authorization header (Bearer token)
    
    if (!token) {
        // No token provided, treat the user as a guest
        console.log('No token provided');
        req.user = null; // Set req.user to null to signify guest access
        return next(); // Proceed to the next middleware or route handler
    }

    try {
        // Verify the token and extract the user data
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        console.log('Decoded token data:', decoded); // Log decoded data
        // Attach the decoded user data (including role) to the request object
        req.user = {
            matricula: decoded.matricula, // User's unique identifier
            email: decoded.email, // User's email
            username: decoded.username, // User's username
            role: decoded.role, // User's role (e.g., ADMIN, USER)
            phoneNumber: decoded.phoneNumber
        };

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).json({ message: "Invalid Token" });
    }
}

// Export the function to use it in other files
module.exports = verifyToken;