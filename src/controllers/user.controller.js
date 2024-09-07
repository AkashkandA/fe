import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js";


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
      $set:{
        refreshToken: undefined
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

 const user = User.findByIdAndUpdate(req.user?._id,
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








export {
   registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateAccountDetails,
    updateUserAvatar
 };
