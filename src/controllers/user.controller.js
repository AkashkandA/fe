import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js";
import { subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken =    user.generateRefreshToken();
        user.refreshToken = refreshToken

        await user.save({validateBeforeSave: false })

        return{accessToken,refreshToken}


    } catch (error){

        throw new ApiError(500,"Something went wrong while generating referesh and access token")
    }
}




const registerUser = asyncHandler(async (req, res) => {
  // Extract fields from the request body

//   console.log(req);
  const { fullname, email, username, password } = req.body;

  // Validate required fields
  if ([fullname, email, username, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All Fields are required");
  }

  // Check if a user already exists with the given username or email
  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
//   console.log(req.files);

  // Handle file upload
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Upload files to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;
 
//   console.log(avatar);
  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  // Create user object and save it to the database
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Fetch the created user without password and refresh token fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }


  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  );
});

const loginUser =asyncHandler(async(req,res)=>{ 
  
   

    const { email, username, password } = req.body;

    // console.log('Email:', email);
    // console.log('Username:', username);
    // console.log('Password:', password);

    if (!username && !email) {
        return res.status(400).json({ error: 'Username or email is required' });
    }
  
    const user = await  User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials")
}

   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).
   select("-password -refreshToken")

   const options ={
        httpOnly: true,
        secure: true
   }

   return res.status(200).cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(200,{
        user:loggedInUser,accessToken,refreshToken
    },
    "User logged In Successfully"

    
    )
   )




})

const logoutUser = asyncHandler(async(req,res)=>{

  User.findByIdAndUpdate(
    req.user._id,
    {
      $unset:{
        refreshToken: 1
      }
      
    }
    ,{
      new:true
    }
  )

  const options ={
    httpOnly: true,
    secure: true
}

return res
.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken",options)
.json(new ApiResponse(200,{},"User logged out successfully"))

});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "Strict", // optional, but recommended for security
    };

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Update the user's refresh token in the database
    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    // Handle token verification or other errors
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});

const updateAccountDetails = asyncHandler(async(req,res)=>{

  const {fullname, email} =  req.body

  if(!fullname || !email){
    throw new ApiError(400, "All fields are required")
  }

 const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
      fullname:fullname,
      email:email
    }
  },
    {new:true}
  ).select("-password")
  // user.save(user)

  return res.status(200)
  .json(new ApiResponse(200,user,"Account details updated Successfully"

  ));


})

const updateUserAvatar = asyncHandler(async(req,res)=>{
   
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary
  (avatarLocalPath)
  
  if(!avatar.url){
    throw new ApiError(400,"Error while uplaoding on avator"

    )
  };
    const user = await User.findByIdAndUpdate(
     req.user?._id,
     {
       $set:{
         avatar:avatar.url
       }
     },
     {new:true},
   
   ).select(-password)

   return res.status(200)
   .json(new ApiResponse(200,user,"Account details updated Successfully"
 
   ));

 }) 

 const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Check if the necessary fields are provided
  if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required (currentPassword, newPassword, confirmPassword).' });
  }

  // Find the user by ID
  const user = await User.findById(req.user?._id);

  if (!user) {
      return res.status(404).json({ error: 'User not found.' });
  }

  // Check if the current password is correct
  const isCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isCorrect) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  // Check if the new password matches the confirmation password
  if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match.' });
  }


  user.password = newPassword; 
  await user.save();

  res.status(200).json({ message: 'Password successfully updated.' });
});


 const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
      throw new ApiError(400,"coverImage file is missing")
    }
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url){
    throw new ApiError(400,"Error while uploading cover image ")
  }
   
 const user =  await User.findByIdAndUpdate(
    req.user?._id,
    
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {new:true}
  .select(-password)
  )

  return res.status(200)
   .json(new ApiResponse(200,user,"coverImage updated Successfully"
 
   ));

 })

 const getCurrentUser = asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(new ApiResponse(
    200,
    req.user,
    "User fetched successfully"
  ))
 })

 const getUserChannelProfile = asyncHandler(async(req,res)=>{
   const {username} = req.pqrqms

   if(!username?.trim()){
    throw new ApiError(400,"username is missing")
   }

    const Channel = await User.aggregate([
    {

      $match:{
        username:username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscriber"
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },
    {
      $addFields:{
        subscribersCount:{
          $size:"$subscribers"
        },
        channelsSubscribedToCount:{
          $size:"$subscribedTo"
        },
        isSubscrided:{
          $cond:{
            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
        

      }
    },
    {
      $project:{
        fullname:1,
        username:1,
        subscribersCount:1,
        channelsSubscribedToCount:1,
        isSubscrided:1,
        avatar:1,
        coverImage:1,
        email:1,


      }
    }
   ])

   if(!Channel?.length){
    throw new ApiError(404, "Channel does not exit")
   }

   console.log(Channel);
  return res
  .status(200)
  .json(
    new ApiResponse(200,Channel[0],"user channel fetched successfully")
  )

 })

 const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
      {
          $match: {
              _id: new mongoose.Types.ObjectId(req.user._id),
          },
      },
      {
          $lookup: {
              from: "videos",
              localField: "watchHistory",
              foreignField: "_id",
              as: "watchHistory",
              pipeline: [
                  {
                      $lookup: {
                          from: "users",
                          localField: "owner",
                          foreignField: "_id",
                          as: "owner",
                          pipeline: [
                              {
                                  $project: {
                                      fullname: 1,
                                      username: 1,
                                      avatar: 1,
                                  },
                              },
                          ],
                      },
                  },
                  {
                      $addFields: {
                          owner: {
                              $first: "$owner",
                          },
                      },
                  },
              ],
          },
      },
  ]);

   return res.status(200)
   .json(
    new ApiResponse(
      200,
      user[0].watchHistory,
      "watch  history "

    )
    );
});










export {
   registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateAccountDetails,
    updateUserAvatar,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    changeCurrentPassword,
    updateCoverImage
 };
