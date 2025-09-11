/**
 * Main Application Class - Follows SOLID principles
 * Single Responsibility: Manages the overall application state and initialization
 */
class PortfolioApp {
    constructor() {
        this.components = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    init() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            this.registerComponents();
            this.initializeComponents();
            this.bindEvents();
            this.isInitialized = true;
            console.log('Portfolio application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }

    /**
     * Register all application components
     */
    registerComponents() {
        this.components.set('navigation', new NavigationManager());
        this.components.set('scroll', new ScrollManager());
        this.components.set('animation', new AnimationManager());
        this.components.set('theme', new ThemeManager());
    }

    /**
     * Initialize all registered components
     */
    initializeComponents() {
        this.components.forEach((component, name) => {
            try {
                component.init();
                console.log(`${name} component initialized`);
            } catch (error) {
                console.error(`Failed to initialize ${name} component:`, error);
            }
        });
    }

    /**
     * Bind global event listeners
     */
    bindEvents() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Handle resize events with debouncing
        window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
        
        // Handle errors
        window.addEventListener('error', this.handleError.bind(this));
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            this.components.get('animation')?.resume();
        } else {
            this.components.get('animation')?.pause();
        }
    }

    /**
     * Handle window resize events
     */
    handleResize() {
        this.components.forEach(component => {
            if (typeof component.handleResize === 'function') {
                component.handleResize();
            }
        });
    }

    /**
     * Handle global errors
     */
    handleError(event) {
        console.error('Global error:', event.error);
        // Could implement error reporting here
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

/**
 * Navigation Manager Class
 * Single Responsibility: Handle all navigation-related functionality
 */
class NavigationManager {
    constructor() {
        this.navbar = null;
        this.navToggle = null;
        this.navMenu = null;
        this.navLinks = [];
        this.isMenuOpen = false;
        this.scrollThreshold = 50;
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setActiveLink();
    }

    cacheElements() {
        this.navbar = document.getElementById('navbar');
        this.navToggle = document.getElementById('mobile-menu');
        this.navMenu = document.getElementById('nav-menu');
        this.navLinks = Array.from(document.querySelectorAll('.nav-link'));

        if (!this.navbar || !this.navToggle || !this.navMenu) {
            throw new Error('Required navigation elements not found');
        }
    }

    bindEvents() {
        // Mobile menu toggle
        this.navToggle.addEventListener('click', this.toggleMobileMenu.bind(this));

        // Navigation link clicks
        this.navLinks.forEach(link => {
            link.addEventListener('click', this.handleNavLinkClick.bind(this));
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', this.handleOutsideClick.bind(this));

        // Handle scroll for navbar styling
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16));
    }

    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.navMenu.classList.toggle('active', this.isMenuOpen);
        this.navToggle.classList.toggle('active', this.isMenuOpen);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
        
        // Update ARIA attributes for accessibility
        this.navToggle.setAttribute('aria-expanded', this.isMenuOpen.toString());
    }

    handleNavLinkClick(event) {
        const link = event.currentTarget;
        const targetId = link.getAttribute('href');

        if (targetId.startsWith('#')) {
            event.preventDefault();
            this.scrollToSection(targetId);
            
            // Close mobile menu if open
            if (this.isMenuOpen) {
                this.toggleMobileMenu();
            }
        }
    }

    handleOutsideClick(event) {
        if (this.isMenuOpen && 
            !this.navMenu.contains(event.target) && 
            !this.navToggle.contains(event.target)) {
            this.toggleMobileMenu();
        }
    }

    handleScroll() {
        const scrollY = window.scrollY;
        
        // Add/remove scrolled class
        this.navbar.classList.toggle('scrolled', scrollY > this.scrollThreshold);
        
        // Update active navigation link
        this.setActiveLink();
    }

    scrollToSection(targetId) {
        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;

        const navbarHeight = this.navbar.offsetHeight;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }

    setActiveLink() {
        const scrollPosition = window.scrollY + this.navbar.offsetHeight + 100;

        // Find the current section
        const sections = document.querySelectorAll('section[id]');
        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top + window.scrollY;
            if (scrollPosition >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });

        // Update active navigation link
        this.navLinks.forEach(link => {
            const targetId = link.getAttribute('href').substring(1);
            link.classList.toggle('active', targetId === currentSection);
        });
    }

    handleResize() {
        // Close mobile menu on resize to desktop
        if (window.innerWidth > 768 && this.isMenuOpen) {
            this.toggleMobileMenu();
        }
    }

    /**
     * Utility: Throttle function for scroll events
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * Scroll Manager Class
 * Single Responsibility: Handle smooth scrolling and scroll-based interactions
 */
class ScrollManager {
    constructor() {
        this.scrollToTopButton = null;
        this.scrollThreshold = 300;
    }

    init() {
        this.createScrollToTopButton();
        this.bindEvents();
    }

    createScrollToTopButton() {
        this.scrollToTopButton = document.createElement('button');
        this.scrollToTopButton.className = 'scroll-to-top';
        this.scrollToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
        this.scrollToTopButton.setAttribute('aria-label', 'Scroll to top');
        this.scrollToTopButton.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: var(--shadow-medium);
        `;

        document.body.appendChild(this.scrollToTopButton);
    }

    bindEvents() {
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16));
        this.scrollToTopButton.addEventListener('click', this.scrollToTop.bind(this));
    }

    handleScroll() {
        const scrollY = window.scrollY;
        const shouldShow = scrollY > this.scrollThreshold;

        this.scrollToTopButton.style.opacity = shouldShow ? '1' : '0';
        this.scrollToTopButton.style.visibility = shouldShow ? 'visible' : 'hidden';
        this.scrollToTopButton.style.transform = shouldShow ? 'translateY(0)' : 'translateY(10px)';
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * Animation Manager Class
 * Single Responsibility: Handle scroll-based animations and visual effects
 */
class AnimationManager {
    constructor() {
        this.observedElements = new Set();
        this.intersectionObserver = null;
        this.isAnimationPaused = false;
    }

    init() {
        this.setupIntersectionObserver();
        this.observeElements();
        this.addTypingEffect();
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            if (this.isAnimationPaused) return;

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                    this.intersectionObserver.unobserve(entry.target);
                }
            });
        }, options);
    }

    observeElements() {
        const selectors = [
            '.section-header',
            '.timeline-item',
            '.skill-category',
            '.project-card',
            '.about-text',
            '.contact-item',
            '.education-card'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                element.classList.add('animate-on-scroll');
                element.style.animationDelay = `${index * 100}ms`;
                this.intersectionObserver.observe(element);
                this.observedElements.add(element);
            });
        });
    }

    animateElement(element) {
        element.classList.add('animated');
    }

    addTypingEffect() {
        const heroTitle = document.querySelector('.hero-title .gradient-text');
        if (!heroTitle) return;

        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        heroTitle.style.borderRight = '2px solid var(--primary-color)';

        let charIndex = 0;
        const typeSpeed = 100;

        const typeText = () => {
            if (charIndex < text.length) {
                heroTitle.textContent += text.charAt(charIndex);
                charIndex++;
                setTimeout(typeText, typeSpeed);
            } else {
                // Remove cursor after typing is complete
                setTimeout(() => {
                    heroTitle.style.borderRight = 'none';
                }, 1000);
            }
        };

        // Start typing effect after a short delay
        setTimeout(typeText, 500);
    }

    pause() {
        this.isAnimationPaused = true;
    }

    resume() {
        this.isAnimationPaused = false;
    }

    handleResize() {
        // Re-observe elements if needed after resize
        if (this.observedElements.size === 0) {
            this.observeElements();
        }
    }
}

/**
 * Theme Manager Class
 * Single Responsibility: Handle theme switching and preferences
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.prefersDarkMode = false;
    }

    init() {
        this.detectSystemPreference();
        this.loadSavedTheme();
        this.applyTheme();
    }

    detectSystemPreference() {
        this.prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.hasUserPreference()) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('portfolio-theme');
        if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = this.prefersDarkMode ? 'dark' : 'light';
        }
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateMetaThemeColor();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveTheme();
    }

    saveTheme() {
        localStorage.setItem('portfolio-theme', this.currentTheme);
    }

    hasUserPreference() {
        return localStorage.getItem('portfolio-theme') !== null;
    }

    updateMetaThemeColor() {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const color = this.currentTheme === 'dark' ? '#1e293b' : '#ffffff';
            metaThemeColor.setAttribute('content', color);
        }
    }
}

/**
 * Utility Functions
 */
const Utils = {
    /**
     * Debounce function
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Smooth scroll to element
     */
    smoothScrollTo(targetElement, offset = 0) {
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    },

    /**
     * Format date for display
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
    },

    /**
     * Validate email address
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Get random number between min and max
     */
    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Capitalize first letter of string
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};

/**
 * Performance Monitor
 * Single Responsibility: Monitor and report application performance
 */
class PerformanceMonitor {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
    }

    mark(name) {
        performance.mark(name);
        this.marks.set(name, performance.now());
    }

    measure(name, startMark, endMark = null) {
        if (endMark) {
            performance.measure(name, startMark, endMark);
        } else {
            performance.measure(name, startMark);
        }
        
        const measure = performance.getEntriesByName(name, 'measure')[0];
        this.measures.set(name, measure.duration);
        
        return measure.duration;
    }

    getMetrics() {
        return {
            marks: Object.fromEntries(this.marks),
            measures: Object.fromEntries(this.measures),
            navigation: performance.getEntriesByType('navigation')[0],
            paint: Object.fromEntries(
                performance.getEntriesByType('paint').map(entry => [entry.name, entry.startTime])
            )
        };
    }

    logMetrics() {
        console.group('Performance Metrics');
        console.table(this.getMetrics());
        console.groupEnd();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Performance monitoring
    const perfMonitor = new PerformanceMonitor();
    perfMonitor.mark('app-init-start');

    // Initialize main application
    const app = new PortfolioApp();
    app.init();

    perfMonitor.mark('app-init-end');
    perfMonitor.measure('app-initialization', 'app-init-start', 'app-init-end');

    // Log performance metrics in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => perfMonitor.logMetrics(), 2000);
    }
});

// Handle page load for any remaining initialization
window.addEventListener('load', () => {
    // Remove any loading indicators
    document.body.classList.add('loaded');
    
    // Force scroll to top on page load
    window.scrollTo(0, 0);
});

// Export for potential testing or external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PortfolioApp,
        NavigationManager,
        ScrollManager,
        AnimationManager,
        ThemeManager,
        Utils,
        PerformanceMonitor
    };
}

