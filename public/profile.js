// DOM elements
const editProfileBtn = document.querySelector('.profile-actions .btn:first-child');
const changePasswordBtn = document.querySelector('.profile-actions .btn:last-child');
const mainContent = document.querySelector('.main-content');
let currentModal = null;

// User profile data - this will be populated from the server
let userData = {
    name: "",
    role: "",
    employeeId: "",
    experience: 0,
    salary: "",
    age: 0,
    gender: "",
    contact: "",
    joiningDate: ""
};

// Load user data from server when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get username from session storage (saved during login)
    const username = sessionStorage.getItem('username');
    const userRole = sessionStorage.getItem('role');
    
    if (!username) {
        // Redirect to login if no username found
        window.location.href = 'index.html';
        return;
    }
    
    // Determine which API to call based on user role
    let apiEndpoint;
    
    if (userRole === 'admin') {
        // For admin users
        apiEndpoint = `/api/admin/profile/${username}`;
    } else {
        // For other roles - determine endpoint based on username prefix
        // Assuming username format indicates role (W001 for Warden, J001 for Jailor, etc)
        const firstLetter = username.charAt(0).toUpperCase();
        
        switch (firstLetter) {
            case 'W':
                apiEndpoint = `/api/warden/${username}`;
                break;
            case 'J':
                apiEndpoint = `/api/jailor/${username}`;
                break;
            case 'C':
                if (username.startsWith('CJ')) {
                    apiEndpoint = `/api/chief-jailor/${username}`;
                } else {
                    apiEndpoint = `/api/clerk/${username}`;
                }
                break;
            case 'G':
                apiEndpoint = `/api/guard/${username}`;
                break;
            default:
                // Generic endpoint for other roles
                apiEndpoint = `/api/employee/${username}`;
        }
    }
    
    // Fetch user data from server using the appropriate endpoint
    fetch(apiEndpoint)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load profile data');
            }
            return response.json();
        })
        .then(data => {
            // Determine role from employee ID if available, or from sessionStorage
            const role = determineRole(data.employeeID || username) || userRole;
            
            // Update userData object
            userData = {
                name: data.name || username,
                role: formatRoleName(role),
                employeeId: data.employeeID || username,
                experience: data.yoe || 0,
                salary: data.salary ? `₹${data.salary.toLocaleString()}` : "Not available",
                age: data.age || "Not available",
                gender: formatGender(data.gender),
                contact: data.contact || "Not available",
                joiningDate: data.doj ? new Date(data.doj).toLocaleDateString() : "Not available"
            };
            
            // Update UI with fetched data
            updateProfileUI();
        })
        .catch(err => {
            console.error('Error loading profile:', err);
            showNotification('Failed to load profile data. Please refresh the page.', 'error');
            
            // Still try to display something with the available information
            userData = {
                name: username || "User",
                role: formatRoleName(userRole || "employee"),
                employeeId: username || "",
                experience: 0,
                salary: "Not available",
                age: "Not available",
                gender: "Not available",
                contact: "Not available",
                joiningDate: "Not available"
            };
            updateProfileUI();
        });
    
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Initialize tab functionality for profile page
    initializeTabs();

    // Add event listeners for profile buttons
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', showEditProfileModal);
    }
    
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', showChangePasswordModal);
    }
});

// Helper function to determine role from employee ID
function determineRole(employeeId) {
    if (!employeeId) return null;
    
    const prefix = employeeId.substring(0, 1) === 'C' && employeeId.length > 1 ? 
                   employeeId.substring(0, 2) : 
                   employeeId.substring(0, 1);
                   
    switch (prefix) {
        case 'W': return 'warden';
        case 'CJ': return 'chief jailor';
        case 'J': return 'jailor';
        case 'G': return 'guard';
        case 'C': return 'clerk';
        case 'T': return 'technician';
        default: return 'employee';
    }
}

// Helper function to format role name with proper capitalization
function formatRoleName(role) {
    if (!role) return "Employee";
    
    return role.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Helper function to format gender
function formatGender(gender) {
    if (!gender) return "Not specified";
    
    switch(gender) {
        case 'M': return 'Male';
        case 'F': return 'Female';
        default: return gender;
    }
}

// Initialize tab functionality
function initializeTabs() {
    const profileTabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and contents
            profileTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Create and show Edit Profile modal
function showEditProfileModal() {
    // Close any open modal first
    if (currentModal) {
        mainContent.removeChild(currentModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Edit Profile</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-profile-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="name">Full Name</label>
                            <input type="text" id="name" name="name" value="${userData.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="employeeId">Employee ID</label>
                            <input type="text" id="employeeId" name="employeeId" value="${userData.employeeId}" disabled>
                            <input type="hidden" name="employeeId" value="${userData.employeeId}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="joiningDate">Date of Joining</label>
                            <input type="text" id="joiningDate" name="joiningDate" value="${userData.joiningDate}" disabled>
                        </div>
                        <div class="form-group">
                            <label for="experience">Years of Experience</label>
                            <input type="text" id="experience" name="experience" value="${userData.experience}" disabled>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="salary">Salary</label>
                            <input type="text" id="salary" name="salary" value="${userData.salary.replace('₹', '')}" required>
                        </div>
                        <div class="form-group">
                            <label for="age">Age</label>
                            <input type="number" id="age" name="age" value="${userData.age}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="gender">Gender</label>
                            <select id="gender" name="gender" required>
                                <option value="M" ${userData.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="F" ${userData.gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${userData.gender === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="contact">Contact Number</label>
                            <input type="text" id="contact" name="contact" value="${userData.contact}" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn close-modal">Cancel</button>
                        <button type="submit" class="save-btn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to the DOM
    mainContent.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listeners for modal
    const closeButtons = modalContainer.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            mainContent.removeChild(modalContainer);
            currentModal = null;
        });
    });
    
    // Handle form submission
    const form = modalContainer.querySelector('#edit-profile-form');
    form.addEventListener('submit', handleEditProfileSubmit);
}

// Create and show Change Password modal with simplified interface
function showChangePasswordModal() {
    // Close any open modal first
    if (currentModal) {
        mainContent.removeChild(currentModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content with simplified password form
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Change Password</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="change-password-form">
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" name="newPassword" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn close-modal">Cancel</button>
                        <button type="submit" class="save-btn">Update Password</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to the DOM
    mainContent.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listeners for modal
    const closeButtons = modalContainer.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            mainContent.removeChild(modalContainer);
            currentModal = null;
        });
    });
    
    // Handle form submission
    const form = modalContainer.querySelector('#change-password-form');
    form.addEventListener('submit', handleChangePasswordSubmit);
}

// Handle edit profile form submission
function handleEditProfileSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
        updatedData[key] = value;
    }
    
    // Validate the data
    if (!validateProfileData(updatedData)) {
        return;
    }
    
    // Prepare data for server
    const dataForServer = {
        employeeId: updatedData.employeeId,
        name: updatedData.name,
        salary: updatedData.salary,
        age: parseInt(updatedData.age),
        gender: updatedData.gender,
        contact: updatedData.contact
    };
    
    // Send data to server
    updateProfileOnServer(dataForServer);
}

// Handle change password form submission (simplified)
function handleChangePasswordSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const form = event.target;
    const newPassword = form.newPassword.value;
    
    // Simple validation - just check if not empty
    if (!newPassword.trim()) {
        showNotification('Please enter a new password.', 'error');
        return;
    }
    
    // Prepare data for server
    const dataForServer = {
        employeeId: userData.employeeId,
        newPassword: newPassword
    };
    
    // Send data to server
    updatePasswordOnServer(dataForServer);
}

// Validate profile data
function validateProfileData(data) {
    // Validate phone number
    const phoneRegex = /^\+?[\d\s]{10,15}$/;
    if (!phoneRegex.test(data.contact.replace(/\s/g, ''))) {
        showNotification('Please enter a valid phone number.', 'error');
        return false;
    }
    
    // Validate age
    if (parseInt(data.age) < 18 || parseInt(data.age) > 70) {
        showNotification('Age must be between 18 and 70.', 'error');
        return false;
    }
    
    // Validate salary (non-empty)
    if (!data.salary.trim()) {
        showNotification('Salary cannot be empty.', 'error');
        return false;
    }
    
    return true;
}

// Update the UI with new profile data
function updateProfileUI() {
    // Update profile sidebar
    const profileNameElement = document.querySelector('.profile-name');
    const profileRoleElement = document.querySelector('.profile-role');
    const experienceElement = document.querySelector('.stat-value:first-child');
    const employeeIdElement = document.querySelector('.profile-stats .stat-item:nth-child(2) .stat-value');
    
    if (profileNameElement) profileNameElement.textContent = userData.name;
    if (profileRoleElement) profileRoleElement.textContent = userData.role;
    if (experienceElement) experienceElement.textContent = userData.experience;
    if (employeeIdElement) employeeIdElement.textContent = userData.employeeId;
    
    // Update profile info
    const infoValues = document.querySelectorAll('.info-value');
    if (infoValues && infoValues.length >= 5) {
        infoValues[0].textContent = userData.salary;
        infoValues[1].textContent = userData.age;
        infoValues[2].textContent = userData.gender;
        infoValues[3].textContent = userData.contact;
        infoValues[4].textContent = userData.joiningDate;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification"><i class="fas fa-times"></i></button>
    `;
    
    // Add notification to the DOM
    document.body.appendChild(notification);
    
    // Add event listener to close button
    const closeButton = notification.querySelector('.close-notification');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(notification);
    });
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}

// Function to send updated profile data to server
function updateProfileOnServer(profileData) {
    console.log('Sending profile data to server:', profileData);
    
    fetch('/api/profile/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update local userData with the new values
            userData = {
                ...userData,
                name: profileData.name,
                salary: `₹${profileData.salary}`,
                age: profileData.age,
                gender: profileData.gender === 'M' ? 'Male' : 
                         profileData.gender === 'F' ? 'Female' : profileData.gender,
                contact: profileData.contact
            };
            
            // Update the UI
            updateProfileUI();
            
            // Close the modal
            mainContent.removeChild(currentModal);
            currentModal = null;
            
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to update profile. Please try again.', 'error');
    });
}

// Function to send updated password to server (simplified)
function updatePasswordOnServer(passwordData) {
    console.log('Sending password data to server:', passwordData);
    
    fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message || 'Password updated successfully', 'success');
            mainContent.removeChild(currentModal);
            currentModal = null;
        } else {
            showNotification(data.message || 'Failed to update password', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to change password. Please try again.', 'error');
    });
}