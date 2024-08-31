import mongoose,{Schema} from "mongoose";

import mongooseAggregatePagination from "mongoose-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile:{
            type: String,
            required:true
        },
        thumnail:{
            type: String,
            required:true

        },
        title:{
            type:String,
            required:true,
        },
        description:{
            type:String,
            required:true,
        },
        duration:{
            type:Number,
            required:true

        },
        view:{
            type:Number,
            default:0,
        },
        isPublished:{
            type:Boolean,
            default:true
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)

videoSchema.plugin(mongooseAggregatePagination)
export const Video = mongoose.model("Video",videoSchema)