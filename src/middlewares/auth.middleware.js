import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Log the entire request object for debugging (can be removed later)
      //   console.log(req);`

      // const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")

        // Extract the token from cookies or the Authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.split(' ')[1];

        // If no token is found, throw an Unauthorized error
        if (!token) {
            throw new ApiError(401, "Unauthorized request: No token provided");
        }

        // Verify the token with the secret key
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user in the database based on the token's payload
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // If no user is found, throw an Invalid Access Token error
        if (!user) {
            throw new ApiError(401, "Invalid Access Token: User not found");
        }

        // Attach the user to the request object
        req.user = user;
        next();
    } catch (error) {
        // Handle any errors, including invalid token or user not found
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
