// require('dotenv').config({path:'./env'});

import express from "express";
// import mongoose from "mongoose";
// import {DB_NAME} from "constants"
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
  path:'./env'
})

const app = express()
const port = 3000

connectDB();

// // iffies
// (async()=>{
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//   } catch (error) {
//     console.log("ERROR: ",error);
//     throw error;
//   }
// })()

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`)
})