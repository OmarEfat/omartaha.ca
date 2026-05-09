/**
 * omartaha.ca — site script
 * Navigation, scroll behavior, scroll-reveal, theme toggle, footer dates.
 */

class NavigationManager {
    constructor() {
        this.navbar = null;
        this.navToggle = null;
        this.navMenu = null;
        this.navLinks = [];
        this.isMenuOpen = false;
        this.scrollThreshold = 24;
    }

    init() {
        this.navbar = document.getElementById('navbar');
        this.navToggle = document.getElementById('mobile-menu');
        this.navMenu = document.getElementById('nav-menu');
        this.navLinks = Array.from(document.querySelectorAll('.nav-link'));

        if (!this.navbar || !this.navToggle || !this.navMenu) return;

        this.navToggle.addEventListener('click', () => this.toggleMenu());
        this.navToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleMenu();
            }
        });

        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleLinkClick(e));
        });

        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        window.addEventListener('scroll', throttle(() => this.handleScroll(), 16), { passive: true });
        window.addEventListener('resize', debounce(() => this.handleResize(), 200));

        this.handleScroll();
    }

    toggleMenu(force) {
        this.isMenuOpen = typeof force === 'boolean' ? force : !this.isMenuOpen;
        this.navMenu.classList.toggle('active', this.isMenuOpen);
        this.navToggle.classList.toggle('active', this.isMenuOpen);
        this.navToggle.setAttribute('aria-expanded', String(this.isMenuOpen));
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
    }

    handleLinkClick(event) {
        const href = event.currentTarget.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        const offset = this.navbar.offsetHeight;
        const top = target.getBoundingClientRect().top + window.scrollY - offset + 1;
        window.scrollTo({ top, behavior: 'smooth' });

        if (this.isMenuOpen) this.toggleMenu(false);
    }

    handleOutsideClick(event) {
        if (!this.isMenuOpen) return;
        if (this.navMenu.contains(event.target) || this.navToggle.contains(event.target)) return;
        this.toggleMenu(false);
    }

    handleScroll() {
        const y = window.scrollY;
        this.navbar.classList.toggle('scrolled', y > this.scrollThreshold);

        const scrollPos = y + this.navbar.offsetHeight + 100;
        let current = '';
        document.querySelectorAll('section[id]').forEach(section => {
            if (section.hasAttribute('hidden')) return;
            const top = section.getBoundingClientRect().top + window.scrollY;
            if (scrollPos >= top) current = section.id;
        });

        this.navLinks.forEach(link => {
            const targetId = (link.getAttribute('href') || '').slice(1);
            link.classList.toggle('active', targetId === current);
        });
    }

    handleResize() {
        if (window.innerWidth > 768 && this.isMenuOpen) this.toggleMenu(false);
    }
}

class ScrollToTopManager {
    constructor() {
        this.button = null;
        this.threshold = 320;
    }

    init() {
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'scroll-to-top';
        this.button.setAttribute('aria-label', 'Scroll to top');
        this.button.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
        document.body.appendChild(this.button);

        this.button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', throttle(() => this.handleScroll(), 100), { passive: true });
    }

    handleScroll() {
        this.button.classList.toggle('visible', window.scrollY > this.threshold);
    }
}

class ScrollRevealManager {
    constructor() {
        this.observer = null;
    }

    init() {
        if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('animated'));
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    this.observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        const selectors = [
            '.section-header',
            '.timeline-item',
            '.skill-category',
            '.project-card-link',
            '.about-text',
            '.contact-item-link',
            '.education-card',
            '.honor-card'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach((el, i) => {
                el.classList.add('animate-on-scroll');
                el.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
                this.observer.observe(el);
            });
        });
    }
}

class ThemeManager {
    constructor() {
        this.toggle = null;
    }

    init() {
        this.toggle = document.getElementById('theme-toggle');
        if (!this.toggle) return;

        this.applyTheme(this.currentTheme());

        this.toggle.addEventListener('click', () => {
            const next = this.currentTheme() === 'dark' ? 'light' : 'dark';
            localStorage.setItem('portfolio-theme', next);
            this.applyTheme(next);
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('portfolio-theme')) return;
            this.applyTheme(e.matches ? 'dark' : 'light');
        });
    }

    currentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = this.toggle.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        this.toggle.setAttribute('aria-label', label);
        this.toggle.setAttribute('title', label);

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#fafaf9');
    }
}

function setFooterMeta() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const updatedEl = document.getElementById('last-updated-date');
    if (updatedEl) {
        const lm = document.lastModified ? new Date(document.lastModified) : new Date();
        if (!isNaN(lm.getTime())) {
            const fmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
            updatedEl.textContent = fmt.format(lm);
        }
    }
}

function throttle(fn, limit) {
    let inFlight = false;
    return function (...args) {
        if (inFlight) return;
        fn.apply(this, args);
        inFlight = true;
        setTimeout(() => { inFlight = false; }, limit);
    };
}

function debounce(fn, wait) {
    let id;
    return function (...args) {
        clearTimeout(id);
        id = setTimeout(() => fn.apply(this, args), wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    new NavigationManager().init();
    new ScrollToTopManager().init();
    new ScrollRevealManager().init();
    new ThemeManager().init();
    setFooterMeta();
});
