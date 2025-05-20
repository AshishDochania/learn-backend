import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false})
        
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}


const registerUser=asyncHandler(async(req,res) =>{
    // take data
    // validate karoo
    // check if user already there...
    // check for images, avatars
    // files upload on cloudinary and data on mongo...
    // create user object- create emtry in db
    // remove password and refersh token field from reponse
    // check for user creation
    // return res.

    const {fullname,username,email, password}=req.body
    // console.log("fullname :",fullname);

    // two ways to check if we got something or is it just empty
    if(fullname === ""){
        throw new ApiError(400,"Fullname is required")
    }

    if([username ,email,password].some((field) => field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }

    // checking if user already registered
    const existedUser= await User.findOne({
        $or:[ { email },{ username } ]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username allready exists ")
    }

    //files
    const avatarLocalPAth = req.files?.avatar[0]?.path
    // const coverImageLocalPAth = req.files?.coverImage[0]?.path
    // here coverimagelocalpath was not checked if coming or not and this ? is not really doing it so will checkit with if statment only
    let coverImageLocalPAth;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPAth=req.files.coverImage[0].path;
    }

    if(!avatarLocalPAth){
        throw new ApiError(400,"avatar file is required")
    }

    // file uploads
    const avatar= await uploadCloudinary(avatarLocalPAth)
    const coverImage= await uploadCloudinary(coverImageLocalPAth)

    if(!avatar){
        throw new ApiError(400,"Avatar field is required")
    }

    // upload on database...
    const user = await User.create({
        fullname,
        avatar:avatar.url,
        // now here we have checked for avatar with if statment but we haven't checked if cover image have arrived or not or is it provided by the user or not
        // so here the code will not work properly and crash..
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase(),
    })
    // check if user is created or not
    const userCreated=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!userCreated){
        throw new ApiError(500,"Something went wrong while registering the user")
    }
    // now user is created and response is also created so now will return response
    return res.status(201).json(
        new ApiResponse(200,userCreated,"User registered Successfully")
    )
})

const loginUser=asyncHandler(async(req,res) =>{
    // take username and password
    // find if someone exist with that username
    // use user.ispaswrodcorret
    // response me will return acess token and refresh token along with userinfo without the password
    // cookies send

    const {email, username,password}=req.body
    console.log(req.body);
    if(!(username || email)){
        throw new ApiError(400,"username or email is required")
    }
    
    const gotUser=await User.findOne({
        $or:[{email},{username}]
    })
    if(!gotUser){
        throw new ApiError(404,"User does not exist")
    }
    // console.log(gotUser);
    const correctPassword=await gotUser.isPasswordCorrect(password);

    if(!correctPassword){
        throw new ApiError(401,"Password is invalid")
    }

    // generating access and refresh token together should be put in a method so that both can be
    // created with one call so baar baar na generate karne pade
    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(gotUser._id)

    // here the gotuser we have do not have a refreshtoken so we can put it there or can get it from the database as it is there 
    const user= await User.findById(gotUser._id).select("-password -refreshToken")
    // sending all info in cookies
    // designing some options(objects) of cookies
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:user,accessToken,refreshToken
            },
            "User Logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    // clear cookies
    // refresh token empty... 
    // user object created needs to be deleted
    // here we do not have anything to find the user so how to find a user who needs to be logged out
    // created verifyJWT and now we have req.user access

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {// using new here we get the response with new changes
            new:true
        }
    );

    // now go for cookies
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out Succesfully"))
})

const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user= await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"invalid refresh token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is Expired or Used")
        }
    
        const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);
        const options={
            httpOnly:true,
            secure:true,
        }
        res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error.message || "invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword,newPassword}=req.body;
    // will user varifyJWT

    const user= await User.findById(req.user?._id);
    const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password");
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false});

    return res.status(200).json(
        new ApiResponse(200,{},"password changed successfully")
    )
})

const getCurrentUser= asyncHandler(async(req,res) =>{
    // using middleware here to get res.user from verifyJWT
    return res.status(200)
    .json(200,req.user,"current user fetched seccessfully")
})

const updateAccountDetails = asyncHandler(async(req,res) =>{
    const {fullname,email,username}=req.body
    // when updating a file try keeping different end points for it
    // vide-18 -- 23:05

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user=User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullname,
            email
        }
    },{new :true}).select("-password");

    return res.status(200)
    .json(new ApiResponse(200,user,"Acccount details updated successfully"));

})

const updateUserAvatar= asyncHandler(async(req,res)=>{
    // will user multer middleware and also verify JWT to know if the user is logged in and only after verifying the user we do it 
    const avatarLocalPAth=req.file?.path

    if(!avatarLocalPAth){
        throw new ApiError(400,"Avatar File is missing")
    }
    const avatar=await uploadCloudinary(avatarLocalPAth);
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,
        {$set:{avatar:avatar.url}},
        {new:true}
    )
    return res.status(200)
    .json(new ApiResponse(200,user,"Avatar Sucessfully Updated"));
})

const updateUserCoverImage= asyncHandler(async(req,res)=>{
    // will user multer middleware and also verify JWT to know if the user is logged in and only after verifying the user we do it 
    const coverImageLocalPAth=req.file?.path

    if(!coverImageLocalPAth){
        throw new ApiError(400,"cover Image File is missing")
    }
    const coverImage=await uploadCloudinary(coverImageLocalPAth);
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on cover image")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,
        {$set:{coverImage:coverImage.url}},
        {new:true}
    )
    return res.status(200)
    .json(new ApiResponse(200,user,"Cover Image Sucessfully Updated"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
}