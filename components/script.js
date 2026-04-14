window.addEventListener('load', () => {
    document.fonts.ready.then(() => {
        const statusMsg = document.getElementById('status-msg');
        setTimeout(() => {
            statusMsg.innerText = "ENGAGING PROTOCOL";
            startLaserAnimation();
        }, 1200);
    });
});

// Laser Animation Logic
function startLaserAnimation() {
    const svg = document.getElementById('main-svg');
    const text = document.getElementById('target-text');
    const clipRect = document.getElementById('clip-rect');
    const beam = document.getElementById('laser-beam');
    const spark = document.getElementById('spark');
    const statusMsg = document.getElementById('status-msg');
    const contactLink = document.getElementById('contact-link');

    const bbox = text.getBBox();

    text.setAttribute('clip-path', 'url(#text-clip)');
    clipRect.setAttribute('x', 0);
    clipRect.setAttribute('y', bbox.y - 100);

    const startX = bbox.x - 40;
    const endX = bbox.x + bbox.width + 40;
    const textCenterY = bbox.y + bbox.height / 2;

    let startTime = null;
    const duration = 3500;

    setTimeout(() => {
        beam.style.opacity = 1;
        spark.style.opacity = 1;
        requestAnimationFrame(drawFrame);
    }, 400);

    function drawFrame(time) {
        if (!startTime) startTime = time;
        let elapsed = time - startTime;
        let progress = Math.min(elapsed / duration, 1);

        let currentX = startX + (endX - startX) * progress;
        clipRect.setAttribute('width', currentX + 20);

        let mainFreq = 25;
        let jitterFreq = 60;
        let scribbleY = textCenterY
            + Math.sin(progress * Math.PI * mainFreq) * (bbox.height * 0.45)
            + Math.cos(progress * Math.PI * jitterFreq) * (bbox.height * 0.1);

        beam.setAttribute('x1', currentX);
        beam.setAttribute('y1', 0);
        beam.setAttribute('x2', currentX);
        beam.setAttribute('y2', scribbleY);

        spark.setAttribute('cx', currentX);
        spark.setAttribute('cy', scribbleY);
        spark.setAttribute('r', 5 + Math.random() * 6);

        if (progress < 1) {
            requestAnimationFrame(drawFrame);
        } else {
            beam.style.opacity = 0;
            spark.style.opacity = 0;
            statusMsg.innerText = "IDENTITY COMPILED";

            setTimeout(() => {
                text.classList.add('filled');

                setTimeout(() => {
                    statusMsg.innerText = "DATA UPLOADING...";
                    text.removeAttribute('clip-path');

                    const rect = contactLink.getBoundingClientRect();
                    const targetX = rect.left + rect.width / 2;
                    const targetY = rect.top + rect.height / 2;

                    const pt = svg.createSVGPoint();
                    pt.x = targetX;
                    pt.y = targetY;
                    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

                    const dx = svgPt.x - 600;
                    const dy = svgPt.y - 420;

                    text.style.transform = `translate(${dx}px, ${dy}px) scale(0.015)`;
                    text.style.opacity = '0';

                    setTimeout(() => {
                        contactLink.classList.add('flash-active');
                        statusMsg.innerText = "ACCESS GRANTED";

                        setTimeout(() => {
                            contactLink.classList.remove('flash-active');
                            statusMsg.innerText = "SYSTEM SECURE";
                        }, 800);
                    }, 800);

                }, 1800);
            }, 400);
        }
    }
}