import mongoose,{Schema,Document,model} from 'mongoose'
export interface IMessage extends Document{
    sender:mongoose.Types.ObjectId
    receiver:mongoose.Types.ObjectId
    desc:string
    content:string
    read:boolean
}
const MessageSchema: Schema<IMessage> = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    desc:{type:String, required:true},
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Message=mongoose.models.Message||mongoose.model<IMessage>("Message",MessageSchema)
export default Message