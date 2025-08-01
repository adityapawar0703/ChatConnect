module.exports.chatPageController = (req,res)=>{
    const userName= req.query.name || "Guest";
    const gender = req.query.gender;
  console.log("This is line 4 gender:",gender);
    const maleImages = [
        "/images/male1.png",
        "/images/male2.png",
        "/images/male3.png",
        "/images/male4.png",
    ];

    const femaleImages=[
        "/images/female1.png",
        "/images/female2.png",
        "/images/female3.png",
        "/images/female4.png",
    ];
    const temp= gender=="female"? femaleImages : maleImages;
    const userImg= temp[Math.floor(Math.random()*temp.length)];
    
    // const opponentName="testing2";
    const opponentName=null;
    
    const opponentImg = temp[Math.floor(Math.random()*temp.length)];
    res.render("chat",{userName,userImg, opponentName: opponentName, opponentImg: opponentImg});
}
