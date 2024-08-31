import mongoose, { connect } from "mongoose";
 import dotenv from "dotenv";
import ConnectDB from "./db/index.js";

import { app } from "./app.js";

dotenv.config({
    path:'./env'
})


ConnectDB()
.then(()=>{
    app.listen(process.env.PORT)
    console.log(`Server is runnig at port : ${process.env.PORT}`);
})
.catch((err)=>{
    console.log("Mongo db connection failed !!!, err ");
})
                       