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
            // Display account name from session
            accountName.textContent = data.name || 'User';
            // Sync account name to mobile sidebar
            mobileAccount.textContent = data.name || 'User';
        } else {
            adminBtn.style.display = "none";
            logoutBtn.style.display = "none";
            accountName.style.display = "none";
            leftSite.classList.add("hide-line");
        }
    })
    .catch(err => console.error(err));

function logoutAdmin(){
    fetch("/logout", {
        method: "POST"
    })
    .then(() => window.location.reload())
    .catch(err => console.error(err));
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

// Sync logout button visibility to mobile sidebar.
// We toggle body.logged-in so CSS can gate the drawer's phone/account/logout
// blocks (they have display:flex !important when the drawer is open, which
// would otherwise override the inline display:none set here).
if (logoutBtn && mobileLogoutBtn) {
    const syncLogout = () => {
        const isLoggedIn = !leftSite.classList.contains("hide-line");
        document.body.classList.toggle("logged-in", isLoggedIn);
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

// ===================== REGION FILTER =====================
document.querySelectorAll('.region').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.region').forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        const filter = el.dataset.filter;
        if (typeof filterProjects === 'function') {
            filterProjects(filter);
        }
    });
});
