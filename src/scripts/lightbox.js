/**
 * lightbox.js — Shared gallery lightbox for project pages and build-log posts.
 *
 * Requires in the HTML:
 *   - .gallery-item elements each containing an <img> and an optional .caption
 *   - A lightbox structure:
 *       <div class="lightbox" id="lightbox">
 *           <button id="lightbox-close">×</button>
 *           <button class="lightbox-nav lightbox-prev" id="lightbox-prev">❮</button>
 *           <img class="lightbox-img" id="lightbox-img" src="" alt="">
 *           <p class="lightbox-caption" id="lightbox-caption"></p>
 *           <button class="lightbox-nav lightbox-next" id="lightbox-next">❯</button>
 *       </div>
 */
document.addEventListener('DOMContentLoaded', function () {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    var lightboxImg     = document.getElementById('lightbox-img');
    var lightboxCaption = document.getElementById('lightbox-caption');
    var closeBtn        = document.getElementById('lightbox-close');
    var prevBtn         = document.getElementById('lightbox-prev');
    var nextBtn         = document.getElementById('lightbox-next');
    // Also every image in a Markdown post/project body (a paragraph holding just an image).
    var galleryItems    = document.querySelectorAll('.gallery-item, .prose p:has(> img)');

    if (!galleryItems.length) return;

    var currentIndex = 0;

    function openLightbox(index) {
        currentIndex = index;
        var item       = galleryItems[index];
        var img        = item.querySelector('img');
        var captionEl  = item.querySelector('.caption');
        lightboxImg.src          = img.src;
        lightboxImg.alt          = img.alt;
        lightboxCaption.textContent = captionEl ? captionEl.textContent : (img.title || img.alt || '');
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
        // Hide nav arrows when there is only one image
        var showNav = galleryItems.length > 1;
        prevBtn.style.display = showNav ? '' : 'none';
        nextBtn.style.display = showNav ? '' : 'none';
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % galleryItems.length;
        openLightbox(currentIndex);
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
        openLightbox(currentIndex);
    }

    galleryItems.forEach(function (item, index) {
        item.addEventListener('click', function () { openLightbox(index); });
    });

    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    // Close when clicking outside the image
    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
    });

    // Keyboard: Escape = close, Arrow keys = navigate
    document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape')      closeLightbox();
        if (e.key === 'ArrowRight')  showNext();
        if (e.key === 'ArrowLeft')   showPrev();
    });
});
