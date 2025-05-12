// require('dotenv').config({path:'./env'});
// import mongoose from "mongoose";
// import {DB_NAME} from "constants"
import app from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
  path:'./env'
})

//db here is asynchronus and we will get a promise here so using .then and ,catch
connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`Server is listening at ${process.env.PORT}`);
  })
})
.catch((err)=>{
  console.log("MONGO db connection failed !!!",err);
});

// // iffies
// (async()=>{
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//   } catch (error) {
//     console.log("ERROR: ",error);
//     throw error;
//   }
// })()

