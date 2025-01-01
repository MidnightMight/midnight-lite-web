const carousel = document.querySelector('.carousel');
let scrollAmount = 0;

function scrollCarousel() {
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    if (scrollAmount < maxScroll) {
        scrollAmount += carousel.clientWidth;
    } else {
        scrollAmount = 0;
    }
    carousel.scrollTo({
        top: 0,
        left: scrollAmount,
        behavior: 'smooth'
    });
}

let isScrolling = true;
const scrollInterval = setInterval(() => {
    if (isScrolling) {
        scrollCarousel();
    }
}, 3000); // Adjust the interval as needed

const nextButton = document.querySelector('.next');
const prevButton = document.querySelector('.prev');
const singleChildWidth = carousel.children[0].clientWidth;

function disableScrollingTemporarily() {
    isScrolling = false;
    setTimeout(() => {
        isScrolling = true;
    }, 5000); // Adjust the timeout as needed
}

if (nextButton) {
    nextButton.addEventListener('click', () => {
        disableScrollingTemporarily();
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        
        if (scrollAmount < maxScroll) {
            scrollAmount += singleChildWidth;
        } else {
            scrollAmount = 0;
        }
        carousel.scrollTo({
            top: 0,
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
}

if (prevButton) {
    prevButton.addEventListener('click', () => {
        disableScrollingTemporarily();
        if (scrollAmount > 0) {
            
            scrollAmount -= singleChildWidth;
        } else {
            scrollAmount = carousel.scrollWidth - carousel.clientWidth;
        }
        carousel.scrollTo({
            top: 0,
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
}