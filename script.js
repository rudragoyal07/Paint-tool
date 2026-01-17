const canvas = document.getElementById("paintCanvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
canvas.style.touchAction = "none"; // IMPORTANT for touch devices


let currentTool = "pencil";
let currentShape = null;
let currentColor = "black";
let drawing = false;
let startX = 0, startY = 0;


const fontSizeSelect = document.getElementById("fontSize");
const fontFamilySelect = document.getElementById("fontFamily");
let textBox = null;


let history = [];
let redoStack = [];


saveState();


function saveState() {
    history.push(canvas.toDataURL());
    if (history.length > 50) history.shift();
    redoStack.length = 0;
}

function undo() {
    if (history.length <= 1) return;

    redoStack.push(history.pop());
    restoreFrom(history[history.length - 1]);
}

function redo() {
    if (!redoStack.length) return;

    const state = redoStack.pop();
    history.push(state);
    restoreFrom(state);
}

function restoreFrom(dataURL) {
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
}

document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        currentTool = btn.dataset.tool;
        currentShape = btn.dataset.shape || null;
        canvas.classList.toggle("text-mode", currentTool === "text");
    };
});

document.querySelectorAll(".color").forEach(c => {
    c.onclick = () => {
        currentColor = getComputedStyle(c).backgroundColor;
    };
});

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);

function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if (currentTool === "text") {
        createTextBox(startX, startY);
        return;
    }

    drawing = true;
    canvas.setPointerCapture(e.pointerId);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
}

function onPointerMove(e) {
    if (!drawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (["pencil", "pen", "sketch"].includes(currentTool)) {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth =
            currentTool === "pen" ? 4 :
            currentTool === "sketch" ? 1 : 2;

        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

function onPointerUp(e) {
    if (!drawing) return;

    drawing = false;
    canvas.releasePointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === "shape" && currentShape) {
        drawShape(x, y);
    }

    ctx.closePath();
    saveState();
}


function drawShape(x, y) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;

    const w = x - startX;
    const h = y - startY;

    ctx.beginPath();

    switch (currentShape) {
        case "circle":
            ctx.arc(startX, startY, Math.abs(w), 0, Math.PI * 2);
            break;

        case "square":
            ctx.rect(startX, startY, w, w);
            break;

        case "rectangle":
            ctx.rect(startX, startY, w, h);
            break;

        case "triangle":
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.lineTo(startX * 2 - x, y);
            ctx.closePath();
            break;

        case "oval":
            ctx.ellipse(startX, startY, Math.abs(w), Math.abs(h), 0, 0, Math.PI * 2);
            break;
    }

    ctx.stroke();
}

function createTextBox(x, y) {
    if (textBox) return;

    const rect = canvas.getBoundingClientRect();
    textBox = document.createElement("textarea");
    textBox.rows = 1;

    textBox.style.position = "absolute";
    textBox.style.left = rect.left + x + "px";
    textBox.style.top = rect.top + y + "px";
    textBox.style.fontSize = fontSizeSelect.value + "px";
    textBox.style.fontFamily = fontFamilySelect.value;
    textBox.style.color = currentColor;
    textBox.style.border = "1px dashed #444";
    textBox.style.background = "transparent";
    textBox.style.outline = "none";
    textBox.style.resize = "none";

    document.body.appendChild(textBox);
    setTimeout(() => textBox.focus(), 0);

    textBox.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            finalizeText(x, y);
        }
    });

    textBox.addEventListener("blur", () => finalizeText(x, y));
}

function finalizeText(x, y) {
    if (!textBox) return;

    ctx.fillStyle = currentColor;
    ctx.font = `${fontSizeSelect.value}px ${fontFamilySelect.value}`;
    ctx.textBaseline = "top";
    ctx.fillText(textBox.value, x, y);

    document.body.removeChild(textBox);
    textBox = null;

    saveState();
}

document.getElementById("undoBtn").onclick = undo;
document.getElementById("redoBtn").onclick = redo;

document.getElementById("saveBtn").onclick = async () => {
    saveState();
    await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: canvas.toDataURL() })
    });
    alert("Saved!");
};
