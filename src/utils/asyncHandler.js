const  asyncHandler = (requestHandler)=>{
   return (req,res,next)=>{
        Promise.resolve(
            requestHandler(req,res,next)

        ).catch((err)=> next(err))
    }

}

export {asyncHandler}







// const asyncHAndler = (func) => async (req,res,next) =>{
//     try{

//     } catch(error){
//         await func(req,res,next)
//         res.status(err.code||500).json({
//             success:false,
//             message:err.message
//         })
//     }
// }
