// const asyncHandler = require("../middleware/asynchandler");
// const payment=require("../server")
// const crypto = require('crypto');





// // payment initiation____________________________________________
// exports.initPayment=asyncHandler(async(req,res,next)=>{
//    const totalPrice=req.body.totalPrice
//    const pay_res=await payment.instance.orders.create({
//         amount:totalPrice*100,
//         currency: "INR"
//         })
//     res.status(200).json({success:true,message:"payment initiated",paymentId:pay_res})
//   })

// //   payment conformation__________________________________________
// exports.paymentConform=asyncHandler(async(req,res,next)=>{
//     const {paymentResponse,selectAddress,paymode}=req.body
//      const { razorpay_payment_id,razorpay_signature,razorpay_order_id} = paymentResponse;
     
//      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
//      const generatedsignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY).update(text).digest('hex');

//     if(generatedsignature==razorpay_signature){
//     req.paymentResponse=paymentResponse;
//     req.selectAddress=selectAddress;
//     req.paymode=paymode;
//     next()
//     }
// })

