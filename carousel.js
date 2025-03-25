document.addEventListener("DOMContentLoaded", function () {
    // Select carousel elements
    const carousel = document.querySelector('.carousel');
    const items = document.querySelectorAll(".carousel-item");
    const nextButton = document.querySelector('.next');
    const prevButton = document.querySelector('.prev');

    // Initialize variables
    let singleChildWidth = carousel.children[0].clientWidth; // Width of a single carousel item
    let scrollAmount = 0; // Tracks the current scroll position
    let isScrolling = true; // Controls auto-scrolling
    let currentIndex = 0; // Tracks the current item index

    // Update dimensions on window resize
    function updateDimensions() {
        singleChildWidth = carousel.children[0].clientWidth;
    }
    window.addEventListener('resize', updateDimensions);

    // Auto-scroll the carousel
    function scrollCarousel() {
        const maxScroll = carousel.scrollWidth - carousel.clientWidth; // Maximum scrollable width
        if (scrollAmount < maxScroll) {
            scrollAmount += carousel.clientWidth; // Scroll by one full view
        } else {
            scrollAmount = 0; // Reset to the beginning
        }
        carousel.scrollTo({ top: 0, left: scrollAmount, behavior: 'smooth' });
    }

    // Temporarily disable auto-scrolling
    function disableScrollingTemporarily() {
        isScrolling = false;
        setTimeout(() => {
            isScrolling = true;
        }, 5000); // Adjust timeout as needed
    }

    // Set up auto-scrolling interval
    const scrollInterval = setInterval(() => {
        if (isScrolling) {
            scrollCarousel();
        }
    }, 3000); // Adjust interval as needed

    // Handle "Next" button click
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            disableScrollingTemporarily(); // Pause auto-scrolling
            const maxScroll = carousel.scrollWidth - carousel.clientWidth;
            if (scrollAmount < maxScroll) {
                scrollAmount += singleChildWidth; // Scroll to the next item
            } else {
                scrollAmount = 0; // Reset to the beginning
            }
            carousel.scrollTo({ top: 0, left: scrollAmount, behavior: 'smooth' });
            if (currentIndex < items.length - 1) {
                currentIndex++; // Update current index
            }
        });
    }

    // Handle "Previous" button click
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            disableScrollingTemporarily(); // Pause auto-scrolling
            if (scrollAmount > 0) {
                scrollAmount -= singleChildWidth; // Scroll to the previous item
            } else {
                scrollAmount = carousel.scrollWidth - carousel.clientWidth; // Go to the last item
            }
            carousel.scrollTo({ top: 0, left: scrollAmount, behavior: 'smooth' });
            if (currentIndex > 0) {
                currentIndex--; // Update current index
            }
        });
    }
});