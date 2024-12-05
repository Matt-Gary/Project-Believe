function authorize(allowedRoles = []) {
    return (req, res, next) => {
        // Check if req.user exists
        if (!req.user) {
            return res.status(401).json({ message: 'Authorization token required' });
        }
        
        const userRole = req.user.role;  // Extract the role from the JWT token

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Access denied: insufficient permissions' });
        }

        next(); // Proceed if the user has the required role
    };
}

module.exports = authorize;