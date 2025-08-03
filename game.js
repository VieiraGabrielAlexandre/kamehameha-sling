class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    addExplosion(x, y, color = '#ff6b00') {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                decay: 0.02,
                color: color,
                size: Math.random() * 5 + 2
            });
        }
    }

    addTrail(x, y) {
        this.particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 0.8,
            decay: 0.05,
            color: '#f8c927',
            size: Math.random() * 3 + 1
        });
    }

    update(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            p.vx *= 0.98;
            p.vy *= 0.98;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

class SoundManager {
    constructor() {
        this.sounds = {};
        this.loadSounds();
    }

    loadSounds() {
        try {
            this.sounds.launch = new Audio('assets/launch.wav');
            this.sounds.impact = new Audio('assets/impact.wav');
            this.sounds.launch.volume = 0.7;
            this.sounds.impact.volume = 0.8;
        } catch (e) {
            console.log('Sounds not available');
        }
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(() => {});
        }
    }
}

class GameState {
    constructor() {
        this.score = 0;
        this.currentLevel = 0;
        this.shotsUsed = 0;
        this.maxShots = 3;
        this.superSaiyajin = false;
        this.dragonBallCollected = false;
    }

    addScore(points) {
        this.score += points;
        document.getElementById('scoreDisplay').textContent = this.score;
    }

    nextLevel() {
        this.currentLevel++;
        this.shotsUsed = 0;
        this.dragonBallCollected = false; // Reset dragon ball for new level
        document.getElementById('levelDisplay').textContent = this.currentLevel + 1;
    }

    reset() {
        this.score = 0;
        this.currentLevel = 0;
        this.shotsUsed = 0;
        this.superSaiyajin = false;
        this.dragonBallCollected = false;
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('levelDisplay').textContent = this.currentLevel + 1;
    }
}

let canvas, ctx, gameState, soundManager, particleSystem;
let goku = {};
let levels, enemies, dragonBall;
let dragging = false;
let dragStartX, dragStartY;
let animationId;

// Physics constants
const normalGravity = 0.3;  // More realistic gravity (50% of super saiyajin)
const superGravity = 0.15;  // Super Saiyajin gravity (saved from previous)
const friction = 0.995;
const bounceReduction = 0.6;

function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
    document.getElementById('gameUI').style.display = 'block';
    initGame();
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    gameState = new GameState();
    soundManager = new SoundManager();
    particleSystem = new ParticleSystem();

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (levels) defineLevels(); // Redefine levels on resize
    }
    resize();
    window.addEventListener('resize', resize);

    // Load images with fallback
    const gokuImg = new Image();
    gokuImg.src = 'assets/goku.png';
    gokuImg.onerror = () => console.log('Goku image not found, using fallback');

    const enemyImg = new Image();
    enemyImg.src = 'assets/freeza.png';
    enemyImg.onerror = () => console.log('Enemy image not found, using fallback');

    function resetGoku() {
        goku = {
            x: 100,
            y: canvas.height - 80,
            radius: 25,
            vx: 0,
            vy: 0,
            launched: false,
            trail: []
        };
    }

    function defineLevels() {
        const w = canvas.width;
        const h = canvas.height;

        levels = [
            // Nível 1 - Fácil
            [{ x: w - 150, y: h - 80, health: 1 }],

            // Nível 2 - Médio
            [
                { x: w - 200, y: h - 80, health: 1 },
                { x: w - 120, y: h - 150, health: 1 }
            ],

            // Nível 3 - Difícil
            [
                { x: w - 250, y: h - 80, health: 2 },
                { x: w - 150, y: h - 120, health: 1 },
                { x: w - 80, y: h - 180, health: 1 }
            ],

            // Nível 4 - Muito Difícil
            [
                { x: w - 300, y: h - 80, health: 2 },
                { x: w - 200, y: h - 140, health: 2 },
                { x: w - 100, y: h - 200, health: 1 },
                { x: w - 150, y: h - 260, health: 1 }
            ],

            // Nível 5 - Extremo
            [
                { x: w - 350, y: h - 80, health: 3 },
                { x: w - 250, y: h - 120, health: 2 },
                { x: w - 150, y: h - 160, health: 2 },
                { x: w - 80, y: h - 220, health: 1 },
                { x: w - 200, y: h - 280, health: 1 }
            ]
        ];
    }

    function loadLevel() {
        if (gameState.currentLevel >= levels.length) {
            showGameComplete();
            return;
        }

        enemies = levels[gameState.currentLevel].map(e => ({
            ...e,
            maxHealth: e.health,
            hit: false,
            hitAnimation: 0
        }));

        // Initialize Dragon Ball for each level
        dragonBall = {
            x: Math.random() * (canvas.width - 200) + 100,
            y: Math.random() * (canvas.height - 200) + 100,
            collected: false,
            rotation: 0,
            pulse: 0
        };

        resetGoku();
        gameState.shotsUsed = 0;
    }

    function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function isInsideGoku(x, y) {
        return Math.hypot(x - goku.x, y - goku.y) < goku.radius;
    }

    function updatePowerMeter() {
        if (!dragging || goku.launched) {
            document.getElementById('powerFill').style.width = '0%';
            return;
        }

        const distance = Math.hypot(goku.x - dragStartX, goku.y - dragStartY);
        const maxDistance = 200;
        const power = Math.min(distance / maxDistance * 100, 100);
        document.getElementById('powerFill').style.width = power + '%';
    }

    function onDragStart(e) {
        e.preventDefault();
        const { x, y } = getPointerPos(e);
        if (isInsideGoku(x, y) && !goku.launched) {
            dragging = true;
            dragStartX = goku.x;
            dragStartY = goku.y;
        }
    }

    function onDragMove(e) {
        e.preventDefault();
        if (!dragging || goku.launched) return;

        const { x, y } = getPointerPos(e);
        const maxDistance = 150;
        const distance = Math.hypot(x - dragStartX, y - dragStartY);

        if (distance <= maxDistance) {
            goku.x = x;
            goku.y = y;
        } else {
            const angle = Math.atan2(y - dragStartY, x - dragStartX);
            goku.x = dragStartX + Math.cos(angle) * maxDistance;
            goku.y = dragStartY + Math.sin(angle) * maxDistance;
        }

        updatePowerMeter();
    }

    function onDragEnd(e) {
        e.preventDefault();
        if (dragging && !goku.launched) {
            const deltaX = dragStartX - goku.x;
            const deltaY = dragStartY - goku.y;
            const distance = Math.hypot(deltaX, deltaY);

            if (distance > 5) {
                // Força muito maior para responsividade
                // Use current physics for prediction
                let maxForce, forceMultiplier;
                if (gameState.superSaiyajin) {
                    maxForce = 3;
                    forceMultiplier = 40;
                } else {
                    maxForce = 2;
                    forceMultiplier = 20;
                }

                const force = Math.min(distance / 50, maxForce) * forceMultiplier;
                goku.vx = (deltaX / distance) * force;
                goku.vy = (deltaY / distance) * force;
            }

            goku.launched = true;
            goku.trail = [];
            gameState.shotsUsed++;

            soundManager.play('launch');
            particleSystem.addExplosion(goku.x, goku.y, '#f8c927');
        }
        dragging = false;
        updatePowerMeter();
    }

    function onMouseLeave(e) {
        if (dragging && !goku.launched) {
            // Reset Goku position when mouse leaves canvas
            goku.x = dragStartX;
            goku.y = dragStartY;
            dragging = false;
            updatePowerMeter();
        }
    }
    // Event listeners
    canvas.addEventListener("mousedown", onDragStart);
    canvas.addEventListener("mousemove", onDragMove);
    canvas.addEventListener("mouseup", onDragEnd);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onDragStart, { passive: false });
    canvas.addEventListener("touchmove", onDragMove, { passive: false });
    canvas.addEventListener("touchend", onDragEnd, { passive: false });
    canvas.addEventListener("touchcancel", onDragEnd, { passive: false });

    function drawBackground() {
        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#98D8E8');
        gradient.addColorStop(1, '#90EE90');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

        // Grass
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, canvas.height - 45, canvas.width, 5);
    }

    function drawGoku() {
        // Trail effect
        if (goku.launched && goku.trail.length > 0) {
            ctx.strokeStyle = '#f8c927';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(goku.trail[0].x, goku.trail[0].y);
            for (let i = 1; i < goku.trail.length; i++) {
                ctx.lineTo(goku.trail[i].x, goku.trail[i].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Goku body (fallback if image doesn't load)
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.arc(goku.x, goku.y, goku.radius, 0, Math.PI * 2);
        ctx.fill();

        // Goku face
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(goku.x, goku.y - 5, goku.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(goku.x - 8, goku.y - 10, 3, 0, Math.PI * 2);
        ctx.arc(goku.x + 8, goku.y - 10, 3, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(goku.x - 10, goku.y - 15, 8, 0, Math.PI * 2);
        ctx.arc(goku.x, goku.y - 20, 10, 0, Math.PI * 2);
        ctx.arc(goku.x + 10, goku.y - 15, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawEnemy(enemy) {
        if (enemy.hit) return;

        // Hit animation
        if (enemy.hitAnimation > 0) {
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(Math.sin(enemy.hitAnimation * 0.5) * 0.2);
            ctx.translate(-enemy.x, -enemy.y);
            enemy.hitAnimation--;
        }

        // Health-based color
        const healthRatio = enemy.health / enemy.maxHealth;
        let color = '#8B008B'; // Purple for full health
        if (healthRatio < 0.7) color = '#FF4500'; // Orange for damaged
        if (healthRatio < 0.4) color = '#FF0000'; // Red for critical

        // Enemy body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Enemy face
        ctx.fillStyle = '#E6E6FA';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(enemy.x - 8, enemy.y - 5, 4, 0, Math.PI * 2);
        ctx.arc(enemy.x + 8, enemy.y - 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        if (enemy.maxHealth > 1) {
            const barWidth = 40;
            const barHeight = 6;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y - 40;

            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health
            ctx.fillStyle = healthRatio > 0.5 ? '#00ff00' : healthRatio > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

            // Border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        if (enemy.hitAnimation > 0) {
            ctx.restore();
        }
    }

    function drawDragonBall() {
        if (dragonBall.collected) return;

        // Update animation
        dragonBall.rotation += 0.02;
        dragonBall.pulse += 0.1;

        ctx.save();
        ctx.translate(dragonBall.x, dragonBall.y);
        ctx.rotate(dragonBall.rotation);

        // Glow effect
        const glowSize = 35 + Math.sin(dragonBall.pulse) * 5;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Dragon Ball body
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        // 4 stars
        ctx.fillStyle = '#ff0000';
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + dragonBall.rotation;
            const starX = Math.cos(angle) * 8;
            const starY = Math.sin(angle) * 8;

            ctx.beginPath();
            ctx.arc(starX, starY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    function drawAimLine() {
        if (dragging && !goku.launched) {
            const distance = Math.hypot(goku.x - dragStartX, goku.y - dragStartY);
            const power = Math.min(distance / 150, 1);

            // Trajectory prediction
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * power})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);

            ctx.beginPath();
            ctx.moveTo(dragStartX, dragStartY);

            // Predict trajectory
            let predX = dragStartX;
            let predY = dragStartY;

            const deltaX = dragStartX - goku.x;
            const deltaY = dragStartY - goku.y;

            let predVx = 0;
            let predVy = 0;

            if (distance > 5) {
                const force = Math.min(distance / 100, 2) * 20;
                predVx = (deltaX / distance) * force;
                predVy = (deltaY / distance) * force;
            }

            for (let i = 0; i < 50; i++) {
                const currentGravity = gameState.superSaiyajin ? superGravity : normalGravity;
                const gravityMultiplier = gameState.superSaiyajin ? 0.4 : 0.8;
                predVy += currentGravity * gravityMultiplier;
                predX += predVx;
                predY += predVy;

                if (predY > canvas.height - 40) break;
                if (i % 3 === 0) ctx.lineTo(predX, predY);
            }

            ctx.stroke();
            ctx.setLineDash([]);

            // Power indicator
            ctx.fillStyle = `rgba(248, 201, 39, ${power})`;
            ctx.beginPath();
            ctx.arc(dragStartX, dragStartY, 5 + power * 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawBackground();
        drawAimLine();

        // Update Goku
        if (goku.launched) {
            // Add to trail
            goku.trail.push({ x: goku.x, y: goku.y });
            if (goku.trail.length > 20) goku.trail.shift();

            // Add particle trail
            if (Math.random() < 0.3) {
                particleSystem.addTrail(goku.x, goku.y);
            }

            // Physics
            const currentGravity = gameState.superSaiyajin ? superGravity : normalGravity;
            goku.vy += currentGravity;
            goku.x += goku.vx;
            goku.y += goku.vy;

            // Ground collision
            if (goku.y + goku.radius > canvas.height - 40) {
                goku.y = canvas.height - 40 - goku.radius;
                goku.vy *= -bounceReduction;
                if (Math.abs(goku.vy) > 2) {
                    particleSystem.addExplosion(goku.x, goku.y, '#8B4513');
                }
            }

            // Wall collisions
            if (goku.x - goku.radius < 0) {
                goku.x = goku.radius;
                goku.vx *= -bounceReduction;
            }
            if (goku.x + goku.radius > canvas.width) {
                goku.x = canvas.width - goku.radius;
                goku.vx *= -bounceReduction;
            }

            // Reset if stopped or out of bounds
            const stopThreshold = gameState.superSaiyajin ? 0.5 : 1.0; // Normal mode stops easier
            if ((Math.abs(goku.vx) < stopThreshold && Math.abs(goku.vy) < stopThreshold && goku.y > canvas.height - 100) ||
                goku.y > canvas.height + 100) {
                resetGoku();
            }
        }

        // Draw game objects
        drawGoku();
        drawDragonBall();

        // Update and draw enemies
        enemies.forEach((enemy) => {
            if (!enemy.hit) {
                drawEnemy(enemy);

                // Collision detection
                const dist = Math.hypot(goku.x - enemy.x, goku.y - enemy.y);
                if (dist < goku.radius + 30 && goku.launched && Math.abs(goku.vx) > 0.5) {
                    enemy.health--;
                    enemy.hitAnimation = 20;

                    if (enemy.health <= 0) {
                        enemy.hit = true;
                        gameState.addScore(100 * enemy.maxHealth);
                        particleSystem.addExplosion(enemy.x, enemy.y, '#ff0000');
                        soundManager.play('impact');
                    } else {
                        particleSystem.addExplosion(enemy.x, enemy.y, '#ffff00');
                    }

                    // Bounce Goku away
                    const angle = Math.atan2(goku.y - enemy.y, goku.x - enemy.x);
                    goku.vx = Math.cos(angle) * 6;
                    goku.vy = Math.sin(angle) * 6;
                }
            }
        });

        // Dragon Ball collision
        if (!dragonBall.collected && goku.launched) {
            const dist = Math.hypot(goku.x - dragonBall.x, goku.y - dragonBall.y);
            if (dist < goku.radius + 25) {
                dragonBall.collected = true;
                gameState.dragonBallCollected = true;
                gameState.superSaiyajin = true;
                gameState.addScore(500); // Bonus points

                // Super Saiyajin transformation effect
                for (let i = 0; i < 30; i++) {
                    particleSystem.addExplosion(dragonBall.x, dragonBall.y, '#f8c927');
                }

                // Show transformation message (could add UI element here)
                console.log('SUPER SAIYAJIN ACTIVATED!');
            }
        }

        // Update particles
        particleSystem.update(ctx);

        // Check win condition
        if (enemies.every(e => e.hit)) {
            setTimeout(() => showLevelComplete(), 1000);
        }

        animationId = requestAnimationFrame(update);
    }

    function showLevelComplete() {
        const bonus = Math.max(0, (gameState.maxShots - gameState.shotsUsed) * 50);
        gameState.addScore(bonus);

        document.getElementById('levelScore').textContent = gameState.score;
        document.getElementById('levelComplete').style.display = 'flex';

        cancelAnimationFrame(animationId);
    }

    function showGameComplete() {
        document.getElementById('finalScore').textContent = gameState.score;
        document.getElementById('gameComplete').style.display = 'flex';

        cancelAnimationFrame(animationId);
    }

    // Initialize game
    defineLevels();
    loadLevel();
    update();

    // Global functions for buttons
    window.nextLevel = function() {
        document.getElementById('levelComplete').style.display = 'none';
        gameState.nextLevel();
        loadLevel();
        update();
    };

    window.resetLevel = function() {
        loadLevel();
    };

    window.restartGame = function() {
        document.getElementById('gameComplete').style.display = 'none';
        gameState.reset();
        loadLevel();
        update();
    };
}