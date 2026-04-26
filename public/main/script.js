// ---- Load website settings (logo, phone, main image) ----
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const s = await res.json();
        if (s.logo_url) {
            document.getElementById('site-logo').textContent = '';
            const img = document.createElement('img');
            img.src = s.logo_url;
            img.alt = 'Logo';
            img.style.height = '36px';
            img.style.objectFit = 'contain';
            document.getElementById('site-logo').appendChild(img);
        }
        if (s.phone_number) {
            document.getElementById('site-phone').textContent = s.phone_number;
        }
        if (s.main_image_url) {
            document.getElementById('site-main-image').src = s.main_image_url;
        }
    } catch (err) {
        console.warn('Could not load settings:', err);
    }
}

// ---- Project data from DB ----
let allProjects = [];

function renderProjectCard(p) {
    return `
        <div class="feature-item" data-region="${p.region}">
            <div class="feature-image" onclick="openPopupById(${p.id})">
                <img src="${p.image_url}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                <div class="overlay-text"></div>
            </div>
        </div>
    `;
}

async function loadProjects() {
    try {
        const res = await fetch('/api/projects');
        allProjects = await res.json();
        renderProjectGrid(allProjects);
    } catch (err) {
        console.error('Could not load projects:', err);
    }
}

function renderProjectGrid(projects) {
    const list1 = document.getElementById('project-list-1');
    const list2 = document.getElementById('project-list-2');

    if (!projects || projects.length === 0) {
        list1.innerHTML = '<p style="color:#999;padding:20px;">No projects found.</p>';
        list2.style.display = 'none';
        return;
    }

    const half = Math.ceil(projects.length / 2);
    const firstHalf = projects.slice(0, half);
    const secondHalf = projects.slice(half);

    list1.innerHTML = firstHalf.map(renderProjectCard).join('');
    list2.innerHTML = secondHalf.map(renderProjectCard).join('');
    list2.style.display = '';

    attachHoverHandlers();
}

function attachHoverHandlers() {
    document.querySelectorAll('.feature-image').forEach(img => {
        const overlay = img.querySelector('.overlay-text');
        img.addEventListener('mouseenter', () => {
            const id = img.getAttribute('onclick')?.match(/\d+/)?.[0];
            const project = allProjects.find(p => p.id == id);
            if (project) {
                overlay.textContent = project.name;
                overlay.style.opacity = 1;
            }
        });
        img.addEventListener('mouseleave', () => {
            overlay.style.opacity = 0;
        });
    });
}

// ---- Popup ----
function openPopupById(id) {
    const project = allProjects.find(p => p.id == id);
    if (!project) return;
    document.getElementById('popup-small-content').innerText = project.description || '';
    document.getElementById('popup-right1').innerText = project.name;
    document.getElementById('popup-right2').innerText = project.size;
    document.getElementById('popup-right3').innerText = project.category;
    document.getElementById('popup-right4').innerText = project.year;
    document.getElementById('popup-right5').innerText = project.style;
    document.getElementById('popup-image').src = project.image_url;
    document.getElementById('popup-image').onerror = function() {
        this.src = 'https://via.placeholder.com/400x300?text=No+Image';
    };
    document.getElementById('popup').style.display = 'flex';
}

// ---- Admin auth check ----
const adminBtn = document.getElementById('admin-btn');
const logoutBtn = document.getElementById('logout-btn');

fetch('/check-auth')
    .then(res => res.json())
    .then(data => {
        if (data.loggedIn) {
            adminBtn.style.display = 'block';
            logoutBtn.style.display = 'block';
        }
    })
    .catch(err => console.log(err));

adminBtn.addEventListener('click', () => { window.location.href = '/admin'; });

function logoutAdmin() {
    fetch('/logout', { method: 'POST' }).then(() => window.location.reload()).catch(err => console.log(err));
}

// ---- Window click to close popups ----
window.onclick = function(event) {
    const popup = document.getElementById('popup');
    const fillpopup = document.getElementById('fill-popup');
    if (event.target === popup || event.target === fillpopup) {
        popup.style.display = 'none';
        fillpopup.style.display = 'none';
    }
};

function fillInfoPopup() {
    document.getElementById('fill-popup').style.display = 'flex';
}

// ---- Contact form submission ----
async function submitContact(data) {
    try {
        const res = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.ok;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// ---- Region filter ----
$(document).ready(function() {
    $('.region').click(function() {
        $(this).addClass('active').siblings().removeClass('active');
        const filter = $(this).attr('data-filter');
        if (filter === 'all') {
            $('.feature-item').show(300);
        } else {
            $('.feature-item').hide(200);
            $(`.feature-item[data-region="${filter}"]`).show(300);
        }
    });

    $('#fill-popup .submit-btn a').on('click', async function(e) {
        e.preventDefault();
        const name = $('#fill-popup input').eq(0).val().trim();
        const phone = $('#fill-popup input').eq(1).val().trim();
        const email = $('#fill-popup input').eq(2).val().trim();
        if (!name || !phone || !email) { alert('Please fill in all fields.'); return; }
        const success = await submitContact({ name, phone, email });
        if (success) {
            $('#fill-popup input').val('');
            document.getElementById('fill-popup').style.display = 'none';
            alert('Thank you! Your message has been submitted.');
        } else {
            alert('Failed to submit. Please try again.');
        }
    });
});

// ---- Init ----
loadSettings();
loadProjects();
