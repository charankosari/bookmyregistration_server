const express=require('express')
const router=express.Router()
const {register, login,forgotPassword,resetPassword,addDoctor,updatePassword,getSingleDoctorByCode,HospitalDetails,profileUpdate, getAllHospitals,getAllDoctors, deleteDoctorById,} =require("../controllers/hospitalController")
const {isAuthorized,roleAuthorize, isAuthorizedHosp,}=require("../middleware/auth")
const upload=require('../middleware/multer')

router.route('/')
  .get((req, res) => {
    res.send('Hi');
  });
router.route("/register").post(register)
router.route("/login").post(login)
// router.route("/logout").post(logout)  // frontend 
router.route("/forgotpassword").post(forgotPassword)
router.route("/resetpassword/:id").post(resetPassword)
router.route("/me").get(isAuthorizedHosp,HospitalDetails)
router.route("/password/update").put(isAuthorizedHosp,updatePassword)
router.route("/me/profileupdate").put(isAuthorizedHosp,profileUpdate)
router.route("/adddoctor").post(isAuthorizedHosp,addDoctor)
router.route("/getsingledoctor").post(isAuthorizedHosp,getSingleDoctorByCode)
router.route("/deletedoctor/:id").post(isAuthorizedHosp,deleteDoctorById)
// router.route("/addsession").post(addSession)

router.route("/admin/getalldoctors").get(getAllDoctors)
router.route("/admin/getallhospitals").get(getAllHospitals)
// router.route("/admin/user/:id").get(isAuthorized,roleAuthorize("admin"),getUser)
// .put(isAuthorized,roleAuthorize("admin"),updateUserRole).delete(isAuthorized,roleAuthorize("admin"),deleteUser)
module.exports=router