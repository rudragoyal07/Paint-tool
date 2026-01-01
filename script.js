const canvas = document.getElementById("paintCanvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;


let currentTool = "pencil";
let currentShape = null;
let currentColor = "black";
let drawing = false;
let startX = 0, startY = 0;


const fontSizeSelect = document.getElementById("fontSize");
const fontFamilySelect = document.getElementById("fontFamily");

/* Undo / Redo */
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

    const img = new Image();
    img.src = history[history.length - 1];
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
}

function redo() {
    if (!redoStack.length) return;

    const state = redoStack.pop();
    history.push(state);

    const img = new Image();
    img.src = state;
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
    c.onclick = () => currentColor = getComputedStyle(c).backgroundColor;
});


canvas.addEventListener("mousedown", e => {
    startX = e.offsetX;
    startY = e.offsetY;

    if (currentTool === "text") {
        createTextBox(startX, startY);
        return;
    }

    drawing = true;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
});

canvas.addEventListener("mousemove", e => {
    if (!drawing) return;

    if (["pencil", "pen", "sketch"].includes(currentTool)) {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentTool === "pen" ? 4 : currentTool === "sketch" ? 1 : 2;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    }
});

canvas.addEventListener("mouseup", e => {
    if (!drawing) return;
    drawing = false;

    if (currentTool === "shape" && currentShape) {
        drawShape(e.offsetX, e.offsetY);
    }

    ctx.closePath();
    saveState();
});


function drawShape(x, y) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;

    const w = x - startX;
    const h = y - startY;

    ctx.beginPath();
    if (currentShape === "circle") ctx.arc(startX, startY, Math.abs(w), 0, Math.PI * 2);
    if (currentShape === "square") ctx.rect(startX, startY, w, w);
    if (currentShape === "rectangle") ctx.rect(startX, startY, w, h);
    if (currentShape === "triangle") {
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.lineTo(startX * 2 - x, y);
        ctx.closePath();
    }
    if (currentShape === "oval") ctx.ellipse(startX, startY, Math.abs(w), Math.abs(h), 0, 0, Math.PI * 2);

    ctx.stroke();
}


function createTextBox(x, y) {
    const input = document.createElement("input");
    input.type = "text";

    const rect = canvas.getBoundingClientRect();
    input.style.position = "absolute";
    input.style.left = rect.left + x + "px";
    input.style.top = rect.top + y + "px";

    input.style.fontSize = fontSizeSelect.value + "px";
    input.style.fontFamily = fontFamilySelect.value;
    input.style.color = currentColor;
    input.style.border = "1px dashed #555";
    input.style.background = "transparent";

    document.body.appendChild(input);
    input.focus();

    input.onkeydown = e => {
        if (e.key === "Enter") input.blur();
    };

    input.onblur = () => {
        ctx.fillStyle = currentColor;
        ctx.font = `${fontSizeSelect.value}px ${fontFamilySelect.value}`;
        ctx.fillText(input.value, x, y + parseInt(fontSizeSelect.value));
        document.body.removeChild(input);
        saveState();
    };
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
    alert("Saved successfully!");
};
