/**
 * Simple visitor tracking script for omartaha.ca
 * Tracks URL parameters like ?source=linkedin
 * 
 * Add this to your index.html before </body>:
 * <script src="tracking.js"></script>
 */

(function() {
    'use strict';
    
    // Get URL parameters
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    // Get or create visitor ID (simple implementation using localStorage)
    function getVisitorId() {
        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitor_id', visitorId);
        }
        return visitorId;
    }
    
    // Track visitor
    function trackVisitor() {
        const source = getUrlParameter('source') || 
                      getUrlParameter('utm_source') || 
                      getUrlParameter('ref') || 
                      'direct';
        
        const campaign = getUrlParameter('campaign') || getUrlParameter('utm_campaign') || '';
        const medium = getUrlParameter('medium') || getUrlParameter('utm_medium') || '';
        
        const data = {
            source: source,
            campaign: campaign,
            medium: medium,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
            visitor_id: getVisitorId()
        };
        
        // Send to tracking endpoint
        // Update this URL to your actual server endpoint
        const trackingEndpoint = 'http://YOUR_SERVER_IP:9000/api/track';
        
        // Only track in production (not on localhost)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            fetch(trackingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                mode: 'no-cors' // Use this if you don't have CORS set up
            }).catch(err => {
                // Silent fail - don't break the site if tracking fails
                console.debug('Tracking skipped');
            });
        }
        
        // Also log to console in development
        console.log('Visitor tracked:', data);
        
        // Store source in sessionStorage for reference
        if (source !== 'direct') {
            sessionStorage.setItem('visit_source', source);
        }
    }
    
    // Run tracking when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackVisitor);
    } else {
        trackVisitor();
    }
})();

