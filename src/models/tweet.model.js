import mongoose, { models } from "mongoose";
import { Schema } from "mongoose";

const tweetSchema = new Schema(
    {
        content:{
            type:String
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"user"
        }

        
    },
    {
    timestamps:true
    }
)

export const Tweet  = mongoose.model("Tweet",tweetSchema) 
