// Script pour améliorer l'UX mobile et les animations
// À ajouter dans un fichier js/mobile-ux.js ou intégrer dans vos scripts existants

document.addEventListener('DOMContentLoaded', function() {
    // === Gestion du menu mobile ===
    initMobileMenu();
    
    // === Animations d'entrée pour les éléments ===
    initScrollAnimations();
    
    // === Amélioration des interactions ===
    initInteractionEnhancements();
    
    // === Gestion des toasts modernes ===
    enhanceToastSystem();
});

function initMobileMenu() {
    // Créer le bouton hamburger s'il n'existe pas
    const header = document.querySelector('.main-header');
    const nav = header.querySelector('nav');
    
    if (!header.querySelector('.mobile-menu-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-menu-toggle';
        toggleBtn.setAttribute('aria-label', 'Ouvrir le menu');
        toggleBtn.innerHTML = '☰';
        
        header.appendChild(toggleBtn);
        
        // Gestionnaire du menu mobile
        toggleBtn.addEventListener('click', function() {
            const isOpen = nav.classList.contains('mobile-open');
            
            if (isOpen) {
                nav.classList.remove('mobile-open');
                toggleBtn.innerHTML = '☰';
                toggleBtn.setAttribute('aria-label', 'Ouvrir le menu');
            } else {
                nav.classList.add('mobile-open');
                toggleBtn.innerHTML = '✕';
                toggleBtn.setAttribute('aria-label', 'Fermer le menu');
            }
        });
        
        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!header.contains(e.target) && nav.classList.contains('mobile-open')) {
                nav.classList.remove('mobile-open');
                toggleBtn.innerHTML = '☰';
                toggleBtn.setAttribute('aria-label', 'Ouvrir le menu');
            }
        });
        
        // Fermer le menu sur redimensionnement
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && nav.classList.contains('mobile-open')) {
                nav.classList.remove('mobile-open');
                toggleBtn.innerHTML = '☰';
                toggleBtn.setAttribute('aria-label', 'Ouvrir le menu');
            }
        });
    }
}

function initScrollAnimations() {
    // Intersection Observer pour les animations d'entrée
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });
    
    // Observer les sections
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });
    
    // Observer les éléments de calendrier
    document.querySelectorAll('.mini-month-placeholder').forEach(month => {
        observer.observe(month);
    });
}

function initInteractionEnhancements() {
    // Améliorer les boutons avec des effets de ripple
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Créer l'effet ripple
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Améliorer les champs de formulaire
    document.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('focus', function() {
            this.parentElement.classList.add('field-focused');
        });
        
        field.addEventListener('blur', function() {
            this.parentElement.classList.remove('field-focused');
        });
    });
    
    // Améliorer les cartes avec un effet de lift subtil
    document.querySelectorAll('.mini-month-placeholder, .section').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

function enhanceToastSystem() {
    // Améliorer le système de toast existant s'il y en a un
    const originalShowToast = window.showToast;
    
    if (typeof originalShowToast === 'function') {
        window.showToast = function(message, type = 'info', duration = 5000) {
            // Créer un toast avec une meilleure UX
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            // Ajouter une icône selon le type
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            
            toast.innerHTML = `
                <span class="toast-icon" style="font-size: 1.2em; margin-right: 8px;">${icons[type] || icons.info}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close" style="margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 4px;" aria-label="Fermer">✕</button>
            `;
            
            const container = document.getElementById('toast-container') || createToastContainer();
            container.appendChild(toast);
            
            // Gestionnaire de fermeture
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                removeToast(toast);
            });
            
            // Auto-suppression
            const timeoutId = setTimeout(() => {
                removeToast(toast);
            }, duration);
            
            // Pause sur hover
            toast.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
            });
            
            toast.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    removeToast(toast);
                }, 2000);
            });
            
            return toast;
        };
    }
    
    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
    
    function removeToast(toast) {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Ajouter les animations CSS nécessaires
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    @keyframes slideOut {
        to {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
        }
    }
    
    .field-focused {
        transform: scale(1.02);
    }
    
    .toast-close:hover {
        background: rgba(0, 0, 0, 0.1) !important;
    }
    
    /* Amélioration des transitions pour les interactions */
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .mini-month-placeholder,
    .section {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .form-group {
        transition: transform 0.15s ease;
    }
    
    /* Style pour l'état de chargement */
    .loading {
        position: relative;
        pointer-events: none;
    }
    
    .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

document.head.appendChild(style);

// Fonction utilitaire pour ajouter l'état de chargement
window.setLoadingState = function(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
        element.setAttribute('disabled', 'disabled');
    } else {
        element.classList.remove('loading');
        element.removeAttribute('disabled');
    }
};

// Fonction pour améliorer l'accessibilité
function enhanceAccessibility() {
    // Ajouter des labels ARIA manquants
    document.querySelectorAll('input[type="date"], input[type="time"], input[type="week"]').forEach(input => {
        if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
            const label = input.closest('.form-group')?.querySelector('label');
            if (label && !label.getAttribute('for')) {
                const id = input.id || `input-${Math.random().toString(36).substr(2, 9)}`;
                input.id = id;
                label.setAttribute('for', id);
            }
        }
    });
    
    // Améliorer les boutons sans texte
    document.querySelectorAll('button').forEach(btn => {
        if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) {
            const title = btn.getAttribute('title');
            if (title) {
                btn.setAttribute('aria-label', title);
            }
        }
    });
}

// Initialiser l'accessibilité
enhanceAccessibility();

// Gestion des erreurs globales pour l'UX
window.addEventListener('error', function(e) {
    console.error('Erreur détectée:', e.error);
    if (typeof window.showToast === 'function') {
        window.showToast('Une erreur inattendue s\'est produite', 'error');
    }
});

// Export pour utilisation dans d'autres modules si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initMobileMenu,
        initScrollAnimations,
        initInteractionEnhancements,
        enhanceToastSystem
    };
}