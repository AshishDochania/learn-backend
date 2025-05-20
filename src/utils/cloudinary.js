import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";
import { ApiError } from "./ApiError";

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key:process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET// Click 'View API Keys' above to copy your API secret
});

// Upload an image
const uploadCloudinary= async (localFilePath) =>{
    try {
        if(!localFilePath) return null
        //upload file
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file logged
        // we have seen that file is now getting uploaded sucessfully so will now unlink it
        // console.log("file is uploaded on cloudinary :",response)
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // removes the locally saved file
        // as the upload operation got failed
    }
}

const deleteCludinary=async(url) =>{
    try {
        if(!url) return null;
        const parts=url.split('/');
        const publicIdWithJpg=parts[parts.length-1];
        const public_id=publicIdWithJpg.split('.')[0];
        console.log(public_id);
        const response=await cloudinary.uploader.destroy(public_id,{
            resource_type:"image",
        })
    } catch (error) {
        throw new ApiError(400,"Error while deleting the file from cloudinary")
    }
}

export {uploadCloudinary,deleteCludinary}