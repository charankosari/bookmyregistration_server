const express=require('express')
const router=express.Router()
const {register,sendOtp,verifyOtp, verifyRegisterOtp,getUserBookingDetails,resetPassword,bookAppointment,getBookingDetails,updatePassword,userDetails,profileUpdate, getAllUsers,getUser,updateUserRole,deleteUser,getWishlist,wishListDoctor,RemovewishListProduct,AddCartItem,RemoveCartItem,getCartDetails,updateCartItem,deleteCart,deleteWishlist} =require("../controllers/userController")
const {isAuthorized,roleAuthorize,}=require("../middleware/auth")

// const {FileUpload} =require('../controllers/FileUpload')
router.route("/register").post(register)

router.route("/verifyregisterotp").post(verifyRegisterOtp)
router.route("/login").post(sendOtp)
// router.route("/fileupload").post(FileUpload)
router.post('/verifyotp', verifyOtp);
// router.route("/forgotpassword").post(forgotPassword)
// router.route("/resetpassword/:id").post(resetPassword)
router.route("/me").get(isAuthorized,userDetails)
// router.route
// router.route("/password/update").put(isAuthorized,updatePassword)
router.route("/me/profileupdate").put(isAuthorized,profileUpdate)
router.route("/addbooking").post(isAuthorized,bookAppointment)
router.route('/booking/:bookingId').get(isAuthorized, getBookingDetails);
router.route('/allbookingdetails').get(isAuthorized, getUserBookingDetails);
// router.route("/admin/getallusers").get(isAuthorized,roleAuthorize("admin"),getAllUsers)
// router.route("/admin/user/:id").get(isAuthorized,roleAuthorize("admin"),getUser)
router.route("admin/deleteuser").put(isAuthorized,roleAuthorize("admin"),updateUserRole).delete(isAuthorized,roleAuthorize("admin"),deleteUser)
// whislist routers________________
router.route("/me/wishlist/:id").post(isAuthorized,wishListDoctor).delete(isAuthorized,wishListDoctor)
router.route("/me/wishlist").get(isAuthorized,getWishlist).delete(isAuthorized,deleteWishlist)



module.exports=router