document.addEventListener("DOMContentLoaded", function () {
    const carousel = document.querySelector('.carousel');
    const items = document.querySelectorAll(".carousel-item");
    const nextButton = document.querySelector('.next');
    const prevButton = document.querySelector('.prev');
    const singleChildWidth = carousel.children[0].clientWidth;
    let scrollAmount = 0;
    let isScrolling = true;
    let currentIndex = 0;

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

    function disableScrollingTemporarily() {
        isScrolling = false;
        setTimeout(() => {
            isScrolling = true;
        }, 5000); // Adjust the timeout as needed
    }

    function updateCarousel() {
        carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    const scrollInterval = setInterval(() => {
        if (isScrolling) {
            scrollCarousel();
        }
    }, 3000); // Adjust the interval as needed

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

            if (currentIndex < items.length - 1) {
                currentIndex++;
                updateCarousel();
            }
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

            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });
    }
});
