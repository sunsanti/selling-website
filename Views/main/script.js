// ===================== ADMIN SESSION =====================
const adminBtn = document.getElementById("admin-btn");
const logoutBtn = document.getElementById("logout-btn");
const accountName = document.getElementById("account");
const mobileAccount = document.getElementById("mobile-account");

// F02: 3-zone header — CTA toggles entire blocks (logged-out vs logged-in)
const loggedOutCta = document.querySelector(".logged-out-cta");
const loggedInCta = document.querySelector(".logged-in-cta");

fetch("/check-auth")
    .then(res => res.json())
    .then(data => {
        document.body.classList.toggle("logged-in", !!data.loggedIn);
        if (data.loggedIn) {
            if (loggedOutCta) loggedOutCta.style.display = "none";
            if (loggedInCta) loggedInCta.style.display = "flex";
            if (adminBtn) adminBtn.style.display = "block";
            if (accountName) accountName.textContent = data.name || 'User';
            if (mobileAccount) mobileAccount.textContent = data.name || 'User';
        } else {
            if (loggedOutCta) loggedOutCta.style.display = "flex";
            if (loggedInCta) loggedInCta.style.display = "none";
            if (adminBtn) adminBtn.style.display = "none";
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
    const el = document.getElementById("fill-popup");
    if (el) el.style.display = "flex";
}

function closeFillPopup(){
    const el = document.getElementById("fill-popup");
    if (el) el.style.display = "none";
}

// Auto-open contact popup on first visit per session (delay 1.5s).
// Skipped entirely inside admin live-preview iframes (?preview=1) — the
// popup should never appear over the Dashboard's preview panel.
window.addEventListener('DOMContentLoaded', () => {
    if (new URLSearchParams(window.location.search).get('preview') === '1') return;
    if (sessionStorage.getItem('fillPopupShown')) return;
    setTimeout(() => {
        fillInfoPopup();
        sessionStorage.setItem('fillPopupShown', '1');
    }, 1500);
});

// ===================== MOBILE MENU TOGGLE (Sidebar Drawer) =====================
const menuBtn = document.getElementById("menu-btn");
const navbar = document.getElementById("main-navbar");
const mobileOverlay = document.getElementById("mobile-overlay");
const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

// F02: body.logged-in class is now set directly by /check-auth handler above.
// Mobile drawer logout/account visibility is gated via CSS body.logged-in rules
// (see style.css lines around 1133 + 1345). No MutationObserver needed.

function openMobileMenu() {
    navbar.classList.add("open");
    mobileOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden"; // also lock <html> to remove scrollbar gap
}

function closeMobileMenu() {
    navbar.classList.remove("open");
    mobileOverlay.classList.remove("active");
    // F02 polish: overlay hidden via opacity + pointer-events (CSS), no inline display toggle needed
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
}

function toggleMobileMenu(event) {
    // Prevent the window-onclick handler in this file from re-closing immediately
    if (event) event.stopPropagation();
    if (navbar.classList.contains("open")) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

if (menuBtn && navbar) {
    menuBtn.addEventListener("click", toggleMobileMenu);
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
