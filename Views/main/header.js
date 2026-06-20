/* Shared header component — single source of truth for all client pages.
 * Injected synchronously so the header is available before DOMContentLoaded.
 * Active nav item is detected from window.location.pathname. */
(function () {
    'use strict';

    var p = window.location.pathname;

    function isActive(href) {
        if (href === '/main') return p === '/main' || p === '/main/' || p === '/';
        return p === href || p.indexOf(href + '/') === 0;
    }

    function navLink(href, label) {
        var cls = 'nav-item' + (isActive(href) ? ' nav-active' : '');
        return '<a class="' + cls + '" href="' + href + '">' + label + '</a>';
    }

    var html =
        '<header class="header">\n' +
        '        <div class="header-zone header-zone-left">\n' +
        '            <a href="/main" class="logo" id="logo-link">\n' +
        '                <span id="site-logo-text" class="logo-text">SEALAND PROPERTY</span>\n' +
        '                <img id="site-logo-img" src="" alt="" style="display:none;height:40px;object-fit:contain;">\n' +
        '            </a>\n' +
        '        </div>\n' +
        '        <nav class="navbar" id="main-navbar">\n' +
        '            <div class="mobile-nav-header" style="display:none;">\n' +
        '                <div id="mobile-site-phone" class="mobile-site-phone"></div>\n' +
        '                <div id="mobile-account" class="mobile-account-name"></div>\n' +
        '            </div>\n' +
        '            ' + navLink('/main',    'HOME')    + '\n' +
        '            ' + navLink('/projects','PROJECTS')+ '\n' +
        '            ' + navLink('/about',   'ABOUT US')+ '\n' +
        '            ' + navLink('/videos',  'VIDEO')   + '\n' +
        '            ' + navLink('/news',    'NEWS')    + '\n' +
        '            ' + navLink('/contact', 'CONTACT') + '\n' +
        '            <a class="nav-item desktop-admin-btn" id="admin-btn" style="display:none;" onclick="window.location.href=\'/admin\'">ADMIN</a>\n' +
        '            <button id="mobile-logout-btn" class="mobile-logout-btn" onclick="logoutAdmin()">LOGOUT</button>\n' +
        '        </nav>\n' +
        '        <div class="header-zone header-zone-right">\n' +
        '            <a href="javascript:void(0)" class="btn-header-phone" id="header-phone-btn">\n' +
        '                <i class="fa-solid fa-phone"></i>\n' +
        '                <span id="site-phone">phone number</span>\n' +
        '            </a>\n' +
        '            <div class="header-cta logged-out-cta">\n' +
        '                <a href="/contact" class="btn-book-consultation">BOOK CONSULTATION</a>\n' +
        '            </div>\n' +
        '            <div class="header-cta logged-in-cta" style="display:none;">\n' +
        '                <div class="account-name" id="account">Name</div>\n' +
        '                <button id="logout-btn" onclick="logoutAdmin()"><div>LOGOUT</div></button>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '        <button class="menu-btn" id="menu-btn">\n' +
        '            <i class="fa-solid fa-bars"></i>\n' +
        '        </button>\n' +
        '    </header>\n' +
        '    <div class="mobile-overlay" id="mobile-overlay"></div>';

    var s = document.currentScript;
    if (s && s.parentNode) {
        s.insertAdjacentHTML('afterend', html);
    } else {
        document.body.insertAdjacentHTML('afterbegin', html);
    }
}());
