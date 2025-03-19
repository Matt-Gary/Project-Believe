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
            matricula: decoded.matricula,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role,
            phoneNumber: decoded.phoneNumber,
            planType: decoded.planType, // Include plan type
            startDate: decoded.startDate, // Include start date
            endDate: decoded.endDate // Include end date
        };

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).json({ message: "Invalid Token" });
    }
}

// Export the function to use it in other files
module.exports = verifyToken;