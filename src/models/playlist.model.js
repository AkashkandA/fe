import mongoose from "mongoose";
import { Schema } from "mongoose";

const playlistSchema = new Schema(
    {
        name:{
            type:String
        },
        discription:{
            type:String

        },
        videos:{
            type:Schema.Types.ObjectId,
            ref:"video"
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"user"
        }

    },{timestamps:true}
)

export const Playlist = mongoose.model("Playlist",playlistSchema)