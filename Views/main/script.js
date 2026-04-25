const projects = {
    project1: {
        smallContent: "A 25m² house designed to maximize every inch of space, offering comfort and practicality in a compact layout. Despite its small size, it provides all the essential amenities for modern and convenient living.",
        detail1: "QUANDUONG COMPLEX",
        detail2: "25",
        detail3: "LIVING ROOM",
        detail4: "2024",
        detail5: "MODERN",
        imgSrc: "images/project1_1.jpg"
    },
    project2: {
        smallContent: "A cozy bedroom overlooking the stunning skyline of Sydney, offering a peaceful space to relax while enjoying the vibrant city view. Designed with comfort and style, it creates a perfect balance between modern living and urban scenery.",
        detail1: "NGUYENTHIEN COMPLEX",
        detail2: "20",
        detail3: "BEDROOM ROOM",
        detail4: "2025",
        detail5: "MODERN",
        imgSrc: "images/project2_2.jpg"
    },
    project3: {
        smallContent: "A modern living room connected to a small private garden, bringing natural light and fresh air into the home. This relaxing space blends indoor comfort with a touch of greenery, creating a calm and inviting atmosphere.",
        detail1: "TUANANH COMPLEX",
        detail2: "30",
        detail3: "LIVING ROOM",
        detail4: "2023",
        detail5: "MODERN",
        imgSrc: "images/project3_3.jpg"
    },
    project4: {
        smallContent: "A comfortable bedroom facing the city center, offering a beautiful view of the vibrant skyline and urban lights. Designed to provide a relaxing space while staying connected to the energy of the city.",
        detail1: "PHONG COMPLEX",
        detail2: "25",
        detail3: "BEDROOM ROOM",
        detail4: "2025",
        detail5: "MODERN",
        imgSrc: "images/project4.jpg"
    }
};
//ad session here
const adminBtn = document.getElementById("admin-btn");
const logoutBtn = document.getElementById("logout-btn");

fetch("/check-auth")
    .then(res => res.json())
    .then(data => {
        if (data.loggedIn) {
            adminBtn.style.display = "block"; // hiện nút
            logoutBtn.style.display = "block";
        } else {
            adminBtn.style.display = "none"; // ẩn (cũng có thể bỏ dòng này)
            logoutBtn.style.display = "none";
        }
    })
    .catch(err => console.log(err));
//delete session
function logoutAdmin(){
    fetch("/logout", {
        method: "POST"
    })
    .then(res => res.text())
    .then(data => {
        console.log(data);
        // reload hoặc chuyển trang
        window.location.reload();
    })
    .catch(err => console.log(err));
}


document.querySelectorAll('.feature-image').forEach(img => {
    const type = img.dataset.type;
    const overlay = img.querySelector('.overlay-text');

    img.addEventListener('mouseenter', () => {
        console.log("Hover vào:", type);
        overlay.textContent = projects[type].detail1; 
        overlay.style.opacity = 1;
    });

    img.addEventListener('mouseleave', () => {
        overlay.style.opacity = 0;
    });
});

function openPopup(type){
    const project = projects[type];

    if(!project) return;

    document.getElementById("popup-small-content").innerText = project.smallContent;
    document.getElementById("popup-right1").innerText = project.detail1;
    document.getElementById("popup-right2").innerText = project.detail2;
    document.getElementById("popup-right3").innerText = project.detail3;
    document.getElementById("popup-right4").innerText = project.detail4;
    document.getElementById("popup-right5").innerText = project.detail5;
    document.getElementById("popup-image").src = project.imgSrc;

    document.getElementById("popup").style.display = "flex";
}
window.onclick = function(event) {
    const popup = document.getElementById("popup");
    const fillpopup = document.getElementById("fill-popup");

    if (event.target === popup || event.target === fillpopup) {
        popup.style.display = "none";
        fillpopup.style.display = "none";
    }
}

function fillInfoPopup(){
    document.getElementById("fill-popup").style.display = "flex";
}


$(document).ready(function(){

    $('.region').click(function(){
        $(this).addClass('active').siblings().removeClass('active');

        var filter = $(this).attr('data-filter')

        if(filter == 'all'){
            $('.feature-project .feature-item').show(400);
        }
        else{
            $('.feature-project .feature-item').not('.' +filter).hide(200);
            $('.feature-project .feature-item').filter('.' +filter).show(200);
        }

    });

    $('.feature-project').magnificPopup({
        delegate:'div',
        type:'feature-item',
        gallery:{
            enabled:true,
        }
    });

});