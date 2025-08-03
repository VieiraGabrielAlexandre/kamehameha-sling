function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
    initGame();
}

function initGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const gokuImg = new Image();
    gokuImg.src = 'assets/goku.png';

    const enemyImg = new Image();
    enemyImg.src = 'assets/freeza.png';

    const launchSound = new Audio('assets/launch.wav');
    const impactSound = new Audio('assets/impact.wav');

    const gravity = 0.6;
    const friction = 0.985;

    let goku = {};
    let levels, currentLevel, enemies;
    let dragging = false;

    function resetGoku() {
        goku = {
            x: 150,
            y: canvas.height - 100,
            radius: 30,
            vx: 0,
            vy: 0,
            launched: false
        };
    }

    function defineLevels() {
        levels = [
            [{ x: canvas.width - 200, y: canvas.height - 100 }],
            [{ x: canvas.width - 250, y: canvas.height - 120 }, { x: canvas.width - 150, y: canvas.height - 180 }],
            [{ x: canvas.width - 300, y: canvas.height - 100 }, { x: canvas.width - 200, y: canvas.height - 150 }, { x: canvas.width - 100, y: canvas.height - 200 }]
        ];
    }

    function loadLevel() {
        enemies = levels[currentLevel].map(e => ({ ...e, hit: false }));
        resetGoku();
    }

    function getPointerPos(e) {
        if (e.touches) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return { x: e.offsetX, y: e.offsetY };
    }

    function isInsideGoku(x, y) {
        return Math.hypot(x - goku.x, y - goku.y) < goku.radius;
    }

    function onDragStart(e) {
        const { x, y } = getPointerPos(e);
        if (isInsideGoku(x, y)) dragging = true;
    }

    function onDragMove(e) {
        if (!dragging || goku.launched) return;
        const { x, y } = getPointerPos(e);
        goku.x = x;
        goku.y = y;
    }

    function onDragEnd(e) {
        if (dragging && !goku.launched) {
            goku.vx = (150 - goku.x) * 0.25;
            goku.vy = (canvas.height - 100 - goku.y) * 0.25;
            goku.launched = true;
            launchSound.play();
        }
        dragging = false;
    }

    canvas.addEventListener("mousedown", onDragStart);
    canvas.addEventListener("mousemove", onDragMove);
    canvas.addEventListener("mouseup", onDragEnd);
    canvas.addEventListener("touchstart", onDragStart);
    canvas.addEventListener("touchmove", onDragMove);
    canvas.addEventListener("touchend", onDragEnd);

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Desenha linha de mira
        if (dragging && !goku.launched) {
            ctx.beginPath();
            ctx.moveTo(150, canvas.height - 100);
            ctx.lineTo(goku.x, goku.y);
            ctx.strokeStyle = "#fff";
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Atualiza posição do Goku
        if (goku.launched) {
            goku.vy += gravity;
            goku.x += goku.vx;
            goku.y += goku.vy;
            goku.vx *= friction;
            goku.vy *= friction;

            // Rebote no chão
            if (goku.y + goku.radius > canvas.height) {
                goku.y = canvas.height - goku.radius;
                goku.vy *= -0.5;
            }

            // Fora da tela
            if (goku.x < -100 || goku.x > canvas.width + 100 || goku.y > canvas.height + 100 || (Math.abs(goku.vx) < 0.5 && Math.abs(goku.vy) < 0.5)) {
                resetGoku();
            }
        }

        // Goku
        ctx.drawImage(gokuImg, goku.x - goku.radius, goku.y - goku.radius, goku.radius * 2, goku.radius * 2);

        // Inimigos
        enemies.forEach((enemy) => {
            if (!enemy.hit) {
                ctx.drawImage(enemyImg, enemy.x - 25, enemy.y - 25, 50, 50);
                const dist = Math.hypot(goku.x - enemy.x, goku.y - enemy.y);
                if (dist < goku.radius + 25) {
                    enemy.hit = true;
                    impactSound.play();
                }
            }
        });

        // Verifica vitória
        if (enemies.every(e => e.hit)) {
            currentLevel++;
            if (currentLevel >= levels.length) {
                alert("Você venceu todos os níveis!");
                currentLevel = 0;
            }
            loadLevel();
        }

        requestAnimationFrame(update);
    }

    currentLevel = 0;
    defineLevels();
    loadLevel();
    update();
}
