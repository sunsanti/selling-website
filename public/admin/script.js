// Shared admin JS utilities — auto-logout on 401
document.addEventListener('DOMContentLoaded', () => {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const res = await originalFetch.apply(this, args);
        if (res.status === 401) {
            alert('Session expired. Please log in again.');
            window.location.href = '/login';
        }
        return res;
    };
});
