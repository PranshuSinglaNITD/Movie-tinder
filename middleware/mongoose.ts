import { defaultMaxListeners } from 'events';
import mongoose from 'mongoose'
const connectDb=async()=>{
    try{
        if(mongoose.connection.readyState>=1){
            console.log('using existing databse')
            return;
        }
        if(!process.env.MONGODB_URI){
            throw new Error('no connection')
        }
        console.log('connceting')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('connected')

    }
    catch(error){
        console.error('error')
    }
}
export default connectDb