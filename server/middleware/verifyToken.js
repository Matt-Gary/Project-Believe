const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    // Get the token from the request header or cookies
    const token = req.cookies.accessToken || req.headers['authorization']?.split(" ")[1]; // Support for cookies or Authorization header (Bearer token)
    
    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        // Verify the token and extract the user data
        const decoded = jwt.verify(token, "secretkey");

        // Attach the decoded user data (including role) to the request object
        req.user = {
            matricula: decoded.matricula, // User's unique identifier
            role: decoded.role // User's role (e.g., ADMIN, USER)
        };

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).json({ message: "Invalid Token" });
    }
}

// Export the function to use it in other files
module.exports = verifyToken;