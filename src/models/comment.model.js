import mongoose,{Schema} from "mongoose";

import mongooseAggregatePagination from "mongoose-paginate-v2";

const commentSchema = new Schema(
    {
        content:{
            type:String,
            required:true

        },
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video"
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"users"
        }
    }
)

commentSchema.plugin(mongooseAggregatePagination)

export const Comment = mongoose.model("Comment",commentSchema)