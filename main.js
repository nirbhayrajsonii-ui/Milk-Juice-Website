/* -------------------------------------------------------------
   NEBULA // Kinetic Animation Engine
   ------------------------------------------------------------- */

// Animation Configuration
const totalFrames = 220;
const framePathPrefix = 'frames/ezgif-frame-';
const framePathSuffix = '.jpg';
const images = [];
let loadedCount = 0;

// Canvas Setup
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');
const imageAspectRatio = 1280 / 720; // Pre-calculated from image dimensions (1280x720)

// Animation State
let currentFrameIndex = 0;
let targetFrameIndex = 0;
const damping = 0.08; // Damping factor for smooth frame transition (lerp)

// Autoplay State
let isAutoplay = false;
let autoplayFrame = 0;
let autoplaySpeed = 1.0;
let autoplayInterval = null;

// DOM Elements
const loader = document.getElementById('loader');
const progressBar = document.getElementById('progress-bar');
const loaderPercentage = document.getElementById('loader-percentage');
const scrollHelper = document.getElementById('scroll-helper');
const frameCounter = document.getElementById('frame-counter');
const frameScrubber = document.getElementById('frame-scrubber');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const statusMode = document.getElementById('status-mode');
const playbackSpeedSelect = document.getElementById('playback-speed');
const indicatorFill = document.getElementById('indicator-fill');

// Navigation & Sections elements
const sections = document.querySelectorAll('.scroll-section');
const navLinks = document.querySelectorAll('.nav-link');
const progressSteps = document.querySelectorAll('.step');
const mainNav = document.getElementById('main-nav');

/* -------------------------------------------------------------
   1. Preloader Engine
   ------------------------------------------------------------- */
function initPreloader() {
    // Disable scrolling during load
    document.body.style.overflow = 'hidden';
    
    for (let i = 1; i <= totalFrames; i++) {
        const img = new Image();
        // Zero pad frame number: e.g., 1 -> 001, 15 -> 015, 120 -> 120
        const frameNum = String(i).padStart(3, '0');
        img.src = `${framePathPrefix}${frameNum}${framePathSuffix}`;
        
        img.onload = () => {
            loadedCount++;
            updateLoaderProgress();
        };
        
        img.onerror = () => {
            console.error(`Failed to load frame ${frameNum}`);
            loadedCount++; // Count anyway to avoid getting stuck
            updateLoaderProgress();
        };
        
        images.push(img);
    }
}

function updateLoaderProgress() {
    const percent = Math.floor((loadedCount / totalFrames) * 100);
    progressBar.style.width = `${percent}%`;
    loaderPercentage.textContent = `${percent}%`;
    
    if (loadedCount === totalFrames) {
        setTimeout(completePreloader, 600);
    }
}

function completePreloader() {
    // Fade out loader
    loader.classList.add('fade-out');
    
    // Enable scroll
    document.body.style.overflow = '';
    
    // Resize canvas to correct initial dimensions
    resizeCanvas();
    
    // Render the initial frame
    renderFrame(0);
    
    // Trigger Hero Entry Animations
    setTimeout(() => {
        document.querySelectorAll('.animate-on-load').forEach(el => {
            el.classList.add('ready');
        });
    }, 400);
    
    // Initialize Scroll Listeners & Animation Loop
    setupInteractions();
    requestAnimationFrame(animationLoop);
}

/* -------------------------------------------------------------
   2. Canvas Rendering & Scaling (Cover Effect)
   ------------------------------------------------------------- */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderFrame(Math.round(currentFrameIndex));
}

function renderFrame(index) {
    if (!images[index] || !images[index].complete) return;
    
    const img = images[index];
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let renderWidth, renderHeight, xOffset, yOffset;
    
    if (canvasAspectRatio > imageAspectRatio) {
        // Canvas is wider than image aspect ratio (Crop top/bottom)
        renderWidth = canvas.width;
        renderHeight = canvas.width / imageAspectRatio;
        xOffset = 0;
        yOffset = (canvas.height - renderHeight) / 2;
    } else {
        // Canvas is narrower/taller than image aspect ratio (Crop left/right)
        renderWidth = canvas.height * imageAspectRatio;
        renderHeight = canvas.height;
        xOffset = (canvas.width - renderWidth) / 2;
        yOffset = 0;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, xOffset, yOffset, renderWidth, renderHeight);
}

/* -------------------------------------------------------------
   3. Scroll Tracker & Frame Mapping
   ------------------------------------------------------------- */
function getScrollFraction() {
    const scrollY = window.scrollY;
    const kineticContainer = document.getElementById('kinetic-container');
    if (!kineticContainer) return 0;
    const totalScrollHeight = kineticContainer.offsetHeight - window.innerHeight;
    if (totalScrollHeight <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY / totalScrollHeight));
}

function updateFrameFromScroll() {
    if (isAutoplay) return; // Autoplay handles its own frame calculation
    
    const scrollFraction = getScrollFraction();
    targetFrameIndex = Math.min(totalFrames - 1, Math.floor(scrollFraction * totalFrames));
    
    // Update scrubber UI to match
    frameScrubber.value = targetFrameIndex;
}

/* -------------------------------------------------------------
   4. Frame Interpolation (Lerp) Loop
   ------------------------------------------------------------- */
function animationLoop() {
    // Lerp calculation: currentFrameIndex slides smoothly towards targetFrameIndex
    const diff = targetFrameIndex - currentFrameIndex;
    
    if (Math.abs(diff) > 0.01) {
        currentFrameIndex += diff * damping;
        renderFrame(Math.round(currentFrameIndex));
        updateUI();
    } else if (Math.round(currentFrameIndex) !== targetFrameIndex) {
        // Snapping to final value
        currentFrameIndex = targetFrameIndex;
        renderFrame(targetFrameIndex);
        updateUI();
    }
    
    requestAnimationFrame(animationLoop);
}

/* -------------------------------------------------------------
   5. UI State Syncing
   ------------------------------------------------------------- */
function updateUI() {
    const frameNumber = Math.round(currentFrameIndex) + 1;
    const paddedFrame = String(frameNumber).padStart(3, '0');
    
    // Update bottom-right panel displays
    frameCounter.textContent = `FRAME ${paddedFrame} / ${totalFrames}`;
    
    // Update page progress indicator
    const scrollFraction = getScrollFraction();
    indicatorFill.style.height = `${scrollFraction * 100}%`;
    
    // Highlight side nav steps & global header links based on scroll
    updateActiveStates();
}

function updateActiveStates() {
    const scrollY = window.scrollY;
    const navHeight = 80;
    const kineticContainer = document.getElementById('kinetic-container');
    const playbackPanel = document.getElementById('playback-panel');
    const progressIndicator = document.querySelector('.scroll-progress-indicator');
    
    // Hide scroll helper mouse icon on scroll
    if (scrollY > 50) {
        scrollHelper.classList.add('hidden');
    } else {
        scrollHelper.classList.remove('hidden');
    }
    
    // Shrink header on scroll
    if (scrollY > 100) {
        mainNav.classList.add('scrolled');
    } else {
        mainNav.classList.remove('scrolled');
    }
    
    if (kineticContainer) {
        const kineticHeight = kineticContainer.offsetHeight;
        // Hide dot progress indicators and playback controller when scrolled past kinetic anim wrapper
        if (scrollY > kineticHeight - window.innerHeight / 2) {
            playbackPanel.classList.add('hidden');
            progressIndicator.classList.add('hidden');
        } else {
            playbackPanel.classList.remove('hidden');
            progressIndicator.classList.remove('hidden');
        }
    }
    
    // Highlight active nav link (covering both kinetic and Tailwind sections)
    const allNavLinks = document.querySelectorAll('.nav-link');
    let activeLink = allNavLinks[0];
    
    allNavLinks.forEach(link => {
        const targetId = link.getAttribute('href');
        if (!targetId) return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const top = targetElement.offsetTop - navHeight - 120;
            const bottom = top + targetElement.offsetHeight;
            if (scrollY >= top && scrollY < bottom) {
                activeLink = link;
            }
        }
    });
    
    allNavLinks.forEach(link => {
        if (link === activeLink) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Highlight active progress step dots (first 4 items map to kinetic slides)
    const activeLinkIndex = Array.from(allNavLinks).indexOf(activeLink);
    progressSteps.forEach((step, idx) => {
        if (idx === activeLinkIndex) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

/* -------------------------------------------------------------
   6. Autoplay Controller Pipeline
   ------------------------------------------------------------- */
function startAutoplay() {
    isAutoplay = true;
    autoplayFrame = targetFrameIndex;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    statusMode.textContent = 'PLAYING';
    statusMode.parentNode.classList.add('active');
    
    const intervalTime = 33; // ~30fps base
    
    autoplayInterval = setInterval(() => {
        // Advance frame according to speed selector
        autoplayFrame += autoplaySpeed * 0.8; 
        
        if (autoplayFrame >= totalFrames) {
            autoplayFrame = 0; // Loop frame
        }
        
        targetFrameIndex = Math.floor(autoplayFrame);
        frameScrubber.value = targetFrameIndex;
        
        // programmatically scroll window inside kinetic wrapper to sync overlays
        const kineticContainer = document.getElementById('kinetic-container');
        const totalScrollHeight = kineticContainer ? (kineticContainer.offsetHeight - window.innerHeight) : (document.documentElement.scrollHeight - window.innerHeight);
        const scrollTarget = (targetFrameIndex / (totalFrames - 1)) * totalScrollHeight;
        
        window.scrollTo({
            top: scrollTarget,
            behavior: 'auto' // Instant scroll in animation loop to prevent lag
        });
        
    }, intervalTime);
}

function pauseAutoplay() {
    isAutoplay = false;
    clearInterval(autoplayInterval);
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    statusMode.textContent = 'SCROLLING';
    statusMode.parentNode.classList.remove('active');
}

function toggleAutoplay() {
    if (isAutoplay) {
        pauseAutoplay();
    } else {
        startAutoplay();
    }
}

/* -------------------------------------------------------------
   7. Listeners & Setup
   ------------------------------------------------------------- */
function setupInteractions() {
    // Page Resize
    window.addEventListener('resize', resizeCanvas);
    
    // Document Scrolling
    window.addEventListener('scroll', () => {
        updateFrameFromScroll();
        updateUI();
    });
    
    // Scrubber Bar Interaction (Manual frame scrub)
    frameScrubber.addEventListener('input', (e) => {
        if (isAutoplay) pauseAutoplay();
        targetFrameIndex = parseInt(e.target.value);
        
        // Scroll the viewport to the correct percentage within the kinetic container
        const kineticContainer = document.getElementById('kinetic-container');
        const totalScrollHeight = kineticContainer ? (kineticContainer.offsetHeight - window.innerHeight) : (document.documentElement.scrollHeight - window.innerHeight);
        const targetScroll = (targetFrameIndex / (totalFrames - 1)) * totalScrollHeight;
        
        window.scrollTo({
            top: targetScroll,
            behavior: 'auto'
        });
    });
    
    // Play / Pause Button click
    playPauseBtn.addEventListener('click', toggleAutoplay);
    
    // Playback Speed Selection
    playbackSpeedSelect.addEventListener('change', (e) => {
        autoplaySpeed = parseFloat(e.target.value);
    });
    
    // Interrupt autoplay when user tries to scroll manually
    const interruptKeys = ['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown', 'Home', 'End'];
    window.addEventListener('keydown', (e) => {
        if (isAutoplay && interruptKeys.includes(e.code)) {
            pauseAutoplay();
        }
    });
    
    window.addEventListener('wheel', () => {
        if (isAutoplay) pauseAutoplay();
    }, { passive: true });
    
    window.addEventListener('touchmove', () => {
        if (isAutoplay) pauseAutoplay();
    }, { passive: true });
    
    // Intersection Observer for Content Fading (Kinetic Card reveals)
    const observerOptions = {
        root: null,
        rootMargin: '-10% 0px -10% 0px',
        threshold: 0.15
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const content = entry.target.querySelector('.section-content');
            if (content) {
                if (entry.isIntersecting) {
                    content.classList.add('visible');
                } else {
                    content.classList.remove('visible');
                }
            }
        });
    }, observerOptions);
    
    sections.forEach(sec => {
        observer.observe(sec);
    });

    // General Smooth Scrolling for all nav links & progress dots
    document.querySelectorAll('.nav-link, .step').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            if (isAutoplay) pauseAutoplay();
            
            const targetId = this.getAttribute('href');
            if (targetId) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Intersection Observer for Tailwind Section Scroll Reveals (.scroll-reveal)
    const revealOptions = {
        threshold: 0.1
    };
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, revealOptions);
    document.querySelectorAll('.scroll-reveal').forEach(el => revealObserver.observe(el));
}

// Global Scroll-to-Section Helper (used by Dot Steps click handlers)
window.scrollToSection = function(index) {
    if (isAutoplay) pauseAutoplay();
    
    const targetSection = sections[index];
    if (targetSection) {
        window.scrollTo({
            top: targetSection.offsetTop,
            behavior: 'smooth'
        });
    }
};

// Initialize preloading on window startup
window.addEventListener('DOMContentLoaded', initPreloader);
