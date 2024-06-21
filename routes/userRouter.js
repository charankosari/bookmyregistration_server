const express=require('express')
const router=express.Router()
const {register,sendOtp,verifyOtp, verifyRegisterOtp,getLabDetails,bookAppointmentLab,toggleWishlistItem,sendOtpVerify,getTests ,getUserBookingDetails,numberUpdate,getDoctorDetails,bookAppointment,getBookingDetails,getDoctor,userDetails,profileUpdate, getAllUsers,getUser,updateUserRole,deleteUser,getWishlist,wishListDoctor,RemovewishListProduct,AddCartItem,RemoveCartItem,getCartDetails,updateCartItem,deleteCart,deleteWishlist, addFile, deleteFile, getFiles, downloadFile, getFilesBinary} =require("../controllers/userController")
const {isAuthorized,roleAuthorize,}=require("../middleware/auth")

// const {FileUpload} =require('../controllers/FileUpload')
router.route("/register").post(register)

router.route("/verifyregisterotp").post(verifyRegisterOtp)
router.route("/login").post(sendOtp)
router.route("/verifynumber").post(isAuthorized,sendOtpVerify)
// router.route("/fileupload").post(FileUpload)
router.post('/verifyotp', verifyOtp);
// router.route("/forgotpassword").post(forgotPassword)
// router.route("/resetpassword/:id").post(resetPassword)
router.route("/me").get(isAuthorized,userDetails)
// router.route
// router.route("/password/update").put(isAuthorized,updatePassword)
router.route("/me/profileupdate").put(isAuthorized,profileUpdate)
router.route("/me/numberupdate").put(isAuthorized,numberUpdate)
router.route("/addbooking").post(isAuthorized,bookAppointment)
router.route("/addlabbooking").post(isAuthorized,bookAppointmentLab)
router.route('/booking/:bookingId').get(isAuthorized, getBookingDetails);
router.route('/allbookingdetails').get(isAuthorized, getUserBookingDetails);
router.route('/user/doctors/:id').get( getDoctorDetails);
router.route('/user/labs/:id').get( getLabDetails);
router.route('/doc/:id').get( getDoctor);
router.route('/tests/:id').get( getTests);
router.route('/upload').post(isAuthorized,addFile);
router.route("/delete/:filename").delete(isAuthorized,deleteFile)
router.route("/download/:filename").get(isAuthorized,downloadFile)
router.route('/downloadb/').get(isAuthorized,getFilesBinary)
router.route("/getfiles").get(isAuthorized,getFiles)
// router.route("/download/:filename").post(isAuthorized)
// router.route("/admin/getallusers").get(isAuthorized,roleAuthorize("admin"),getAllUsers)
// router.route("/admin/user/:id").get(isAuthorized,roleAuthorize("admin"),getUser)
router.route("admin/deleteuser").put(isAuthorized,roleAuthorize("admin"),updateUserRole).delete(isAuthorized,roleAuthorize("admin"),deleteUser)
// whislist routers________________
router.route("/me/wishlist/:id").post(isAuthorized,toggleWishlistItem).delete(isAuthorized,toggleWishlistItem)
router.route("/me/wishlist").get(isAuthorized,getWishlist).delete(isAuthorized,deleteWishlist)



module.exports=router