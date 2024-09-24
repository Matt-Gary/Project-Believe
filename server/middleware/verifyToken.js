const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    // Get the token from the request header
    const token = req.cookies.accessToken; // Access token from cookies
    if (!token) {
        return res.status(401).json({ message: "Access Denied" });
    }
    try {
        // Verify the token and extract the user data
        const decoded = jwt.verify(token, "secretkey");
        // Attach the decoded user data to the request object
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).json({ message: "Invalid Token" });
    }
}

// Export the function to use it in other files
module.exports = verifyToken;