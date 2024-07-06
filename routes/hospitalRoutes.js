const express=require('express')
const router=express.Router()
const {register, verifyRegisterOtp,getSingleDoc,docUpdate,testUpdate,getBookingDetails,updateProfile,addFile,sendOtpVerifyHosp,numberUpdateHosp,sendOtp,verifyOtp,addMoreSessionsLabs,getHospitalWithDoctors,getHosptial,getUserDetailsByBookingId,addMoreSessions,addDoctor,updatePassword,getSingleDoctorByCode,HospitalDetails,profileUpdate, getAllHospitals,getAllDoctors, deleteDoctorById, addTest,} =require("../controllers/hospitalController")
const {isAuthorized,roleAuthorize, isAuthorizedHosp,}=require("../middleware/auth")

router.route('/')
  .get((req, res) => {
    res.send('Hi');
  });
  router.route("/register").post(register)
  router.route("/verifyregisterotp").post(verifyRegisterOtp)
  router.route("/login").post(sendOtp)
  router.post('/verifyotp', verifyOtp);
  //verify new number
  router.route("/verifynumber").post(isAuthorizedHosp,sendOtpVerifyHosp)
router.route("/me").get(isAuthorizedHosp,HospitalDetails)
router.route("/me/addmoresessions").post(addMoreSessions)
router.route("/me/addlabsessions").post(addMoreSessionsLabs)
router.route("/me/profileupdate").put(isAuthorizedHosp,profileUpdate)
router.route("/adddoctor").post(isAuthorizedHosp,addDoctor)
router.route("/addtest").post(isAuthorizedHosp,addTest)
//edit doc and test
router.route("/editdoctor").put(isAuthorizedHosp,docUpdate)
router.route("/edittest").put(isAuthorizedHosp,testUpdate)
router.route("/profileupload").post(addFile)
//number verify update
router.route("/numberupdate").put(isAuthorizedHosp,numberUpdateHosp)
router.route("/imageupdate").post(updateProfile)
router.route("/hosp/doctors").get(isAuthorizedHosp,getHospitalWithDoctors)
router.route("/getsingledoctor").post(isAuthorizedHosp,getSingleDoctorByCode)
router.route("/deletedoctor/:id").post(isAuthorizedHosp,deleteDoctorById)
router.route('/doctor/booking/:bookingId').get( getUserDetailsByBookingId);
// router.route("/addsession").post(addSession)
router.route('/singledoc').post(getSingleDoc)
router.route("/doc/bookingdetails").get(isAuthorizedHosp,getBookingDetails)
router.route("/admin/getalldoctors").get(getAllDoctors)
router.route("/admin/getallhospitals").get(getAllHospitals)
router.route("/hospital/:id").get(getHosptial)
// router.route("/admin/user/:id").get(isAuthorized,roleAuthorize("admin"),getUser)
// .put(isAuthorized,roleAuthorize("admin"),updateUserRole).delete(isAuthorized,roleAuthorize("admin"),deleteUser)
module.exports=router