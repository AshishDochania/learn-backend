import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
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
    const existedUser=User.findOne({
        $or:[ { email },{ username } ]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username allready exists ")
    }

    //files
    const avatarLocalPAth = req.files?.avatar[0]?.path
    const coverImageLocalPAth = req.files?.coverImage[0]?.path

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

export {registerUser}