const {Schema, default: mongoose}=require("mongoose");


const userSchema = new Schema({
 name:{type:String ,require:true},
 email:{type:String ,require:true,unique:true},
 password:{type:String ,require:true},
 verifyOtp:{type:String ,default:''},
 verifyOtpExpiresAt:{type:Number ,default:0},
 isAccountVerified:{type:Boolean ,default:false},
 resetOtp:{type:String ,default:''},
 resetOtpExpiresAt:{type:Number ,default:0},
 watchlist: [
    {
      symbol: { type: String, required: true },
      addedAt: { type: Date, default: Date.now },
      priceWhenAdded: Number,
    }
  ]

});

const userModel=mongoose.models.user || mongoose.model('user',userSchema);

module.exports = { userModel}; 