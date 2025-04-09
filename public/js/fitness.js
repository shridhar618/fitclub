const modal = document.getElementById('editProfileModal');
const closeBtn = document.getElementsByClassName('close')[0];
const editProfileForm = document.getElementById('editProfileForm');

const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.querySelector('.nav-menu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuToggle.querySelector('i').classList.toggle('ri-menu-line');
    menuToggle.querySelector('i').classList.toggle('ri-close-line');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.querySelector('i').classList.add('ri-menu-line');
        menuToggle.querySelector('i').classList.remove('ri-close-line');
    });
});

// Progress Bar
window.onscroll = function() {
    // Progress bar
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.querySelector('.progress-bar-fill').style.width = scrolled + '%';

    // Go to top button
    const goToTopButton = document.getElementById('goToTop');
    if (winScroll > 300) {
        goToTopButton.style.display = 'flex';
    } else {
        goToTopButton.style.display = 'none';
    }

    // Active link highlighting
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);
        
        if(winScroll > sectionTop && winScroll <= sectionTop + sectionHeight) {
            navLink?.classList.add('active');
        } else {
            navLink?.classList.remove('active');
        }
    });
};

// Go to Top
document.getElementById('goToTop').addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Update chart colors based on theme
function updateChartColors() {
    const isDark = body.getAttribute('data-theme') === 'dark';
    const chartColor = isDark ? '#fff' : '#666';
    
    if (window.myChart) {
        window.myChart.options.scales.x.ticks.color = chartColor;
        window.myChart.options.scales.y.ticks.color = chartColor;
        window.myChart.options.plugins.legend.labels.color = chartColor;
        window.myChart.update();
    }
}

// Progress Chart Configuration
const chartConfig = {
    weight: {
        label: 'Weight (kg)',
        color: 'rgb(75, 192, 192)',
        unit: 'kg'
    },
    steps: {
        label: 'Steps',
        color: 'rgb(255, 159, 64)',
        unit: 'steps'
    },
    calories: {
        label: 'Calories Burned',
        color: 'rgb(255, 99, 132)',
        unit: 'kcal'
    },
    water: {
        label: 'Water Intake',
        color: 'rgb(54, 162, 235)',
        unit: 'L'
    }
};

// Initialize date range
let currentWeekStart = moment().startOf('week');

// Initialize progress chart
function initProgressChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: generateDateLabels(),
            datasets: [{
                label: 'Weight Progress',
                data: [],
                borderColor: chartConfig.weight.color,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: body.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: body.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
                    }
                },
                y: {
                    ticks: {
                        color: body.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
                    }
                }
            }
        }
    });
}

// Generate date labels for the chart
function generateDateLabels() {
    return Array.from({length: 7}, (_, i) => {
        return moment(currentWeekStart).add(i, 'days').format('ddd DD');
    });
}

// Update chart data
async function updateChartData(metric = 'weight') {
    try {
        const response = await fetch(`/api/progress/${metric}?start=${currentWeekStart.format('YYYY-MM-DD')}`);
        const data = await response.json();
        
        const values = data.values || Array(7).fill(null);
        
        // Update chart
        window.myChart.data.datasets[0].label = chartConfig[metric].label;
        window.myChart.data.datasets[0].borderColor = chartConfig[metric].color;
        window.myChart.data.datasets[0].data = values;
        window.myChart.update();

        // Update statistics
        updateStats(values);
    } catch (error) {
        console.error('Error fetching progress data:', error);
    }
}

// Update statistics
function updateStats(values) {
    const validValues = values.filter(v => v !== null);
    if (validValues.length === 0) return;

    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const max = Math.max(...validValues);
    const min = Math.min(...validValues);
    const progress = ((validValues[validValues.length - 1] - validValues[0]) / validValues[0] * 100).toFixed(1);

    document.getElementById('avgValue').textContent = `${avg.toFixed(1)}`;
    document.getElementById('maxValue').textContent = `${max.toFixed(1)}`;
    document.getElementById('minValue').textContent = `${min.toFixed(1)}`;
    document.getElementById('progressValue').textContent = `${progress}%`;
}

// Event Listeners
document.getElementById('metricSelect').addEventListener('change', (e) => {
    updateChartData(e.target.value);
});

document.getElementById('prevWeek').addEventListener('click', () => {
    currentWeekStart.subtract(1, 'week');
    document.getElementById('dateRange').textContent = `${currentWeekStart.format('MMM DD')} - ${currentWeekStart.clone().add(6, 'days').format('MMM DD')}`;
    window.myChart.data.labels = generateDateLabels();
    updateChartData(document.getElementById('metricSelect').value);
});

document.getElementById('nextWeek').addEventListener('click', () => {
    currentWeekStart.add(1, 'week');
    document.getElementById('dateRange').textContent = `${currentWeekStart.format('MMM DD')} - ${currentWeekStart.clone().add(6, 'days').format('MMM DD')}`;
    window.myChart.data.labels = generateDateLabels();
    updateChartData(document.getElementById('metricSelect').value);
});

// Initialize chart on page load
document.addEventListener('DOMContentLoaded', () => {
    initProgressChart();
    updateChartData();
    document.getElementById('dateRange').textContent = `${currentWeekStart.format('MMM DD')} - ${currentWeekStart.clone().add(6, 'days').format('MMM DD')}`;
});

// Update chart colors when theme changes
themeToggle.addEventListener('click', updateChartColors);

// Simple profile management without class
let currentUser = null;

// Check login status when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    
    // Add submit event listener to the form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
});

function checkLoginStatus() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        loadUserProfile();
    }
}

function loadUserProfile() {
    const profileData = localStorage.getItem(`profile_${currentUser.id}`);
    if (profileData) {
        const data = JSON.parse(profileData);
        updateProfileUI(data);
    }
}

// Simple function to open the modal when edit button is clicked
function editProfile() {
    const modal = document.getElementById('profileModal');
    const form = document.getElementById('profileForm');
    
    // Get current profile data
    const profileData = JSON.parse(localStorage.getItem('userProfile') || '{}');
    
    // Pre-fill the form with current values
    form.userName.value = profileData.userName || '';
    form.userAge.value = profileData.age || '';
    form.userWeight.value = profileData.weight || '';
    form.userHeight.value = profileData.height || '';
    
    // Set current profile image in preview
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.src = profileData.profileImage || './images/profile-placeholder.jpg';
    
    // Show the modal
    modal.style.display = 'block';
}

// Function to preview image before upload
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.src = e.target.result;
        }
        
        reader.readAsDataURL(file);
    }
}

// Function to handle form submission
function saveProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const profileImage = document.getElementById('imagePreview').src;
    
    // Get profile data
    const profileData = {
        userName: form.userName.value,
        age: form.userAge.value,
        weight: form.userWeight.value,
        height: form.userHeight.value,
        profileImage: profileImage
    };
    
    // Update UI
    document.querySelector('.profile-summary h3').textContent = profileData.userName;
    document.getElementById('displayAge').textContent = profileData.age;
    document.getElementById('displayWeight').textContent = `${profileData.weight} kg`;
    document.getElementById('displayHeight').textContent = `${profileData.height} cm`;
    
    // Update profile image everywhere
    const profileImages = document.querySelectorAll('.profile-image');
    profileImages.forEach(img => {
        img.src = profileData.profileImage;
    });
    
    // Calculate and update BMI
    const weight = parseFloat(profileData.weight);
    const height = parseFloat(profileData.height);
    const bmi = calculateBMI(weight, height);
    document.getElementById('displayBMI').textContent = bmi.toFixed(1);
    
    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(profileData));
    
    // Close the modal
    closeProfileModal();
    
    // Show success message
    showNotification('Profile updated successfully');
}

// Function to close the modal
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
        closeProfileModal();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Login Management
function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;

    // Mock user login
    const mockUser = {
        id: '123',
        email: email,
        name: 'User'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUser));
    currentUser = mockUser;
    
    closeLoginModal();
    showNotification('Login successful!');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'none';
}

// Exercise Logging
function logExercise() {
    const exerciseForm = `
        <div class="log-entry">
            <input type="text" placeholder="Exercise Name">
            <input type="number" placeholder="Duration (min)">
            <input type="number" placeholder="Calories">
            <button onclick="saveExercise(this)" class="btn">Save</button>
        </div>
    `;
    document.querySelector('.log-entries').insertAdjacentHTML('afterbegin', exerciseForm);
}

// Water Tracking
function addWater() {
    const currentAmount = parseFloat(document.getElementById('waterAmount').textContent);
    const newAmount = (currentAmount + 0.25).toFixed(1);
    document.getElementById('waterAmount').textContent = newAmount;
    const percentage = (newAmount / 2.5) * 100;
    document.querySelector('.water-fill').style.width = `${percentage}%`;
}

// Utility functions
// Function to show goal modal
function showGoalModal() {
    const modal = document.getElementById('goalModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Function to close goal modal
function closeGoalModal() {
    const modal = document.getElementById('goalModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Function to add new goal
function addNewGoal(event) {
    if (event) {
        event.preventDefault();
    }
    
    // Get the goal input values
    const goalTitle = document.getElementById('goalTitle').value;
    const goalTarget = document.getElementById('goalTarget').value;
    const goalDeadline = document.getElementById('goalDeadline').value;

    // Validate inputs
    if (!goalTitle || !goalTarget || !goalDeadline) {
        showNotification('Please fill in all goal fields', 'error');
        return;
    }

    // Calculate days remaining
    const today = new Date();
    const deadline = new Date(goalDeadline);
    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
        showNotification('Please select a future date', 'error');
        return;
    }

    // Create new goal element
    const goalsContainer = document.getElementById('goalsContainer');
    const goalElement = document.createElement('div');
    goalElement.className = 'goal-item';
    goalElement.setAttribute('data-deadline', goalDeadline);

    goalElement.innerHTML = `
        <div class="goal-info">
            <h4>${goalTitle}</h4>
            <p>${goalTarget}</p>
            <div class="progress-bar">
                <div class="progress" style="width: 0%"></div>
            </div>
        </div>
        <span class="goal-deadline">${daysRemaining} days left</span>
        <button class="btn-delete" onclick="deleteGoal(this)">
            <i class="ri-delete-bin-line"></i>
        </button>
    `;

    // Add the new goal to container
    goalsContainer.appendChild(goalElement);

    // Save goals to localStorage
    saveGoals();

    // Clear input fields
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalTarget').value = '';
    document.getElementById('goalDeadline').value = '';

    // Close the modal
    closeGoalModal();

    // Show success notification
    showNotification('Goal added successfully');
}

// Function to delete goal
function deleteGoal(button) {
    const goalItem = button.closest('.goal-item');
    if (goalItem) {
        goalItem.remove();
        saveGoals();
        showNotification('Goal deleted successfully');
    }
}

// Function to save goals to localStorage
function saveGoals() {
    const goalsContainer = document.getElementById('goalsContainer');
    const goals = [];
    
    // Get all goal cards and extract their data
    goalsContainer.querySelectorAll('.goal-item').forEach(goalCard => {
        const title = goalCard.querySelector('h4').textContent;
        const target = goalCard.querySelector('p').textContent;
        const deadline = goalCard.getAttribute('data-deadline');
        
        goals.push({
            title: title,
            target: target,
            deadline: deadline
        });
    });

    // Save to localStorage
    localStorage.setItem('fitnessGoals', JSON.stringify(goals));
}

// Function to load goals from localStorage
function loadGoals() {
    const savedGoals = localStorage.getItem('fitnessGoals');
    if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        const goalsContainer = document.getElementById('goalsContainer');
        goalsContainer.innerHTML = ''; // Clear existing goals
        
        goals.forEach(goal => {
            // Calculate days remaining
            const today = new Date();
            const deadline = new Date(goal.deadline);
            const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            
            const goalElement = document.createElement('div');
            goalElement.className = 'goal-item';
            goalElement.setAttribute('data-deadline', goal.deadline);
            
            goalElement.innerHTML = `
                <div class="goal-info">
                    <h4>${goal.title}</h4>
                    <p>${goal.target}</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: 0%"></div>
                    </div>
                </div>
                <span class="goal-deadline">${daysRemaining} days left</span>
                <button class="btn-delete" onclick="deleteGoal(this)">
                    <i class="ri-delete-bin-line"></i>
                </button>
            `;
            
            goalsContainer.appendChild(goalElement);
        });
    }
}

// Load goals when page loads
document.addEventListener('DOMContentLoaded', loadGoals);

function logMeal(mealType) {
    // Meal logging logic
}

function saveExercise(btn) {
    // Save exercise logic
}

document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.querySelector('.nav-menu');

    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.querySelector('i').classList.toggle('ri-menu-line');
        menuToggle.querySelector('i').classList.toggle('ri-close-line');
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuToggle.querySelector('i').classList.add('ri-menu-line');
            menuToggle.querySelector('i').classList.remove('ri-close-line');
        });
    });

    // Progress Bar
    window.onscroll = function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        document.querySelector('.progress-bar-fill').style.width = scrolled + '%';
    };

    // Active link highlighting
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);
            
            if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLink?.classList.add('active');
            } else {
                navLink?.classList.remove('active');
            }
        });
    });
});

function saveProfile(event) {
    event.preventDefault();
    
    // Get form values
    const formData = {
        name: document.getElementById('userName').value,
        age: document.getElementById('userAge').value,
        weight: document.getElementById('userWeight').value,
        height: document.getElementById('userHeight').value
    };

    // Update profile display on dashboard
    document.querySelector('.profile-summary h3').textContent = formData.name;
    document.getElementById('displayAge').textContent = formData.age;
    document.getElementById('displayWeight').textContent = `${formData.weight} kg`;
    document.getElementById('displayHeight').textContent = `${formData.height} cm`;

    // Calculate and update BMI
    const bmi = calculateBMI(formData.weight, formData.height);
    document.getElementById('displayBMI').textContent = bmi.toFixed(1);

    // Save to localStorage for persistence
    localStorage.setItem('userProfile', JSON.stringify(formData));

    // Close the modal
    closeProfileModal();
}

function calculateBMI(weight, height) {
    // Convert height from cm to meters
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
}

// Load profile data when page loads
function loadProfile() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
        try {
            const profile = JSON.parse(savedProfile);
            
            // Update profile summary
            document.querySelector('.profile-summary h3').textContent = profile.userName || 'Your Name';
            
            // Update stats display
            document.getElementById('displayAge').textContent = profile.age || '0';
            document.getElementById('displayWeight').textContent = `${profile.weight || '0'} kg`;
            document.getElementById('displayHeight').textContent = `${profile.height || '0'} cm`;
            
            // Update profile images
            if (profile.profileImage) {
                const profileImages = document.querySelectorAll('.profile-image');
                const imagePreview = document.getElementById('imagePreview');
                
                profileImages.forEach(img => {
                    img.src = profile.profileImage;
                });
                
                if (imagePreview) {
                    imagePreview.src = profile.profileImage;
                }
            }
            
            // Calculate and update BMI
            if (profile.weight && profile.height) {
                const bmi = calculateBMI(profile.weight, profile.height);
                document.getElementById('displayBMI').textContent = bmi.toFixed(1);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            showNotification('Error loading profile', 'error');
        }
    }
}

// Call loadProfile when page loads
document.addEventListener('DOMContentLoaded', loadProfile);

function showWorkoutInput() {
    document.getElementById("workoutInput").style.display = "block";
}

function hideWorkoutInput() {
    document.getElementById("workoutInput").style.display = "none";
}

function addWorkout() {
    let day = document.getElementById("dayInput").value.trim();
    let workout = document.getElementById("workoutInputField").value.trim();

    if (day === "" || workout === "") {
        alert("Please enter both day and workout!");
        return;
    }

    let scheduleGrid = document.getElementById("scheduleGrid");
    let dayElements = scheduleGrid.getElementsByClassName("schedule-day");
    let dayExists = false;

    for (let i = 0; i < dayElements.length; i++) {
        let dayHeader = dayElements[i].getElementsByTagName("h4")[0];
        if (dayHeader.innerText.toLowerCase() === day.toLowerCase()) {
            let newWorkout = document.createElement("div");
            newWorkout.classList.add("workout-slot");
            newWorkout.setAttribute("draggable", "true");
            newWorkout.innerHTML = `${workout} <button class="delete-btn" onclick="deleteWorkout(this)">X</button>`;
            dayElements[i].appendChild(newWorkout);
            dayExists = true;
            break;
        }
    }

    if (!dayExists) {
        let newDay = document.createElement("div");
        newDay.classList.add("schedule-day");

        let dayTitle = document.createElement("h4");
        dayTitle.innerText = day;

        let newWorkout = document.createElement("div");
        newWorkout.classList.add("workout-slot");
        newWorkout.setAttribute("draggable", "true");
        newWorkout.innerHTML = `${workout} <button class="delete-btn" onclick="deleteWorkout(this)">X</button>`;

        newDay.appendChild(dayTitle);
        newDay.appendChild(newWorkout);
        scheduleGrid.appendChild(newDay);
    }

    // Clear input fields and hide input box
    document.getElementById("dayInput").value = "";
    document.getElementById("workoutInputField").value = "";
    hideWorkoutInput();
}

function deleteWorkout(button) {
    let workoutSlot = button.parentElement;
    let dayContainer = workoutSlot.parentElement;

    // Remove workout slot
    workoutSlot.remove();

    // If no workouts left in a day, remove the day container
    if (dayContainer.getElementsByClassName("workout-slot").length === 0) {
        dayContainer.remove();
    }
}



document.addEventListener("DOMContentLoaded", function () {
    let ctx = document.getElementById("progressChart").getContext("2d");

    let progressChart = new Chart(ctx, {
        type: "line", // You can also use 'bar', 'pie', etc.
        data: {
            labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"], // X-axis (Time)
            datasets: [{
                label: "Weight (kg)", // Change based on the tracked metric
                data: [75, 74, 73, 72, 71], // Example progress data
                borderColor: "blue",
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
});


function updateProgress(newData) {
    progressChart.data.datasets[0].data.push(newData); // Add new data
    progressChart.data.labels.push("Week " + (progressChart.data.labels.length + 1)); // New label
    progressChart.update(); // Refresh chart
}


function openChatbot() {
    window.location.href = 'https://flask-chatbot-3-pl35.onrender.com/'; // Replace with the actual URL of your chatbot page
  }


// Add event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load existing goals
    loadGoals();

    // Add click event listeners for goal modal
    const addGoalBtn = document.querySelector('[onclick="showGoalModal()"]');
    if (addGoalBtn) {
        addGoalBtn.addEventListener('click', showGoalModal);
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        const goalModal = document.getElementById('goalModal');
        if (event.target === goalModal) {
            closeGoalModal();
        }
    };

    // Add submit event listener to goal form
    const goalForm = document.getElementById('goalForm');
    if (goalForm) {
        goalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addNewGoal();
        });
    }

    // Add click event listeners for goal cards
    document.getElementById('goalsContainer').addEventListener('click', function(e) {
        if (e.target.closest('.goal-item')) {
            const goalCard = e.target.closest('.goal-item');
            if (!e.target.closest('.btn-delete')) {
                editGoal(goalCard);
            }
        }
    });
});

// Function to show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

