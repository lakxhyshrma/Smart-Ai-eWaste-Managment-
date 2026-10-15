// ======================================
// SMART WASTE AI
// ======================================

// IMPORTANT:
// Replace this value after creating and
// exporting your own Teachable Machine model.
//
// Example format:
// https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/

const MODEL_URL = "";

let model = null;
let selectedImage = null;
let chart = null;
let historyData = [];

const CATEGORIES = [
    "Plastic",
    "Paper",
    "Glass",
    "Metal",
    "Cardboard"
];

const CATEGORY_INFO = {
    plastic: {
        emoji: "🧴",
        advice:
            "Check the plastic type and local recycling rules. Empty containers before disposal."
    },

    paper: {
        emoji: "📄",
        advice:
            "Keep recyclable paper clean and dry. Follow local paper collection guidelines."
    },

    glass: {
        emoji: "🍾",
        advice:
            "Check whether your local recycling service accepts this glass item. Handle broken glass carefully."
    },

    metal: {
        emoji: "🥫",
        advice:
            "Empty accepted metal packaging and follow your local metal recycling instructions."
    },

    cardboard: {
        emoji: "📦",
        advice:
            "Flatten clean, dry cardboard and place it in the appropriate recycling collection."
    }
};


// ======================================
// MOBILE NAVIGATION
// ======================================

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", function () {
    navLinks.classList.toggle("active");
});

document.querySelectorAll("#navLinks a").forEach(function (link) {
    link.addEventListener("click", function () {
        navLinks.classList.remove("active");
    });
});


// ======================================
// IMAGE UPLOAD
// ======================================

const imageInput = document.getElementById("imageInput");

const imagePreview = document.getElementById("imagePreview");

const previewContainer =
    document.getElementById("previewContainer");

const uploadArea = document.getElementById("uploadArea");

const analyzeBtn = document.getElementById("analyzeBtn");

const removeImageBtn = document.getElementById("removeImage");

const statusMessage = document.getElementById("statusMessage");

let previewObjectURL = null;

imageInput.addEventListener("change", function () {

    const file = imageInput.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        statusMessage.textContent =
            "Please select a valid image file.";

        imageInput.value = "";

        return;
    }

    if (file.size > 10 * 1024 * 1024) {

        statusMessage.textContent =
            "Please choose an image smaller than 10 MB.";

        imageInput.value = "";

        return;
    }

    selectedImage = file;

    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
    }

    previewObjectURL = URL.createObjectURL(file);

    imagePreview.src = previewObjectURL;

    document.getElementById("fileName").textContent =
        file.name;

    uploadArea.classList.add("hidden");

    previewContainer.classList.remove("hidden");

    analyzeBtn.disabled = false;

    statusMessage.textContent =
        "Image selected. Ready for analysis.";

    document.getElementById("emptyResult").classList.remove("hidden");

    document.getElementById("resultContent").classList.add("hidden");
});


// ======================================
// REMOVE IMAGE
// ======================================

removeImageBtn.addEventListener("click", function () {

    selectedImage = null;

    imageInput.value = "";

    imagePreview.removeAttribute("src");

    if (previewObjectURL) {

        URL.revokeObjectURL(previewObjectURL);

        previewObjectURL = null;
    }

    previewContainer.classList.add("hidden");

    uploadArea.classList.remove("hidden");

    analyzeBtn.disabled = true;

    statusMessage.textContent =
        "Select an image to get started.";
});


// ======================================
// LOAD AI MODEL
// ======================================

async function loadAIModel() {

    if (!MODEL_URL) {

        statusMessage.textContent =
            "Interface ready. Add your trained model URL to enable AI predictions.";

        return;
    }

    try {

        statusMessage.textContent =
            "Loading the AI model...";

        analyzeBtn.disabled = true;

        const modelURL = MODEL_URL + "model.json";

        const metadataURL = MODEL_URL + "metadata.json";

        model = await tmImage.load(
            modelURL,
            metadataURL
        );

        statusMessage.textContent =
            "AI model loaded successfully.";

    } catch (error) {

        console.error("Model loading error:", error);

        statusMessage.textContent =
            "Could not load the model. Check the model URL and internet connection.";

    } finally {

        analyzeBtn.disabled = !selectedImage;
    }
}


// ======================================
// ANALYZE WASTE
// ======================================

analyzeBtn.addEventListener("click", async function () {

    if (!selectedImage) {

        statusMessage.textContent =
            "Please select an image first.";

        return;
    }

    if (!model) {

        statusMessage.textContent =
            "AI model is not connected yet. Connect a trained model to analyze images.";

        return;
    }

    analyzeBtn.disabled = true;

    statusMessage.textContent =
        "Analyzing image with the AI model...";

    try {

        const predictions = await model.predict(imagePreview);

        if (!predictions || predictions.length === 0) {

            throw new Error("The model returned no predictions.");
        }

        predictions.sort(function (a, b) {
            return b.probability - a.probability;
        });

        const bestPrediction = predictions[0];

        const category = normalizeCategory(
            bestPrediction.className
        );

        const confidence =
            bestPrediction.probability * 100;

        if (!category) {

            statusMessage.textContent =
                "The model predicted a class that is not configured for this application.";

            return;
        }

        showResult(category, confidence);

        saveHistory(category, confidence);

        statusMessage.textContent =
            "Analysis completed successfully.";

    } catch (error) {

        console.error("Prediction error:", error);

        statusMessage.textContent =
            "Prediction failed. Check your model, image, and browser console.";

    } finally {

        analyzeBtn.disabled = !selectedImage;
    }
});


// ======================================
// NORMALIZE MODEL CLASS NAMES
// ======================================

function normalizeCategory(className) {

    const value = String(className)
        .toLowerCase()
        .trim();

    const aliases = {
        "plastic": "Plastic",
        "paper": "Paper",
        "glass": "Glass",
        "metal": "Metal",
        "cardboard": "Cardboard"
    };

    return aliases[value] || null;
}


// ======================================
// DISPLAY RESULT
// ======================================

function showResult(category, confidence) {

    const info = CATEGORY_INFO[category.toLowerCase()];

    document.getElementById("emptyResult")
        .classList.add("hidden");

    document.getElementById("resultContent")
        .classList.remove("hidden");

    document.getElementById("resultCategory")
        .textContent = category;

    document.getElementById("resultEmoji")
        .textContent = info.emoji;

    document.getElementById("confidenceText")
        .textContent = confidence.toFixed(1) + "%";

    document.getElementById("confidenceBar")
        .style.width = confidence + "%";

    document.getElementById("resultAdvice")
        .textContent = info.advice;
}


// ======================================
// DETECTION HISTORY
// ======================================

function loadHistory() {

    try {

        const stored = localStorage.getItem("smartWasteHistory");

        const parsed = stored ? JSON.parse(stored) : [];

        historyData = Array.isArray(parsed)
            ? parsed.filter(function (item) {

                return item &&
                    typeof item.category === "string" &&
                    typeof item.confidence === "number" &&
                    typeof item.date === "string" &&
                    CATEGORIES.includes(item.category);

            })
            : [];

    } catch (error) {

        historyData = [];

    }

    renderHistory();

    updateDashboard();
}


function saveHistory(category, confidence) {

    const entry = {

        category: category,

        confidence: confidence,

        date: new Date().toLocaleString()

    };

    historyData.unshift(entry);

    // Keep the latest 100 entries.

    historyData = historyData.slice(0, 100);

    try {

        localStorage.setItem(
            "smartWasteHistory",
            JSON.stringify(historyData)
        );

    } catch (error) {

        console.error("Could not save history:", error);

        statusMessage.textContent =
            "Prediction completed, but history could not be saved.";

    }

    renderHistory();

    updateDashboard();
}


// ======================================
// RENDER HISTORY TABLE
// ======================================

function renderHistory() {

    const historyBody =
        document.getElementById("historyBody");

    historyBody.replaceChildren();

    if (historyData.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 3;

        cell.className = "no-history";

        cell.textContent =
            "No predictions yet. Analyze an image first.";

        row.appendChild(cell);

        historyBody.appendChild(row);

        return;
    }

    historyData.forEach(function (item) {

        const row = document.createElement("tr");

        const categoryCell = document.createElement("td");

        categoryCell.textContent = item.category;

        const confidenceCell = document.createElement("td");

        confidenceCell.textContent =
            item.confidence.toFixed(1) + "%";

        const dateCell = document.createElement("td");

        dateCell.textContent = item.date;

        row.append(
            categoryCell,
            confidenceCell,
            dateCell
        );

        historyBody.appendChild(row);
    });
}


// ======================================
// CLEAR HISTORY
// ======================================

document.getElementById("clearHistory")
    .addEventListener("click", function () {

        const confirmed = confirm(
            "Are you sure you want to clear your detection history?"
        );

        if (!confirmed) {
            return;
        }

        historyData = [];

        localStorage.removeItem("smartWasteHistory");

        renderHistory();

        updateDashboard();
    });


// ======================================
// DASHBOARD STATISTICS
// ======================================

function updateDashboard() {

    document.getElementById("totalCount")
        .textContent = historyData.length;

    const counts = {};

    CATEGORIES.forEach(function (category) {

        counts[category] = 0;

    });

    historyData.forEach(function (item) {

        counts[item.category]++;

    });

    const detectedCategories = Object.values(counts)
        .filter(function (count) {
            return count > 0;
        }).length;

    document.getElementById("categoryCount")
        .textContent = detectedCategories;

    let topCategory = "--";

    if (historyData.length > 0) {

        topCategory = CATEGORIES.reduce(function (best, current) {

            return counts[current] > counts[best]
                ? current
                : best;

        }, CATEGORIES[0]);

    }

    document.getElementById("topCategory")
        .textContent = topCategory;

    updateChart(counts);
}


// ======================================
// CHART.JS
// ======================================

function updateChart(counts) {

    const canvas =
        document.getElementById("wasteChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const labels = CATEGORIES;

    const values = labels.map(function (category) {

        return counts[category] || 0;

    });

    if (chart) {

        chart.data.labels = labels;

        chart.data.datasets[0].data = values;

        chart.update();

        return;
    }

    chart = new Chart(canvas, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [{

                label: "Number of Predictions",

                data: values,

                backgroundColor: [
                    "#159447",
                    "#43ad6a",
                    "#75c78b",
                    "#a2ddb0",
                    "#c1e9ca"
                ],

                borderRadius: 8,

                borderSkipped: false

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: true,

            plugins: {

                legend: {

                    display: false

                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    ticks: {

                        precision: 0

                    }

                }

            }

        }

    });
}


// ======================================
// START APPLICATION
// ======================================

loadHistory();

loadAIModel();