/* Bilingual (EN / VI) i18n module — loaded synchronously before header.js.
 * API:  window.i18n.t(key)          → translated string for current lang
 *       window.i18n.td(obj, field)  → picks obj[field+'_vi'] when lang=vi, falls back to obj[field]
 *       window.i18n.getLang()       → 'en' | 'vi'
 *       window.i18n.setLang(lang)   → switch + persist + dispatch 'langchange' + re-apply DOM
 *       window.i18n.applyTranslations() → apply data-i18n / data-i18n-attr / data-i18n-html
 *       window.i18n.applyInputPlaceholders() → apply data-i18n-ph to placeholder attr
 */
(function () {
    'use strict';

    var DICT = {
        en: {
            // ── Navigation ──────────────────────────────────────
            nav_home:     'HOME',
            nav_projects: 'PROJECTS',
            nav_about:    'ABOUT US',
            nav_video:    'VIDEO',
            nav_news:     'NEWS',
            nav_contact:  'CONTACT',
            nav_book:     'BOOK CONSULTATION',
            nav_admin:    'ADMIN',
            nav_logout:   'LOGOUT',

            // ── Hero (main page) ────────────────────────────────
            hero_tagline:   'INVEST IN AUSTRALIAN PROPERTY',
            hero_title_1:   'BUILD WEALTH.',
            hero_title_2:   'SECURE YOUR FUTURE.',
            hero_subtitle:  "We help local and overseas buyers find high-growth properties in Australia's most desirable locations.",
            btn_explore:    'EXPLORE PROJECTS',
            btn_book_hero:  'BOOK CONSULTATION',

            // ── Property search bar ─────────────────────────────
            lbl_state:        'STATE',
            lbl_area:         'AREA',
            lbl_prop_type:    'PROPERTY TYPE',
            lbl_price_range:  'PRICE RANGE',
            btn_search:       'SEARCH PROPERTY',
            opt_all_states:   'All States',
            opt_all_areas:    'All Areas',
            opt_all_types:    'All Types',
            opt_any_price:    'Any Price',
            opt_apartment:    'Apartment',
            opt_house:        'House',
            opt_townhouse:    'Townhouse',
            opt_land:         'Land',
            btn_search_short: 'SEARCH',

            // ── Section tags / headings ─────────────────────────
            tag_featured:         'FEATURED PROJECTS',
            h2_featured:          'Premium Projects. Prime Locations.',
            btn_all_projects:     'VIEW ALL PROJECTS',
            tag_video:            'VIDEO',
            h2_video:             'Videos From Our Company',
            btn_all_videos:       'VIEW ALL VIDEOS',
            tag_services:         'OUR SERVICES',
            h2_services:          'How We Can Help You',
            tag_news:             'LATEST NEWS',
            h2_news:              "What's News Today",

            // ── Footer ──────────────────────────────────────────
            footer_touch:     'Get in touch with us today',
            ph_fullname:      'Full Name *',
            ph_phone:         'Phone Number',
            ph_email:         'Email Address',
            btn_submit:       'SUBMIT',
            h3_quick_links:   'QUICK LINKS',
            h3_team:          'CONTACT OUR TEAM',
            lnk_home:         'Home',
            lnk_projects:     'Projects',
            lnk_services:     'Services',
            lnk_video:        'Video',
            lnk_news:         'News',
            lnk_about:        'About Us',
            lnk_contact:      'Contact',

            // ── About page ──────────────────────────────────────
            about_hero_tag:   'SEALAND PROPERTY',
            about_hero_title: 'ABOUT US',
            about_mission:    "Our core mission is to become <strong>a trusted agency for buyers, sellers and investors</strong> looking to achieve property ownership in Australia — connecting people, knowledge and opportunity across Sydney, Melbourne, Brisbane and the Gold Coast.",
            tag_our_team:     'OUR TEAM',
            h2_meet_team:     'Meet the people behind Sealand.',
            tag_our_services: 'OUR SERVICES',
            h2_what_we_do:    'What we do for our clients.',
            tag_our_offices:  'OUR OFFICES',
            h2_offices:       'Get in touch.',

            // ── Contact page ────────────────────────────────────
            contact_hero_tag:   "WE'D LOVE TO HEAR FROM YOU",
            contact_hero_title: 'Contact Us',
            h2_send_msg:        'Send Us a Message',
            p_fill_details:     "Fill in your details and we'll get back to you as soon as possible.",
            btn_send_msg:       'SEND MESSAGE',
            h2_our_offices:     'Our Offices',
            h2_contact_team:    'Contact Our Team',
            p_contact_team:     'Reach out directly to a member of our team.',

            // ── Projects list page ──────────────────────────────
            tag_portfolio:      'OUR PORTFOLIO',
            h1_all_projects:    'All Projects',
            p_projects_sub:     'Browse our complete portfolio of premium properties across Australia.',
            txt_no_projects:    'No projects match your search.',
            lnk_clear_filters:  'Clear filters',
            lnk_clear_all:      'Clear all',
            lbl_beds:           'Beds',
            lbl_baths:          'Baths',
            lbl_cars:           'Car',

            // ── Projects detail page ────────────────────────────
            h2_about_property:  'About this property',
            h3_prop_details:    'Property Details',
            lnk_enquire:        'Enquire Now',
            h3_gallery:         'Gallery',
            h2_proj_not_found:  'Project not found',
            p_proj_not_found:   'The project you\'re looking for may have been removed.',
            lnk_browse_projects:'Browse all projects →',

            // ── News list page ──────────────────────────────────
            tag_news_page:      'LATEST NEWS',
            h1_all_news:        'All News',
            p_news_sub:         'Stay up-to-date with the Australian property market.',
            txt_no_news:        'No news available.',
            lnk_back_home:      'Back to home',
            btn_read_more:      'READ MORE',

            // ── News detail page ────────────────────────────────
            lnk_back_news:      'Back to all news',
            h2_news_not_found:  'News not found',
            p_news_not_found:   "The article you're looking for may have been removed.",
            lnk_browse_news:    'Browse all news',

            // ── Videos page ─────────────────────────────────────
            tag_video_lib:     'VIDEO LIBRARY',
            h1_all_videos:     'All Videos',
            p_videos_sub:      'Watch every Sealand Property video. All cards open TikTok in a new tab.',
            txt_no_videos:     'No videos yet.',
            lnk_back_home_vid: 'Back to home',
        },

        vi: {
            // ── Navigation ──────────────────────────────────────
            nav_home:     'TRANG CHỦ',
            nav_projects: 'DỰ ÁN',
            nav_about:    'VỀ CHÚNG TÔI',
            nav_video:    'VIDEO',
            nav_news:     'TIN TỨC',
            nav_contact:  'LIÊN HỆ',
            nav_book:     'ĐẶT TƯ VẤN',
            nav_admin:    'QUẢN TRỊ',
            nav_logout:   'ĐĂNG XUẤT',

            // ── Hero ────────────────────────────────────────────
            hero_tagline:   'ĐẦU TƯ BẤT ĐỘNG SẢN ÚC',
            hero_title_1:   'XÂY DỰNG TÀI SẢN.',
            hero_title_2:   'AN TOÀN TƯƠNG LAI.',
            hero_subtitle:  'Chúng tôi giúp người mua trong nước và quốc tế tìm kiếm bất động sản tăng trưởng cao tại các địa điểm đắc địa nhất của Úc.',
            btn_explore:    'KHÁM PHÁ DỰ ÁN',
            btn_book_hero:  'ĐẶT TƯ VẤN',

            // ── Search bar ──────────────────────────────────────
            lbl_state:        'BANG',
            lbl_area:         'KHU VỰC',
            lbl_prop_type:    'LOẠI BẤT ĐỘNG SẢN',
            lbl_price_range:  'MỨC GIÁ',
            btn_search:       'TÌM KIẾM',
            opt_all_states:   'Tất cả Bang',
            opt_all_areas:    'Tất cả Khu vực',
            opt_all_types:    'Tất cả Loại',
            opt_any_price:    'Mọi mức giá',
            opt_apartment:    'Căn hộ',
            opt_house:        'Nhà ở',
            opt_townhouse:    'Nhà phố',
            opt_land:         'Đất nền',
            btn_search_short: 'TÌM KIẾM',

            // ── Sections ────────────────────────────────────────
            tag_featured:         'DỰ ÁN NỔI BẬT',
            h2_featured:          'Dự Án Cao Cấp. Vị Trí Đắc Địa.',
            btn_all_projects:     'XEM TẤT CẢ DỰ ÁN',
            tag_video:            'VIDEO',
            h2_video:             'Video Từ Công Ty Chúng Tôi',
            btn_all_videos:       'XEM TẤT CẢ VIDEO',
            tag_services:         'DỊCH VỤ CỦA CHÚNG TÔI',
            h2_services:          'Chúng Tôi Có Thể Giúp Gì Cho Bạn',
            tag_news:             'TIN TỨC MỚI NHẤT',
            h2_news:              'Tin Tức Hôm Nay',

            // ── Footer ──────────────────────────────────────────
            footer_touch:     'Liên hệ với chúng tôi ngay hôm nay',
            ph_fullname:      'Họ và Tên *',
            ph_phone:         'Số Điện Thoại',
            ph_email:         'Địa Chỉ Email',
            btn_submit:       'GỬI',
            h3_quick_links:   'LIÊN KẾT NHANH',
            h3_team:          'LIÊN HỆ ĐỘI NGŨ',
            lnk_home:         'Trang Chủ',
            lnk_projects:     'Dự Án',
            lnk_services:     'Dịch Vụ',
            lnk_video:        'Video',
            lnk_news:         'Tin Tức',
            lnk_about:        'Về Chúng Tôi',
            lnk_contact:      'Liên Hệ',

            // ── About ────────────────────────────────────────────
            about_hero_tag:   'SEALAND PROPERTY',
            about_hero_title: 'VỀ CHÚNG TÔI',
            about_mission:    'Sứ mệnh cốt lõi của chúng tôi là trở thành <strong>đơn vị uy tín cho người mua, người bán và nhà đầu tư</strong> muốn sở hữu bất động sản tại Úc — kết nối con người, kiến thức và cơ hội tại Sydney, Melbourne, Brisbane và Gold Coast.',
            tag_our_team:     'ĐỘI NGŨ CỦA CHÚNG TÔI',
            h2_meet_team:     'Gặp gỡ những người đứng sau Sealand.',
            tag_our_services: 'DỊCH VỤ CỦA CHÚNG TÔI',
            h2_what_we_do:    'Chúng tôi làm gì cho khách hàng.',
            tag_our_offices:  'VĂN PHÒNG CỦA CHÚNG TÔI',
            h2_offices:       'Liên hệ với chúng tôi.',

            // ── Contact ──────────────────────────────────────────
            contact_hero_tag:   'CHÚNG TÔI MUỐN NGHE TỪ BẠN',
            contact_hero_title: 'Liên Hệ',
            h2_send_msg:        'Gửi Tin Nhắn Cho Chúng Tôi',
            p_fill_details:     'Điền thông tin và chúng tôi sẽ liên hệ lại sớm nhất có thể.',
            btn_send_msg:       'GỬI TIN NHẮN',
            h2_our_offices:     'Văn Phòng Của Chúng Tôi',
            h2_contact_team:    'Liên Hệ Đội Ngũ',
            p_contact_team:     'Liên hệ trực tiếp với một thành viên trong đội ngũ của chúng tôi.',

            // ── Projects list ────────────────────────────────────
            tag_portfolio:      'DANH MỤC DỰ ÁN',
            h1_all_projects:    'Tất Cả Dự Án',
            p_projects_sub:     'Khám phá danh mục bất động sản cao cấp trên khắp nước Úc.',
            txt_no_projects:    'Không tìm thấy dự án phù hợp.',
            lnk_clear_filters:  'Xoá bộ lọc',
            lnk_clear_all:      'Xoá tất cả',
            lbl_beds:           'PN',
            lbl_baths:          'WC',
            lbl_cars:           'Xe',

            // ── Projects detail ──────────────────────────────────
            h2_about_property:  'Về bất động sản này',
            h3_prop_details:    'Thông Tin Bất Động Sản',
            lnk_enquire:        'Liên Hệ Ngay',
            h3_gallery:         'Thư Viện Ảnh',
            h2_proj_not_found:  'Không tìm thấy dự án',
            p_proj_not_found:   'Dự án bạn đang tìm kiếm có thể đã bị xoá.',
            lnk_browse_projects:'Xem tất cả dự án →',

            // ── News list ─────────────────────────────────────────
            tag_news_page:      'TIN TỨC MỚI NHẤT',
            h1_all_news:        'Tất Cả Tin Tức',
            p_news_sub:         'Cập nhật thông tin mới nhất về thị trường bất động sản Úc.',
            txt_no_news:        'Chưa có tin tức nào.',
            lnk_back_home:      'Về trang chủ',
            btn_read_more:      'XEM THÊM',

            // ── News detail ───────────────────────────────────────
            lnk_back_news:      'Quay lại tất cả tin tức',
            h2_news_not_found:  'Không tìm thấy bài viết',
            p_news_not_found:   'Bài viết bạn đang tìm có thể đã bị xoá.',
            lnk_browse_news:    'Xem tất cả tin tức',

            // ── Videos ───────────────────────────────────────────
            tag_video_lib:     'THƯ VIỆN VIDEO',
            h1_all_videos:     'Tất Cả Video',
            p_videos_sub:      'Xem toàn bộ video của Sealand Property. Tất cả đều mở TikTok ở tab mới.',
            txt_no_videos:     'Chưa có video nào.',
            lnk_back_home_vid: 'Về trang chủ',
        }
    };

    var _lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'en';

    function getLang() { return _lang; }

    function t(key) {
        var dict = DICT[_lang] || DICT.en;
        return dict[key] !== undefined ? dict[key] : (DICT.en[key] !== undefined ? DICT.en[key] : key);
    }

    // Returns bilingual DB field: prefers field_vi when lang=vi and non-empty
    function td(obj, field) {
        if (!obj) return '';
        if (_lang === 'vi') {
            var vi = obj[field + '_vi'];
            if (vi && String(vi).trim()) return vi;
        }
        return obj[field] || '';
    }

    function applyTranslations() {
        // data-i18n → textContent
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        // data-i18n-html → innerHTML (for bold/link markup in translations)
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            el.innerHTML = t(el.getAttribute('data-i18n-html'));
        });
        // data-i18n-ph → placeholder attribute
        document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
            el.placeholder = t(el.getAttribute('data-i18n-ph'));
        });
        // data-i18n-attr="attrName" + data-i18n="key" → el.setAttribute(attrName, t(key))
        document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
            var attr = el.getAttribute('data-i18n-attr');
            var key  = el.getAttribute('data-i18n');
            if (attr && key) el.setAttribute(attr, t(key));
        });
        // Sync toggle button active state
        document.querySelectorAll('.lang-btn').forEach(function (btn) {
            btn.classList.toggle('lang-btn-active', btn.dataset.lang === _lang);
        });
        document.documentElement.lang = _lang === 'vi' ? 'vi' : 'en';
    }

    function setLang(lang) {
        if (lang !== 'en' && lang !== 'vi') return;
        _lang = lang;
        if (typeof localStorage !== 'undefined') localStorage.setItem('lang', lang);
        applyTranslations();
        window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
    }

    window.i18n = { t: t, td: td, getLang: getLang, setLang: setLang, applyTranslations: applyTranslations };

    // Apply on DOMContentLoaded so data-i18n elements are already in the DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTranslations);
    } else {
        applyTranslations();
    }
}());
