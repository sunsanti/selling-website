// ===================== STATE =====================
// Static project data kept for fallback (projects loaded from DB via inline script in index.html)
const projects = {
    project1: {
        smallContent: "A 25m² house designed to maximize every inch of space, offering comfort and practicality in a compact layout. Despite its small size, it provides all the essential amenities for modern and convenient living.",
        detail1: "QUANDUONG COMPLEX",
        detail2: "25",
        detail3: "LIVING ROOM",
        detail4: "2024",
        detail5: "MODERN",
        imgSrc: "/images/project1_1.jpg, /images/project1.jpg, /images/project3.jpg"
    },
    project2: {
        smallContent: "A cozy bedroom overlooking the stunning skyline of Sydney, offering a peaceful space to relax while enjoying the vibrant city view. Designed with comfort and style, it creates a perfect balance between modern living and urban scenery.",
        detail1: "NGUYENTHIEN COMPLEX",
        detail2: "20",
        detail3: "BEDROOM ROOM",
        detail4: "2025",
        detail5: "MODERN",
        imgSrc: "/images/project2_2.jpg, /images/project2.jpg, /images/project4.jpg"
    },
    project3: {
        smallContent: "A modern living room connected to a small private garden, bringing natural light and fresh air into the home. This relaxing space blends indoor comfort with a touch of greenery, creating a calm and inviting atmosphere.",
        detail1: "TUANANH COMPLEX",
        detail2: "30",
        detail3: "LIVING ROOM",
        detail4: "2023",
        detail5: "MODERN",
        imgSrc: "/images/project3_3.jpg, /images/project1.jpg, /images/project2.jpg"
    },
    project4: {
        smallContent: "A comfortable bedroom facing the city center, offering a beautiful view of the vibrant skyline and urban lights. Designed to provide a relaxing space while staying connected to the energy of the city.",
        detail1: "PHONG COMPLEX",
        detail2: "25",
        detail3: "BEDROOM ROOM",
        detail4: "2025",
        detail5: "MODERN",
        imgSrc: "/images/project4.jpg, /images/project3.jpg, /images/project1_1.jpg"
    }
};

// ===================== ADMIN SESSION =====================
const adminBtn = document.getElementById("admin-btn");
const logoutBtn = document.getElementById("logout-btn");
const accountName = document.getElementById("account");
const leftSite = document.querySelector(".left-site");
const mobileSitePhone = document.getElementById("mobile-site-phone");
const mobileAccount = document.getElementById("mobile-account");
const desktopSitePhone = document.getElementById("site-phone");


fetch("/check-auth")
    .then(res => res.json())
    .then(data => {
        if (data.loggedIn) {
            adminBtn.style.display = "block";
            logoutBtn.style.display = "block";
            accountName.style.display = "block";
            leftSite.classList.remove("hide-line");
            // Sync account name to mobile sidebar
            mobileAccount.textContent = accountName.textContent;
        } else {
            adminBtn.style.display = "none";
            logoutBtn.style.display = "none";
            accountName.style.display = "none";
            leftSite.classList.add("hide-line");
        }
    })
    .catch(err => console.log(err));
console.log(accountName);
function logoutAdmin(){
    fetch("/logout", {
        method: "POST"
    })
    .then(res => res.text())
    .then(data => {
        console.log(data);
        window.location.reload();
    })
    .catch(err => console.log(err));
}

// ===================== POPUP HANDLERS (fallback for non-DB projects) =====================
// Hover events for static projects in script.js are superseded by DB-loaded version in index.html inline script
// This ensures backward compatibility if DB is not yet set up

document.querySelectorAll('.feature-image').forEach(img => {
    const type = img.dataset.type;
    const overlay = img.querySelector('.overlay-text');

    img.addEventListener('mouseenter', () => {
        if (projects[type]) {
            overlay.textContent = projects[type].detail1;
            overlay.style.opacity = 1;
        }
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

    // Build slider from project image (comma-separated supported)
    sliderImages = project.imgSrc.split(',').map(s => s.trim()).filter(Boolean);
    if (sliderImages.length === 0) sliderImages = [project.imgSrc];
    currentSlide = 0;
    renderSlider();

    document.getElementById("popup").style.display = "flex";
}

function closePopup(){
    document.getElementById("popup").style.display = "none";
}

window.onclick = function(event) {
    const popup = document.getElementById("popup");
    const fillpopup = document.getElementById("fill-popup");
    const navbar = document.getElementById("main-navbar");
    const mobileOverlay = document.getElementById("mobile-overlay");
    const menuBtn = document.getElementById("menu-btn");

    // Close mobile menu when clicking outside
    if (navbar && navbar.classList.contains("open")) {
        if (event.target !== menuBtn && !menuBtn?.contains(event.target) &&
            event.target !== navbar && !navbar.contains(event.target) &&
            event.target !== mobileOverlay) {
            closeMobileMenu();
        }
    }

    // Close popups when clicking outside
    if ((event.target === popup || event.target === fillpopup)) {
        popup.style.display = "none";
        fillpopup.style.display = "none";
    }
}

function fillInfoPopup(){
    document.getElementById("fill-popup").style.display = "flex";
}

function closeFillPopup(){
    document.getElementById("fill-popup").style.display = "none";
}

// ===================== MOBILE MENU TOGGLE (Sidebar Drawer) =====================
const menuBtn = document.getElementById("menu-btn");
const navbar = document.getElementById("main-navbar");
const mobileOverlay = document.getElementById("mobile-overlay");
const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

// Sync logout button visibility to mobile sidebar
if (logoutBtn && mobileLogoutBtn) {
    const syncLogout = () => {
        const isLoggedIn = !leftSite.classList.contains("hide-line");
        if (isLoggedIn) {
            mobileLogoutBtn.style.display = "";
            mobileAccount.style.display = "";
        } else {
            mobileLogoutBtn.style.display = "none";
            mobileAccount.style.display = "none";
        }
    };
    // Watch for changes on logoutBtn and accountName
    const observer = new MutationObserver(syncLogout);
    observer.observe(logoutBtn, { attributes: true, attributeFilter: ["style"] });
    observer.observe(accountName, { attributes: true, attributeFilter: ["style"] });
    syncLogout();
}

function openMobileMenu() {
    navbar.classList.add("open");
    mobileOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeMobileMenu() {
    navbar.classList.remove("open");
    mobileOverlay.classList.remove("active");
    setTimeout(() => {
        if (!mobileOverlay.classList.contains("active")) {
            mobileOverlay.style.display = "none";
        }
    }, 300);
    document.body.style.overflow = "";
}

if (menuBtn && navbar) {
    menuBtn.addEventListener("click", openMobileMenu);
}

if (mobileOverlay) {
    mobileOverlay.addEventListener("click", closeMobileMenu);
}

// Close menu when clicking a nav link (tablet/mobile)
document.querySelectorAll(".header .navbar a").forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
            closeMobileMenu();
        }
    });
});

// ===================== SWIPE GESTURE - close sidebar by swiping right =====================
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
}, { passive: true });

document.addEventListener("touchend", (e) => {
    if (window.innerWidth > 768) return; // Only on mobile
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const deltaTime = touchEndTime - touchStartTime;

    // Swipe right: deltaX > 50px, within 300ms, mostly horizontal
    if (deltaX > 50 && deltaTime < 300 && Math.abs(deltaX) > Math.abs(deltaY)) {
        closeMobileMenu();
    }
}, { passive: true });

// ===================== JQUERY =====================
$(document).ready(function(){

    $('.region').click(function(){
        $(this).addClass('active').siblings().removeClass('active');
        var filter = $(this).attr('data-filter');
        if (typeof filterProjects === 'function') {
            filterProjects(filter);
        }
    });

});
