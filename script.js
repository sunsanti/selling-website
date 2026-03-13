function openPopup(type){
    let smallContent = "";
    let projectDetail = "";
    let detail1 = "";
    let detail2 = "";
    let detail3 = "";
    let detail4 = "";
    let detail5 = "";
    let imgSrc = "";

    if(type == "project1"){
        smallContent = "A 25m² house designed to maximize every inch of space, offering comfort and practicality in a compact layout. Despite its small size, it provides all the essential amenities for modern and convenient living.";
        detail1 = "QUANDUONG COMPLEX";
        detail2 = "25";
        detail3 = "LIVING ROOM";
        detail4 = "2024";
        detail5 = "MODERN";
        imgSrc = "images/project1_1.jpg";
    }
    if(type == "project2"){
        smallContent = "A cozy bedroom overlooking the stunning skyline of Sydney, offering a peaceful space to relax while enjoying the vibrant city view. Designed with comfort and style, it creates a perfect balance between modern living and urban scenery.";
        detail1 = "NGUYENTHIEN COMPLEX";
        detail2 = "20";
        detail3 = "BEDROOM ROOM";
        detail4 = "2025";
        detail5 = "MODERN";
        imgSrc = "images/project2_2.jpg";
    }
    if(type == "project3"){
        smallContent = "A modern living room connected to a small private garden, bringing natural light and fresh air into the home. This relaxing space blends indoor comfort with a touch of greenery, creating a calm and inviting atmosphere.";
        detail1 = "TUANANH COMPLEX";
        detail2 = "30";
        detail3 = "LIVING ROOM";
        detail4 = "2023";
        detail5 = "MODERN";
        imgSrc = "images/project3_3.jpg";
    }
    if(type == "project4"){
        smallContent = "A comfortable bedroom facing the city center, offering a beautiful view of the vibrant skyline and urban lights. Designed to provide a relaxing space while staying connected to the energy of the city.";
        detail1 = "PHONG COMPLEX";
        detail2 = "25";
        detail3 = "BEDROOM ROOM";
        detail4 = "2025";
        detail5 = "MODERN";
        imgSrc = "images/project4.jpg";
    }
    
    document.getElementById("popup-small-content").innerText = smallContent;
    document.getElementById("popup-right1").innerText = detail1
    document.getElementById("popup-right2").innerText = detail2
    document.getElementById("popup-right3").innerText = detail3
    document.getElementById("popup-right4").innerText = detail4
    document.getElementById("popup-right5").innerText = detail5
    document.getElementById("popup-image").src = imgSrc

    document.getElementById("popup").style.display = "flex";
}

window.onclick = function(event) {
  const popup = document.getElementById("popup");
  const fillpopup = document.getElementById("fill-popup");

  if (event.target === popup || event.target === fillpopup) {
    popup.style.display = "none";
    fillpopup.style.display = "none"
  }
}

function fillInfoPopup(){
    document.getElementById("fill-popup").style.display = "flex"
}