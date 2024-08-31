import { v2 as cloudinary } from 'cloudinary';

import fs from  "fs";


(async function() {

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_SECRETKEY, 
        api_secret: process.env.CLOUDINARY_API_SECRETKEY 
    });
    
    const uploadOnCloudinary = async (localFilePath) =>{
        try{
            if(!localFilePath) return null
            // upload the file on cloudinary

            const response = await cloudinary.uploader.upload
            (localFilePath,{
                resource_type:"auto"
            })

            // file has been uploaded successfully

            console.log("file is uploaded on cloudinary",response.url);
            return response

        }catch(error){
            fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload opration got failed 

            return null;
            
        }
    }


     
})();

export {uploadOnCloudinary}