import mongoose  from "mongoose";
import { Schema } from "mongoose";


const likeSchema = new Schema(
    {
        comment:{
            types:Schema.Types.ObjectId,
            ref:"Comment"

        },
        video:{
            types:Schema.Types.ObjectId,
            ref:"video"
        },
        likeBy:{
            types:Schema.Types.ObjectId,
            ref:"user"
        },
        tweet:{
            types:Schema.Types.ObjectId,
            ref:"tweets"
        }



    },
    {timestamps:true}
)

export const Like =mongoose.model("Like",likeSchema)
